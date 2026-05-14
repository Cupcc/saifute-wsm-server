import type {
  InventoryEvent,
  InventoryOperationType,
  InventoryReplayBlocker,
  InventoryReplayCoverageGap,
  InventoryReplayPlan,
  InventorySourceLink,
  PlannedBalanceRow,
  PlannedLogInsert,
  PlannedPriceLayerRow,
  PlannedSourceUsageInsert,
  PriceLayerReconciliationRow,
  ReturnSourceLinkCandidateRow,
  SourceUsageStatusValue,
} from "./types";
import {
  INVENTORY_REPLAY_MIGRATION_BATCH,
  REPLAY_CONSUMER_OPERATION_TYPES,
  REPLAY_FIFO_SOURCE_OPERATION_TYPES,
} from "./types";

const QTY_SCALE = 6;
const COST_SCALE = 2;
const QTY_FACTOR = 10n ** BigInt(QTY_SCALE);

const FIFO_SOURCE_OPERATION_TYPE_SET = new Set<InventoryOperationType>(
  REPLAY_FIFO_SOURCE_OPERATION_TYPES,
);
const CONSUMER_OPERATION_TYPE_SET = new Set<InventoryOperationType>(
  REPLAY_CONSUMER_OPERATION_TYPES,
);
const RETURN_OPERATION_TYPE_SET = new Set<InventoryOperationType>([
  "SALES_RETURN_IN",
  "RETURN_IN",
]);

interface SourcePoolEntry {
  sequence: number;
  sourceLogIdempotencyKey: string;
  materialId: number;
  stockScopeId: number;
  unitCostScaled: bigint;
  availableQty: bigint;
}

interface AllocationPiece {
  source: SourcePoolEntry;
  allocatedQty: bigint;
  costAmountScaled: bigint;
}

interface AllocationResult {
  pieces: AllocationPiece[];
  missingQty: bigint;
  costAmountScaled: bigint;
  futureAllocatedQty: bigint;
  futureAllocatedSourceRefs: string[];
  hasInsufficientSourceBlocker: boolean;
}

interface BuildPlanOptions {
  coverageGaps?: InventoryReplayCoverageGap[];
}

interface LinkedReturnCoverage {
  quantityScaled: bigint;
  returnEvents: InventoryEvent[];
}

interface ResolvedReturnSourceLink {
  sourceDocumentType: string;
  sourceDocumentId: number;
  sourceDocumentLineId: number;
  linkedQty: string;
  quantityScaled: bigint;
}

interface StandaloneReturnSourceDecision {
  unitCostScaled: bigint;
  costAmountScaled: bigint;
  note: string;
  warning: string;
}

interface ReturnRecoverySourceDecision {
  unitCostScaled: bigint;
  quantityScaled: bigint;
  note: string;
  warning: string;
}

interface HistoricalUnfundedDeficit {
  event: InventoryEvent;
  plannedLog: PlannedLogInsert;
  totalQty: bigint;
  fundedQty: bigint;
  remainingQty: bigint;
  unitCostScaled: bigint;
  costAmountScaled: bigint;
}

interface RecoverableLinkedReturnDeficit {
  sourceEvent: InventoryEvent;
  plannedLog: PlannedLogInsert;
  remainingQty: bigint;
}

function balanceKey(materialId: number, stockScopeId: number): string {
  return `${materialId}::${stockScopeId}`;
}

function isSourceEventForReturn(
  sourceEvent: InventoryEvent,
  returnEvent: InventoryEvent,
): boolean {
  if (!RETURN_OPERATION_TYPE_SET.has(returnEvent.operationType)) return false;

  const returnQty = parseScaledDecimal(returnEvent.changeQty, QTY_SCALE) ?? 0n;
  return normalizeEventSourceLinks(returnEvent, returnQty).some(
    (link) =>
      link.sourceDocumentType === sourceEvent.businessDocumentType &&
      link.sourceDocumentId === sourceEvent.businessDocumentId &&
      link.sourceDocumentLineId === sourceEvent.businessDocumentLineId &&
      returnEvent.materialId === sourceEvent.materialId,
  );
}

function sortEvents(events: InventoryEvent[]): InventoryEvent[] {
  const sortedEvents = [...events].sort((a, b) => {
    const dateCompare = a.bizDate.localeCompare(b.bizDate);
    if (dateCompare !== 0) return dateCompare;

    if (a.sortPriority !== b.sortPriority)
      return a.sortPriority - b.sortPriority;

    const documentTypeCompare = a.businessDocumentType.localeCompare(
      b.businessDocumentType,
    );
    if (documentTypeCompare !== 0) return documentTypeCompare;

    if (a.businessDocumentId !== b.businessDocumentId)
      return a.businessDocumentId - b.businessDocumentId;

    return a.businessDocumentLineId - b.businessDocumentLineId;
  });

  let movedSourceBeforeReturn = true;
  while (movedSourceBeforeReturn) {
    movedSourceBeforeReturn = false;

    for (
      let returnEventIndex = 0;
      returnEventIndex < sortedEvents.length;
      returnEventIndex += 1
    ) {
      const returnEvent = sortedEvents[returnEventIndex];
      if (!RETURN_OPERATION_TYPE_SET.has(returnEvent.operationType)) {
        continue;
      }

      const sourceEventIndex = sortedEvents.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex > returnEventIndex &&
          candidate.bizDate === returnEvent.bizDate &&
          isSourceEventForReturn(candidate, returnEvent),
      );
      if (sourceEventIndex <= returnEventIndex) continue;

      const [sourceEvent] = sortedEvents.splice(sourceEventIndex, 1);
      sortedEvents.splice(returnEventIndex, 0, sourceEvent);
      movedSourceBeforeReturn = true;
      break;
    }
  }

  return sortedEvents;
}

function parseScaledDecimal(
  value: string | null,
  scale: number,
): bigint | null {
  if (value === null) return null;

  const match = String(value)
    .trim()
    .match(/^([+-])?(\d+)(?:\.(\d+))?$/u);
  if (!match) return null;

  const [, signSymbol, integerPartRaw, fractionalPartRaw = ""] = match;
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/u, "") || "0";
  const sign = signSymbol === "-" ? -1n : 1n;

  if (fractionalPartRaw.length <= scale) {
    const paddedFraction = fractionalPartRaw.padEnd(scale, "0");
    return BigInt(`${integerPart}${paddedFraction}`) * sign;
  }

  const keptFraction = fractionalPartRaw.slice(0, scale);
  const droppedFraction = fractionalPartRaw.slice(scale);
  let scaled = BigInt(`${integerPart}${keptFraction}`) * sign;
  if (droppedFraction[0] >= "5") {
    scaled += sign;
  }
  return scaled;
}

function formatScaledDecimal(value: bigint, scale: number): string {
  const isNegative = value < 0n;
  const absoluteValue = isNegative ? -value : value;
  const rawDigits = absoluteValue.toString().padStart(scale + 1, "0");
  const integerPart = rawDigits.slice(0, -scale) || "0";
  const fractionalPart = rawDigits.slice(-scale);
  return `${isNegative ? "-" : ""}${integerPart}.${fractionalPart}`;
}

function formatQty(value: bigint): string {
  return formatScaledDecimal(value, QTY_SCALE);
}

function formatCost(value: bigint): string {
  return formatScaledDecimal(value, COST_SCALE);
}

function divideRounded(value: bigint, divisor: bigint): bigint {
  if (divisor === 0n) return 0n;
  const isNegative = value < 0n;
  const absoluteValue = isNegative ? -value : value;
  const rounded = (absoluteValue + divisor / 2n) / divisor;
  return isNegative ? -rounded : rounded;
}

function multiplyQtyByUnitCost(
  quantityScaled: bigint,
  unitCostScaled: bigint,
): bigint {
  return divideRounded(quantityScaled * unitCostScaled, QTY_FACTOR);
}

function divideCostByQtyToUnitCost(
  costAmountScaled: bigint,
  quantityScaled: bigint,
): bigint {
  return divideRounded(costAmountScaled * QTY_FACTOR, quantityScaled);
}

function sourceUsageKey(params: {
  consumerDocumentType: string;
  consumerDocumentId: number;
  consumerLineId: number;
  sourceLogIdempotencyKey: string;
}): string {
  return [
    params.consumerDocumentType,
    params.consumerDocumentId,
    params.consumerLineId,
    params.sourceLogIdempotencyKey,
  ].join("::");
}

function toSourceUsageStatus(
  allocatedQty: bigint,
  releasedQty: bigint,
): SourceUsageStatusValue {
  if (releasedQty <= 0n) return "ALLOCATED";
  if (releasedQty >= allocatedQty) return "RELEASED";
  return "PARTIALLY_RELEASED";
}

function isNonNegativeCost(value: bigint | null): value is bigint {
  return value !== null && value >= 0n;
}

function isPositiveCost(value: bigint | null): value is bigint {
  return value !== null && value > 0n;
}

function isHistoricalUnfundedConsumerAllowed(event: InventoryEvent): boolean {
  return (
    event.operationType === "OUTBOUND_OUT" ||
    event.operationType === "PICK_OUT" ||
    event.operationType === "RD_PROJECT_OUT"
  );
}

function appendLogNote(log: PlannedLogInsert, note: string): void {
  log.note = log.note ? `${log.note} ${note}` : note;
}

function isAcceptedNegativeFinalBalanceForStocktake(params: {
  balanceQty: bigint;
  sourceAvailableQty: bigint;
}): boolean {
  return params.balanceQty < 0n && params.sourceAvailableQty === 0n;
}

function addBlocker(
  blockers: InventoryReplayBlocker[],
  reason: string,
  details?: Record<string, unknown>,
): void {
  blockers.push({
    severity: "blocker",
    reason,
    ...(details ? { details } : {}),
  });
}

function addFifoSourceInsufficientBlocker(params: {
  blockers: InventoryReplayBlocker[];
  event: InventoryEvent;
  requestedQty: bigint;
  missingQty: bigint;
  selectedUnitCostScaled: bigint | null;
}): void {
  addBlocker(params.blockers, "fifo-source-insufficient", {
    operationType: params.event.operationType,
    documentType: params.event.businessDocumentType,
    documentId: params.event.businessDocumentId,
    lineId: params.event.businessDocumentLineId,
    materialId: params.event.materialId,
    stockScopeId: params.event.stockScopeId,
    requestedQty: formatQty(params.requestedQty),
    missingQty: formatQty(params.missingQty),
    selectedUnitCost:
      params.selectedUnitCostScaled !== null
        ? formatCost(params.selectedUnitCostScaled)
        : null,
  });
}

function isFullyUnmatchedReversalOut(params: {
  event: InventoryEvent;
  requestedQty: bigint;
  missingQty: bigint;
  allocatedPieces: readonly AllocationPiece[];
}): boolean {
  return (
    params.event.operationType === "REVERSAL_OUT" &&
    params.missingQty === params.requestedQty &&
    params.allocatedPieces.length === 0
  );
}

function isFullyUnmatchedAllocation(params: {
  requestedQty: bigint;
  missingQty: bigint;
  allocatedPieces: readonly AllocationPiece[];
}): boolean {
  return (
    params.missingQty === params.requestedQty &&
    params.allocatedPieces.length === 0
  );
}

