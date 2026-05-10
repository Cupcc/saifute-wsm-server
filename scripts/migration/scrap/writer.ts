import type { MigrationConnectionLike, QueryResultWithInsertId } from "../db";
import { stableJsonStringify } from "../shared/deterministic";
import type {
  ArchivedFieldPayloadRecord,
  ExcludedScrapPlanRecord,
  ScrapExecutionResult,
  ScrapLinePlanRecord,
  ScrapMigrationPlan,
  ScrapOrderPlanRecord,
} from "./types";

export const TARGET_TABLES = {
  order: "workshop_material_order",
  line: "workshop_material_order_line",
} as const;

export const MAP_TABLES = {
  order: "map_workshop_material_order",
  line: "map_workshop_material_order_line",
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
    `DELETE FROM migration_staging.${MAP_TABLES.order} WHERE migration_batch = ?`,
    [migrationBatch],
  );
  await connection.query(
    `DELETE FROM migration_staging.${MAP_TABLES.line} WHERE migration_batch = ?`,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.archived_field_payload
      WHERE migration_batch = ?
        AND target_table IN ('workshop_material_order', 'workshop_material_order_line')
        AND legacy_table IN ('saifute_scrap_order', 'saifute_scrap_detail')
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.excluded_documents
      WHERE migration_batch = ?
        AND legacy_table IN ('saifute_scrap_order')
    `,
    [migrationBatch],
  );
}

async function upsertWorkshopMaterialOrder(
  connection: MigrationConnectionLike,
  record: ScrapOrderPlanRecord,
): Promise<number> {
  return runUpsert(
    connection,
    `
      INSERT INTO workshop_material_order (
        document_no, order_type, biz_date, handler_personnel_id, workshop_id, stock_scope_id,
        lifecycle_status, audit_status_snapshot, inventory_effect_status, revision_no,
        handler_name_snapshot, workshop_name_snapshot, total_qty, total_amount,
        remark, void_reason, voided_by, voided_at,
        created_by, created_at, updated_by, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        CASE
          WHEN ? = '研发小仓' THEN (SELECT id FROM stock_scope WHERE scope_code = 'RD_SUB' LIMIT 1)
          ELSE (SELECT id FROM stock_scope WHERE scope_code = 'MAIN' LIMIT 1)
        END,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, COALESCE(?, CURRENT_TIMESTAMP), ?, COALESCE(?, CURRENT_TIMESTAMP)
      )
      ON DUPLICATE KEY UPDATE
        order_type = VALUES(order_type), biz_date = VALUES(biz_date),
        handler_personnel_id = VALUES(handler_personnel_id), workshop_id = VALUES(workshop_id),
        stock_scope_id = VALUES(stock_scope_id),
        lifecycle_status = VALUES(lifecycle_status), audit_status_snapshot = VALUES(audit_status_snapshot),
        inventory_effect_status = VALUES(inventory_effect_status), revision_no = VALUES(revision_no),
        handler_name_snapshot = VALUES(handler_name_snapshot), workshop_name_snapshot = VALUES(workshop_name_snapshot),
        total_qty = VALUES(total_qty), total_amount = VALUES(total_amount),
        remark = VALUES(remark), void_reason = VALUES(void_reason),
        voided_by = VALUES(voided_by), voided_at = VALUES(voided_at),
        created_by = VALUES(created_by), created_at = COALESCE(VALUES(created_at), created_at),
        updated_by = VALUES(updated_by), updated_at = COALESCE(VALUES(updated_at), updated_at),
        id = LAST_INSERT_ID(id)
    `,
    [
      record.target.documentNo,
      record.target.orderType,
      record.target.bizDate,
      record.target.handlerPersonnelId,
      record.target.workshopId,
      record.target.workshopNameSnapshot,
      record.target.lifecycleStatus,
      record.target.auditStatusSnapshot,
      record.target.inventoryEffectStatus,
      record.target.revisionNo,
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

async function upsertWorkshopMaterialOrderLine(
  connection: MigrationConnectionLike,
  orderId: number,
  record: ScrapLinePlanRecord,
): Promise<number> {
  return runUpsert(
    connection,
    `
      INSERT INTO workshop_material_order_line (
        order_id, line_no, material_id, material_code_snapshot, material_name_snapshot,
        material_spec_snapshot, unit_code_snapshot, quantity, unit_price, amount,
        source_document_type, source_document_id, source_document_line_id,
        remark, created_by, created_at, updated_by, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, COALESCE(?, CURRENT_TIMESTAMP)
      )
      ON DUPLICATE KEY UPDATE
        material_id = VALUES(material_id), material_code_snapshot = VALUES(material_code_snapshot),
        material_name_snapshot = VALUES(material_name_snapshot), material_spec_snapshot = VALUES(material_spec_snapshot),
        unit_code_snapshot = VALUES(unit_code_snapshot), quantity = VALUES(quantity),
        unit_price = VALUES(unit_price), amount = VALUES(amount),
        source_document_type = VALUES(source_document_type), source_document_id = VALUES(source_document_id),
        source_document_line_id = VALUES(source_document_line_id),
        remark = VALUES(remark), created_by = VALUES(created_by),
        created_at = COALESCE(VALUES(created_at), created_at),
        updated_by = VALUES(updated_by), updated_at = COALESCE(VALUES(updated_at), updated_at),
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
      record.target.sourceDocumentType,
      record.target.sourceDocumentId,
      record.target.sourceDocumentLineId,
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
        legacy_table, legacy_id, target_table, target_id, target_code, migration_batch
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        target_table = VALUES(target_table), target_id = VALUES(target_id),
        target_code = VALUES(target_code), migration_batch = VALUES(migration_batch)
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
        legacy_table, legacy_id, target_table, target_id, target_code,
        payload_kind, archive_reason, payload_json, migration_batch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        target_id = VALUES(target_id), target_code = VALUES(target_code),
        payload_kind = VALUES(payload_kind), archive_reason = VALUES(archive_reason),
        payload_json = VALUES(payload_json), migration_batch = VALUES(migration_batch)
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
  record: ExcludedScrapPlanRecord,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.excluded_documents (
        legacy_table, legacy_id, exclusion_reason, payload_json, migration_batch
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

export async function executeScrapPlan(
  connection: MigrationConnectionLike,
  plan: ScrapMigrationPlan,
): Promise<ScrapExecutionResult> {
  let insertedOrUpdatedOrders = 0;
  let insertedOrUpdatedLines = 0;
  let archivedPayloadCount = 0;
  let excludedDocumentCount = 0;

  await connection.beginTransaction();

  try {
    await cleanupSliceStagingRows(connection, plan.migrationBatch);

    for (const record of plan.migratedOrders) {
      const orderId = await upsertWorkshopMaterialOrder(connection, record);
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
        const lineId = await upsertWorkshopMaterialOrderLine(
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
        await upsertArchivedPayload(
          connection,
          plan.migrationBatch,
          lineRecord.archivedPayload,
          lineId,
        );
        archivedPayloadCount += 1;
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
