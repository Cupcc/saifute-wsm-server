import type {
  ArchivedRelationDbRow,
  FinalizationArchiveCandidate,
  PendingRelationDbRow,
} from "./types";
import { ALLOWED_FINALIZE_REASON } from "./types";

export interface DisallowedReasonState {
  pendingRows: PendingRelationDbRow[];
}

export interface PendingDriftState {
  currentPendingRows: PendingRelationDbRow[];
  expectedRelations: Array<{
    legacyTable: string;
    legacyId: number;
    legacyLineId: number;
    pendingReason: string;
    payloadJson: string;
  }>;
}

export interface AlreadyArchivedState {
  archivedRows: ArchivedRelationDbRow[];
  expectedCandidates: FinalizationArchiveCandidate[];
}

function buildRelationIdentity(input: {
  legacyTable: string;
  legacyId: number;
  legacyLineId: number;
}): string {
  return `${input.legacyTable}::${input.legacyId}::${input.legacyLineId}`;
}

export function buildDisallowedReasonBlockers(
  state: DisallowedReasonState,
): Array<Record<string, unknown>> {
  const disallowedRows = state.pendingRows.filter(
    (row) => row.pendingReason !== ALLOWED_FINALIZE_REASON,
  );

  if (disallowedRows.length === 0) {
    return [];
  }

  return [
    {
      reason:
        "batch3e pending_relations contains rows with a disallowed reason family other than 'no-upstream-pick-line-candidate'. This finalization slice only handles that specific reason. A new planning step is required before these rows can be finalized.",
      disallowedCount: disallowedRows.length,
      disallowedRows: disallowedRows.map((row) => ({
        legacyTable: row.legacyTable,
        legacyId: row.legacyId,
        legacyLineId: row.legacyLineId,
        pendingReason: row.pendingReason,
      })),
    },
  ];
}

export function buildPendingDriftBlockers(
  state: PendingDriftState,
): Array<Record<string, unknown>> {
  const blockers: Array<Record<string, unknown>> = [];
  const currentByIdentity = new Map(
    state.currentPendingRows.map((row) => [buildRelationIdentity(row), row]),
  );
  const expectedByIdentity = new Map(
    state.expectedRelations.map((rel) => [buildRelationIdentity(rel), rel]),
  );

  if (state.currentPendingRows.length !== state.expectedRelations.length) {
    blockers.push({
      reason:
        "Current batch3e pending_relations count differs from the deterministic plan. The finalization plan cannot be safely built.",
      expectedCount: state.expectedRelations.length,
      actualCount: state.currentPendingRows.length,
    });
  }

  const missingExpected: Array<{
    legacyTable: string;
    legacyId: number;
    legacyLineId: number;
  }> = [];
  const reasonMismatches: Array<{
    legacyTable: string;
    legacyId: number;
    legacyLineId: number;
    expectedReason: string;
    actualReason: string;
  }> = [];
  const payloadMismatches: Array<{
    legacyTable: string;
    legacyId: number;
    legacyLineId: number;
  }> = [];

  for (const expected of state.expectedRelations) {
    const identity = buildRelationIdentity(expected);
    const currentRow = currentByIdentity.get(identity);

    if (!currentRow) {
      missingExpected.push({
        legacyTable: expected.legacyTable,
        legacyId: expected.legacyId,
        legacyLineId: expected.legacyLineId,
      });
      continue;
    }

    if (currentRow.pendingReason !== expected.pendingReason) {
      reasonMismatches.push({
        legacyTable: expected.legacyTable,
        legacyId: expected.legacyId,
        legacyLineId: expected.legacyLineId,
        expectedReason: expected.pendingReason,
        actualReason: currentRow.pendingReason,
      });
    }

    if (currentRow.payloadJson !== expected.payloadJson) {
      payloadMismatches.push({
        legacyTable: expected.legacyTable,
        legacyId: expected.legacyId,
        legacyLineId: expected.legacyLineId,
      });
    }
  }

  const unexpectedRows = state.currentPendingRows.filter(
    (row) => !expectedByIdentity.has(buildRelationIdentity(row)),
  );

  if (missingExpected.length > 0) {
    blockers.push({
      reason:
        "Expected batch3e pending_relations rows are missing from the DB. Payload drift detected.",
      missingExpectedCount: missingExpected.length,
      missingExpected,
    });
  }

  if (unexpectedRows.length > 0) {
    blockers.push({
      reason:
        "batch3e pending_relations contains rows not in the deterministic plan. Unexpected staging rows detected.",
      unexpectedCount: unexpectedRows.length,
      unexpectedRows: unexpectedRows.map((row) => ({
        legacyTable: row.legacyTable,
        legacyId: row.legacyId,
        legacyLineId: row.legacyLineId,
      })),
    });
  }

  if (reasonMismatches.length > 0) {
    blockers.push({
      reason:
        "batch3e pending_relations rows have mismatched pending_reason compared to the deterministic plan.",
      mismatchCount: reasonMismatches.length,
      reasonMismatches,
    });
  }

  if (payloadMismatches.length > 0) {
    blockers.push({
      reason:
        "batch3e pending_relations payload_json does not match the deterministic plan. Payload drift detected.",
      mismatchCount: payloadMismatches.length,
      payloadMismatches,
    });
  }

  return blockers;
}

