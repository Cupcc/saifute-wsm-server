import type { MigrationConnectionLike } from "../db";
import type { FinalizationPlan, FinalizationResult } from "./types";
import { FINALIZE_LEGACY_TABLE } from "./types";

async function deleteExistingBatchArchivedRelations(
  connection: MigrationConnectionLike,
  migrationBatch: string,
): Promise<void> {
  await connection.query(
    `
      DELETE FROM migration_staging.archived_relations
      WHERE migration_batch = ?
        AND legacy_table IN (?)
    `,
    [migrationBatch, FINALIZE_LEGACY_TABLE],
  );
}

async function insertArchivedRelation(
  connection: MigrationConnectionLike,
  migrationBatch: string,
  candidate: {
    legacyTable: string;
    legacyId: number;
    legacyLineId: number;
    archiveReason: string;
    payloadJson: string;
  },
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.archived_relations (
        legacy_table,
        legacy_id,
        legacy_line_id,
        archive_reason,
        payload_json,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      candidate.legacyTable,
      candidate.legacyId,
      candidate.legacyLineId,
      candidate.archiveReason,
      candidate.payloadJson,
      migrationBatch,
    ],
  );
}

async function deleteOriginatingPendingRelations(
  connection: MigrationConnectionLike,
  migrationBatch: string,
): Promise<void> {
  await connection.query(
    `
      DELETE FROM migration_staging.pending_relations
      WHERE migration_batch = ?
        AND legacy_table IN (?)
    `,
    [migrationBatch, FINALIZE_LEGACY_TABLE],
  );
}

export async function executeFinalizationPlan(
  connection: MigrationConnectionLike,
  plan: FinalizationPlan,
): Promise<FinalizationResult> {
  let archivedRelationCount = 0;
  let deletedPendingRelationCount = 0;

  await connection.beginTransaction();

  try {
    await deleteExistingBatchArchivedRelations(
      connection,
      plan.originatingBatch,
    );

    for (const candidate of plan.archiveCandidates) {
      await insertArchivedRelation(
        connection,
        plan.originatingBatch,
        candidate,
      );
      archivedRelationCount += 1;
    }

    await deleteOriginatingPendingRelations(connection, plan.originatingBatch);
    deletedPendingRelationCount = plan.archiveCandidates.length;

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  return {
    archivedRelationCount,
    deletedPendingRelationCount,
  };
}
