import type {
  PlannedSourceUsageInsert,
  ReturnSourceLinkCandidateRow,
} from "./types";

const QTY_SCALE = 6;

type ReturnSourceCandidate = ReturnSourceLinkCandidateRow["candidates"][number];

export interface SelectedReturnSourceBackfillPiece {
  selectedCandidateRank: number;
  sourceDocumentType: string;
  sourceDocumentId: number;
  sourceDocumentNumber: string;
  sourceLineId: number;
  sourceOperationType: string;
  sourceBizDate: string;
  sourceRemark: string | null;
  linkedQty: string;
  sourceRemainingBefore: string;
  sourceRemainingAfter: string;
  sourceReleasableBefore: string | null;
  sourceReleasableAfter: string | null;
  remarkDateMatches: boolean | null;
  remarkMatchedDate: string | null;
  sameWorkshop: boolean | null;
  unitCostMatches: boolean | null;
  daysBeforeReturn: number;
  warnings: string[];
}

export interface SelectedReturnSourceBackfill {
  returnDocumentType: string;
  returnDocumentId: number;
  returnDocumentNumber: string;
  returnLineId: number;
  returnOperationType: string;
  materialId: number;
  stockScopeId: number;
  returnQty: string;
  returnRemark: string | null;
  remarkTargetDates: string[];
  candidateCount: number;
  selectedCandidateRank: number;
  sourceDocumentType: string;
  sourceDocumentId: number;
  sourceDocumentNumber: string;
  sourceLineId: number;
  sourceOperationType: string;
  sourceBizDate: string;
  sourceRemark: string | null;
  sourceRemainingBefore: string;
  sourceRemainingAfter: string;
  sourceReleasableBefore: string | null;
  sourceReleasableAfter: string | null;
  remarkDateMatches: boolean | null;
  remarkMatchedDate: string | null;
  sameWorkshop: boolean | null;
  unitCostMatches: boolean | null;
  daysBeforeReturn: number;
  warnings: string[];
  sourcePieces: SelectedReturnSourceBackfillPiece[];
  affectedRows?: number;
}

export interface SkippedReturnSourceBackfill {
  returnDocumentType: string;
  returnDocumentId: number;
  returnDocumentNumber: string;
  returnLineId: number;
  materialId: number;
  stockScopeId: number;
  returnQty: string;
  candidateCount: number;
  reason:
    | "no-candidate"
    | "no-single-candidate-can-cover-return-quantity"
    | "selected-candidate-cannot-release-full-return-quantity"
    | "invalid-return-quantity";
}

export interface BestReturnSourceBackfillPlan {
  totalMissingLinks: number;
  rowsWithCandidates: number;
  selectedRows: SelectedReturnSourceBackfill[];
  skippedRows: SkippedReturnSourceBackfill[];
}

export interface BestReturnSourceBackfillOptions {
  plannedSourceUsages?: readonly PlannedSourceUsageInsert[];
}

function parseQty(value: string): bigint | null {
  const match = String(value)
    .trim()
    .match(/^([+-])?(\d+)(?:\.(\d+))?$/u);
  if (!match) return null;

  const [, signSymbol, integerPartRaw, fractionalPartRaw = ""] = match;
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/u, "") || "0";
  const sign = signSymbol === "-" ? -1n : 1n;

  if (fractionalPartRaw.length <= QTY_SCALE) {
    const paddedFraction = fractionalPartRaw.padEnd(QTY_SCALE, "0");
    return BigInt(`${integerPart}${paddedFraction}`) * sign;
  }

  const keptFraction = fractionalPartRaw.slice(0, QTY_SCALE);
  const droppedFraction = fractionalPartRaw.slice(QTY_SCALE);
  let scaled = BigInt(`${integerPart}${keptFraction}`) * sign;
  if (droppedFraction[0] >= "5") {
    scaled += sign;
  }
  return scaled;
}

function formatQty(value: bigint): string {
  const isNegative = value < 0n;
  const absoluteValue = isNegative ? -value : value;
  const rawDigits = absoluteValue.toString().padStart(QTY_SCALE + 1, "0");
  const integerPart = rawDigits.slice(0, -QTY_SCALE) || "0";
  const fractionalPart = rawDigits.slice(-QTY_SCALE);
  return `${isNegative ? "-" : ""}${integerPart}.${fractionalPart}`;
}

