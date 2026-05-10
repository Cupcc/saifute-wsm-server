import type { MigrationConnectionLike, QueryResultWithInsertId } from "../db";
import { BusinessDocumentType } from "../shared/business-document-type";
import type {
  AuditDocumentInsert,
  DocumentLineRelationInsert,
  DocumentRelationInsert,
  InventoryLogInsert,
  InventorySourceUsageInsert,
  PostAdmissionExecutionResult,
  PostAdmissionMigrationPlan,
  SourceBackfillRecord,
  StaleClearRecord,
} from "./types";

const SALES_STOCK_DOCUMENT_TYPE = BusinessDocumentType.SalesStockOrder;
const WORKSHOP_MATERIAL_DOCUMENT_TYPE =
  BusinessDocumentType.WorkshopMaterialOrder;

async function applySourceBackfill(
  connection: MigrationConnectionLike,
  record: SourceBackfillRecord,
  documentType: string,
): Promise<void> {
  const targetTable =
    documentType === SALES_STOCK_DOCUMENT_TYPE
      ? "sales_stock_order_line"
      : "workshop_material_order_line";

  await connection.query(
    `
      UPDATE ${targetTable}
      SET
        source_document_type = ?,
        source_document_id = ?,
        source_document_line_id = ?
      WHERE id = ?
        AND source_document_id IS NULL
    `,
    [
      record.sourceDocumentType,
      record.sourceDocumentId,
      record.sourceDocumentLineId,
      record.lineId,
    ],
  );
}

async function upsertDocumentRelation(
  connection: MigrationConnectionLike,
  record: DocumentRelationInsert,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO document_relation (
        relation_type,
        upstream_family,
        upstream_document_type,
        upstream_document_id,
        downstream_family,
        downstream_document_type,
        downstream_document_id,
        is_active,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      record.relationType,
      record.upstreamFamily,
      record.upstreamDocumentType,
      record.upstreamDocumentId,
      record.downstreamFamily,
      record.downstreamDocumentType,
      record.downstreamDocumentId,
      record.isActive ? 1 : 0,
    ],
  );
}

async function upsertDocumentLineRelation(
  connection: MigrationConnectionLike,
  record: DocumentLineRelationInsert,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO document_line_relation (
        relation_type,
        upstream_family,
        upstream_document_type,
        upstream_document_id,
        upstream_line_id,
        downstream_family,
        downstream_document_type,
        downstream_document_id,
        downstream_line_id,
        linked_qty,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        linked_qty = VALUES(linked_qty),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      record.relationType,
      record.upstreamFamily,
      record.upstreamDocumentType,
      record.upstreamDocumentId,
      record.upstreamLineId,
      record.downstreamFamily,
      record.downstreamDocumentType,
      record.downstreamDocumentId,
      record.downstreamLineId,
      record.linkedQty,
    ],
  );
}

async function clearInventoryTables(
  connection: MigrationConnectionLike,
): Promise<void> {
  await connection.query(`DELETE FROM inventory_source_usage`);
  await connection.query(`DELETE FROM inventory_log`);
  await connection.query(`DELETE FROM inventory_balance`);
}

async function clearAuditDocuments(
  connection: MigrationConnectionLike,
): Promise<void> {
  await connection.query(`DELETE FROM approval_document`);
}

async function clearDocumentRelations(
  connection: MigrationConnectionLike,
): Promise<void> {
  await connection.query(`DELETE FROM document_line_relation`);
  await connection.query(`DELETE FROM document_relation`);
}

async function clearStaleReturnLineSourceFields(
  connection: MigrationConnectionLike,
  records: StaleClearRecord[],
): Promise<number> {
  let cleared = 0;

  for (const record of records) {
    await connection.query(
      `UPDATE ${record.documentTable}
       SET source_document_type = NULL, source_document_id = NULL, source_document_line_id = NULL
       WHERE id = ?`,
      [record.lineId],
    );
    cleared += 1;
  }

  return cleared;
}

async function upsertInventoryBalance(
  connection: MigrationConnectionLike,
  materialId: number,
  stockScopeId: number,
): Promise<number> {
  const result =
    (await connection.query<QueryResultWithInsertId>(
      `
        INSERT INTO inventory_balance (
          material_id,
          stock_scope_id,
          quantity_on_hand,
          row_version,
          updated_at
        ) VALUES (?, ?, 0, 0, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id)
      `,
      [materialId, stockScopeId],
    )) ?? {};

  return Number(result.insertId ?? 0);
}