function candidateRemainingTotalScaled(
  row: ReturnSourceLinkCandidateRow,
): bigint {
  return row.candidates.reduce((total, candidate) => {
    const remainingQty =
      parseScaledDecimal(candidate.remainingReturnableQty, QTY_SCALE) ?? 0n;
    return total + remainingQty;
  }, 0n);
}

function addSourcePoolEntry(params: {
  sourcePools: Map<string, SourcePoolEntry[]>;
  sourceByKey: Map<string, SourcePoolEntry>;
  nextSourceSequence: { value: number };
  log: PlannedLogInsert;
  unitCostScaled: bigint;
  quantityScaled: bigint;
}): SourcePoolEntry {
  const existingSource = params.sourceByKey.get(params.log.idempotencyKey);
  const key = balanceKey(params.log.materialId, params.log.stockScopeId);
  const pool = params.sourcePools.get(key) ?? [];

  if (existingSource) {
    if (!pool.includes(existingSource)) {
      pool.push(existingSource);
      params.sourcePools.set(key, pool);
    }
    return existingSource;
  }

  const source: SourcePoolEntry = {
    sequence: params.nextSourceSequence.value,
    sourceLogIdempotencyKey: params.log.idempotencyKey,
    materialId: params.log.materialId,
    stockScopeId: params.log.stockScopeId,
    unitCostScaled: params.unitCostScaled,
    availableQty: params.quantityScaled,
  };
  params.nextSourceSequence.value += 1;

  pool.push(source);
  params.sourcePools.set(key, pool);
  params.sourceByKey.set(source.sourceLogIdempotencyKey, source);
  return source;
}

function sourceLinkKey(params: {
  documentType: string;
  documentId: number;
  lineId: number;
  materialId: number;
}): string {
  return [
    params.documentType,
    params.documentId,
    params.lineId,
    params.materialId,
  ].join("::");
}

function normalizeEventSourceLinks(
  event: InventoryEvent,
  fallbackQty: bigint,
): ResolvedReturnSourceLink[] {
  const relationLinks = event.sourceLinks ?? [];
  if (relationLinks.length > 0) {
    return relationLinks.map((link: InventorySourceLink) => ({
      sourceDocumentType: link.sourceDocumentType,
      sourceDocumentId: link.sourceDocumentId,
      sourceDocumentLineId: link.sourceDocumentLineId,
      linkedQty: link.linkedQty,
      quantityScaled: parseScaledDecimal(link.linkedQty, QTY_SCALE) ?? 0n,
    }));
  }

  if (
    event.sourceDocumentType &&
    event.sourceDocumentId !== null &&
    event.sourceDocumentLineId !== null
  ) {
    return [
      {
        sourceDocumentType: event.sourceDocumentType,
        sourceDocumentId: event.sourceDocumentId,
        sourceDocumentLineId: event.sourceDocumentLineId,
        linkedQty: formatQty(fallbackQty),
        quantityScaled: fallbackQty,
      },
    ];
  }

  return [];
}

function hasReturnSourceLinks(event: InventoryEvent): boolean {
  return (
    (event.sourceLinks?.length ?? 0) > 0 ||
    (event.sourceDocumentType !== null &&
      event.sourceDocumentId !== null &&
      event.sourceDocumentLineId !== null)
  );
}

function normalizeKnownUnitCost(value: string | null): string | null {
  const scaled = parseScaledDecimal(value, COST_SCALE);
  return scaled !== null && scaled > 0n ? formatCost(scaled) : null;
}

function stockInLineSourceLogKey(params: {
  documentType: string;
  documentId: number;
  lineId: number;
}): string {
  return `${params.documentType}:${params.documentId}:line:${params.lineId}`;
}

function formatDateParts(
  year: number,
  month: number,
  day: number,
): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function extractRemarkTargetDates(remark: string | null | undefined): string[] {
  if (!remark) return [];

  const dates = new Set<string>();
  const datePattern =
    /(?:^|[^\d])(?:(20\d{2}|\d{2})[./-](\d{1,2})[./-](\d{1,2}))(?!\d)/gu;

  for (const match of remark.matchAll(datePattern)) {
    const [, yearText, monthText, dayText] = match;
    const rawYear = Number(yearText);
    const year = yearText.length === 2 ? 2000 + rawYear : rawYear;
    const formattedDate = formatDateParts(
      year,
      Number(monthText),
      Number(dayText),
    );
    if (formattedDate) dates.add(formattedDate);
  }

  return [...dates].sort();
}