function sourceCandidateKey(
  row: ReturnSourceLinkCandidateRow,
  candidate: ReturnSourceCandidate,
): string {
  return [
    candidate.sourceDocumentType,
    candidate.sourceDocumentId,
    candidate.sourceLineId,
    row.materialId,
    row.stockScopeId,
  ].join("::");
}

function sourceLineKey(params: {
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

function sourceLineKeyForCandidate(
  row: ReturnSourceLinkCandidateRow,
  candidate: ReturnSourceCandidate,
): string {
  return sourceLineKey({
    documentType: candidate.sourceDocumentType,
    documentId: candidate.sourceDocumentId,
    lineId: candidate.sourceLineId,
    materialId: row.materialId,
  });
}

function buildReleasableQtyBySourceLine(
  sourceUsages: readonly PlannedSourceUsageInsert[],
): Map<string, bigint> {
  const releasableQtyBySourceLine = new Map<string, bigint>();

  for (const usage of sourceUsages) {
    const allocatedQty = parseQty(usage.allocatedQty) ?? 0n;
    const releasedQty = parseQty(usage.releasedQty) ?? 0n;
    const releasableQty = allocatedQty - releasedQty;
    if (releasableQty <= 0n) continue;

    const key = sourceLineKey({
      documentType: usage.consumerDocumentType,
      documentId: usage.consumerDocumentId,
      lineId: usage.consumerLineId,
      materialId: usage.materialId,
    });
    releasableQtyBySourceLine.set(
      key,
      (releasableQtyBySourceLine.get(key) ?? 0n) + releasableQty,
    );
  }

  return releasableQtyBySourceLine;
}

function buildSelectionWarnings(candidate: ReturnSourceCandidate): string[] {
  return [
    candidate.sameWorkshop === false ? "workshop-mismatch" : null,
    candidate.unitCostMatches === false
      ? "document-price-diff-not-cost-blocker"
      : null,
    candidate.unitCostMatches === null ? "document-cost-signal-unknown" : null,
  ].filter((warning): warning is string => warning !== null);
}

function minQty(left: bigint, right: bigint): bigint {
  return left < right ? left : right;
}

function compareReturnRows(
  left: ReturnSourceLinkCandidateRow,
  right: ReturnSourceLinkCandidateRow,
): number {
  return (
    left.returnBizDate.localeCompare(right.returnBizDate) ||
    left.returnDocumentType.localeCompare(right.returnDocumentType) ||
    left.returnDocumentId - right.returnDocumentId ||
    left.returnLineId - right.returnLineId ||
    left.materialId - right.materialId
  );
}

export function buildBestReturnSourceLinkBackfillPlan(
  rows: readonly ReturnSourceLinkCandidateRow[],
  options: BestReturnSourceBackfillOptions = {},
): BestReturnSourceBackfillPlan {
  const remainingBySourceKey = new Map<string, bigint>();
  const releasableBySourceLine = options.plannedSourceUsages
    ? buildReleasableQtyBySourceLine(options.plannedSourceUsages)
    : null;

  for (const row of rows) {
    for (const candidate of row.candidates) {
      const remainingQty = parseQty(candidate.remainingReturnableQty);
      if (remainingQty === null) continue;

      const key = sourceCandidateKey(row, candidate);
      const currentRemaining = remainingBySourceKey.get(key);
      if (currentRemaining === undefined || remainingQty > currentRemaining) {
        remainingBySourceKey.set(key, remainingQty);
      }
    }
  }

  const selectedRows: SelectedReturnSourceBackfill[] = [];
  const skippedRows: SkippedReturnSourceBackfill[] = [];
  const orderedRows = [...rows].sort(compareReturnRows);

  for (const row of orderedRows) {
    const returnQty = parseQty(row.returnQty);
    if (returnQty === null || returnQty <= 0n) {
      skippedRows.push({
        returnDocumentType: row.returnDocumentType,
        returnDocumentId: row.returnDocumentId,
        returnDocumentNumber: row.returnDocumentNumber,
        returnLineId: row.returnLineId,
        materialId: row.materialId,
        stockScopeId: row.stockScopeId,
        returnQty: row.returnQty,
        candidateCount: row.candidateCount,
        reason: "invalid-return-quantity",
      });
      continue;
    }

    if (row.candidates.length === 0) {
      skippedRows.push({
        returnDocumentType: row.returnDocumentType,
        returnDocumentId: row.returnDocumentId,
        returnDocumentNumber: row.returnDocumentNumber,
        returnLineId: row.returnLineId,
        materialId: row.materialId,
        stockScopeId: row.stockScopeId,
        returnQty: row.returnQty,
        candidateCount: row.candidateCount,
        reason: "no-candidate",
      });
      continue;
    }

    const candidateOptions = row.candidates.map((candidate, index) => ({
      candidate,
      index,
      key: sourceCandidateKey(row, candidate),
      sourceLineKey: sourceLineKeyForCandidate(row, candidate),
    }));
    const selectedCandidate = candidateOptions.find(
      ({ key, sourceLineKey: candidateSourceLineKey }) => {
        const sourceRemainingQty = remainingBySourceKey.get(key) ?? 0n;
        const sourceReleasableQty = releasableBySourceLine?.get(
          candidateSourceLineKey,
        );

        return (
          sourceRemainingQty >= returnQty &&
          (releasableBySourceLine === null ||
            (sourceReleasableQty ?? 0n) >= returnQty)
        );
      },
    );

    const sourcePieces: SelectedReturnSourceBackfillPiece[] = [];

    if (selectedCandidate) {
      const remainingBefore =
        remainingBySourceKey.get(selectedCandidate.key) ?? 0n;
      const remainingAfter = remainingBefore - returnQty;
      remainingBySourceKey.set(selectedCandidate.key, remainingAfter);
      const releasableBefore =
        releasableBySourceLine?.get(selectedCandidate.sourceLineKey) ?? null;
      const releasableAfter =
        releasableBefore === null ? null : releasableBefore - returnQty;
      if (releasableAfter !== null) {
        releasableBySourceLine?.set(
          selectedCandidate.sourceLineKey,
          releasableAfter,
        );
      }

      sourcePieces.push({
        selectedCandidateRank: selectedCandidate.index + 1,
        sourceDocumentType: selectedCandidate.candidate.sourceDocumentType,
        sourceDocumentId: selectedCandidate.candidate.sourceDocumentId,
        sourceDocumentNumber: selectedCandidate.candidate.sourceDocumentNumber,
        sourceLineId: selectedCandidate.candidate.sourceLineId,
        sourceOperationType: selectedCandidate.candidate.sourceOperationType,
        sourceBizDate: selectedCandidate.candidate.sourceBizDate,
        sourceRemark: selectedCandidate.candidate.sourceRemark ?? null,
        linkedQty: formatQty(returnQty),
        sourceRemainingBefore: formatQty(remainingBefore),
        sourceRemainingAfter: formatQty(remainingAfter),
        sourceReleasableBefore:
          releasableBefore !== null ? formatQty(releasableBefore) : null,
        sourceReleasableAfter:
          releasableAfter !== null ? formatQty(releasableAfter) : null,
        remarkDateMatches:
          selectedCandidate.candidate.remarkDateMatches ?? null,
        remarkMatchedDate:
          selectedCandidate.candidate.remarkMatchedDate ?? null,
        sameWorkshop: selectedCandidate.candidate.sameWorkshop,
        unitCostMatches: selectedCandidate.candidate.unitCostMatches,
        daysBeforeReturn: selectedCandidate.candidate.daysBeforeReturn,
        warnings: buildSelectionWarnings(selectedCandidate.candidate),
      });
    } else {
      let remainingToCover = returnQty;
      const plannedPieces: Array<{
        option: (typeof candidateOptions)[number];
        linkedQty: bigint;
        remainingBefore: bigint;
        remainingAfter: bigint;
        releasableBefore: bigint | null;
        releasableAfter: bigint | null;
      }> = [];

      for (const option of candidateOptions) {
        if (option.candidate.sameWorkshop === false) continue;

        const sourceRemainingQty = remainingBySourceKey.get(option.key) ?? 0n;
        const sourceReleasableQty =
          releasableBySourceLine === null
            ? null
            : (releasableBySourceLine.get(option.sourceLineKey) ?? 0n);
        const availableQty =
          sourceReleasableQty === null
            ? sourceRemainingQty
            : minQty(sourceRemainingQty, sourceReleasableQty);
        if (availableQty <= 0n) continue;

        const linkedQty = minQty(availableQty, remainingToCover);
        plannedPieces.push({
          option,
          linkedQty,
          remainingBefore: sourceRemainingQty,
          remainingAfter: sourceRemainingQty - linkedQty,
          releasableBefore: sourceReleasableQty,
          releasableAfter:
            sourceReleasableQty === null
              ? null
              : sourceReleasableQty - linkedQty,
        });

        remainingToCover -= linkedQty;
        if (remainingToCover <= 0n) break;
      }

      if (remainingToCover === 0n && plannedPieces.length > 1) {
        for (const piece of plannedPieces) {
          remainingBySourceKey.set(piece.option.key, piece.remainingAfter);
          if (piece.releasableAfter !== null) {
            releasableBySourceLine?.set(
              piece.option.sourceLineKey,
              piece.releasableAfter,
            );
          }

          sourcePieces.push({
            selectedCandidateRank: piece.option.index + 1,
            sourceDocumentType: piece.option.candidate.sourceDocumentType,
            sourceDocumentId: piece.option.candidate.sourceDocumentId,
            sourceDocumentNumber: piece.option.candidate.sourceDocumentNumber,
            sourceLineId: piece.option.candidate.sourceLineId,
            sourceOperationType: piece.option.candidate.sourceOperationType,
            sourceBizDate: piece.option.candidate.sourceBizDate,
            sourceRemark: piece.option.candidate.sourceRemark ?? null,
            linkedQty: formatQty(piece.linkedQty),
            sourceRemainingBefore: formatQty(piece.remainingBefore),
            sourceRemainingAfter: formatQty(piece.remainingAfter),
            sourceReleasableBefore:
              piece.releasableBefore !== null
                ? formatQty(piece.releasableBefore)
                : null,
            sourceReleasableAfter:
              piece.releasableAfter !== null
                ? formatQty(piece.releasableAfter)
                : null,
            remarkDateMatches: piece.option.candidate.remarkDateMatches ?? null,
            remarkMatchedDate: piece.option.candidate.remarkMatchedDate ?? null,
            sameWorkshop: piece.option.candidate.sameWorkshop,
            unitCostMatches: piece.option.candidate.unitCostMatches,
            daysBeforeReturn: piece.option.candidate.daysBeforeReturn,
            warnings: buildSelectionWarnings(piece.option.candidate),
          });
        }
      }
    }

    if (sourcePieces.length === 0) {
      skippedRows.push({
        returnDocumentType: row.returnDocumentType,
        returnDocumentId: row.returnDocumentId,
        returnDocumentNumber: row.returnDocumentNumber,
        returnLineId: row.returnLineId,
        materialId: row.materialId,
        stockScopeId: row.stockScopeId,
        returnQty: row.returnQty,
        candidateCount: row.candidateCount,
        reason: "no-single-candidate-can-cover-return-quantity",
      });
      continue;
    }

    const primaryPiece = sourcePieces[0];

    selectedRows.push({
      returnDocumentType: row.returnDocumentType,
      returnDocumentId: row.returnDocumentId,
      returnDocumentNumber: row.returnDocumentNumber,
      returnLineId: row.returnLineId,
      returnOperationType: row.returnOperationType,
      materialId: row.materialId,
      stockScopeId: row.stockScopeId,
      returnQty: row.returnQty,
      returnRemark: row.returnRemark,
      remarkTargetDates: row.remarkTargetDates,
      candidateCount: row.candidateCount,
      selectedCandidateRank: primaryPiece.selectedCandidateRank,
      sourceDocumentType: primaryPiece.sourceDocumentType,
      sourceDocumentId: primaryPiece.sourceDocumentId,
      sourceDocumentNumber: primaryPiece.sourceDocumentNumber,
      sourceLineId: primaryPiece.sourceLineId,
      sourceOperationType: primaryPiece.sourceOperationType,
      sourceBizDate: primaryPiece.sourceBizDate,
      sourceRemark: primaryPiece.sourceRemark,
      sourceRemainingBefore: primaryPiece.sourceRemainingBefore,
      sourceRemainingAfter: primaryPiece.sourceRemainingAfter,
      sourceReleasableBefore: primaryPiece.sourceReleasableBefore,
      sourceReleasableAfter: primaryPiece.sourceReleasableAfter,
      remarkDateMatches: primaryPiece.remarkDateMatches,
      remarkMatchedDate: primaryPiece.remarkMatchedDate,
      sameWorkshop: primaryPiece.sameWorkshop,
      unitCostMatches: primaryPiece.unitCostMatches,
      daysBeforeReturn: primaryPiece.daysBeforeReturn,
      warnings: [...new Set(sourcePieces.flatMap((piece) => piece.warnings))],
      sourcePieces,
    });
  }

  return {
    totalMissingLinks: rows.length,
    rowsWithCandidates: rows.filter((row) => row.candidates.length > 0).length,
    selectedRows,
    skippedRows,
  };
}
