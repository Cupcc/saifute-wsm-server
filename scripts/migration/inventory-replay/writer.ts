import type { MigrationConnectionLike, QueryResultWithInsertId } from "../db";
import type {
  InventoryReplayExecutionResult,
  InventoryReplayPlan,
} from "./types";

async function cleanupExistingInventoryData(
  connection: MigrationConnectionLike,
): Promise<{ deletedLogs: number; deletedBalances: number }> {
  const logResult = await connection.query<QueryResultWithInsertId>(
    `DELETE FROM inventory_log WHERE reversalOfLogId IS NULL`,
  );
  const deletedLogs = Number(
    (logResult as { affectedRows?: number }).affectedRows ?? 0,
  );

  const balanceResult = await connection.query<QueryResultWithInsertId>(
    `DELETE FROM inventory_balance`,
  );
  const deletedBalances = Number(
    (balanceResult as { affectedRows?: number }).affectedRows ?? 0,
  );

  return { deletedLogs, deletedBalances };
}

async function insertBalanceRow(
  connection: MigrationConnectionLike,
  materialId: number,
  workshopId: number,
  quantityOnHand: string,
): Promise<number> {
  const result = await connection.query<QueryResultWithInsertId>(
    `
      INSERT INTO inventory_balance (materialId, workshopId, quantityOnHand, rowVersion, createdBy, createdAt, updatedBy, updatedAt)
      VALUES (?, ?, ?, 0, 'migration-replay', NOW(), 'migration-replay', NOW())
      ON DUPLICATE KEY UPDATE
        quantityOnHand = VALUES(quantityOnHand),
        rowVersion = rowVersion + 1,
        updatedBy = VALUES(updatedBy),
        updatedAt = NOW(),
        id = LAST_INSERT_ID(id)
    `,
    [materialId, workshopId, quantityOnHand],
  );
  const insertId = Number(result?.insertId ?? 0);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new Error(
      `Failed to insert/update inventory_balance for material=${materialId}, workshop=${workshopId}`,
    );
  }
  return insertId;
}

async function insertLogRow(
  connection: MigrationConnectionLike,
  balanceId: number,
  log: {
    materialId: number;
    workshopId: number;
    direction: string;
    operationType: string;
    businessModule: string;
    businessDocumentType: string;
    businessDocumentId: number;
    businessDocumentNumber: string;
    businessDocumentLineId: number;
    changeQty: string;
    beforeQty: string;
    afterQty: string;
    operatorId: string | null;
    occurredAt: string;
    idempotencyKey: string;
  },
): Promise<void> {
  await connection.query(
    `
      INSERT INTO inventory_log (
        balanceId, materialId, workshopId, direction, operationType,
        businessModule, businessDocumentType, businessDocumentId,
        businessDocumentNumber, businessDocumentLineId,
        changeQty, beforeQty, afterQty,
        operatorId, occurredAt, idempotencyKey
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        balanceId = VALUES(balanceId)
    `,
    [
      balanceId,
      log.materialId,
      log.workshopId,
      log.direction,
      log.operationType,
      log.businessModule,
      log.businessDocumentType,
      log.businessDocumentId,
      log.businessDocumentNumber,
      log.businessDocumentLineId,
      log.changeQty,
      log.beforeQty,
      log.afterQty,
      log.operatorId,
      log.occurredAt,
      log.idempotencyKey,
    ],
  );
}

export async function executeInventoryReplayPlan(
  connection: MigrationConnectionLike,
  plan: InventoryReplayPlan,
): Promise<InventoryReplayExecutionResult> {
  await connection.beginTransaction();

  try {
    await cleanupExistingInventoryData(connection);

    const balanceIdMap = new Map<string, number>();
    let insertedBalances = 0;

    for (const balance of plan.plannedBalances) {
      const balanceId = await insertBalanceRow(
        connection,
        balance.materialId,
        balance.workshopId,
        balance.quantityOnHand,
      );
      balanceIdMap.set(
        `${balance.materialId}::${balance.workshopId}`,
        balanceId,
      );
      insertedBalances += 1;
    }

    let insertedLogs = 0;

    for (const log of plan.plannedLogs) {
      const key = `${log.materialId}::${log.workshopId}`;
      let balanceId = balanceIdMap.get(key);

      if (balanceId === undefined) {
        balanceId = await insertBalanceRow(
          connection,
          log.materialId,
          log.workshopId,
          "0.000000",
        );
        balanceIdMap.set(key, balanceId);
        insertedBalances += 1;
      }

      await insertLogRow(connection, balanceId, log);
      insertedLogs += 1;
    }

    await connection.commit();

    return { insertedBalances, insertedLogs };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
