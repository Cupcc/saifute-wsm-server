import {
  DEFAULT_WORKSHOP_CODE,
  DEFAULT_WORKSHOP_NAME,
  normalizeOptionalText,
  resolveDeterministicCodes,
} from "../shared/deterministic";
import type {
  ArchivedFieldPayloadRecord,
  DocumentLifecycleStatusValue,
  ExcludedScrapPlanRecord,
  LegacyScrapDetailRow,
  LegacyScrapOrderRow,
  LegacyScrapSnapshot,
  ResolvedMaterialDependency,
  ResolvedPersonnelDependency,
  ScrapDependencySnapshot,
  ScrapGlobalBlocker,
  ScrapLinePlanRecord,
  ScrapMigrationPlan,
  ScrapOrderPlanRecord,
  ScrapPlanCounts,
  ScrapWarning,
  WorkshopMaterialOrderTargetInsert,
} from "./types";
import { WORKSHOP_SCRAP_MIGRATION_BATCH } from "./types";

function buildLegacyKey(legacyTable: string, legacyId: number): string {
  return `${legacyTable}::${legacyId}`;
}

function buildOrderKey(
  order: Pick<LegacyScrapOrderRow, "legacyTable" | "legacyId">,
): string {
  return buildLegacyKey(order.legacyTable, order.legacyId);
}

function normalizePersonnelLookupName(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replace(/\s+/gu, " ") : null;
}

function normalizeDecimalToScale(
  value: string | number | null | undefined,
  scale: number,
): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;

  const match = normalized.match(/^([+-])?(\d+)(?:\.(\d+))?$/u);
  if (!match) return null;

  const [, signSymbol, integerPartRaw, fractionalPartRaw = ""] = match;
  const digits = `${integerPartRaw}${fractionalPartRaw}`.replace(
    /^0+(?=\d)/u,
    "",
  );
  const normalizedDigits = digits.length > 0 ? digits : "0";
  const sign =
    signSymbol === "-" && normalizedDigits !== "0"
      ? (-1 as const)
      : (1 as const);
  const scaledInteger = BigInt(normalizedDigits) * BigInt(sign);
  const currentScale = fractionalPartRaw.length;

  let result: bigint;
  if (currentScale <= scale) {
    result = scaledInteger * 10n ** BigInt(scale - currentScale);
  } else {
    const divisor = 10n ** BigInt(currentScale - scale);
    const quotient = scaledInteger / divisor;
    const remainder = scaledInteger % divisor;
    const absoluteRemainder = remainder < 0n ? -remainder : remainder;
    result =
      absoluteRemainder * 2n >= divisor && remainder !== 0n
        ? quotient + (scaledInteger >= 0n ? 1n : -1n)
        : quotient;
  }

  const isNegative = result < 0n;
  const absoluteValue = isNegative ? -result : result;
  const rawDigits = absoluteValue.toString().padStart(scale + 1, "0");
  if (scale === 0) return `${isNegative ? "-" : ""}${rawDigits}`;
  const integerPart = rawDigits.slice(0, -scale) || "0";
  const fractionalPart = rawDigits.slice(-scale);
  return `${isNegative ? "-" : ""}${integerPart}.${fractionalPart}`;
}

function toScaledInteger(
  value: string | number | null | undefined,
  scale: number,
): bigint | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;

  const match = normalized.match(/^([+-])?(\d+)(?:\.(\d+))?$/u);
  if (!match) return null;

  const [, signSymbol, integerPartRaw, fractionalPartRaw = ""] = match;
  const digits = `${integerPartRaw}${fractionalPartRaw}`.replace(
    /^0+(?=\d)/u,
    "",
  );
  const normalizedDigits = digits.length > 0 ? digits : "0";
  const sign =
    signSymbol === "-" && normalizedDigits !== "0"
      ? (-1 as const)
      : (1 as const);
  const signedInteger = BigInt(normalizedDigits) * BigInt(sign);
  const currentScale = fractionalPartRaw.length;

  if (currentScale <= scale) {
    return signedInteger * 10n ** BigInt(scale - currentScale);
  }
  const divisor = 10n ** BigInt(currentScale - scale);
  const quotient = signedInteger / divisor;
  const remainder = signedInteger % divisor;
  const absoluteRemainder = remainder < 0n ? -remainder : remainder;
  return absoluteRemainder * 2n >= divisor && remainder !== 0n
    ? quotient + (signedInteger >= 0n ? 1n : -1n)
    : quotient;
}

