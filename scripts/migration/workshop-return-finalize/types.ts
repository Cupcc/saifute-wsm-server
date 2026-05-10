export const FINALIZE_ORIGINATING_BATCH = "batch3e-workshop-return-formal";
export const ALLOWED_FINALIZE_REASONS = [
  "no-upstream-pick-line-candidate",
  "multiple-upstream-pick-line-candidates",
] as const;
export const ALLOWED_FINALIZE_REASON = ALLOWED_FINALIZE_REASONS[0];
export const FINALIZE_LEGACY_TABLE = "saifute_return_order" as const;

export interface PendingRelationDbRow {
  legacyTable: string;
  legacyId: number;
  legacyLineId: number;
  pendingReason: string;
  payloadJson: string;
}

export interface ArchivedRelationDbRow {
  legacyTable: string;
  legacyId: number;
  legacyLineId: number;
  archiveReason: string;
  payloadJson: string;
}

export interface ExcludedDocumentDbRow {
  legacyTable: string;
  legacyId: number;
  exclusionReason: string;
}

export interface FinalizationArchiveCandidate {
  legacyTable: string;
  legacyId: number;
  legacyLineId: number;
  archiveReason: string;
  payloadJson: string;
}

export interface FinalizationPlan {
  originatingBatch: string;
  archiveCandidates: FinalizationArchiveCandidate[];
  affectedLegacyIds: number[];
  affectedHeaderCount: number;
  reasonCounts: Record<string, number>;
  blockers: Array<{ reason: string; details?: Record<string, unknown> }>;
}

export interface FinalizationResult {
  archivedRelationCount: number;
  deletedPendingRelationCount: number;
}