export function buildAlreadyArchivedMismatchBlockers(
  state: AlreadyArchivedState,
): Array<Record<string, unknown>> {
  if (state.archivedRows.length === 0) {
    return [];
  }

  const expectedByIdentity = new Map(
    state.expectedCandidates.map((candidate) => [
      buildRelationIdentity(candidate),
      candidate,
    ]),
  );
  const archivedByIdentity = new Map(
    state.archivedRows.map((row) => [buildRelationIdentity(row), row]),
  );

  const unexpectedArchived = state.archivedRows.filter(
    (row) => !expectedByIdentity.has(buildRelationIdentity(row)),
  );
  const missingExpectedArchived = state.expectedCandidates.filter(
    (candidate) => !archivedByIdentity.has(buildRelationIdentity(candidate)),
  );

  const reasonMismatches: Array<{
    legacyTable: string;
    legacyId: number;
    legacyLineId: number;
    expectedReason: string;
    actualReason: string;
  }> = [];

  const payloadMismatches: Array<{
    legacyTable: string;
    legacyId: number;
    legacyLineId: number;
  }> = [];

  for (const row of state.archivedRows) {
    const expected = expectedByIdentity.get(buildRelationIdentity(row));

    if (!expected) {
      continue;
    }

    if (row.archiveReason !== expected.archiveReason) {
      reasonMismatches.push({
        legacyTable: row.legacyTable,
        legacyId: row.legacyId,
        legacyLineId: row.legacyLineId,
        expectedReason: expected.archiveReason,
        actualReason: row.archiveReason,
      });
    }

    if (row.payloadJson !== expected.payloadJson) {
      payloadMismatches.push({
        legacyTable: row.legacyTable,
        legacyId: row.legacyId,
        legacyLineId: row.legacyLineId,
      });
    }
  }

  const blockers: Array<Record<string, unknown>> = [];

  if (missingExpectedArchived.length > 0) {
    blockers.push({
      reason:
        "archived_relations is missing expected rows from the deterministic finalization plan. Re-execute is blocked until the archive set is complete.",
      missingExpectedCount: missingExpectedArchived.length,
      missingExpectedRows: missingExpectedArchived.map((row) => ({
        legacyTable: row.legacyTable,
        legacyId: row.legacyId,
        legacyLineId: row.legacyLineId,
        archiveReason: row.archiveReason,
      })),
    });
  }

  if (unexpectedArchived.length > 0) {
    blockers.push({
      reason:
        "archived_relations already contains unexpected rows for this batch that are not in the deterministic finalization plan. Re-execute is blocked until these are resolved.",
      unexpectedCount: unexpectedArchived.length,
      unexpectedRows: unexpectedArchived.map((row) => ({
        legacyTable: row.legacyTable,
        legacyId: row.legacyId,
        legacyLineId: row.legacyLineId,
        archiveReason: row.archiveReason,
      })),
    });
  }

  if (reasonMismatches.length > 0) {
    blockers.push({
      reason:
        "Existing archived_relations rows have mismatched archive_reason compared to the finalization plan.",
      mismatchCount: reasonMismatches.length,
      reasonMismatches,
    });
  }

  if (payloadMismatches.length > 0) {
    blockers.push({
      reason:
        "Existing archived_relations payload_json does not match the finalization plan payload. Payload drift detected.",
      mismatchCount: payloadMismatches.length,
      payloadMismatches,
    });
  }

  return blockers;
}