function formatScaledInteger(value: bigint, scale: number): string {
  const isNegative = value < 0n;
  const absoluteValue = isNegative ? -value : value;
  const rawDigits = absoluteValue.toString().padStart(scale + 1, "0");
  if (scale === 0) return `${isNegative ? "-" : ""}${rawDigits}`;
  const integerPart = rawDigits.slice(0, -scale) || "0";
  const fractionalPart = rawDigits.slice(-scale);
  return `${isNegative ? "-" : ""}${integerPart}.${fractionalPart}`;
}

function sumDecimalValues(
  values: Array<string | number | null | undefined>,
  scale: number,
): string {
  const total = values.reduce<bigint>((runningTotal, value) => {
    const scaledInteger = toScaledInteger(value, scale);
    return runningTotal + (scaledInteger ?? 0n);
  }, 0n);
  return formatScaledInteger(total, scale);
}

function deriveDeterministicUnitPrice(
  quantity: string | number | null | undefined,
  amount: string | number | null | undefined,
): string | null {
  const quantityMicros = toScaledInteger(quantity, 6);
  const amountCents = toScaledInteger(amount, 2);

  if (quantityMicros === null || amountCents === null || quantityMicros <= 0n)
    return null;

  const numerator = amountCents * 1_000_000n;
  if (numerator % quantityMicros !== 0n) return null;

  return formatScaledInteger(numerator / quantityMicros, 2);
}

function normalizeDate(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/u);
  return match?.[1] ?? null;
}

function normalizeDateTime(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;
  return normalized.length >= 19 ? normalized.slice(0, 19) : normalized;
}

function normalizePositiveLegacyId(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return numericValue;
}

function preserveRawLegacyEvidence(
  value: string | number | null | undefined,
): string | null {
  return normalizeOptionalText(value);
}

function toLifecycleStatus(
  delFlag: string | number | null | undefined,
): DocumentLifecycleStatusValue {
  return String(delFlag ?? "0") === "2" ? "VOIDED" : "EFFECTIVE";
}

function resolveDeterministicDocumentNumbers(
  orders: readonly LegacyScrapOrderRow[],
): {
  documentNoByOrderKey: Map<string, string>;
  rewrites: {
    originalDocumentNo: string;
    keptLegacyTable: "saifute_scrap_order";
    keptLegacyId: number;
    rewritten: Array<{
      legacyTable: "saifute_scrap_order";
      legacyId: number;
      rewrittenDocumentNo: string;
    }>;
  }[];
} {
  const resolution = resolveDeterministicCodes(
    orders.flatMap((order) => {
      const sourceDocumentNo = normalizeOptionalText(order.sourceDocumentNo);
      if (!sourceDocumentNo) return [];
      return [
        {
          legacyId: order.legacyId,
          isActive: String(order.delFlag ?? "0") !== "2",
          sourceCode: sourceDocumentNo,
        },
      ];
    }),
    "SCRAP-LEGACY",
  );

  const documentNoByOrderKey = new Map<string, string>();
  for (const order of orders) {
    const targetDocumentNo = resolution.codeByLegacyId.get(order.legacyId);
    if (targetDocumentNo) {
      documentNoByOrderKey.set(buildOrderKey(order), targetDocumentNo);
    }
  }

  return {
    documentNoByOrderKey,
    rewrites: resolution.rewrites.map((rewrite) => ({
      originalDocumentNo: rewrite.originalCode,
      keptLegacyTable: "saifute_scrap_order" as const,
      keptLegacyId: rewrite.keptLegacyId,
      rewritten: rewrite.rewritten.map((entry) => ({
        legacyTable: "saifute_scrap_order" as const,
        legacyId: entry.legacyId,
        rewrittenDocumentNo: entry.rewrittenCode,
      })),
    })),
  };
}

