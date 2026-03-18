import type { MigrationConnectionLike, QueryResultWithInsertId } from "../db";
import { stableJsonStringify } from "../shared/deterministic";
import type {
  ArchivedIntervalPlanRecord,
  LineBackfillPlanRecord,
  OutboundReservationExecutionResult,
  OutboundReservationMigrationPlan,
  ReservationPlanRecord,
} from "./types";

export const TARGET_TABLES = {
  reservation: "factory_number_reservation",
  line: "customer_stock_order_line",
} as const;

export const MAP_TABLES = {
  reservation: "map_factory_number_reservation",
} as const;

function buildPlaceholders(size: number): string {
  return Array.from({ length: size }, () => "?").join(", ");
}

async function runUpsert(
  connection: MigrationConnectionLike,
  sql: string,
  values: readonly unknown[],
): Promise<number> {
  const result =
    (await connection.query<QueryResultWithInsertId>(sql, values)) ?? {};
  const insertId = Number(result.insertId ?? 0);

  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new Error("Upsert did not yield a valid target id.");
  }

  return insertId;
}

async function clearPriorBatchLineBackfills(
  connection: MigrationConnectionLike,
  migrationBatch: string,
): Promise<void> {
  const rows = await connection.query<Array<{ lineId: number }>>(
    `
      SELECT DISTINCT reservation_row.businessDocumentLineId AS lineId
      FROM ${TARGET_TABLES.reservation} reservation_row
      INNER JOIN migration_staging.${MAP_TABLES.reservation} map_row
        ON map_row.target_id = reservation_row.id
      WHERE map_row.migration_batch = ?
      ORDER BY reservation_row.businessDocumentLineId ASC
    `,
    [migrationBatch],
  );
  const lineIds = rows
    .map((row) => Number(row.lineId))
    .filter((lineId) => Number.isFinite(lineId) && lineId > 0);

  if (lineIds.length === 0) {
    return;
  }

  await connection.query(
    `
      UPDATE ${TARGET_TABLES.line}
      SET startNumber = NULL,
          endNumber = NULL
      WHERE id IN (${buildPlaceholders(lineIds.length)})
    `,
    lineIds,
  );
}

async function cleanupSliceStagingRows(
  connection: MigrationConnectionLike,
  migrationBatch: string,
): Promise<void> {
  await clearPriorBatchLineBackfills(connection, migrationBatch);

  await connection.query(
    `
      DELETE reservation_row
      FROM ${TARGET_TABLES.reservation} reservation_row
      INNER JOIN migration_staging.${MAP_TABLES.reservation} map_row
        ON map_row.target_id = reservation_row.id
      WHERE map_row.migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.${MAP_TABLES.reservation}
      WHERE migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.archived_intervals
      WHERE migration_batch = ?
        AND legacy_table = 'saifute_interval'
    `,
    [migrationBatch],
  );
}

async function upsertReservation(
  connection: MigrationConnectionLike,
  record: ReservationPlanRecord,
): Promise<number> {
  return runUpsert(
    connection,
    `
      INSERT INTO factory_number_reservation (
        materialId,
        workshopId,
        businessDocumentType,
        businessDocumentId,
        businessDocumentLineId,
        startNumber,
        endNumber,
        status,
        reservedAt,
        releasedAt,
        createdBy,
        createdAt,
        updatedBy,
        updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, COALESCE(?, CURRENT_TIMESTAMP)
      )
      ON DUPLICATE KEY UPDATE
        materialId = VALUES(materialId),
        workshopId = VALUES(workshopId),
        businessDocumentType = VALUES(businessDocumentType),
        businessDocumentId = VALUES(businessDocumentId),
        businessDocumentLineId = VALUES(businessDocumentLineId),
        startNumber = VALUES(startNumber),
        endNumber = VALUES(endNumber),
        status = VALUES(status),
        reservedAt = VALUES(reservedAt),
        releasedAt = VALUES(releasedAt),
        createdBy = VALUES(createdBy),
        createdAt = COALESCE(VALUES(createdAt), createdAt),
        updatedBy = VALUES(updatedBy),
        updatedAt = COALESCE(VALUES(updatedAt), updatedAt),
        id = LAST_INSERT_ID(id)
    `,
    [
      record.target.materialId,
      record.target.workshopId,
      record.target.businessDocumentType,
      record.target.businessDocumentId,
      record.target.businessDocumentLineId,
      record.target.startNumber,
      record.target.endNumber,
      record.target.status,
      record.target.reservedAt,
      record.target.releasedAt,
      record.target.createdBy,
      record.target.createdAt,
      record.target.updatedBy,
      record.target.updatedAt,
    ],
  );
}

async function upsertReservationMapRow(
  connection: MigrationConnectionLike,
  migrationBatch: string,
  record: ReservationPlanRecord,
  targetId: number,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.${MAP_TABLES.reservation} (
        legacy_table,
        legacy_id,
        target_table,
        target_id,
        target_code,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        target_table = VALUES(target_table),
        target_id = VALUES(target_id),
        target_code = VALUES(target_code),
        migration_batch = VALUES(migration_batch)
    `,
    [
      record.legacyTable,
      record.legacyId,
      record.targetTable,
      targetId,
      record.targetCode,
      migrationBatch,
    ],
  );
}

async function insertArchivedInterval(
  connection: MigrationConnectionLike,
  migrationBatch: string,
  record: ArchivedIntervalPlanRecord,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.archived_intervals (
        legacy_table,
        legacy_id,
        archive_reason,
        payload_json,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?)
    `,
    [
      record.legacyTable,
      record.legacyId,
      record.archiveReason,
      stableJsonStringify(record.payload),
      migrationBatch,
    ],
  );
}

async function applyLineBackfill(
  connection: MigrationConnectionLike,
  record: LineBackfillPlanRecord,
): Promise<void> {
  await connection.query(
    `
      UPDATE ${TARGET_TABLES.line}
      SET startNumber = ?,
          endNumber = ?
      WHERE id = ?
    `,
    [record.startNumber, record.endNumber, record.targetLineId],
  );
}

export async function executeOutboundReservationPlan(
  connection: MigrationConnectionLike,
  plan: OutboundReservationMigrationPlan,
): Promise<OutboundReservationExecutionResult> {
  let insertedOrUpdatedReservations = 0;
  let archivedIntervalCount = 0;
  let touchedLineCount = 0;
  let singleIntervalLineBackfillCount = 0;

  await connection.beginTransaction();

  try {
    await cleanupSliceStagingRows(connection, plan.migrationBatch);

    for (const record of plan.liveReservations) {
      const reservationId = await upsertReservation(connection, record);
      insertedOrUpdatedReservations += 1;

      await upsertReservationMapRow(
        connection,
        plan.migrationBatch,
        record,
        reservationId,
      );
    }

    for (const record of plan.archivedIntervals) {
      await insertArchivedInterval(connection, plan.migrationBatch, record);
      archivedIntervalCount += 1;
    }

    for (const record of plan.lineBackfills) {
      await applyLineBackfill(connection, record);
      touchedLineCount += 1;

      if (record.liveSegmentCount === 1) {
        singleIntervalLineBackfillCount += 1;
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  return {
    insertedOrUpdatedReservations,
    archivedIntervalCount,
    touchedLineCount,
    singleIntervalLineBackfillCount,
  };
}
