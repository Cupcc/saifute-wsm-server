import type { MigrationConnectionLike, QueryResultWithInsertId } from "../db";
import { stableJsonStringify } from "../shared/deterministic";
import type {
  ArchivedFieldPayloadRecord,
  ExcludedDocumentPlanRecord,
  StockInExecutionResult,
  StockInLinePlanRecord,
  StockInMigrationPlan,
  StockInOrderPlanRecord,
} from "./types";

export const TARGET_TABLES = {
  order: "stock_in_order",
  line: "stock_in_order_line",
} as const;

export const MAP_TABLES = {
  order: "map_stock_in_order",
  line: "map_stock_in_order_line",
} as const;

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

async function cleanupSliceStagingRows(
  connection: MigrationConnectionLike,
  migrationBatch: string,
): Promise<void> {
  await connection.query(
    `
      DELETE line_row
      FROM ${TARGET_TABLES.line} line_row
      INNER JOIN migration_staging.${MAP_TABLES.line} map_row
        ON map_row.target_id = line_row.id
      WHERE map_row.migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE order_row
      FROM ${TARGET_TABLES.order} order_row
      INNER JOIN migration_staging.${MAP_TABLES.order} map_row
        ON map_row.target_id = order_row.id
      WHERE map_row.migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.${MAP_TABLES.order}
      WHERE migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.${MAP_TABLES.line}
      WHERE migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.archived_field_payload
      WHERE migration_batch = ?
        AND target_table IN ('stock_in_order', 'stock_in_order_line')
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.excluded_documents
      WHERE migration_batch = ?
        AND legacy_table IN ('saifute_inbound_order', 'saifute_into_order')
    `,
    [migrationBatch],
  );
}

async function upsertStockInOrder(
  connection: MigrationConnectionLike,
  record: StockInOrderPlanRecord,
): Promise<number> {
  return runUpsert(
    connection,
    `
      INSERT INTO stock_in_order (
        documentNo,
        orderType,
        bizDate,
        supplierId,
        handlerPersonnelId,
        workshopId,
        lifecycleStatus,
        auditStatusSnapshot,
        inventoryEffectStatus,
        revisionNo,
        supplierCodeSnapshot,
        supplierNameSnapshot,
        handlerNameSnapshot,
        workshopNameSnapshot,
        totalQty,
        totalAmount,
        remark,
        voidReason,
        voidedBy,
        voidedAt,
        createdBy,
        createdAt,
        updatedBy,
        updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, COALESCE(?, CURRENT_TIMESTAMP)
      )
      ON DUPLICATE KEY UPDATE
        orderType = VALUES(orderType),
        bizDate = VALUES(bizDate),
        supplierId = VALUES(supplierId),
        handlerPersonnelId = VALUES(handlerPersonnelId),
        workshopId = VALUES(workshopId),
        lifecycleStatus = VALUES(lifecycleStatus),
        auditStatusSnapshot = VALUES(auditStatusSnapshot),
        inventoryEffectStatus = VALUES(inventoryEffectStatus),
        revisionNo = VALUES(revisionNo),
        supplierCodeSnapshot = VALUES(supplierCodeSnapshot),
        supplierNameSnapshot = VALUES(supplierNameSnapshot),
        handlerNameSnapshot = VALUES(handlerNameSnapshot),
        workshopNameSnapshot = VALUES(workshopNameSnapshot),
        totalQty = VALUES(totalQty),
        totalAmount = VALUES(totalAmount),
        remark = VALUES(remark),
        voidReason = VALUES(voidReason),
        voidedBy = VALUES(voidedBy),
        voidedAt = VALUES(voidedAt),
        createdBy = VALUES(createdBy),
        createdAt = COALESCE(VALUES(createdAt), createdAt),
        updatedBy = VALUES(updatedBy),
        updatedAt = COALESCE(VALUES(updatedAt), updatedAt),
        id = LAST_INSERT_ID(id)
    `,
    [
      record.target.documentNo,
      record.target.orderType,
      record.target.bizDate,
      record.target.supplierId,
      record.target.handlerPersonnelId,
      record.target.workshopId,
      record.target.lifecycleStatus,
      record.target.auditStatusSnapshot,
      record.target.inventoryEffectStatus,
      record.target.revisionNo,
      record.target.supplierCodeSnapshot,
      record.target.supplierNameSnapshot,
      record.target.handlerNameSnapshot,
      record.target.workshopNameSnapshot,
      record.target.totalQty,
      record.target.totalAmount,
      record.target.remark,
      record.target.voidReason,
      record.target.voidedBy,
      record.target.voidedAt,
      record.target.createdBy,
      record.target.createdAt,
      record.target.updatedBy,
      record.target.updatedAt,
    ],
  );
}

