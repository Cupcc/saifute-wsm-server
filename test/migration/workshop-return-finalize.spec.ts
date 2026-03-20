import { stableJsonStringify } from "../../scripts/migration/shared/deterministic";
import type { PendingRelationRecord } from "../../scripts/migration/workshop-return/types";
import {
  buildFinalizationPlan,
  hasFinalizationBlockers,
} from "../../scripts/migration/workshop-return-finalize/planner";
import type { PendingRelationDbRow } from "../../scripts/migration/workshop-return-finalize/types";
import {
  ALLOWED_FINALIZE_REASON,
  FINALIZE_ORIGINATING_BATCH,
} from "../../scripts/migration/workshop-return-finalize/types";

function makePendingRecord(
  legacyId: number,
  legacyLineId: number,
  candidateCount = 0,
): PendingRelationRecord {
  return {
    legacyTable: "saifute_return_order",
    legacyId,
    legacyLineId,
    pendingReason: "no-upstream-pick-line-candidate",
    payload: {
      materialLegacyId: 101,
      targetMaterialId: 201,
      returnQty: "3.000000",
      returnDate: "2024-06-15",
      targetWorkshopId: 5,
      candidateCount,
      candidateSummary: [],
      remarkEvidence: null,
    },
  };
}

function makePendingDbRow(
  legacyId: number,
  legacyLineId: number,
  pendingReason: string = ALLOWED_FINALIZE_REASON,
  overridePayload?: Record<string, unknown>,
): PendingRelationDbRow {
  const record = makePendingRecord(legacyId, legacyLineId);
  const payload = overridePayload ?? record.payload;

  return {
    legacyTable: "saifute_return_order",
    legacyId,
    legacyLineId,
    pendingReason,
    payloadJson: stableJsonStringify(payload),
  };
}