async function updateInventoryBalance(
  connection: MigrationConnectionLike,
  balanceId: number,
  quantityOnHand: string,
): Promise<void> {
  await connection.query(
    `UPDATE inventory_balance SET quantity_on_hand = ?, row_version = row_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [quantityOnHand, balanceId],
  );
}

async function insertInventoryLog(
  connection: MigrationConnectionLike,
  balanceId: number,
  beforeQty: string,
  afterQty: string,
  log: InventoryLogInsert,
  reversalOfLogId: number | null,
): Promise<number> {
  const result =
    (await connection.query<QueryResultWithInsertId>(
      `
        INSERT INTO inventory_log (
          balance_id,
          material_id,
          stock_scope_id,
          workshop_id,
          biz_date,
          direction,
          operation_type,
          business_module,
          business_document_type,
          business_document_id,
          business_document_number,
          business_document_line_id,
          change_qty,
          before_qty,
          after_qty,
          operator_id,
          occurred_at,
          reversal_of_log_id,
          idempotency_key,
          note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id)
      `,
      [
        balanceId,
        log.materialId,
        log.stockScopeId,
        log.workshopId,
        log.bizDate,
        log.direction,
        log.operationType,
        log.businessModule,
        log.businessDocumentType,
        log.businessDocumentId,
        log.businessDocumentNumber,
        log.businessDocumentLineId,
        log.changeQty,
        beforeQty,
        afterQty,
        log.bizDate,
        reversalOfLogId,
        log.idempotencyKey,
        log.note,
      ],
    )) ?? {};

  return Number(result.insertId ?? 0);
}

async function upsertInventorySourceUsage(
  connection: MigrationConnectionLike,
  usage: InventorySourceUsageInsert,
  sourceLogId: number,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO inventory_source_usage (
        material_id,
        source_log_id,
        consumer_document_type,
        consumer_document_id,
        consumer_line_id,
        allocated_qty,
        released_qty,
        status,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        allocated_qty = VALUES(allocated_qty),
        released_qty = VALUES(released_qty),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      usage.materialId,
      sourceLogId,
      usage.consumerDocumentType,
      usage.consumerDocumentId,
      usage.consumerLineId,
      usage.allocatedQty,
      usage.allocatedQty,
      usage.status,
    ],
  );
}

async function upsertAuditDocument(
  connection: MigrationConnectionLike,
  doc: AuditDocumentInsert,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO approval_document (
        document_family,
        document_type,
        document_id,
        document_number,
        audit_status,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        document_family = VALUES(document_family),
        document_number = VALUES(document_number),
        audit_status = VALUES(audit_status),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      doc.documentFamily,
      doc.documentType,
      doc.documentId,
      doc.documentNumber,
      doc.auditStatus,
    ],
  );
}

async function getInventoryLogIdByIdempotencyKey(
  connection: MigrationConnectionLike,
  idempotencyKey: string,
): Promise<number | null> {
  const rows = await connection.query<Array<{ id: number }>>(
    `SELECT id FROM inventory_log WHERE idempotency_key = ?`,
    [idempotencyKey],
  );

  return rows[0]?.id ?? null;
}

async function getInventoryBalanceId(
  connection: MigrationConnectionLike,
  materialId: number,
  stockScopeId: number,
): Promise<number | null> {
  const rows = await connection.query<
    Array<{ id: number; quantityOnHand: string }>
  >(
    `SELECT id, quantity_on_hand AS quantityOnHand FROM inventory_balance WHERE material_id = ? AND stock_scope_id = ?`,
    [materialId, stockScopeId],
  );

  return rows[0]?.id ?? null;
}

async function getInventoryBalanceQty(
  connection: MigrationConnectionLike,
  balanceId: number,
): Promise<string> {
  const rows = await connection.query<Array<{ quantityOnHand: string }>>(
    `SELECT quantity_on_hand AS quantityOnHand FROM inventory_balance WHERE id = ?`,
    [balanceId],
  );

  return rows[0]?.quantityOnHand ?? "0.000000";
}

function parseDecimalBigInt(s: string): bigint {
  const trimmed = s.trim();
  const isNegative = trimmed.startsWith("-");
  const abs = isNegative ? trimmed.slice(1) : trimmed;
  const dotIndex = abs.indexOf(".");
  const intPart = dotIndex === -1 ? abs : abs.slice(0, dotIndex);
  const fracRaw = dotIndex === -1 ? "" : abs.slice(dotIndex + 1);
  const fracPadded = fracRaw.padEnd(6, "0").slice(0, 6);
  const raw = BigInt(`${intPart}${fracPadded}`);

  return isNegative ? -raw : raw;
}

function formatDecimalBigInt(n: bigint): string {
  const isNeg = n < 0n;
  const abs = isNeg ? -n : n;
  const intPart = abs / 1_000_000n;
  const fracPart = abs % 1_000_000n;

  return `${isNeg ? "-" : ""}${intPart}.${String(fracPart).padStart(6, "0")}`;
}

function addDecimalStrings(a: string, b: string): string {
  return formatDecimalBigInt(parseDecimalBigInt(a) + parseDecimalBigInt(b));
}

function subtractDecimalStrings(a: string, b: string): string {
  return formatDecimalBigInt(parseDecimalBigInt(a) - parseDecimalBigInt(b));
}

export async function executePostAdmissionPlan(
  connection: MigrationConnectionLike,
  plan: PostAdmissionMigrationPlan,
): Promise<PostAdmissionExecutionResult> {
  let staleSourceFieldsCleared = 0;
  let sourceBackfillsApplied = 0;
  let documentRelationsInserted = 0;
  let documentLineRelationsInserted = 0;
  let inventoryBalancesInserted = 0;
  let inventoryLogsInserted = 0;
  let sourceUsageInserted = 0;
  let auditDocumentsInserted = 0;

  await connection.beginTransaction();

  try {
    await clearDocumentRelations(connection);
    await clearInventoryTables(connection);
    await clearAuditDocuments(connection);

    staleSourceFieldsCleared = await clearStaleReturnLineSourceFields(
      connection,
      plan.backfill.staleClearRecords,
    );

    for (const record of plan.backfill.backfillRecords) {
      const docType =
        record.sourceDocumentType === SALES_STOCK_DOCUMENT_TYPE
          ? SALES_STOCK_DOCUMENT_TYPE
          : WORKSHOP_MATERIAL_DOCUMENT_TYPE;
      await applySourceBackfill(connection, record, docType);
      sourceBackfillsApplied += 1;
    }

    for (const relation of plan.backfill.documentRelations) {
      await upsertDocumentRelation(connection, relation);
      documentRelationsInserted += 1;
    }

    for (const lineRelation of plan.backfill.documentLineRelations) {
      await upsertDocumentLineRelation(connection, lineRelation);
      documentLineRelationsInserted += 1;
    }

    const balanceIdByKey = new Map<string, number>();
    const logIdByIdempotencyKey = new Map<string, number>();
    const primaryLogIdByIdempotencyKey = new Map<string, number>();

    const firstPassLogs = plan.replay.logInserts.filter((l) => !l.isReversal);
    const reversalLogs = plan.replay.logInserts.filter((l) => l.isReversal);

    for (const log of firstPassLogs) {
      let balanceId = balanceIdByKey.get(log.balanceKey);

      if (balanceId === undefined) {
        if (log.stockScopeId <= 0) {
          throw new Error(
            `Cannot create inventory_balance without stockScopeId for materialId=${log.materialId}`,
          );
        }

        balanceId = await upsertInventoryBalance(
          connection,
          log.materialId,
          log.stockScopeId,
        );

        if (!balanceId || balanceId <= 0) {
          const existingId = await getInventoryBalanceId(
            connection,
            log.materialId,
            log.stockScopeId,
          );

          if (!existingId) {
            throw new Error(
              `Failed to create or find inventory_balance for materialId=${log.materialId} stockScopeId=${log.stockScopeId}`,
            );
          }

          balanceId = existingId;
        }

        balanceIdByKey.set(log.balanceKey, balanceId);
        inventoryBalancesInserted += 1;
      }

      const beforeQty = await getInventoryBalanceQty(connection, balanceId);
      const afterQty =
        log.direction === "IN"
          ? addDecimalStrings(beforeQty, log.changeQty)
          : subtractDecimalStrings(beforeQty, log.changeQty);

      const logId = await insertInventoryLog(
        connection,
        balanceId,
        beforeQty,
        afterQty,
        log,
        null,
      );

      primaryLogIdByIdempotencyKey.set(log.idempotencyKey, logId);
      logIdByIdempotencyKey.set(log.idempotencyKey, logId);
      inventoryLogsInserted += 1;

      if (!log.note?.includes("pre-reversal")) {
        await updateInventoryBalance(connection, balanceId, afterQty);
      }
    }

    for (const log of reversalLogs) {
      const primaryKey = log.primaryIdempotencyKey;

      if (!primaryKey) {
        continue;
      }

      const primaryLogId = primaryLogIdByIdempotencyKey.get(primaryKey);

      if (!primaryLogId) {
        continue;
      }

      let balanceId = balanceIdByKey.get(log.balanceKey);

      if (balanceId === undefined) {
        if (log.stockScopeId <= 0) {
          throw new Error(
            `Cannot create inventory_balance without stockScopeId for materialId=${log.materialId}`,
          );
        }

        balanceId = await upsertInventoryBalance(
          connection,
          log.materialId,
          log.stockScopeId,
        );

        if (!balanceId || balanceId <= 0) {
          const existingId = await getInventoryBalanceId(
            connection,
            log.materialId,
            log.stockScopeId,
          );

          if (!existingId) {
            throw new Error(
              `Failed to create or find inventory_balance for materialId=${log.materialId} stockScopeId=${log.stockScopeId}`,
            );
          }

          balanceId = existingId;
        }

        balanceIdByKey.set(log.balanceKey, balanceId);
        inventoryBalancesInserted += 1;
      }

      const primaryLog = firstPassLogs.find(
        (l) => l.idempotencyKey === primaryKey,
      );

      if (!primaryLog) {
        continue;
      }

      const beforeQty = await getInventoryBalanceQty(connection, balanceId);

      let afterQtyPrimary: string;

      if (primaryLog.direction === "IN") {
        afterQtyPrimary = addDecimalStrings(beforeQty, primaryLog.changeQty);
      } else {
        afterQtyPrimary = subtractDecimalStrings(
          beforeQty,
          primaryLog.changeQty,
        );
      }

      await connection.query(
        `UPDATE inventory_log SET before_qty = ?, after_qty = ? WHERE id = ?`,
        [beforeQty, afterQtyPrimary, primaryLogId],
      );

      await updateInventoryBalance(connection, balanceId, afterQtyPrimary);

      const reversalBeforeQty = afterQtyPrimary;
      const reversalAfterQty =
        log.direction === "IN"
          ? addDecimalStrings(reversalBeforeQty, log.changeQty)
          : subtractDecimalStrings(reversalBeforeQty, log.changeQty);

      const reversalLogId = await insertInventoryLog(
        connection,
        balanceId,
        reversalBeforeQty,
        reversalAfterQty,
        log,
        primaryLogId,
      );

      logIdByIdempotencyKey.set(log.idempotencyKey, reversalLogId);
      inventoryLogsInserted += 1;

      await updateInventoryBalance(connection, balanceId, reversalAfterQty);
    }

    for (const usage of plan.replay.sourceUsageInserts) {
      let sourceLogId = logIdByIdempotencyKey.get(
        usage.sourceLogIdempotencyKey,
      );

      if (!sourceLogId) {
        sourceLogId =
          (await getInventoryLogIdByIdempotencyKey(
            connection,
            usage.sourceLogIdempotencyKey,
          )) ?? undefined;
      }

      if (!sourceLogId) {
        continue;
      }

      await upsertInventorySourceUsage(connection, usage, sourceLogId);
      sourceUsageInserted += 1;
    }

    for (const doc of plan.audit.auditDocumentInserts) {
      await upsertAuditDocument(connection, doc);
      auditDocumentsInserted += 1;
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  return {
    staleSourceFieldsCleared,
    sourceBackfillsApplied,
    documentRelationsInserted,
    documentLineRelationsInserted,
    inventoryBalancesInserted,
    inventoryLogsInserted,
    sourceUsageInserted,
    auditDocumentsInserted,
  };
}
