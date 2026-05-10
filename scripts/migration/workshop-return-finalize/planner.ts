import { stableJsonStringify } from "../shared/deterministic";
import type { PendingRelationRecord } from "../workshop-return/types";
import {
  buildDisallowedReasonBlockers,
  buildPendingDriftBlockers,
} from "./execute-guard";
import type {
  FinalizationArchiveCandidate,
  FinalizationPlan,
  PendingRelationDbRow,
} from "./types";
import { ALLOWED_FINALIZE_REASONS, FINALIZE_ORIGINATING_BATCH } from "./types";

export function buildExpectedRelationsFromPlan(
  pendingRelations: PendingRelationRecord[],
): Array<{
  legacyTable: string;
  legacyId: number;
  legacyLineId: number;
  pendingReason: string;
  payloadJson: string;
}> {
  return [...pendingRelations]
    .sort(
      (left, right) =>
        left.legacyTable.localeCompare(right.legacyTable) ||
        left.legacyId - right.legacyId ||
        left.legacyLineId - right.legacyLineId,
    )
    .map((record) => ({
      legacyTable: record.legacyTable,
      legacyId: record.legacyId,
      legacyLineId: record.legacyLineId,
      pendingReason: record.pendingReason,
      payloadJson: stableJsonStringify(record.payload),
    }));
}

function buildArchiveCandidatesFromExpectedRelations(
  expectedRelations: Array<{
    legacyTable: string;
    legacyId: number;
    legacyLineId: number;
    pendingReason: string;
    payloadJson: string;
  }>,
): FinalizationArchiveCandidate[] {
  return expectedRelations.map((row) => ({
    legacyTable: row.legacyTable,
    legacyId: row.legacyId,
    legacyLineId: row.legacyLineId,
    archiveReason: row.pendingReason,
    payloadJson: row.payloadJson,
  }));
}

export function buildFinalizationPlan(
  currentPendingRows: PendingRelationDbRow[],
  deterministicPendingRelations: PendingRelationRecord[],
): FinalizationPlan {
  const blockers: Array<{ reason: string; details?: Record<string, unknown> }> =
    [];

  const expectedRelations = buildExpectedRelationsFromPlan(
    deterministicPendingRelations,
  );

  const disallowedBlockers = buildDisallowedReasonBlockers({
    pendingRows: currentPendingRows,
  });

  const allowArchivedOnlyRerun =
    currentPendingRows.length === 0 && expectedRelations.length > 0;
  const driftBlockers = allowArchivedOnlyRerun
    ? []
    : buildPendingDriftBlockers({
        currentPendingRows,
        expectedRelations,
      });

  blockers.push(
    ...disallowedBlockers.map((b) => ({
      reason: String(b.reason),
      details: b,
    })),
    ...driftBlockers.map((b) => ({
      reason: String(b.reason),
      details: b,
    })),
  );

  const eligibleRows = currentPendingRows.filter((row) =>
    ALLOWED_FINALIZE_REASONS.includes(
      row.pendingReason as (typeof ALLOWED_FINALIZE_REASONS)[number],
    ),
  );

  const archiveCandidates: FinalizationArchiveCandidate[] =
    eligibleRows.length > 0
      ? eligibleRows
          .sort(
            (left, right) =>
              left.legacyTable.localeCompare(right.legacyTable) ||
              left.legacyId - right.legacyId ||
              left.legacyLineId - right.legacyLineId,
          )
          .map((row) => ({
            legacyTable: row.legacyTable,
            legacyId: row.legacyId,
            legacyLineId: row.legacyLineId,
            archiveReason: row.pendingReason,
            payloadJson: row.payloadJson,
          }))
      : buildArchiveCandidatesFromExpectedRelations(expectedRelations);

  const affectedLegacyIds = [
    ...new Set(archiveCandidates.map((c) => c.legacyId)),
  ].sort((left, right) => left - right);

  const reasonCounts: Record<string, number> = {};

  for (const row of allowArchivedOnlyRerun
    ? expectedRelations
    : currentPendingRows) {
    reasonCounts[row.pendingReason] =
      (reasonCounts[row.pendingReason] ?? 0) + 1;
  }

  return {
    originatingBatch: FINALIZE_ORIGINATING_BATCH,
    archiveCandidates,
    affectedLegacyIds,
    affectedHeaderCount: affectedLegacyIds.length,
    reasonCounts,
    blockers,
  };
}

export function hasFinalizationBlockers(plan: FinalizationPlan): boolean {
  return plan.blockers.length > 0;
}

export function buildDryRunSummary(
  plan: FinalizationPlan,
  currentPendingCount: number,
): Record<string, unknown> {
  return {
    sliceType: "archive/finalization",
    originatingBatch: plan.originatingBatch,
    currentPendingRelationCount: currentPendingCount,
    archiveCandidateCount: plan.archiveCandidates.length,
    affectedHeaderCount: plan.affectedHeaderCount,
    affectedLegacyIds: plan.affectedLegacyIds,
    reasonCounts: plan.reasonCounts,
    archiveCandidateSummary: plan.archiveCandidates.map((c) => ({
      legacyTable: c.legacyTable,
      legacyId: c.legacyId,
      legacyLineId: c.legacyLineId,
      archiveReason: c.archiveReason,
    })),
    blockers: plan.blockers,
    businessSignOffRequired: true,
    businessSignOffNote:
      "Excluded workshop-return headers remain non-empty after finalization. Manual business sign-off is required before cutover.",
  };
}