async function upsertStockInOrderLine(
  connection: MigrationConnectionLike,
  orderId: number,
  record: StockInLinePlanRecord,
): Promise<number> {
  return runUpsert(
    connection,
    `
      INSERT INTO stock_in_order_line (
        orderId,
        lineNo,
        materialId,
        materialCodeSnapshot,
        materialNameSnapshot,
        materialSpecSnapshot,
        unitCodeSnapshot,
        quantity,
        unitPrice,
        amount,
        remark,
        createdBy,
        createdAt,
        updatedBy,
        updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, COALESCE(?, CURRENT_TIMESTAMP)
      )
      ON DUPLICATE KEY UPDATE
        materialId = VALUES(materialId),
        materialCodeSnapshot = VALUES(materialCodeSnapshot),
        materialNameSnapshot = VALUES(materialNameSnapshot),
        materialSpecSnapshot = VALUES(materialSpecSnapshot),
        unitCodeSnapshot = VALUES(unitCodeSnapshot),
        quantity = VALUES(quantity),
        unitPrice = VALUES(unitPrice),
        amount = VALUES(amount),
        remark = VALUES(remark),
        createdBy = VALUES(createdBy),
        createdAt = COALESCE(VALUES(createdAt), createdAt),
        updatedBy = VALUES(updatedBy),
        updatedAt = COALESCE(VALUES(updatedAt), updatedAt),
        id = LAST_INSERT_ID(id)
    `,
    [
      orderId,
      record.target.lineNo,
      record.target.materialId,
      record.target.materialCodeSnapshot,
      record.target.materialNameSnapshot,
      record.target.materialSpecSnapshot,
      record.target.unitCodeSnapshot,
      record.target.quantity,
      record.target.unitPrice,
      record.target.amount,
      record.target.remark,
      record.target.createdBy,
      record.target.createdAt,
      record.target.updatedBy,
      record.target.updatedAt,
    ],
  );
}

async function upsertMapRow(
  connection: MigrationConnectionLike,
  mapTable: string,
  migrationBatch: string,
  record: {
    legacyTable: string;
    legacyId: number;
    targetTable: string;
    targetCode: string;
  },
  targetId: number,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.${mapTable} (
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

async function upsertArchivedPayload(
  connection: MigrationConnectionLike,
  migrationBatch: string,
  payload: ArchivedFieldPayloadRecord,
  targetId: number,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.archived_field_payload (
        legacy_table,
        legacy_id,
        target_table,
        target_id,
        target_code,
        payload_kind,
        archive_reason,
        payload_json,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        target_id = VALUES(target_id),
        target_code = VALUES(target_code),
        payload_kind = VALUES(payload_kind),
        archive_reason = VALUES(archive_reason),
        payload_json = VALUES(payload_json),
        migration_batch = VALUES(migration_batch)
    `,
    [
      payload.legacyTable,
      payload.legacyId,
      payload.targetTable,
      targetId,
      payload.targetCode,
      payload.payloadKind,
      payload.archiveReason,
      stableJsonStringify(payload.payload),
      migrationBatch,
    ],
  );
}

async function insertExcludedDocument(
  connection: MigrationConnectionLike,
  migrationBatch: string,
  record: ExcludedDocumentPlanRecord,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.excluded_documents (
        legacy_table,
        legacy_id,
        exclusion_reason,
        payload_json,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?)
    `,
    [
      record.legacyTable,
      record.legacyId,
      record.exclusionReason,
      stableJsonStringify(record.payload),
      migrationBatch,
    ],
  );
}

export async function executeStockInPlan(
  connection: MigrationConnectionLike,
  plan: StockInMigrationPlan,
): Promise<StockInExecutionResult> {
  let insertedOrUpdatedOrders = 0;
  let insertedOrUpdatedLines = 0;
  let archivedPayloadCount = 0;
  let excludedDocumentCount = 0;

  await connection.beginTransaction();

  try {
    await cleanupSliceStagingRows(connection, plan.migrationBatch);

    for (const record of plan.migratedOrders) {
      const orderId = await upsertStockInOrder(connection, record);
      insertedOrUpdatedOrders += 1;

      await upsertMapRow(
        connection,
        MAP_TABLES.order,
        plan.migrationBatch,
        record,
        orderId,
      );
      await upsertArchivedPayload(
        connection,
        plan.migrationBatch,
        record.archivedPayload,
        orderId,
      );
      archivedPayloadCount += 1;

      for (const lineRecord of record.lines) {
        const lineId = await upsertStockInOrderLine(
          connection,
          orderId,
          lineRecord,
        );
        insertedOrUpdatedLines += 1;

        await upsertMapRow(
          connection,
          MAP_TABLES.line,
          plan.migrationBatch,
          lineRecord,
          lineId,
        );

        if (lineRecord.archivedPayload) {
          await upsertArchivedPayload(
            connection,
            plan.migrationBatch,
            lineRecord.archivedPayload,
            lineId,
          );
          archivedPayloadCount += 1;
        }
      }
    }

    for (const record of plan.excludedDocuments) {
      await insertExcludedDocument(connection, plan.migrationBatch, record);
      excludedDocumentCount += 1;
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  return {
    insertedOrUpdatedOrders,
    insertedOrUpdatedLines,
    archivedPayloadCount,
    excludedDocumentCount,
  };
}