function buildOrderArchivedPayload(
  order: LegacyScrapOrderRow,
  targetDocumentNo: string,
): ArchivedFieldPayloadRecord {
  const sourceDocumentNo = normalizeOptionalText(order.sourceDocumentNo);
  return {
    legacyTable: order.legacyTable,
    legacyId: order.legacyId,
    targetTable: "workshop_material_order",
    targetCode: targetDocumentNo,
    payloadKind: "legacy-unmapped-fields",
    archiveReason:
      "Archive source-only scrap order fields and original document number when rewritten.",
    payload: {
      attn: normalizeOptionalText(order.attn),
      chargeBy: normalizeOptionalText(order.chargeBy),
      disposalMethod: normalizeOptionalText(order.disposalMethod),
      originalDocumentNo:
        sourceDocumentNo && sourceDocumentNo !== targetDocumentNo
          ? sourceDocumentNo
          : null,
    },
  };
}

function buildLineArchivedPayload(
  line: LegacyScrapDetailRow,
  targetCode: string,
  amount: string,
  unitPrice: string,
): ArchivedFieldPayloadRecord {
  return {
    legacyTable: line.legacyTable,
    legacyId: line.legacyId,
    targetTable: "workshop_material_order_line",
    targetCode,
    payloadKind: "legacy-unmapped-fields",
    archiveReason:
      "Archive scrap-detail-only fields and raw price evidence for deterministic pricing follow-up.",
    payload: {
      estimatedLoss: preserveRawLegacyEvidence(line.estimatedLoss),
      rawQuantity: normalizeDecimalToScale(line.quantity, 6),
      derivedAmount: amount,
      derivedUnitPrice: unitPrice,
      scrapReason: normalizeOptionalText(line.scrapReason),
      unit: normalizeOptionalText(line.unit),
    },
  };
}

function buildDetailsByOrderKey(
  details: readonly LegacyScrapDetailRow[],
): Map<string, LegacyScrapDetailRow[]> {
  const detailsByOrderKey = new Map<string, LegacyScrapDetailRow[]>();
  for (const detail of [...details].sort(
    (left, right) =>
      left.parentLegacyId - right.parentLegacyId ||
      left.legacyId - right.legacyId,
  )) {
    const orderKey = buildLegacyKey(
      detail.parentLegacyTable,
      detail.parentLegacyId,
    );
    const existingDetails = detailsByOrderKey.get(orderKey) ?? [];
    existingDetails.push(detail);
    detailsByOrderKey.set(orderKey, existingDetails);
  }
  return detailsByOrderKey;
}

function buildExcludedDocumentPlan(
  order: LegacyScrapOrderRow,
  details: readonly LegacyScrapDetailRow[],
  targetDocumentNoCandidate: string | null,
  exclusionReasons: string[],
): ExcludedScrapPlanRecord {
  return {
    legacyTable: order.legacyTable,
    legacyId: order.legacyId,
    exclusionReason: exclusionReasons.join("; "),
    payload: {
      bizDate: normalizeDate(order.bizDate),
      chargeBy: normalizeOptionalText(order.chargeBy),
      createdAt: normalizeDateTime(order.createdAt),
      createdBy: normalizeOptionalText(order.createdBy),
      disposalMethod: normalizeOptionalText(order.disposalMethod),
      exclusionReasons,
      lifecycleStatus: toLifecycleStatus(order.delFlag),
      details: details.map((detail) => ({
        estimatedLoss: preserveRawLegacyEvidence(detail.estimatedLoss),
        legacyId: detail.legacyId,
        legacyTable: detail.legacyTable,
        materialLegacyId: normalizePositiveLegacyId(detail.materialLegacyId),
        quantity: normalizeDecimalToScale(detail.quantity, 6),
        remark: normalizeOptionalText(detail.remark),
        scrapReason: normalizeOptionalText(detail.scrapReason),
        unit: normalizeOptionalText(detail.unit),
      })),
      sourceDocumentNo: normalizeOptionalText(order.sourceDocumentNo),
      targetDocumentNoCandidate,
      attn: normalizeOptionalText(order.attn),
      updatedAt: normalizeDateTime(order.updatedAt),
      updatedBy: normalizeOptionalText(order.updatedBy),
      voidReason: normalizeOptionalText(order.voidReason),
    },
  };
}

interface PreparedLine {
  source: LegacyScrapDetailRow;
  material: ResolvedMaterialDependency;
  quantity: string;
  amount: string;
  unitPrice: string;
}

