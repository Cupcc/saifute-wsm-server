import type {
  InventoryEvent,
  InventoryOperationType,
  InventoryReplayPlan,
  PlannedBalanceRow,
  PlannedLogInsert,
} from "./types";
import { INVENTORY_REPLAY_MIGRATION_BATCH } from "./types";

function balanceKey(materialId: number, workshopId: number): string {
  return `${materialId}::${workshopId}`;
}

function sortEvents(events: InventoryEvent[]): InventoryEvent[] {
  return [...events].sort((a, b) => {
    const dateCompare = a.bizDate.localeCompare(b.bizDate);
    if (dateCompare !== 0) return dateCompare;

    if (a.sortPriority !== b.sortPriority)
      return a.sortPriority - b.sortPriority;

    if (a.businessDocumentId !== b.businessDocumentId)
      return a.businessDocumentId - b.businessDocumentId;

    return a.businessDocumentLineId - b.businessDocumentLineId;
  });
}

function toScaledBigInt(value: string): bigint {
  const match = value.match(/^([+-])?(\d+)(?:\.(\d+))?$/u);
  if (!match) return 0n;

  const [, signSymbol, integerPartRaw, fractionalPartRaw = ""] = match;
  const digits = `${integerPartRaw}${fractionalPartRaw}`.replace(
    /^0+(?=\d)/u,
    "",
  );
  const normalizedDigits = digits.length > 0 ? digits : "0";
  const sign = signSymbol === "-" && normalizedDigits !== "0" ? -1n : 1n;
  const signedInteger = BigInt(normalizedDigits) * sign;
  const currentScale = fractionalPartRaw.length;
  const targetScale = 6;

  if (currentScale <= targetScale) {
    return signedInteger * 10n ** BigInt(targetScale - currentScale);
  }

  const divisor = 10n ** BigInt(currentScale - targetScale);
  const quotient = signedInteger / divisor;
  const remainder = signedInteger % divisor;
  const absoluteRemainder = remainder < 0n ? -remainder : remainder;
  return absoluteRemainder * 2n >= divisor && remainder !== 0n
    ? quotient + (signedInteger >= 0n ? 1n : -1n)
    : quotient;
}

function formatDecimal6(value: bigint): string {
  const isNegative = value < 0n;
  const absoluteValue = isNegative ? -value : value;
  const rawDigits = absoluteValue.toString().padStart(7, "0");
  const integerPart = rawDigits.slice(0, -6) || "0";
  const fractionalPart = rawDigits.slice(-6);
  return `${isNegative ? "-" : ""}${integerPart}.${fractionalPart}`;
}

export function buildInventoryReplayPlan(
  events: InventoryEvent[],
): InventoryReplayPlan {
  const sortedEvents = sortEvents(events);
  const balances = new Map<string, bigint>();
  const plannedLogs: PlannedLogInsert[] = [];
  const warnings: string[] = [];
  const eventCounts: Record<string, number> = {};

  for (const event of sortedEvents) {
    eventCounts[event.operationType] =
      (eventCounts[event.operationType] ?? 0) + 1;

    const key = balanceKey(event.materialId, event.workshopId);
    const currentBalance = balances.get(key) ?? 0n;
    const changeQty = toScaledBigInt(event.changeQty);

    const signedChange = event.direction === "IN" ? changeQty : -changeQty;
    const newBalance = currentBalance + signedChange;
    balances.set(key, newBalance);

    plannedLogs.push({
      materialId: event.materialId,
      workshopId: event.workshopId,
      direction: event.direction,
      operationType: event.operationType,
      businessModule: event.businessModule,
      businessDocumentType: event.businessDocumentType,
      businessDocumentId: event.businessDocumentId,
      businessDocumentNumber: event.businessDocumentNumber,
      businessDocumentLineId: event.businessDocumentLineId,
      changeQty: formatDecimal6(changeQty),
      beforeQty: formatDecimal6(currentBalance),
      afterQty: formatDecimal6(newBalance),
      operatorId: event.operatorId,
      occurredAt: event.occurredAt,
      idempotencyKey: event.idempotencyKey,
    });
  }

  const plannedBalances: PlannedBalanceRow[] = [];
  const negativeBalanceMaterials: InventoryReplayPlan["negativeBalanceMaterials"] =
    [];

  for (const [key, qty] of balances.entries()) {
    const [materialIdStr, workshopIdStr] = key.split("::");
    const materialId = Number(materialIdStr);
    const workshopId = Number(workshopIdStr);

    plannedBalances.push({
      materialId,
      workshopId,
      quantityOnHand: formatDecimal6(qty),
    });

    if (qty < 0n) {
      negativeBalanceMaterials.push({
        materialId,
        workshopId,
        finalQty: formatDecimal6(qty),
      });
    }
  }

  plannedBalances.sort(
    (a, b) => a.materialId - b.materialId || a.workshopId - b.workshopId,
  );
  negativeBalanceMaterials.sort(
    (a, b) => a.materialId - b.materialId || a.workshopId - b.workshopId,
  );

  if (negativeBalanceMaterials.length > 0) {
    warnings.push(
      `${negativeBalanceMaterials.length} (materialId, workshopId) bucket(s) have negative final balance after replay. This may indicate missing inbound data or chronological ordering issues.`,
    );
  }

  return {
    migrationBatch: INVENTORY_REPLAY_MIGRATION_BATCH,
    events: sortedEvents,
    plannedBalances,
    plannedLogs,
    eventCounts: eventCounts as Record<InventoryOperationType, number>,
    uniqueBalanceBuckets: plannedBalances.length,
    warnings,
    negativeBalanceMaterials,
  };
}