function daysBetweenDates(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

function matchRank(value: boolean | null): number {
  if (value === true) return 0;
  if (value === null) return 1;
  return 2;
}

function getExpectedConsumerOperationType(
  returnOperationType: InventoryOperationType,
): "OUTBOUND_OUT" | "PICK_OUT" | null {
  if (returnOperationType === "SALES_RETURN_IN") return "OUTBOUND_OUT";
  if (returnOperationType === "RETURN_IN") return "PICK_OUT";
  return null;
}

function returnEventKey(event: InventoryEvent): string {
  return sourceLinkKey({
    documentType: event.businessDocumentType,
    documentId: event.businessDocumentId,
    lineId: event.businessDocumentLineId,
    materialId: event.materialId,
  });
}

function canUseFutureStockInSource(
  operationType: InventoryOperationType,
): boolean {
  return (
    operationType === "OUTBOUND_OUT" ||
    operationType === "PICK_OUT" ||
    operationType === "RD_PROJECT_OUT" ||
    operationType === "REVERSAL_OUT"
  );
}

function buildReturnSourceLinkCandidates(
  sortedEvents: readonly InventoryEvent[],
): ReturnSourceLinkCandidateRow[] {
  const linkedReturnQtyBySourceLine = new Map<string, bigint>();

  for (const event of sortedEvents) {
    if (!RETURN_OPERATION_TYPE_SET.has(event.operationType)) continue;

    const returnQty = parseScaledDecimal(event.changeQty, QTY_SCALE) ?? 0n;
    for (const sourceLink of normalizeEventSourceLinks(event, returnQty)) {
      if (sourceLink.quantityScaled <= 0n) continue;

      const key = sourceLinkKey({
        documentType: sourceLink.sourceDocumentType,
        documentId: sourceLink.sourceDocumentId,
        lineId: sourceLink.sourceDocumentLineId,
        materialId: event.materialId,
      });
      linkedReturnQtyBySourceLine.set(
        key,
        (linkedReturnQtyBySourceLine.get(key) ?? 0n) +
          sourceLink.quantityScaled,
      );
    }
  }

  const rows: ReturnSourceLinkCandidateRow[] = [];

  for (const returnEvent of sortedEvents) {
    if (!RETURN_OPERATION_TYPE_SET.has(returnEvent.operationType)) continue;
    if (hasReturnSourceLinks(returnEvent)) {
      continue;
    }

    const expectedConsumerOperationType = getExpectedConsumerOperationType(
      returnEvent.operationType,
    );
    if (!expectedConsumerOperationType) continue;

    const returnQty =
      parseScaledDecimal(returnEvent.changeQty, QTY_SCALE) ?? 0n;
    const returnUnitCost = normalizeKnownUnitCost(returnEvent.unitCost);
    const returnRemarkDates = extractRemarkTargetDates(returnEvent.remark);

    const candidates = sortedEvents
      .filter((candidate) => {
        if (candidate.operationType !== expectedConsumerOperationType) {
          return false;
        }
        return (
          candidate.businessDocumentType === returnEvent.businessDocumentType &&
          candidate.bizDate <= returnEvent.bizDate &&
          candidate.materialId === returnEvent.materialId &&
          candidate.stockScopeId === returnEvent.stockScopeId
        );
      })
      .map((candidate) => {
        const sourceQty =
          parseScaledDecimal(candidate.changeQty, QTY_SCALE) ?? 0n;
        const key = sourceLinkKey({
          documentType: candidate.businessDocumentType,
          documentId: candidate.businessDocumentId,
          lineId: candidate.businessDocumentLineId,
          materialId: candidate.materialId,
        });
        const alreadyLinkedReturnQty =
          linkedReturnQtyBySourceLine.get(key) ?? 0n;
        const remainingReturnableQty = sourceQty - alreadyLinkedReturnQty;
        const sourceUnitCost = normalizeKnownUnitCost(
          candidate.selectedUnitCost ?? candidate.unitCost,
        );
        const sameWorkshop =
          returnEvent.workshopId === null || candidate.workshopId === null
            ? null
            : returnEvent.workshopId === candidate.workshopId;
        const unitCostMatches =
          returnUnitCost === null || sourceUnitCost === null
            ? null
            : returnUnitCost === sourceUnitCost;
        const remarkMatchedDate =
          returnRemarkDates.find((date) => date === candidate.bizDate) ?? null;
        const remarkDateMatches =
          returnRemarkDates.length === 0 ? null : remarkMatchedDate !== null;

        return {
          sourceDocumentType: candidate.businessDocumentType,
          sourceDocumentId: candidate.businessDocumentId,
          sourceDocumentNumber: candidate.businessDocumentNumber,
          sourceLineId: candidate.businessDocumentLineId,
          sourceOperationType: candidate.operationType as
            | "OUTBOUND_OUT"
            | "PICK_OUT",
          sourceBizDate: candidate.bizDate,
          sourceQty: formatQty(sourceQty),
          alreadyLinkedReturnQty: formatQty(alreadyLinkedReturnQty),
          remainingReturnableQty: formatQty(remainingReturnableQty),
          remainingReturnableQtyScaled: remainingReturnableQty,
          sourceUnitCost,
          sourceRemark: candidate.remark ?? null,
          remarkDateMatches,
          remarkMatchedDate,
          daysBeforeReturn: daysBetweenDates(
            candidate.bizDate,
            returnEvent.bizDate,
          ),
          sameWorkshop,
          unitCostMatches,
        };
      })
      .filter((candidate) => candidate.remainingReturnableQtyScaled > 0n)
      .sort((left, right) => {
        const workshopCompare =
          matchRank(left.sameWorkshop) - matchRank(right.sameWorkshop);
        if (workshopCompare !== 0) return workshopCompare;

        const remarkDateCompare =
          matchRank(left.remarkDateMatches) -
          matchRank(right.remarkDateMatches);
        if (remarkDateCompare !== 0) return remarkDateCompare;

        if (left.daysBeforeReturn !== right.daysBeforeReturn) {
          return left.daysBeforeReturn - right.daysBeforeReturn;
        }

        const costCompare =
          matchRank(left.unitCostMatches) - matchRank(right.unitCostMatches);
        if (costCompare !== 0) return costCompare;

        if (
          left.remainingReturnableQtyScaled !==
          right.remainingReturnableQtyScaled
        ) {
          return left.remainingReturnableQtyScaled >
            right.remainingReturnableQtyScaled
            ? -1
            : 1;
        }

        if (left.sourceDocumentId !== right.sourceDocumentId) {
          return right.sourceDocumentId - left.sourceDocumentId;
        }

        return right.sourceLineId - left.sourceLineId;
      });

    const coveringCandidates = candidates.filter(
      (candidate) =>
        candidate.remainingReturnableQtyScaled >= returnQty &&
        candidate.sameWorkshop !== false,
    );
    const uniqueCoveringCandidate =
      coveringCandidates.length === 1 ? coveringCandidates[0] : null;
    const recommendedAction: ReturnSourceLinkCandidateRow["recommendedAction"] =
      candidates.length === 0
        ? "manual-review-no-candidate"
        : coveringCandidates.length === 0
          ? "manual-review-no-full-quantity-candidate"
          : coveringCandidates.length === 1
            ? "review-and-link-unique-covering-candidate"
            : "manual-review-multiple-covering-candidates";

    rows.push({
      returnDocumentType: returnEvent.businessDocumentType,
      returnDocumentId: returnEvent.businessDocumentId,
      returnDocumentNumber: returnEvent.businessDocumentNumber,
      returnLineId: returnEvent.businessDocumentLineId,
      returnOperationType: returnEvent.operationType as
        | "SALES_RETURN_IN"
        | "RETURN_IN",
      returnBizDate: returnEvent.bizDate,
      materialId: returnEvent.materialId,
      stockScopeId: returnEvent.stockScopeId,
      workshopId: returnEvent.workshopId,
      returnQty: formatQty(returnQty),
      returnUnitCost,
      returnRemark: returnEvent.remark ?? null,
      remarkTargetDates: returnRemarkDates,
      candidateCount: candidates.length,
      coveringCandidateCount: coveringCandidates.length,
      recommendedAction,
      suggestedSourceDocumentType:
        uniqueCoveringCandidate?.sourceDocumentType ?? null,
      suggestedSourceDocumentId:
        uniqueCoveringCandidate?.sourceDocumentId ?? null,
      suggestedSourceDocumentNumber:
        uniqueCoveringCandidate?.sourceDocumentNumber ?? null,
      suggestedSourceLineId: uniqueCoveringCandidate?.sourceLineId ?? null,
      candidates: candidates.map((candidate) => ({
        sourceDocumentType: candidate.sourceDocumentType,
        sourceDocumentId: candidate.sourceDocumentId,
        sourceDocumentNumber: candidate.sourceDocumentNumber,
        sourceLineId: candidate.sourceLineId,
        sourceOperationType: candidate.sourceOperationType,
        sourceBizDate: candidate.sourceBizDate,
        sourceQty: candidate.sourceQty,
        alreadyLinkedReturnQty: candidate.alreadyLinkedReturnQty,
        remainingReturnableQty: candidate.remainingReturnableQty,
        sourceUnitCost: candidate.sourceUnitCost,
        sourceRemark: candidate.sourceRemark,
        remarkDateMatches: candidate.remarkDateMatches,
        remarkMatchedDate: candidate.remarkMatchedDate,
        daysBeforeReturn: candidate.daysBeforeReturn,
        sameWorkshop: candidate.sameWorkshop,
        unitCostMatches: candidate.unitCostMatches,
      })),
    });
  }

  return rows;
}

function buildLinkedReturnCoverageBySourceLine(
  sortedEvents: readonly InventoryEvent[],
): Map<string, LinkedReturnCoverage> {
  const coverageBySourceLine = new Map<string, LinkedReturnCoverage>();

  for (const returnEvent of sortedEvents) {
    if (!RETURN_OPERATION_TYPE_SET.has(returnEvent.operationType)) continue;

    const returnQty =
      parseScaledDecimal(returnEvent.changeQty, QTY_SCALE) ?? 0n;
    if (returnQty <= 0n) continue;

    for (const sourceLink of normalizeEventSourceLinks(
      returnEvent,
      returnQty,
    )) {
      if (sourceLink.quantityScaled <= 0n) continue;

      const sourceKey = sourceLinkKey({
        documentType: sourceLink.sourceDocumentType,
        documentId: sourceLink.sourceDocumentId,
        lineId: sourceLink.sourceDocumentLineId,
        materialId: returnEvent.materialId,
      });
      const coverage = coverageBySourceLine.get(sourceKey) ?? {
        quantityScaled: 0n,
        returnEvents: [],
      };
      coverage.quantityScaled += sourceLink.quantityScaled;
      coverage.returnEvents.push(returnEvent);
      coverageBySourceLine.set(sourceKey, coverage);
    }
  }

  return coverageBySourceLine;
}

function findMatchingLinkedReturnCoverage(params: {
  sourceEvent: InventoryEvent;
  coverageBySourceLine: ReadonlyMap<string, LinkedReturnCoverage>;
}): LinkedReturnCoverage | null {
  const sourceKey = sourceLinkKey({
    documentType: params.sourceEvent.businessDocumentType,
    documentId: params.sourceEvent.businessDocumentId,
    lineId: params.sourceEvent.businessDocumentLineId,
    materialId: params.sourceEvent.materialId,
  });
  const coverage = params.coverageBySourceLine.get(sourceKey);
  if (!coverage) return null;

  const matchingReturnEvents = coverage.returnEvents.filter((returnEvent) => {
    const returnQty =
      parseScaledDecimal(returnEvent.changeQty, QTY_SCALE) ?? 0n;
    const sourceLinks = normalizeEventSourceLinks(returnEvent, returnQty);

    return (
      sourceLinks.length === 1 &&
      sourceLinks[0].quantityScaled === returnQty &&
      getExpectedConsumerOperationType(returnEvent.operationType) ===
        params.sourceEvent.operationType &&
      returnEvent.materialId === params.sourceEvent.materialId &&
      returnEvent.stockScopeId === params.sourceEvent.stockScopeId
    );
  });
  if (matchingReturnEvents.length === 0) return null;

  const matchingReturnQty = matchingReturnEvents.reduce(
    (total, returnEvent) =>
      total + (parseScaledDecimal(returnEvent.changeQty, QTY_SCALE) ?? 0n),
    0n,
  );

  return {
    quantityScaled: matchingReturnQty,
    returnEvents: matchingReturnEvents,
  };
}

function findExactLinkedReturnOffset(params: {
  sourceEvent: InventoryEvent;
  sourceQty: bigint;
  coverageBySourceLine: ReadonlyMap<string, LinkedReturnCoverage>;
}): LinkedReturnCoverage | null {
  const matchingCoverage = findMatchingLinkedReturnCoverage({
    sourceEvent: params.sourceEvent,
    coverageBySourceLine: params.coverageBySourceLine,
  });
  if (!matchingCoverage) return null;
  return matchingCoverage.quantityScaled === params.sourceQty
    ? matchingCoverage
    : null;
}

function findRecoverableLinkedReturnDeficitQty(params: {
  sourceEvent: InventoryEvent;
  currentBalance: bigint;
  changeQty: bigint;
  coverageBySourceLine: ReadonlyMap<string, LinkedReturnCoverage>;
}): bigint {
  const matchingCoverage = findMatchingLinkedReturnCoverage({
    sourceEvent: params.sourceEvent,
    coverageBySourceLine: params.coverageBySourceLine,
  });
  if (!matchingCoverage) return 0n;

  const recoverableNegativeQty =
    params.currentBalance < 0n
      ? params.changeQty
      : params.changeQty > params.currentBalance
        ? params.changeQty - params.currentBalance
        : 0n;
  if (recoverableNegativeQty <= 0n) return 0n;

  return matchingCoverage.quantityScaled >= recoverableNegativeQty
    ? recoverableNegativeQty
    : 0n;
}

export function buildInventoryReplayPlan(
  events: InventoryEvent[],
  options: BuildPlanOptions = {},
): InventoryReplayPlan {
  const sortedEvents = sortEvents(events);
  const balances = new Map<string, bigint>();
  const plannedLogs: PlannedLogInsert[] = [];
  const plannedSourceUsageByKey = new Map<string, PlannedSourceUsageInsert>();
  const sourcePools = new Map<string, SourcePoolEntry[]>();
  const sourceByKey = new Map<string, SourcePoolEntry>();
  const nextSourceSequence = { value: 1 };
  const warnings: string[] = [];
  const blockers: InventoryReplayBlocker[] = [];
  const historicalUnfundedDeficits: HistoricalUnfundedDeficit[] = [];
  const eventCounts: Record<string, number> = {};
  const seenIdempotencyKeys = new Set<string>();
  const linkedReturnCoverageBySourceLine =
    buildLinkedReturnCoverageBySourceLine(sortedEvents);
  const skippedLinkedReturnOffsetKeys = new Set<string>();
  const initialReturnSourceLinkCandidates =
    buildReturnSourceLinkCandidates(sortedEvents);
  const returnSourceLinkCandidateByReturnKey = new Map(
    initialReturnSourceLinkCandidates.map(
      (row) =>
        [
          sourceLinkKey({
            documentType: row.returnDocumentType,
            documentId: row.returnDocumentId,
            lineId: row.returnLineId,
            materialId: row.materialId,
          }),
          row,
        ] as const,
    ),
  );
  const acceptedStandaloneReturnKeys = new Set<string>();
  const recoverableLinkedReturnDeficits = new Map<
    string,
    RecoverableLinkedReturnDeficit
  >();

  for (const coverageGap of options.coverageGaps ?? []) {
    addBlocker(blockers, "historical-document-family-not-covered", {
      family: coverageGap.family,
      effectiveRows: coverageGap.effectiveRows,
      reason: coverageGap.reason,
    });
  }

  function appendLog(params: {
    event: InventoryEvent;
    direction: "IN" | "OUT";
    operationType: InventoryOperationType;
    stockScopeId: number;
    workshopId: number | null;
    changeQty: bigint;
    unitCostScaled: bigint | null;
    costAmountScaled: bigint | null;
    idempotencyKey: string;
    note?: string | null;
    allowTemporaryNegativeBalance?: boolean;
    temporaryNegativeBalanceReason?: string;
  }): PlannedLogInsert {
    eventCounts[params.operationType] =
      (eventCounts[params.operationType] ?? 0) + 1;

    if (seenIdempotencyKeys.has(params.idempotencyKey)) {
      addBlocker(blockers, "duplicate-inventory-log-idempotency-key", {
        idempotencyKey: params.idempotencyKey,
        documentType: params.event.businessDocumentType,
        documentId: params.event.businessDocumentId,
        lineId: params.event.businessDocumentLineId,
      });
    }
    seenIdempotencyKeys.add(params.idempotencyKey);

    const key = balanceKey(params.event.materialId, params.stockScopeId);
    const currentBalance = balances.get(key) ?? 0n;
    const signedChange =
      params.direction === "IN" ? params.changeQty : -params.changeQty;
    const newBalance = currentBalance + signedChange;
    balances.set(key, newBalance);

    const worsensNegativeBalance =
      newBalance < 0n && (currentBalance >= 0n || signedChange < 0n);
    if (worsensNegativeBalance && !params.allowTemporaryNegativeBalance) {
      addBlocker(blockers, "negative-balance-during-replay", {
        materialId: params.event.materialId,
        stockScopeId: params.stockScopeId,
        documentType: params.event.businessDocumentType,
        documentId: params.event.businessDocumentId,
        lineId: params.event.businessDocumentLineId,
        beforeQty: formatQty(currentBalance),
        changeQty: formatQty(params.changeQty),
        afterQty: formatQty(newBalance),
      });
    } else if (newBalance < 0n) {
      warnings.push(
        `${params.operationType} ${params.event.businessDocumentType}:${params.event.businessDocumentId}:line:${params.event.businessDocumentLineId} temporarily makes material=${params.event.materialId}, stockScope=${params.stockScopeId} negative${params.temporaryNegativeBalanceReason ?? " before matched future stock-in source(s) are replayed"}.`,
      );
    }

    const plannedLog: PlannedLogInsert = {
      bizDate: params.event.bizDate,
      materialId: params.event.materialId,
      stockScopeId: params.stockScopeId,
      workshopId: params.workshopId,
      projectTargetId: params.event.projectTargetId ?? null,
      direction: params.direction,
      operationType: params.operationType,
      businessModule: params.event.businessModule,
      businessDocumentType: params.event.businessDocumentType,
      businessDocumentId: params.event.businessDocumentId,
      businessDocumentNumber: params.event.businessDocumentNumber,
      businessDocumentLineId: params.event.businessDocumentLineId,
      changeQty: formatQty(params.changeQty),
      beforeQty: formatQty(currentBalance),
      afterQty: formatQty(newBalance),
      unitCost:
        params.unitCostScaled !== null
          ? formatCost(params.unitCostScaled)
          : null,
      costAmount:
        params.costAmountScaled !== null
          ? formatCost(params.costAmountScaled)
          : null,
      operatorId: params.event.operatorId,
      occurredAt: params.event.occurredAt,
      idempotencyKey: params.idempotencyKey,
      note: params.note ?? null,
    };
    plannedLogs.push(plannedLog);
    return plannedLog;
  }

  function allocateSourceEntry(params: {
    event: InventoryEvent;
    source: SourcePoolEntry;
    remainingQty: bigint;
  }): { allocatedQty: bigint; costAmountScaled: bigint } {
    const allocatedQty =
      params.source.availableQty > params.remainingQty
        ? params.remainingQty
        : params.source.availableQty;
    params.source.availableQty -= allocatedQty;

    const costAmountScaled = multiplyQtyByUnitCost(
      allocatedQty,
      params.source.unitCostScaled,
    );

    const usageKey = sourceUsageKey({
      consumerDocumentType: params.event.businessDocumentType,
      consumerDocumentId: params.event.businessDocumentId,
      consumerLineId: params.event.businessDocumentLineId,
      sourceLogIdempotencyKey: params.source.sourceLogIdempotencyKey,
    });
    const existingUsage = plannedSourceUsageByKey.get(usageKey);
    const currentAllocated = existingUsage
      ? (parseScaledDecimal(existingUsage.allocatedQty, QTY_SCALE) ?? 0n)
      : 0n;
    const currentReleased = existingUsage
      ? (parseScaledDecimal(existingUsage.releasedQty, QTY_SCALE) ?? 0n)
      : 0n;
    const nextAllocated = currentAllocated + allocatedQty;

    plannedSourceUsageByKey.set(usageKey, {
      materialId: params.event.materialId,
      sourceLogIdempotencyKey: params.source.sourceLogIdempotencyKey,
      consumerDocumentType: params.event.businessDocumentType,
      consumerDocumentId: params.event.businessDocumentId,
      consumerLineId: params.event.businessDocumentLineId,
      allocatedQty: formatQty(nextAllocated),
      releasedQty: formatQty(currentReleased),
      status: toSourceUsageStatus(nextAllocated, currentReleased),
    });

    return { allocatedQty, costAmountScaled };
  }

  function recordHistoricalUnfundedDeficit(params: {
    event: InventoryEvent;
    plannedLog: PlannedLogInsert;
    totalQty: bigint;
    missingQty: bigint;
    fundedCostAmountScaled: bigint;
  }): void {
    const unitCostScaled = parseScaledDecimal(
      params.event.unitCost,
      COST_SCALE,
    );
    if (!isPositiveCost(unitCostScaled) || params.missingQty <= 0n) return;

    historicalUnfundedDeficits.push({
      event: params.event,
      plannedLog: params.plannedLog,
      totalQty: params.totalQty,
      fundedQty: params.totalQty - params.missingQty,
      remainingQty: params.missingQty,
      unitCostScaled,
      costAmountScaled: params.fundedCostAmountScaled,
    });
  }

  function settleHistoricalUnfundedDeficitsFromAvailableSources(params: {
    event: InventoryEvent;
    unitCostScaled: bigint | null;
    maxQty: bigint;
  }): bigint {
    if (!isPositiveCost(params.unitCostScaled) || params.maxQty <= 0n) {
      return 0n;
    }

    const pool = sourcePools.get(
      balanceKey(params.event.materialId, params.event.stockScopeId),
    );
    if (!pool) return 0n;

    let remainingOffsetQty = params.maxQty;
    let totalOffsetQty = 0n;

    for (const deficit of historicalUnfundedDeficits) {
      if (remainingOffsetQty <= 0n) break;
      if (
        deficit.remainingQty <= 0n ||
        deficit.event.materialId !== params.event.materialId ||
        deficit.event.stockScopeId !== params.event.stockScopeId ||
        deficit.unitCostScaled !== params.unitCostScaled
      ) {
        continue;
      }

      let deficitOffsetQty = 0n;
      for (const source of pool) {
        if (remainingOffsetQty <= 0n || deficit.remainingQty <= 0n) break;
        if (
          source.availableQty <= 0n ||
          source.unitCostScaled !== params.unitCostScaled
        ) {
          continue;
        }

        const requestedQty =
          source.availableQty > deficit.remainingQty
            ? deficit.remainingQty
            : source.availableQty;
        const cappedQty =
          requestedQty > remainingOffsetQty ? remainingOffsetQty : requestedQty;
        const allocation = allocateSourceEntry({
          event: deficit.event,
          source,
          remainingQty: cappedQty,
        });
        if (allocation.allocatedQty <= 0n) continue;

        deficit.remainingQty -= allocation.allocatedQty;
        deficit.fundedQty += allocation.allocatedQty;
        deficit.costAmountScaled += allocation.costAmountScaled;
        remainingOffsetQty -= allocation.allocatedQty;
        totalOffsetQty += allocation.allocatedQty;
        deficitOffsetQty += allocation.allocatedQty;
      }

      if (deficitOffsetQty <= 0n) continue;

      if (deficit.fundedQty >= deficit.totalQty) {
        deficit.plannedLog.unitCost = formatCost(
          divideCostByQtyToUnitCost(deficit.costAmountScaled, deficit.totalQty),
        );
        deficit.plannedLog.costAmount = formatCost(deficit.costAmountScaled);
      }
      appendLogNote(
        deficit.plannedLog,
        `Later return/recovery source offset ${formatQty(deficitOffsetQty)} of this historical source-less movement.`,
      );
      warnings.push(
        `UNFUNDED_HISTORICAL_OUT_OFFSET ${params.event.businessDocumentNumber} (${params.event.businessDocumentType}:${params.event.businessDocumentId}:line:${params.event.businessDocumentLineId}) offset ${formatQty(deficitOffsetQty)} of ${deficit.event.businessDocumentNumber} (${deficit.event.businessDocumentType}:${deficit.event.businessDocumentId}:line:${deficit.event.businessDocumentLineId}) for material=${params.event.materialId}, stockScope=${params.event.stockScopeId}, unitCost=${formatCost(params.unitCostScaled)}.`,
      );
    }

    return totalOffsetQty;
  }

  function settleRecoverableLinkedReturnDeficitsFromBalanceRecovery(params: {
    event: InventoryEvent;
    maxQty: bigint;
  }): bigint {
    if (params.maxQty <= 0n) return 0n;

    let remainingRecoveryQty = params.maxQty;
    let totalRecoveredQty = 0n;

    for (const [sourceKey, deficit] of recoverableLinkedReturnDeficits) {
      if (remainingRecoveryQty <= 0n) break;
      if (
        deficit.remainingQty <= 0n ||
        deficit.sourceEvent.materialId !== params.event.materialId ||
        deficit.sourceEvent.stockScopeId !== params.event.stockScopeId
      ) {
        continue;
      }

      const recoveredQty =
        deficit.remainingQty < remainingRecoveryQty
          ? deficit.remainingQty
          : remainingRecoveryQty;
      if (recoveredQty <= 0n) continue;

      deficit.remainingQty -= recoveredQty;
      remainingRecoveryQty -= recoveredQty;
      totalRecoveredQty += recoveredQty;
      appendLogNote(
        deficit.plannedLog,
        `Later inbound ${params.event.businessDocumentNumber} recovered ${formatQty(recoveredQty)} of this temporary negative balance before any linked return restored source availability.`,
      );
      if (deficit.remainingQty <= 0n) {
        recoverableLinkedReturnDeficits.delete(sourceKey);
      }
    }

    return totalRecoveredQty;
  }

  function getOrCreateFutureSourceEntry(params: {
    sourceEvent: InventoryEvent;
    quantityScaled: bigint;
    unitCostScaled: bigint;
  }): SourcePoolEntry {
    const existingSource = sourceByKey.get(params.sourceEvent.idempotencyKey);
    if (existingSource) return existingSource;

    const source: SourcePoolEntry = {
      sequence: nextSourceSequence.value,
      sourceLogIdempotencyKey: params.sourceEvent.idempotencyKey,
      materialId: params.sourceEvent.materialId,
      stockScopeId: params.sourceEvent.stockScopeId,
      unitCostScaled: params.unitCostScaled,
      availableQty: params.quantityScaled,
    };
    nextSourceSequence.value += 1;
    sourceByKey.set(source.sourceLogIdempotencyKey, source);
    return source;
  }

  function allocateFromFutureStockInSources(
    event: InventoryEvent,
    currentEventIndex: number,
    quantityScaled: bigint,
    selectedUnitCostScaled: bigint | null,
  ): {
    pieces: AllocationPiece[];
    allocatedQty: bigint;
    costAmountScaled: bigint;
    sourceRefs: string[];
  } {
    if (!canUseFutureStockInSource(event.operationType)) {
      return {
        pieces: [],
        allocatedQty: 0n,
        costAmountScaled: 0n,
        sourceRefs: [],
      };
    }

    let remaining = quantityScaled;
    let allocatedQty = 0n;
    let costAmountScaled = 0n;
    const pieces: AllocationPiece[] = [];
    const sourceRefs: string[] = [];

    for (
      let sourceEventIndex = currentEventIndex + 1;
      sourceEventIndex < sortedEvents.length;
      sourceEventIndex += 1
    ) {
      if (remaining <= 0n) break;

      const sourceEvent = sortedEvents[sourceEventIndex];
      if (!FIFO_SOURCE_OPERATION_TYPE_SET.has(sourceEvent.operationType)) {
        continue;
      }
      if (sourceEvent.businessDocumentType !== "StockInOrder") {
        continue;
      }
      if (
        sourceEvent.materialId !== event.materialId ||
        sourceEvent.stockScopeId !== event.stockScopeId
      ) {
        continue;
      }

      const sourceUnitCostScaled = parseScaledDecimal(
        sourceEvent.unitCost,
        COST_SCALE,
      );
      if (!isNonNegativeCost(sourceUnitCostScaled)) {
        continue;
      }
      if (
        selectedUnitCostScaled !== null &&
        sourceUnitCostScaled !== selectedUnitCostScaled
      ) {
        continue;
      }

      const sourceQty = parseScaledDecimal(sourceEvent.changeQty, QTY_SCALE);
      if (sourceQty === null || sourceQty <= 0n) {
        continue;
      }

      const source = getOrCreateFutureSourceEntry({
        sourceEvent,
        quantityScaled: sourceQty,
        unitCostScaled: sourceUnitCostScaled,
      });
      if (source.availableQty <= 0n) continue;

      const piece = allocateSourceEntry({
        event,
        source,
        remainingQty: remaining,
      });
      remaining -= piece.allocatedQty;
      allocatedQty += piece.allocatedQty;
      costAmountScaled += piece.costAmountScaled;
      pieces.push({
        source,
        allocatedQty: piece.allocatedQty,
        costAmountScaled: piece.costAmountScaled,
      });

      warnings.push(
        `${event.operationType} ${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId} consumed future source ${sourceEvent.businessDocumentType}:${sourceEvent.businessDocumentId}:line:${sourceEvent.businessDocumentLineId} for ${formatQty(piece.allocatedQty)} @ ${formatCost(sourceUnitCostScaled)}.`,
      );
      sourceRefs.push(
        `${sourceEvent.businessDocumentType}:${sourceEvent.businessDocumentId}:line:${sourceEvent.businessDocumentLineId}`,
      );
    }

    return { pieces, allocatedQty, costAmountScaled, sourceRefs };
  }

  function allocateFromSources(
    event: InventoryEvent,
    quantityScaled: bigint,
    selectedUnitCostScaled: bigint | null,
    currentEventIndex: number,
    options: { deferInsufficientSourceBlocker?: boolean } = {},
  ): AllocationResult {
    const pool = sourcePools.get(
      balanceKey(event.materialId, event.stockScopeId),
    );
    let remaining = quantityScaled;
    let costAmountScaled = 0n;
    const pieces: AllocationPiece[] = [];

    for (const source of pool ?? []) {
      if (remaining <= 0n) break;
      if (source.availableQty <= 0n) continue;
      if (
        selectedUnitCostScaled !== null &&
        source.unitCostScaled !== selectedUnitCostScaled
      ) {
        continue;
      }

      const piece = allocateSourceEntry({
        event,
        source,
        remainingQty: remaining,
      });
      remaining -= piece.allocatedQty;
      costAmountScaled += piece.costAmountScaled;
      pieces.push({
        source,
        allocatedQty: piece.allocatedQty,
        costAmountScaled: piece.costAmountScaled,
      });
    }

    const futureAllocation = allocateFromFutureStockInSources(
      event,
      currentEventIndex,
      remaining,
      selectedUnitCostScaled,
    );
    remaining -= futureAllocation.allocatedQty;
    costAmountScaled += futureAllocation.costAmountScaled;
    pieces.push(...futureAllocation.pieces);

    const hasInsufficientSourceBlocker =
      remaining > 0n &&
      !isFullyUnmatchedReversalOut({
        event,
        requestedQty: quantityScaled,
        missingQty: remaining,
        allocatedPieces: pieces,
      });

    if (
      hasInsufficientSourceBlocker &&
      !options.deferInsufficientSourceBlocker
    ) {
      addFifoSourceInsufficientBlocker({
        blockers,
        event,
        requestedQty: quantityScaled,
        missingQty: remaining,
        selectedUnitCostScaled,
      });
    }

    return {
      pieces,
      missingQty: remaining,
      costAmountScaled,
      futureAllocatedQty: futureAllocation.allocatedQty,
      futureAllocatedSourceRefs: futureAllocation.sourceRefs,
      hasInsufficientSourceBlocker,
    };
  }

  function releaseLinkedSourceUsage(
    event: InventoryEvent,
    quantityScaled: bigint,
    options: { deferInsufficientReleaseBlocker?: boolean } = {},
  ): {
    releasedQty: bigint;
    costAmountScaled: bigint;
    deficitOffsetQty: bigint;
  } {
    const sourceLinks = normalizeEventSourceLinks(event, quantityScaled);
    if (sourceLinks.length === 0) {
      addBlocker(blockers, "return-source-link-missing", {
        operationType: event.operationType,
        documentType: event.businessDocumentType,
        documentId: event.businessDocumentId,
        lineId: event.businessDocumentLineId,
        materialId: event.materialId,
      });
      return { releasedQty: 0n, costAmountScaled: 0n, deficitOffsetQty: 0n };
    }

    if (sourceLinks.some((link) => link.quantityScaled <= 0n)) {
      addBlocker(blockers, "return-source-link-quantity-invalid", {
        operationType: event.operationType,
        documentType: event.businessDocumentType,
        documentId: event.businessDocumentId,
        lineId: event.businessDocumentLineId,
        materialId: event.materialId,
        linkedQty: sourceLinks.map((link) => link.linkedQty).join(","),
      });
      return { releasedQty: 0n, costAmountScaled: 0n, deficitOffsetQty: 0n };
    }

    const linkedQty = sourceLinks.reduce(
      (total, link) => total + link.quantityScaled,
      0n,
    );
    if (linkedQty !== quantityScaled) {
      addBlocker(blockers, "return-source-link-quantity-mismatch", {
        operationType: event.operationType,
        documentType: event.businessDocumentType,
        documentId: event.businessDocumentId,
        lineId: event.businessDocumentLineId,
        materialId: event.materialId,
        returnQty: formatQty(quantityScaled),
        linkedQty: formatQty(linkedQty),
      });
      return { releasedQty: 0n, costAmountScaled: 0n, deficitOffsetQty: 0n };
    }

    let releasedQty = 0n;
    let costAmountScaled = 0n;
    let deficitOffsetQty = 0n;

    for (const sourceLink of sourceLinks) {
      const recoverableDeficitKey = sourceLinkKey({
        documentType: sourceLink.sourceDocumentType,
        documentId: sourceLink.sourceDocumentId,
        lineId: sourceLink.sourceDocumentLineId,
        materialId: event.materialId,
      });
      const matchingUsages = [...plannedSourceUsageByKey.values()]
        .filter(
          (usage) =>
            usage.consumerDocumentType === sourceLink.sourceDocumentType &&
            usage.consumerDocumentId === sourceLink.sourceDocumentId &&
            usage.consumerLineId === sourceLink.sourceDocumentLineId &&
            usage.materialId === event.materialId,
        )
        .sort((left, right) => {
          const leftSource = sourceByKey.get(left.sourceLogIdempotencyKey);
          const rightSource = sourceByKey.get(right.sourceLogIdempotencyKey);
          return (leftSource?.sequence ?? 0) - (rightSource?.sequence ?? 0);
        });

      let remaining = sourceLink.quantityScaled;
      let releasedFromLink = 0n;

      for (const usage of matchingUsages) {
        if (remaining <= 0n) break;

        const source = sourceByKey.get(usage.sourceLogIdempotencyKey);
        if (!source) continue;

        const allocatedQty =
          parseScaledDecimal(usage.allocatedQty, QTY_SCALE) ?? 0n;
        const releasedBefore =
          parseScaledDecimal(usage.releasedQty, QTY_SCALE) ?? 0n;
        const unreleasedQty = allocatedQty - releasedBefore;
        if (unreleasedQty <= 0n) continue;

        const toRelease = unreleasedQty > remaining ? remaining : unreleasedQty;
        const releasedAfter = releasedBefore + toRelease;
        usage.releasedQty = formatQty(releasedAfter);
        usage.status = toSourceUsageStatus(allocatedQty, releasedAfter);

        let qtyReturnedToPool = toRelease;
        const recoverableDeficit = recoverableLinkedReturnDeficits.get(
          recoverableDeficitKey,
        );
        if (recoverableDeficit && recoverableDeficit.remainingQty > 0n) {
          const offsetQty =
            recoverableDeficit.remainingQty < qtyReturnedToPool
              ? recoverableDeficit.remainingQty
              : qtyReturnedToPool;
          if (offsetQty > 0n) {
            recoverableDeficit.remainingQty -= offsetQty;
            qtyReturnedToPool -= offsetQty;
            deficitOffsetQty += offsetQty;
            appendLogNote(
              recoverableDeficit.plannedLog,
              `Linked return later neutralized ${formatQty(offsetQty)} of this temporary negative balance.`,
            );
            if (recoverableDeficit.remainingQty <= 0n) {
              recoverableLinkedReturnDeficits.delete(recoverableDeficitKey);
            }
          }
        }

        source.availableQty += qtyReturnedToPool;
        remaining -= toRelease;
        releasedQty += toRelease;
        releasedFromLink += toRelease;
        costAmountScaled += multiplyQtyByUnitCost(
          toRelease,
          source.unitCostScaled,
        );
      }

      if (remaining > 0n && !options.deferInsufficientReleaseBlocker) {
        addBlocker(blockers, "return-source-release-insufficient", {
          operationType: event.operationType,
          documentType: event.businessDocumentType,
          documentId: event.businessDocumentId,
          lineId: event.businessDocumentLineId,
          materialId: event.materialId,
          sourceDocumentType: sourceLink.sourceDocumentType,
          sourceDocumentId: sourceLink.sourceDocumentId,
          sourceDocumentLineId: sourceLink.sourceDocumentLineId,
          requestedQty: formatQty(sourceLink.quantityScaled),
          releasedQty: formatQty(releasedFromLink),
          missingQty: formatQty(remaining),
        });
      }
    }

    return { releasedQty, costAmountScaled, deficitOffsetQty };
  }

  function allocateSupplierReturnSources(
    event: InventoryEvent,
    quantityScaled: bigint,
  ): { allocatedQty: bigint; costAmountScaled: bigint; sourceRefs: string[] } {
    const sourceLinks = normalizeEventSourceLinks(event, quantityScaled);
    if (sourceLinks.length === 0) {
      addBlocker(blockers, "supplier-return-source-link-missing", {
        operationType: event.operationType,
        documentType: event.businessDocumentType,
        documentId: event.businessDocumentId,
        lineId: event.businessDocumentLineId,
        materialId: event.materialId,
      });
      return { allocatedQty: 0n, costAmountScaled: 0n, sourceRefs: [] };
    }

    if (sourceLinks.some((link) => link.quantityScaled <= 0n)) {
      addBlocker(blockers, "supplier-return-source-link-quantity-invalid", {
        operationType: event.operationType,
        documentType: event.businessDocumentType,
        documentId: event.businessDocumentId,
        lineId: event.businessDocumentLineId,
        materialId: event.materialId,
        linkedQty: sourceLinks.map((link) => link.linkedQty).join(","),
      });
      return { allocatedQty: 0n, costAmountScaled: 0n, sourceRefs: [] };
    }

    const linkedQty = sourceLinks.reduce(
      (total, link) => total + link.quantityScaled,
      0n,
    );
    if (linkedQty !== quantityScaled) {
      addBlocker(blockers, "supplier-return-source-link-quantity-mismatch", {
        operationType: event.operationType,
        documentType: event.businessDocumentType,
        documentId: event.businessDocumentId,
        lineId: event.businessDocumentLineId,
        materialId: event.materialId,
        returnQty: formatQty(quantityScaled),
        linkedQty: formatQty(linkedQty),
      });
      return { allocatedQty: 0n, costAmountScaled: 0n, sourceRefs: [] };
    }

    const selectedUnitCostScaled = parseScaledDecimal(
      event.selectedUnitCost,
      COST_SCALE,
    );
    let allocatedQty = 0n;
    let costAmountScaled = 0n;
    const sourceRefs: string[] = [];

    for (const sourceLink of sourceLinks) {
      const sourceKey = stockInLineSourceLogKey({
        documentType: sourceLink.sourceDocumentType,
        documentId: sourceLink.sourceDocumentId,
        lineId: sourceLink.sourceDocumentLineId,
      });
      const source = sourceByKey.get(sourceKey);
      if (!source) {
        addBlocker(blockers, "supplier-return-source-log-missing", {
          operationType: event.operationType,
          documentType: event.businessDocumentType,
          documentId: event.businessDocumentId,
          lineId: event.businessDocumentLineId,
          materialId: event.materialId,
          sourceDocumentType: sourceLink.sourceDocumentType,
          sourceDocumentId: sourceLink.sourceDocumentId,
          sourceDocumentLineId: sourceLink.sourceDocumentLineId,
        });
        continue;
      }

      if (
        source.materialId !== event.materialId ||
        source.stockScopeId !== event.stockScopeId
      ) {
        addBlocker(blockers, "supplier-return-source-mismatch", {
          operationType: event.operationType,
          documentType: event.businessDocumentType,
          documentId: event.businessDocumentId,
          lineId: event.businessDocumentLineId,
          materialId: event.materialId,
          stockScopeId: event.stockScopeId,
          sourceDocumentType: sourceLink.sourceDocumentType,
          sourceDocumentId: sourceLink.sourceDocumentId,
          sourceDocumentLineId: sourceLink.sourceDocumentLineId,
          sourceMaterialId: source.materialId,
          sourceStockScopeId: source.stockScopeId,
        });
        continue;
      }

      if (
        selectedUnitCostScaled !== null &&
        source.unitCostScaled !== selectedUnitCostScaled
      ) {
        addBlocker(blockers, "supplier-return-source-cost-mismatch", {
          operationType: event.operationType,
          documentType: event.businessDocumentType,
          documentId: event.businessDocumentId,
          lineId: event.businessDocumentLineId,
          materialId: event.materialId,
          selectedUnitCost: formatCost(selectedUnitCostScaled),
          sourceUnitCost: formatCost(source.unitCostScaled),
          sourceDocumentType: sourceLink.sourceDocumentType,
          sourceDocumentId: sourceLink.sourceDocumentId,
          sourceDocumentLineId: sourceLink.sourceDocumentLineId,
        });
        continue;
      }

      const piece = allocateSourceEntry({
        event,
        source,
        remainingQty: sourceLink.quantityScaled,
      });
      allocatedQty += piece.allocatedQty;
      costAmountScaled += piece.costAmountScaled;
      if (piece.allocatedQty > 0n) {
        sourceRefs.push(source.sourceLogIdempotencyKey);
      }

      if (piece.allocatedQty < sourceLink.quantityScaled) {
        addBlocker(blockers, "supplier-return-source-insufficient", {
          operationType: event.operationType,
          documentType: event.businessDocumentType,
          documentId: event.businessDocumentId,
          lineId: event.businessDocumentLineId,
          materialId: event.materialId,
          sourceDocumentType: sourceLink.sourceDocumentType,
          sourceDocumentId: sourceLink.sourceDocumentId,
          sourceDocumentLineId: sourceLink.sourceDocumentLineId,
          requestedQty: formatQty(sourceLink.quantityScaled),
          allocatedQty: formatQty(piece.allocatedQty),
          missingQty: formatQty(sourceLink.quantityScaled - piece.allocatedQty),
        });
      }
    }

    return { allocatedQty, costAmountScaled, sourceRefs };
  }

  function buildStandaloneReturnSourceDecision(
    event: InventoryEvent,
    changeQty: bigint,
  ): StandaloneReturnSourceDecision | null {
    if (
      event.operationType !== "RETURN_IN" &&
      event.operationType !== "SALES_RETURN_IN"
    ) {
      return null;
    }
    if (hasReturnSourceLinks(event)) {
      return null;
    }

    const candidateRow = returnSourceLinkCandidateByReturnKey.get(
      returnEventKey(event),
    );
    if (event.operationType === "RETURN_IN" && candidateRow) {
      const candidateTotal = candidateRemainingTotalScaled(candidateRow);
      if (candidateTotal >= changeQty) {
        return null;
      }
    }

    const unitCostScaled = parseScaledDecimal(event.unitCost, COST_SCALE);
    if (!isPositiveCost(unitCostScaled)) return null;

    const eventCostAmountScaled = parseScaledDecimal(
      event.costAmount,
      COST_SCALE,
    );
    if (eventCostAmountScaled !== null && eventCostAmountScaled < 0n) {
      return null;
    }

    const computedCostAmountScaled = multiplyQtyByUnitCost(
      changeQty,
      unitCostScaled,
    );
    const costAmountScaled = eventCostAmountScaled ?? computedCostAmountScaled;

    if (event.operationType === "SALES_RETURN_IN") {
      const candidateSummary =
        candidateRow && candidateRow.candidateCount > 0
          ? ` return-source candidates were not linked (candidateCount=${candidateRow.candidateCount}) because the row is accepted as a standalone sales return source.`
          : "";

      return {
        unitCostScaled,
        costAmountScaled,
        note: "Standalone sales return source accepted via existing remark semantics: no source link is written; return line cost basis is used.",
        warning: `STANDALONE_SALES_RETURN_SOURCE ${event.businessDocumentNumber} (${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId}) accepted as a new sales return source for material=${event.materialId}, stockScope=${event.stockScopeId}, qty=${formatQty(changeQty)}, unitCost=${formatCost(unitCostScaled)}; no extra source-link fields are written, and audit context stays in existing remark semantics.${candidateSummary}`,
      };
    }

    const candidateSummary =
      candidateRow && candidateRow.candidateCount > 0
        ? ` Return-source candidates cover only ${formatQty(candidateRemainingTotalScaled(candidateRow))} of ${formatQty(changeQty)}, so this historical return is accepted as standalone recovery.`
        : "";

    return {
      unitCostScaled,
      costAmountScaled,
      note: "Accepted standalone workshop return source: no reliable source link; return line cost is used as the source cost.",
      warning: `STANDALONE_RETURN_SOURCE ${event.businessDocumentNumber} (${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId}) accepted as a new workshop return source for material=${event.materialId}, stockScope=${event.stockScopeId}, qty=${formatQty(changeQty)}, unitCost=${formatCost(unitCostScaled)} because no reliable full-quantity source link candidate exists.${candidateSummary}`,
    };
  }

  function buildUnfundedReturnRecoverySourceDecision(
    event: InventoryEvent,
    returnQty: bigint,
    releasedQty: bigint,
  ): ReturnRecoverySourceDecision | null {
    const missingQty = returnQty - releasedQty;
    if (missingQty <= 0n) return null;

    const unitCostScaled = parseScaledDecimal(event.unitCost, COST_SCALE);
    if (!isPositiveCost(unitCostScaled)) return null;

    const eventCostAmountScaled = parseScaledDecimal(
      event.costAmount,
      COST_SCALE,
    );
    if (eventCostAmountScaled !== null && eventCostAmountScaled < 0n) {
      return null;
    }

    const returnKind =
      event.operationType === "SALES_RETURN_IN"
        ? "sales return"
        : "workshop return";

    return {
      unitCostScaled,
      quantityScaled: missingQty,
      note: `Historical linked ${returnKind} had insufficient releasable source usage; unreleased quantity is accepted as a recovery source.`,
      warning: `UNFUNDED_RETURN_RECOVERY_SOURCE ${event.businessDocumentNumber} (${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId}) accepted ${formatQty(missingQty)} of ${formatQty(returnQty)} as a new ${returnKind} source for material=${event.materialId}, stockScope=${event.stockScopeId}, unitCost=${formatCost(unitCostScaled)} because linked source usage released only ${formatQty(releasedQty)}.`,
    };
  }

  function canRecoverLinkedReturnShortfall(
    event: InventoryEvent,
    returnQty: bigint,
  ): boolean {
    const sourceLinks = normalizeEventSourceLinks(event, returnQty);
    if (sourceLinks.length === 0) return false;
    if (sourceLinks.some((link) => link.quantityScaled <= 0n)) return false;

    const linkedQty = sourceLinks.reduce(
      (total, link) => total + link.quantityScaled,
      0n,
    );
    if (linkedQty !== returnQty) return false;

    return (
      buildUnfundedReturnRecoverySourceDecision(event, returnQty, 0n) !== null
    );
  }

  for (const [eventIndex, event] of sortedEvents.entries()) {
    const changeQty = parseScaledDecimal(event.changeQty, QTY_SCALE);
    if (changeQty === null || changeQty <= 0n) {
      addBlocker(blockers, "invalid-event-quantity", {
        operationType: event.operationType,
        documentType: event.businessDocumentType,
        documentId: event.businessDocumentId,
        lineId: event.businessDocumentLineId,
        changeQty: event.changeQty,
      });
      continue;
    }

    if (skippedLinkedReturnOffsetKeys.has(event.idempotencyKey)) {
      warnings.push(
        `UNFUNDED_RETURN_OFFSET linked return ${event.businessDocumentNumber} (${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId}) is document-only because its unfunded source outbound was exactly offset; no inventory_log will be planned for this row.`,
      );
      continue;
    }

    if (event.operationType === "RD_HANDOFF_OUT") {
      const selectedUnitCostScaled = parseScaledDecimal(
        event.selectedUnitCost,
        COST_SCALE,
      );
      const allocation = allocateFromSources(
        event,
        changeQty,
        isPositiveCost(selectedUnitCostScaled) ? selectedUnitCostScaled : null,
        eventIndex,
      );
      const allocationCostComputed =
        allocation.missingQty === 0n && allocation.pieces.length > 0;
      const settledUnitCostScaled = allocationCostComputed
        ? divideCostByQtyToUnitCost(allocation.costAmountScaled, changeQty)
        : null;

      appendLog({
        event,
        direction: "OUT",
        operationType: event.operationType,
        stockScopeId: event.stockScopeId,
        workshopId: event.workshopId,
        changeQty,
        unitCostScaled: settledUnitCostScaled,
        costAmountScaled: allocationCostComputed
          ? allocation.costAmountScaled
          : null,
        idempotencyKey: event.idempotencyKey,
      });

      if (event.transferInStockScopeId === null) {
        addBlocker(blockers, "rd-handoff-target-stock-scope-missing", {
          documentType: event.businessDocumentType,
          documentId: event.businessDocumentId,
          lineId: event.businessDocumentLineId,
        });
        continue;
      }

      for (const piece of allocation.pieces) {
        const bridgeLog = appendLog({
          event,
          direction: "IN",
          operationType: "RD_HANDOFF_IN",
          stockScopeId: event.transferInStockScopeId,
          workshopId: event.transferInWorkshopId,
          changeQty: piece.allocatedQty,
          unitCostScaled: piece.source.unitCostScaled,
          costAmountScaled: piece.costAmountScaled,
          idempotencyKey: `${event.businessDocumentType}:${event.businessDocumentId}:in:${event.businessDocumentLineId}:src:${piece.source.sequence}`,
          note: `RD handoff bridge from source ${piece.source.sourceLogIdempotencyKey}`,
        });
        addSourcePoolEntry({
          sourcePools,
          sourceByKey,
          nextSourceSequence,
          log: bridgeLog,
          unitCostScaled: piece.source.unitCostScaled,
          quantityScaled: piece.allocatedQty,
        });
      }
      continue;
    }

    if (event.operationType === "SUPPLIER_RETURN_OUT") {
      const allocation = allocateSupplierReturnSources(event, changeQty);
      const allocationCostComputed =
        allocation.allocatedQty === changeQty && allocation.allocatedQty > 0n;
      const settledUnitCostScaled = allocationCostComputed
        ? divideCostByQtyToUnitCost(allocation.costAmountScaled, changeQty)
        : null;

      appendLog({
        event,
        direction: "OUT",
        operationType: event.operationType,
        stockScopeId: event.stockScopeId,
        workshopId: event.workshopId,
        changeQty,
        unitCostScaled: settledUnitCostScaled,
        costAmountScaled: allocationCostComputed
          ? allocation.costAmountScaled
          : null,
        idempotencyKey: event.idempotencyKey,
        note: allocationCostComputed
          ? `Supplier return source-bound allocation from ${allocation.sourceRefs.join(", ")}.`
          : null,
      });
      continue;
    }

    if (CONSUMER_OPERATION_TYPE_SET.has(event.operationType)) {
      const selectedUnitCostScaled = parseScaledDecimal(
        event.selectedUnitCost,
        COST_SCALE,
      );
      const canOffsetWithLinkedReturn =
        event.operationType === "OUTBOUND_OUT" ||
        event.operationType === "PICK_OUT";
      const allowHistoricalUnfundedConsumer =
        isHistoricalUnfundedConsumerAllowed(event) &&
        !isPositiveCost(selectedUnitCostScaled);
      const allocation = allocateFromSources(
        event,
        changeQty,
        isPositiveCost(selectedUnitCostScaled) ? selectedUnitCostScaled : null,
        eventIndex,
        {
          deferInsufficientSourceBlocker:
            canOffsetWithLinkedReturn || allowHistoricalUnfundedConsumer,
        },
      );
      const linkedReturnOffset = isFullyUnmatchedAllocation({
        requestedQty: changeQty,
        missingQty: allocation.missingQty,
        allocatedPieces: allocation.pieces,
      })
        ? findExactLinkedReturnOffset({
            sourceEvent: event,
            sourceQty: changeQty,
            coverageBySourceLine: linkedReturnCoverageBySourceLine,
          })
        : null;
      if (linkedReturnOffset) {
        for (const returnEvent of linkedReturnOffset.returnEvents) {
          skippedLinkedReturnOffsetKeys.add(returnEvent.idempotencyKey);
        }
        const returnRefs = linkedReturnOffset.returnEvents
          .map(
            (returnEvent) =>
              `${returnEvent.businessDocumentNumber} (${returnEvent.businessDocumentType}:${returnEvent.businessDocumentId}:line:${returnEvent.businessDocumentLineId})`,
          )
          .join(", ");
        warnings.push(
          `UNFUNDED_RETURN_OFFSET ${event.businessDocumentNumber} (${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId}) is exactly offset by linked return(s) ${returnRefs} for ${formatQty(linkedReturnOffset.quantityScaled)}; no inventory_log, source usage, or price layer will be planned for these rows.`,
        );
        continue;
      }
      if (
        allocation.hasInsufficientSourceBlocker &&
        canOffsetWithLinkedReturn &&
        !allowHistoricalUnfundedConsumer
      ) {
        addFifoSourceInsufficientBlocker({
          blockers,
          event,
          requestedQty: changeQty,
          missingQty: allocation.missingQty,
          selectedUnitCostScaled: isPositiveCost(selectedUnitCostScaled)
            ? selectedUnitCostScaled
            : null,
        });
      }
      if (
        isFullyUnmatchedReversalOut({
          event,
          requestedQty: changeQty,
          missingQty: allocation.missingQty,
          allocatedPieces: allocation.pieces,
        })
      ) {
        addBlocker(blockers, "stock-in-offset-source-unresolved", {
          operationType: event.operationType,
          documentType: event.businessDocumentType,
          documentId: event.businessDocumentId,
          documentNumber: event.businessDocumentNumber,
          lineId: event.businessDocumentLineId,
          materialId: event.materialId,
          stockScopeId: event.stockScopeId,
          requestedQty: formatQty(changeQty),
          unitCost:
            selectedUnitCostScaled !== null
              ? formatCost(selectedUnitCostScaled)
              : null,
          disposition:
            "deferred-document-only-offset-no-matched-source-stock-fact-skipped",
        });
        warnings.push(
          `REVERSAL_OUT ${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId} is deferred as document-only offset because no matched source exists; no inventory_log will be planned for this row.`,
        );
        continue;
      }
      const allocationCostComputed =
        allocation.missingQty === 0n && allocation.pieces.length > 0;
      const settledUnitCostScaled = allocationCostComputed
        ? divideCostByQtyToUnitCost(allocation.costAmountScaled, changeQty)
        : null;
      const hasHistoricalUnfundedQty =
        allocation.hasInsufficientSourceBlocker &&
        allowHistoricalUnfundedConsumer;
      const currentBalance =
        balances.get(balanceKey(event.materialId, event.stockScopeId)) ?? 0n;
      const recoverableLinkedReturnDeficitQty = canOffsetWithLinkedReturn
        ? findRecoverableLinkedReturnDeficitQty({
            sourceEvent: event,
            currentBalance,
            changeQty,
            coverageBySourceLine: linkedReturnCoverageBySourceLine,
          })
        : 0n;
      const recoverableLinkedReturnSourceDeficitQty =
        allocation.missingQty > 0n && recoverableLinkedReturnDeficitQty > 0n
          ? recoverableLinkedReturnDeficitQty < allocation.missingQty
            ? recoverableLinkedReturnDeficitQty
            : allocation.missingQty
          : 0n;
      const hasRecoverableLinkedReturnDeficit =
        recoverableLinkedReturnDeficitQty > 0n;
      if (hasHistoricalUnfundedQty) {
        warnings.push(
          `UNFUNDED_HISTORICAL_OUT ${event.businessDocumentNumber} (${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId}) accepted ${formatQty(allocation.missingQty)} of ${formatQty(changeQty)} without source usage for material=${event.materialId}, stockScope=${event.stockScopeId}; historical data allows negative or source-less stock movement.`,
        );
      }

      const plannedLog = appendLog({
        event,
        direction: "OUT",
        operationType: event.operationType,
        stockScopeId: event.stockScopeId,
        workshopId: event.workshopId,
        changeQty,
        unitCostScaled: settledUnitCostScaled,
        costAmountScaled: allocationCostComputed
          ? allocation.costAmountScaled
          : null,
        idempotencyKey: event.idempotencyKey,
        allowTemporaryNegativeBalance:
          (allocation.futureAllocatedQty > 0n &&
            allocation.missingQty === 0n) ||
          hasHistoricalUnfundedQty ||
          hasRecoverableLinkedReturnDeficit,
        temporaryNegativeBalanceReason: hasHistoricalUnfundedQty
          ? " due to accepted historical source-less stock movement"
          : hasRecoverableLinkedReturnDeficit
            ? " before linked return restores the temporary deficit"
            : undefined,
        note: hasHistoricalUnfundedQty
          ? `Historical source-less stock movement accepted for ${formatQty(allocation.missingQty)} without inventory_source_usage.`
          : allocation.futureAllocatedSourceRefs.length > 0
            ? `Historical unordered stock movement matched future stock-in source(s): ${allocation.futureAllocatedSourceRefs.join(", ")}.`
            : null,
      });
      if (hasRecoverableLinkedReturnDeficit) {
        if (recoverableLinkedReturnSourceDeficitQty > 0n) {
          recoverableLinkedReturnDeficits.set(
            sourceLinkKey({
              documentType: event.businessDocumentType,
              documentId: event.businessDocumentId,
              lineId: event.businessDocumentLineId,
              materialId: event.materialId,
            }),
            {
              sourceEvent: event,
              plannedLog,
              remainingQty: recoverableLinkedReturnSourceDeficitQty,
            },
          );
        }
        appendLogNote(
          plannedLog,
          `Linked return coverage can offset up to ${formatQty(recoverableLinkedReturnDeficitQty)} of this temporary negative balance.`,
        );
      }
      if (hasHistoricalUnfundedQty) {
        recordHistoricalUnfundedDeficit({
          event,
          plannedLog,
          totalQty: changeQty,
          missingQty: allocation.missingQty,
          fundedCostAmountScaled: allocation.costAmountScaled,
        });
      }
      continue;
    }

    if (RETURN_OPERATION_TYPE_SET.has(event.operationType)) {
      const standaloneReturnSource = buildStandaloneReturnSourceDecision(
        event,
        changeQty,
      );
      if (standaloneReturnSource) {
        const plannedLog = appendLog({
          event,
          direction: "IN",
          operationType: event.operationType,
          stockScopeId: event.stockScopeId,
          workshopId: event.workshopId,
          changeQty,
          unitCostScaled: standaloneReturnSource.unitCostScaled,
          costAmountScaled: standaloneReturnSource.costAmountScaled,
          idempotencyKey: event.idempotencyKey,
          note: standaloneReturnSource.note,
        });
        addSourcePoolEntry({
          sourcePools,
          sourceByKey,
          nextSourceSequence,
          log: plannedLog,
          unitCostScaled: standaloneReturnSource.unitCostScaled,
          quantityScaled: changeQty,
        });
        settleRecoverableLinkedReturnDeficitsFromBalanceRecovery({
          event,
          maxQty: changeQty,
        });
        settleHistoricalUnfundedDeficitsFromAvailableSources({
          event,
          unitCostScaled: standaloneReturnSource.unitCostScaled,
          maxQty: changeQty,
        });
        acceptedStandaloneReturnKeys.add(returnEventKey(event));
        warnings.push(standaloneReturnSource.warning);
        continue;
      }

      const releaseResult = releaseLinkedSourceUsage(event, changeQty, {
        deferInsufficientReleaseBlocker: canRecoverLinkedReturnShortfall(
          event,
          changeQty,
        ),
      });
      const recoverySource = buildUnfundedReturnRecoverySourceDecision(
        event,
        changeQty,
        releaseResult.releasedQty,
      );
      const releaseCostComputed = releaseResult.releasedQty === changeQty;
      const releaseUnitCostScaled = releaseCostComputed
        ? divideCostByQtyToUnitCost(releaseResult.costAmountScaled, changeQty)
        : (recoverySource?.unitCostScaled ??
          parseScaledDecimal(event.unitCost, COST_SCALE));
      const recoveryCostAmountScaled = recoverySource
        ? multiplyQtyByUnitCost(
            recoverySource.quantityScaled,
            recoverySource.unitCostScaled,
          )
        : null;
      const releaseCostAmountScaled = releaseCostComputed
        ? releaseResult.costAmountScaled
        : (parseScaledDecimal(event.costAmount, COST_SCALE) ??
          (recoveryCostAmountScaled !== null
            ? releaseResult.costAmountScaled + recoveryCostAmountScaled
            : null));

      const plannedLog = appendLog({
        event,
        direction: "IN",
        operationType: event.operationType,
        stockScopeId: event.stockScopeId,
        workshopId: event.workshopId,
        changeQty,
        unitCostScaled: isNonNegativeCost(releaseUnitCostScaled)
          ? releaseUnitCostScaled
          : null,
        costAmountScaled:
          releaseCostAmountScaled !== null && releaseCostAmountScaled >= 0n
            ? releaseCostAmountScaled
            : null,
        idempotencyKey: event.idempotencyKey,
        note: recoverySource?.note,
      });
      if (releaseResult.deficitOffsetQty > 0n) {
        appendLogNote(
          plannedLog,
          `Linked return first neutralized ${formatQty(releaseResult.deficitOffsetQty)} of temporary negative on-hand before restoring any price-layer availability.`,
        );
        warnings.push(
          `LINKED_RETURN_NEGATIVE_BALANCE_OFFSET ${event.businessDocumentNumber} (${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId}) neutralized ${formatQty(releaseResult.deficitOffsetQty)} of temporary negative on-hand before restoring price-layer availability for material=${event.materialId}, stockScope=${event.stockScopeId}.`,
        );
      }
      if (recoverySource) {
        addSourcePoolEntry({
          sourcePools,
          sourceByKey,
          nextSourceSequence,
          log: plannedLog,
          unitCostScaled: recoverySource.unitCostScaled,
          quantityScaled: recoverySource.quantityScaled,
        });
        warnings.push(recoverySource.warning);
      }
      settleHistoricalUnfundedDeficitsFromAvailableSources({
        event,
        unitCostScaled: parseScaledDecimal(event.unitCost, COST_SCALE),
        maxQty:
          releaseResult.releasedQty + (recoverySource?.quantityScaled ?? 0n),
      });
      continue;
    }

    const rawUnitCostScaled = parseScaledDecimal(event.unitCost, COST_SCALE);
    const eventCostAmountScaled = parseScaledDecimal(
      event.costAmount,
      COST_SCALE,
    );
    const isFifoSourceEvent = FIFO_SOURCE_OPERATION_TYPE_SET.has(
      event.operationType,
    );
    const acceptsZeroCostSource =
      isFifoSourceEvent &&
      (rawUnitCostScaled === null || rawUnitCostScaled === 0n) &&
      (eventCostAmountScaled === null || eventCostAmountScaled === 0n);
    const unitCostScaled = acceptsZeroCostSource ? 0n : rawUnitCostScaled;
    const computedCostAmountScaled = isNonNegativeCost(unitCostScaled)
      ? multiplyQtyByUnitCost(changeQty, unitCostScaled)
      : null;
    const costAmountScaled = acceptsZeroCostSource
      ? 0n
      : (eventCostAmountScaled ?? computedCostAmountScaled);

    const plannedLog = appendLog({
      event,
      direction: event.direction,
      operationType: event.operationType,
      stockScopeId: event.stockScopeId,
      workshopId: event.workshopId,
      changeQty,
      unitCostScaled,
      costAmountScaled,
      idempotencyKey: event.idempotencyKey,
      note: acceptsZeroCostSource
        ? "Accepted zero-cost source: unknown price or gifted item."
        : null,
    });

    if (isFifoSourceEvent) {
      if (!isNonNegativeCost(unitCostScaled)) {
        addBlocker(blockers, "source-log-cost-missing", {
          operationType: event.operationType,
          documentType: event.businessDocumentType,
          documentId: event.businessDocumentId,
          lineId: event.businessDocumentLineId,
          materialId: event.materialId,
          stockScopeId: event.stockScopeId,
          unitCost: event.unitCost,
        });
        continue;
      }
      if (acceptsZeroCostSource) {
        warnings.push(
          `Accepted zero-cost source ${event.businessDocumentType}:${event.businessDocumentId}:line:${event.businessDocumentLineId} for material=${event.materialId}, stockScope=${event.stockScopeId}; reason=unknown-price-or-gifted-item.`,
        );
      }

      addSourcePoolEntry({
        sourcePools,
        sourceByKey,
        nextSourceSequence,
        log: plannedLog,
        unitCostScaled,
        quantityScaled: changeQty,
      });
      settleRecoverableLinkedReturnDeficitsFromBalanceRecovery({
        event,
        maxQty: changeQty,
      });
    } else if (event.direction === "IN") {
      addBlocker(blockers, "inbound-event-not-source-eligible", {
        operationType: event.operationType,
        documentType: event.businessDocumentType,
        documentId: event.businessDocumentId,
        lineId: event.businessDocumentLineId,
        materialId: event.materialId,
        stockScopeId: event.stockScopeId,
      });
    }
  }

  const plannedBalances: PlannedBalanceRow[] = [];
  const negativeBalanceMaterials: InventoryReplayPlan["negativeBalanceMaterials"] =
    [];

  for (const [key, qty] of balances.entries()) {
    const [materialIdStr, stockScopeIdStr] = key.split("::");
    const materialId = Number(materialIdStr);
    const stockScopeId = Number(stockScopeIdStr);

    plannedBalances.push({
      materialId,
      stockScopeId,
      quantityOnHand: formatQty(qty),
    });

    if (qty < 0n) {
      negativeBalanceMaterials.push({
        materialId,
        stockScopeId,
        finalQty: formatQty(qty),
      });
    }
  }

  plannedBalances.sort(
    (a, b) => a.materialId - b.materialId || a.stockScopeId - b.stockScopeId,
  );
  negativeBalanceMaterials.sort(
    (a, b) => a.materialId - b.materialId || a.stockScopeId - b.stockScopeId,
  );

  if (negativeBalanceMaterials.length > 0) {
    warnings.push(
      `${negativeBalanceMaterials.length} (materialId, stockScopeId) bucket(s) have negative final balance after replay.`,
    );
  }

  const priceLayerMap = new Map<string, PlannedPriceLayerRow>();
  const sourceAvailableByBalance = new Map<string, bigint>();
  for (const source of sourceByKey.values()) {
    if (source.availableQty <= 0n) continue;

    const sourceBalanceKey = balanceKey(source.materialId, source.stockScopeId);
    sourceAvailableByBalance.set(
      sourceBalanceKey,
      (sourceAvailableByBalance.get(sourceBalanceKey) ?? 0n) +
        source.availableQty,
    );

    const layerKey = `${sourceBalanceKey}::${formatCost(source.unitCostScaled)}`;
    const currentLayer = priceLayerMap.get(layerKey);
    if (currentLayer) {
      const currentQty =
        parseScaledDecimal(currentLayer.availableQty, QTY_SCALE) ?? 0n;
      currentLayer.availableQty = formatQty(currentQty + source.availableQty);
      currentLayer.sourceLogCount += 1;
    } else {
      priceLayerMap.set(layerKey, {
        materialId: source.materialId,
        stockScopeId: source.stockScopeId,
        unitCost: formatCost(source.unitCostScaled),
        availableQty: formatQty(source.availableQty),
        sourceLogCount: 1,
      });
    }
  }

  const plannedPriceLayers = [...priceLayerMap.values()].sort(
    (a, b) =>
      a.materialId - b.materialId ||
      a.stockScopeId - b.stockScopeId ||
      a.unitCost.localeCompare(b.unitCost),
  );

  const priceLayerReconciliation: PriceLayerReconciliationRow[] = [];
  const acceptedNegativeStocktakeBalanceKeys = new Set<string>();
  for (const balance of plannedBalances) {
    const key = balanceKey(balance.materialId, balance.stockScopeId);
    const balanceQty =
      parseScaledDecimal(balance.quantityOnHand, QTY_SCALE) ?? 0n;
    const sourceAvailableQty = sourceAvailableByBalance.get(key) ?? 0n;
    const differenceQty = sourceAvailableQty - balanceQty;
    const row: PriceLayerReconciliationRow = {
      materialId: balance.materialId,
      stockScopeId: balance.stockScopeId,
      balanceQty: formatQty(balanceQty),
      sourceAvailableQty: formatQty(sourceAvailableQty),
      differenceQty: formatQty(differenceQty),
    };
    priceLayerReconciliation.push(row);

    if (
      isAcceptedNegativeFinalBalanceForStocktake({
        balanceQty,
        sourceAvailableQty,
      })
    ) {
      acceptedNegativeStocktakeBalanceKeys.add(key);
      warnings.push(
        `NEGATIVE_FINAL_BALANCE_ACCEPTED_FOR_STOCKTAKE material=${row.materialId}, stockScope=${row.stockScopeId}, balanceQty=${row.balanceQty}; no available price layer is planned. Warehouse stocktake must later adjust physical quantity and cost source explicitly.`,
      );
      continue;
    }

    if (differenceQty !== 0n) {
      addBlocker(blockers, "price-layer-balance-mismatch", {
        materialId: row.materialId,
        stockScopeId: row.stockScopeId,
        balanceQty: row.balanceQty,
        sourceAvailableQty: row.sourceAvailableQty,
        differenceQty: row.differenceQty,
      });
    }
  }

  const finalBlockers = blockers.filter((blocker) => {
    if (blocker.reason !== "negative-balance-during-replay") return true;

    const materialId =
      typeof blocker.details?.materialId === "number"
        ? blocker.details.materialId
        : null;
    const stockScopeId =
      typeof blocker.details?.stockScopeId === "number"
        ? blocker.details.stockScopeId
        : null;
    if (materialId === null || stockScopeId === null) return true;

    if (
      !acceptedNegativeStocktakeBalanceKeys.has(
        balanceKey(materialId, stockScopeId),
      )
    ) {
      return true;
    }

    warnings.push(
      `NEGATIVE_BALANCE_EVENT_ACCEPTED_FOR_STOCKTAKE ${String(blocker.details?.documentType ?? "unknown")}:${String(blocker.details?.documentId ?? "unknown")}:line:${String(blocker.details?.lineId ?? "unknown")} material=${materialId}, stockScope=${stockScopeId}; final balance is accepted for warehouse stocktake adjustment.`,
    );
    return false;
  });

  const plannedSourceUsages = [...plannedSourceUsageByKey.values()].sort(
    (a, b) =>
      a.consumerDocumentType.localeCompare(b.consumerDocumentType) ||
      a.consumerDocumentId - b.consumerDocumentId ||
      a.consumerLineId - b.consumerLineId ||
      a.sourceLogIdempotencyKey.localeCompare(b.sourceLogIdempotencyKey),
  );

  const returnSourceLinkCandidates = initialReturnSourceLinkCandidates.filter(
    (row) =>
      !acceptedStandaloneReturnKeys.has(
        sourceLinkKey({
          documentType: row.returnDocumentType,
          documentId: row.returnDocumentId,
          lineId: row.returnLineId,
          materialId: row.materialId,
        }),
      ),
  );

  return {
    migrationBatch: INVENTORY_REPLAY_MIGRATION_BATCH,
    events: sortedEvents,
    plannedBalances,
    plannedLogs,
    plannedSourceUsages,
    plannedPriceLayers,
    priceLayerReconciliation,
    returnSourceLinkCandidates,
    eventCounts: eventCounts as Record<InventoryOperationType, number>,
    uniqueBalanceBuckets: plannedBalances.length,
    warnings,
    blockers: finalBlockers,
    coverageGaps: options.coverageGaps ?? [],
    negativeBalanceMaterials,
  };
}