function prepareLines(
  details: readonly LegacyScrapDetailRow[],
  dependencies: ScrapDependencySnapshot,
  exclusionReasons: string[],
): PreparedLine[] {
  const preparedLines: PreparedLine[] = [];

  for (const detail of [...details].sort(
    (left, right) => left.legacyId - right.legacyId,
  )) {
    const materialLegacyId = normalizePositiveLegacyId(detail.materialLegacyId);

    if (materialLegacyId === null) {
      exclusionReasons.push(
        `Detail ${detail.legacyTable}#${detail.legacyId} is missing material_id.`,
      );
      continue;
    }

    if (dependencies.blockedMaterialLegacyIds.has(materialLegacyId)) {
      exclusionReasons.push(
        `Detail ${detail.legacyTable}#${detail.legacyId} references blocked batch1 material ${materialLegacyId}.`,
      );
      continue;
    }

    const material =
      dependencies.materialByLegacyKey.get(
        buildLegacyKey("saifute_material", materialLegacyId),
      ) ?? null;

    if (!material) {
      exclusionReasons.push(
        `Detail ${detail.legacyTable}#${detail.legacyId} material ${materialLegacyId} is missing from the batch1 material map.`,
      );
      continue;
    }

    const quantity = normalizeDecimalToScale(detail.quantity, 6);
    const quantityMicros = toScaledInteger(detail.quantity, 6);

    if (!quantity || quantityMicros === null || quantityMicros <= 0n) {
      exclusionReasons.push(
        `Detail ${detail.legacyTable}#${detail.legacyId} quantity must be greater than zero.`,
      );
      continue;
    }

    const amount = normalizeDecimalToScale(detail.estimatedLoss, 2) ?? "0.00";
    const unitPrice = deriveDeterministicUnitPrice(quantity, amount) ?? "0.00";

    preparedLines.push({
      source: detail,
      material,
      quantity,
      amount,
      unitPrice,
    });
  }

  return preparedLines;
}