describe("workshop-return-finalize plan builder", () => {
  describe("buildFinalizationPlan - happy path", () => {
    it("should build a plan with archive candidates matching current DB pending rows", () => {
      const pending1 = makePendingRecord(12, 12);
      const pending2 = makePendingRecord(12, 13);
      const dbRow1 = makePendingDbRow(12, 12);
      const dbRow2 = makePendingDbRow(12, 13);

      const plan = buildFinalizationPlan(
        [dbRow1, dbRow2],
        [pending1, pending2],
      );

      expect(plan.originatingBatch).toBe(FINALIZE_ORIGINATING_BATCH);
      expect(plan.archiveCandidates).toHaveLength(2);
      expect(plan.affectedHeaderCount).toBe(1);
      expect(plan.affectedLegacyIds).toEqual([12]);
      expect(plan.reasonCounts[ALLOWED_FINALIZE_REASON]).toBe(2);
      expect(plan.blockers).toHaveLength(0);
    });

    it("should build a plan tracking multiple affected headers", () => {
      const pending1 = makePendingRecord(12, 12);
      const pending2 = makePendingRecord(13, 14);
      const dbRow1 = makePendingDbRow(12, 12);
      const dbRow2 = makePendingDbRow(13, 14);

      const plan = buildFinalizationPlan(
        [dbRow1, dbRow2],
        [pending1, pending2],
      );

      expect(plan.affectedHeaderCount).toBe(2);
      expect(plan.affectedLegacyIds).toEqual([12, 13]);
      expect(plan.blockers).toHaveLength(0);
    });

    it("should set archive_reason = pending_reason for each candidate", () => {
      const pending = makePendingRecord(12, 12);
      const dbRow = makePendingDbRow(12, 12);

      const plan = buildFinalizationPlan([dbRow], [pending]);

      expect(plan.archiveCandidates[0]?.archiveReason).toBe(
        ALLOWED_FINALIZE_REASON,
      );
    });

    it("should preserve payload JSON byte-for-byte from DB pending row", () => {
      const pending = makePendingRecord(12, 12);
      const expectedPayloadJson = stableJsonStringify(pending.payload);
      const dbRow = makePendingDbRow(12, 12);

      const plan = buildFinalizationPlan([dbRow], [pending]);

      expect(plan.archiveCandidates[0]?.payloadJson).toBe(expectedPayloadJson);
    });

    it("should sort archive candidates deterministically by legacyId then legacyLineId", () => {
      const pending1 = makePendingRecord(14, 15);
      const pending2 = makePendingRecord(12, 13);
      const pending3 = makePendingRecord(12, 12);
      const dbRow1 = makePendingDbRow(14, 15);
      const dbRow2 = makePendingDbRow(12, 13);
      const dbRow3 = makePendingDbRow(12, 12);

      const plan = buildFinalizationPlan(
        [dbRow1, dbRow2, dbRow3],
        [pending1, pending2, pending3],
      );

      expect(
        plan.archiveCandidates.map((c) => `${c.legacyId}:${c.legacyLineId}`),
      ).toEqual(["12:12", "12:13", "14:15"]);
    });

    it("should return empty archive candidates and no blockers when both plan and DB have no pending rows", () => {
      const plan = buildFinalizationPlan([], []);

      expect(plan.archiveCandidates).toHaveLength(0);
      expect(plan.blockers).toHaveLength(0);
      expect(plan.affectedHeaderCount).toBe(0);
    });

    it("should allow archived-only rerun by rebuilding archive candidates from the deterministic plan when current pending rows are already drained", () => {
      const pending1 = makePendingRecord(12, 12);
      const pending2 = makePendingRecord(13, 14);

      const plan = buildFinalizationPlan([], [pending1, pending2]);

      expect(plan.archiveCandidates).toHaveLength(2);
      expect(plan.affectedLegacyIds).toEqual([12, 13]);
      expect(plan.reasonCounts[ALLOWED_FINALIZE_REASON]).toBe(2);
      expect(plan.blockers).toHaveLength(0);
    });
  });

  describe("buildFinalizationPlan - disallowed reason families", () => {
    it("should block when any DB pending row has a disallowed reason", () => {
      const pending = makePendingRecord(12, 12);
      const dbRow = makePendingDbRow(
        12,
        12,
        "multiple-upstream-pick-line-candidates",
      );

      const plan = buildFinalizationPlan([dbRow], [pending]);

      expect(hasFinalizationBlockers(plan)).toBe(true);
      expect(plan.blockers[0]?.reason).toMatch(/disallowed/i);
    });

    it("should block when a mix of allowed and disallowed reasons exists", () => {
      const pending1 = makePendingRecord(12, 12);
      const pending2 = makePendingRecord(13, 14);
      const dbRowAllowed = makePendingDbRow(12, 12);
      const dbRowDisallowed = makePendingDbRow(
        13,
        14,
        "upstream-workshop-mismatch",
      );

      const plan = buildFinalizationPlan(
        [dbRowAllowed, dbRowDisallowed],
        [pending1, pending2],
      );

      expect(hasFinalizationBlockers(plan)).toBe(true);
    });

    it("should not include disallowed rows in archive candidates", () => {
      const pending1 = makePendingRecord(12, 12);
      const pending2 = makePendingRecord(13, 14);
      const dbRowAllowed = makePendingDbRow(12, 12);
      const dbRowDisallowed = makePendingDbRow(
        13,
        14,
        "upstream-workshop-mismatch",
      );

      const plan = buildFinalizationPlan(
        [dbRowAllowed, dbRowDisallowed],
        [pending1, pending2],
      );

      expect(plan.archiveCandidates.every((c) => c.legacyId === 12)).toBe(true);
    });
  });

  describe("buildFinalizationPlan - pending drift detection", () => {
    it("should block when current DB pending rows exceed the deterministic plan", () => {
      const pending1 = makePendingRecord(12, 12);
      const dbRow1 = makePendingDbRow(12, 12);
      const dbRowExtra = makePendingDbRow(12, 13);

      const plan = buildFinalizationPlan([dbRow1, dbRowExtra], [pending1]);

      expect(hasFinalizationBlockers(plan)).toBe(true);
    });

    it("should block when deterministic plan has more rows than DB", () => {
      const pending1 = makePendingRecord(12, 12);
      const pending2 = makePendingRecord(12, 13);
      const dbRow1 = makePendingDbRow(12, 12);

      const plan = buildFinalizationPlan([dbRow1], [pending1, pending2]);

      expect(hasFinalizationBlockers(plan)).toBe(true);
    });

    it("should block when DB row payload does not match deterministic plan payload", () => {
      const pending = makePendingRecord(12, 12);
      const dbRowDrifted = makePendingDbRow(12, 12, ALLOWED_FINALIZE_REASON, {
        materialLegacyId: 999,
        targetMaterialId: null,
        returnQty: "99.000000",
        returnDate: "2020-01-01",
        targetWorkshopId: null,
        candidateCount: 5,
        candidateSummary: [],
        remarkEvidence: null,
      });

      const plan = buildFinalizationPlan([dbRowDrifted], [pending]);

      expect(hasFinalizationBlockers(plan)).toBe(true);
      const payloadBlocker = plan.blockers.find((b) =>
        b.reason.toLowerCase().includes("payload"),
      );
      expect(payloadBlocker).toBeDefined();
    });

    it("should not block when all DB rows match the deterministic plan exactly", () => {
      const pending1 = makePendingRecord(12, 12);
      const pending2 = makePendingRecord(13, 14);
      const dbRow1 = makePendingDbRow(12, 12);
      const dbRow2 = makePendingDbRow(13, 14);

      const plan = buildFinalizationPlan(
        [dbRow1, dbRow2],
        [pending1, pending2],
      );

      expect(hasFinalizationBlockers(plan)).toBe(false);
    });
  });

  describe("hasFinalizationBlockers", () => {
    it("should return false when the plan has no blockers", () => {
      const pending = makePendingRecord(12, 12);
      const dbRow = makePendingDbRow(12, 12);
      const plan = buildFinalizationPlan([dbRow], [pending]);

      expect(hasFinalizationBlockers(plan)).toBe(false);
    });

    it("should return true when the plan has blockers", () => {
      const plan = buildFinalizationPlan(
        [makePendingDbRow(12, 12, "disallowed-reason")],
        [makePendingRecord(12, 12)],
      );

      expect(hasFinalizationBlockers(plan)).toBe(true);
    });
  });
});