export function buildScrapMigrationPlan(
  snapshot: LegacyScrapSnapshot,
  dependencies: ScrapDependencySnapshot,
): ScrapMigrationPlan {
  const warnings: ScrapWarning[] = [];
  const globalBlockers: ScrapGlobalBlocker[] = [];
  const migratedOrders: ScrapOrderPlanRecord[] = [];
  const excludedDocuments: ExcludedScrapPlanRecord[] = [];
  const detailsByOrderKey = buildDetailsByOrderKey(snapshot.details);
  const { documentNoByOrderKey, rewrites } =
    resolveDeterministicDocumentNumbers(snapshot.orders);

  for (const issue of dependencies.batch1Baseline.issues) {
    globalBlockers.push({ reason: issue });
  }

  if (!dependencies.defaultWorkshop) {
    globalBlockers.push({
      reason:
        "Frozen default workshop is missing from the migrated workshop staging map.",
      details: {
        expectedWorkshopCode: DEFAULT_WORKSHOP_CODE,
        expectedWorkshopName: DEFAULT_WORKSHOP_NAME,
      },
    });
  }

  for (const ambiguousName of Array.from(
    dependencies.ambiguousPersonnelNames,
  ).sort((left, right) => left.localeCompare(right))) {
    warnings.push({
      legacyTable: "personnel",
      legacyId: null,
      reason:
        "Target personnel snapshot contains ambiguous names; attn matches will preserve handlerNameSnapshot without handlerPersonnelId.",
      details: { personnelName: ambiguousName },
    });
  }

  for (const order of [...snapshot.orders].sort(
    (left, right) => left.legacyId - right.legacyId,
  )) {
    const orderKey = buildOrderKey(order);
    const details = detailsByOrderKey.get(orderKey) ?? [];
    const sourceDocumentNo = normalizeOptionalText(order.sourceDocumentNo);
    const targetDocumentNoCandidate =
      documentNoByOrderKey.get(orderKey) ?? sourceDocumentNo ?? null;
    const exclusionReasons: string[] = [];

    if (!sourceDocumentNo) {
      exclusionReasons.push("Document number is required.");
    }

    const bizDate = normalizeDate(order.bizDate);
    if (!bizDate) {
      exclusionReasons.push("Business date is required.");
    }

    if (details.length === 0) {
      exclusionReasons.push(
        "No legacy detail rows were found for this document.",
      );
    }

    if (!dependencies.defaultWorkshop) {
      exclusionReasons.push(
        "Frozen default workshop is unavailable in the migrated workshop staging map.",
      );
    }

    const normalizedAttn = normalizePersonnelLookupName(order.attn);
    let handler: ResolvedPersonnelDependency | null = null;
    let handlerNameSnapshot: string | null = normalizeOptionalText(order.attn);

    if (normalizedAttn !== null) {
      if (dependencies.ambiguousPersonnelNames.has(normalizedAttn)) {
        warnings.push({
          legacyTable: order.legacyTable,
          legacyId: order.legacyId,
          reason:
            "Attn name is ambiguous in the migrated personnel snapshot; preserving handlerNameSnapshot without handlerPersonnelId.",
          details: { attn: normalizedAttn },
        });
      } else {
        handler =
          dependencies.personnelByNormalizedName.get(normalizedAttn) ?? null;
        if (!handler) {
          warnings.push({
            legacyTable: order.legacyTable,
            legacyId: order.legacyId,
            reason:
              "Attn name is missing from the migrated personnel snapshot; preserving handler_name_snapshot without handler_personnel_id.",
            details: { attn: normalizedAttn },
          });
        } else {
          handlerNameSnapshot = handler.personnelName;
        }
      }
    }

    const preparedLines = prepareLines(details, dependencies, exclusionReasons);

    if (
      exclusionReasons.length > 0 ||
      !targetDocumentNoCandidate ||
      !bizDate ||
      !dependencies.defaultWorkshop
    ) {
      excludedDocuments.push(
        buildExcludedDocumentPlan(
          order,
          details,
          targetDocumentNoCandidate,
          exclusionReasons,
        ),
      );
      continue;
    }

    const lifecycleStatus = toLifecycleStatus(order.delFlag);
    const createdAt = normalizeDateTime(order.createdAt);
    const updatedAt = normalizeDateTime(order.updatedAt) ?? createdAt;
    const target: WorkshopMaterialOrderTargetInsert = {
      documentNo: targetDocumentNoCandidate,
      orderType: "SCRAP",
      bizDate,
      handlerPersonnelId: handler?.targetId ?? null,
      workshopId: dependencies.defaultWorkshop.targetId,
      lifecycleStatus,
      auditStatusSnapshot: "NOT_REQUIRED",
      inventoryEffectStatus:
        lifecycleStatus === "VOIDED" ? "REVERSED" : "POSTED",
      revisionNo: 1,
      handlerNameSnapshot,
      workshopNameSnapshot: dependencies.defaultWorkshop.workshopName,
      totalQty: sumDecimalValues(
        preparedLines.map((line) => line.quantity),
        6,
      ),
      totalAmount: sumDecimalValues(
        preparedLines.map((line) => line.amount),
        2,
      ),
      remark: normalizeOptionalText(order.remark),
      voidReason: normalizeOptionalText(order.voidReason),
      voidedBy:
        lifecycleStatus === "VOIDED"
          ? normalizeOptionalText(order.updatedBy)
          : null,
      voidedAt:
        lifecycleStatus === "VOIDED"
          ? normalizeDateTime(order.updatedAt)
          : null,
      createdBy: normalizeOptionalText(order.createdBy),
      createdAt,
      updatedBy: normalizeOptionalText(order.updatedBy),
      updatedAt,
    };

    const linePlans: ScrapLinePlanRecord[] = preparedLines.map(
      (preparedLine, index) => {
        const lineNo = index + 1;
        const targetCode = `${targetDocumentNoCandidate}#${lineNo}`;
        return {
          legacyTable: preparedLine.source.legacyTable,
          legacyId: preparedLine.source.legacyId,
          parentLegacyTable: preparedLine.source.parentLegacyTable,
          parentLegacyId: preparedLine.source.parentLegacyId,
          targetTable: "workshop_material_order_line" as const,
          targetCode,
          target: {
            lineNo,
            materialId: preparedLine.material.targetId,
            materialCodeSnapshot: preparedLine.material.materialCode,
            materialNameSnapshot: preparedLine.material.materialName,
            materialSpecSnapshot: preparedLine.material.specModel,
            unitCodeSnapshot: preparedLine.material.unitCode,
            quantity: preparedLine.quantity,
            unitPrice: preparedLine.unitPrice,
            amount: preparedLine.amount,
            sourceDocumentType: null,
            sourceDocumentId: null,
            sourceDocumentLineId: null,
            remark: normalizeOptionalText(preparedLine.source.remark),
            createdBy: normalizeOptionalText(order.createdBy),
            createdAt,
            updatedBy: normalizeOptionalText(order.updatedBy),
            updatedAt,
          },
          archivedPayload: buildLineArchivedPayload(
            preparedLine.source,
            targetCode,
            preparedLine.amount,
            preparedLine.unitPrice,
          ),
        };
      },
    );

    migratedOrders.push({
      legacyTable: order.legacyTable,
      legacyId: order.legacyId,
      sourceDocumentNo: sourceDocumentNo ?? targetDocumentNoCandidate,
      targetTable: "workshop_material_order",
      targetCode: targetDocumentNoCandidate,
      target,
      lines: linePlans,
      archivedPayload: buildOrderArchivedPayload(
        order,
        targetDocumentNoCandidate,
      ),
    });
  }

  const counts: ScrapPlanCounts = {
    orders: {
      source: snapshot.orders.length,
      migrated: migratedOrders.length,
      excluded: excludedDocuments.length,
    },
    details: {
      source: snapshot.details.length,
      migrated: migratedOrders.reduce(
        (total, order) => total + order.lines.length,
        0,
      ),
      excluded: excludedDocuments.reduce((total, document) => {
        const details = document.payload.details;
        return total + (Array.isArray(details) ? details.length : 0);
      }, 0),
    },
    sourceOrderTables: { saifute_scrap_order: snapshot.orders.length },
    sourceDetailTables: { saifute_scrap_detail: snapshot.details.length },
  };

  return {
    migrationBatch: WORKSHOP_SCRAP_MIGRATION_BATCH,
    migratedOrders: migratedOrders.sort(
      (left, right) => left.legacyId - right.legacyId,
    ),
    excludedDocuments: excludedDocuments.sort(
      (left, right) => left.legacyId - right.legacyId,
    ),
    documentNoRewrites: rewrites.sort(
      (left, right) =>
        left.originalDocumentNo.localeCompare(right.originalDocumentNo) ||
        left.keptLegacyId - right.keptLegacyId,
    ),
    warnings: warnings.sort(
      (left, right) =>
        left.legacyTable.localeCompare(right.legacyTable) ||
        (left.legacyId ?? 0) - (right.legacyId ?? 0) ||
        left.reason.localeCompare(right.reason),
    ),
    globalBlockers,
    counts,
    context: {
      defaultWorkshopCode:
        dependencies.defaultWorkshop?.workshopCode ?? DEFAULT_WORKSHOP_CODE,
      defaultWorkshopName:
        dependencies.defaultWorkshop?.workshopName ?? DEFAULT_WORKSHOP_NAME,
      blockedMaterialLegacyIds: Array.from(
        dependencies.blockedMaterialLegacyIds,
      ).sort((left, right) => left - right),
      batch1Baseline: dependencies.batch1Baseline,
    },
  };
}

export function hasExecutionBlockers(plan: ScrapMigrationPlan): boolean {
  return plan.globalBlockers.length > 0;
}

export function buildDryRunSummary(
  plan: ScrapMigrationPlan,
): Record<string, unknown> {
  return {
    migrationBatch: plan.migrationBatch,
    counts: plan.counts,
    documentNoRewrites: plan.documentNoRewrites,
    globalBlockers: plan.globalBlockers,
    warnings: plan.warnings,
    excludedDocuments: plan.excludedDocuments.map((document) => ({
      legacyTable: document.legacyTable,
      legacyId: document.legacyId,
      exclusionReason: document.exclusionReason,
      sourceDocumentNo:
        typeof document.payload.sourceDocumentNo === "string"
          ? document.payload.sourceDocumentNo
          : null,
      targetDocumentNoCandidate:
        typeof document.payload.targetDocumentNoCandidate === "string"
          ? document.payload.targetDocumentNoCandidate
          : null,
      excludedDetailCount: Array.isArray(document.payload.details)
        ? document.payload.details.length
        : 0,
    })),
    migratedDocuments: plan.migratedOrders.map((order) => ({
      legacyTable: order.legacyTable,
      legacyId: order.legacyId,
      sourceDocumentNo: order.sourceDocumentNo,
      documentNo: order.target.documentNo,
      orderType: order.target.orderType,
      workshopId: order.target.workshopId,
      lineCount: order.lines.length,
      lifecycleStatus: order.target.lifecycleStatus,
      inventoryEffectStatus: order.target.inventoryEffectStatus,
    })),
    context: plan.context,
  };
}
