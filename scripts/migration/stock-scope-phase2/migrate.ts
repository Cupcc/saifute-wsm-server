import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseMigrationCliOptions,
  resolveReportPath,
} from "../config";
import { closePools, createMariaDbPool, withPoolConnection } from "../db";
import { writeStableReport } from "../shared/report-writer";

type Queryable = {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
};

type NullCountRow = {
  tableName: string;
  totalRows: number;
  nullRows: number;
};

type ConflictRow = {
  materialId: number;
  targetScopeCode: string;
  duplicateCount: number;
};

type WorkshopRefRow = {
  tableName: string;
  workshopId: number;
  workshopName: string | null;
  totalRows: number;
};

type ColumnPresenceRow = {
  total: number;
};

const SCOPE_CODE_MAIN = "MAIN";
const SCOPE_CODE_RD_SUB = "RD_SUB";

async function hasTableColumn(
  connection: Queryable,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const rows = await connection.query<ColumnPresenceRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName],
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function ensureStockScopeTypeColumn(connection: Queryable): Promise<{
  addedColumn: boolean;
  normalizedRows: number;
}> {
  const rows = await connection.query<ColumnPresenceRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'stock_scope'
        AND COLUMN_NAME = 'scope_type'
    `,
  );
  const hasColumn = Number(rows[0]?.total ?? 0) > 0;

  if (!hasColumn) {
    await connection.query(
      `
        ALTER TABLE stock_scope
        ADD COLUMN scope_type ENUM('MAIN', 'RD_SUB') NOT NULL DEFAULT 'MAIN'
        AFTER scope_name
      `,
    );
  }

  const normalizationResult = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE stock_scope
      SET scope_type =
        CASE
          WHEN scope_code = ? THEN 'RD_SUB'
          ELSE 'MAIN'
        END
      WHERE scope_type <>
        CASE
          WHEN scope_code = ? THEN 'RD_SUB'
          ELSE 'MAIN'
        END
    `,
    [SCOPE_CODE_RD_SUB, SCOPE_CODE_RD_SUB],
  );

  return {
    addedColumn: !hasColumn,
    normalizedRows: Number(normalizationResult.affectedRows ?? 0),
  };
}

async function ensureStockScopeSeed(connection: Queryable): Promise<void> {
  await connection.query(
    `
      INSERT INTO stock_scope (
        scope_code,
        scope_name,
        status,
        created_at,
        updated_at
      )
      VALUES
        (?, '主仓', 'ACTIVE', NOW(), NOW()),
        (?, '研发小仓', 'ACTIVE', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        scope_name = VALUES(scope_name),
        status = VALUES(status),
        updated_at = NOW()
    `,
    [SCOPE_CODE_MAIN, SCOPE_CODE_RD_SUB],
  );
}

async function readStockScopeIds(connection: Queryable): Promise<{
  MAIN: number;
  RD_SUB: number;
}> {
  const rows = await connection.query<Array<{ scopeCode: string; id: number }>>(
    `
      SELECT scope_code AS scopeCode, id
      FROM stock_scope
      WHERE scope_code IN (?, ?)
    `,
    [SCOPE_CODE_MAIN, SCOPE_CODE_RD_SUB],
  );

  const byCode = new Map(rows.map((row) => [row.scopeCode, Number(row.id)]));
  const mainId = byCode.get(SCOPE_CODE_MAIN);
  const rdId = byCode.get(SCOPE_CODE_RD_SUB);

  if (!mainId || !rdId) {
    throw new Error("stock_scope seed incomplete: MAIN / RD_SUB missing");
  }

  return {
    MAIN: mainId,
    RD_SUB: rdId,
  };
}

async function getNullCounts(connection: Queryable): Promise<NullCountRow[]> {
  return connection.query<NullCountRow[]>(
    `
      SELECT 'inventory_balance' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM inventory_balance
      UNION ALL
      SELECT 'inventory_log' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM inventory_log
      UNION ALL
      SELECT 'factory_number_reservation' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM factory_number_reservation
      UNION ALL
      SELECT 'stock_in_order' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM stock_in_order
      UNION ALL
      SELECT 'sales_stock_order' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM sales_stock_order
      UNION ALL
      SELECT 'workshop_material_order' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM workshop_material_order
      UNION ALL
      SELECT 'rd_project' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM rd_project
      UNION ALL
      SELECT 'rd_handoff_order' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN source_stock_scope_id IS NULL OR target_stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM rd_handoff_order
      UNION ALL
      SELECT 'rd_procurement_request' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM rd_procurement_request
      UNION ALL
      SELECT 'rd_stocktake_order' AS tableName, COUNT(*) AS totalRows, SUM(CASE WHEN stock_scope_id IS NULL THEN 1 ELSE 0 END) AS nullRows
      FROM rd_stocktake_order
    `,
  );
}

async function getInventoryBalanceConflicts(
  connection: Queryable,
): Promise<ConflictRow[]> {
  if (!(await hasTableColumn(connection, "inventory_balance", "workshop_id"))) {
    return [];
  }

  return connection.query<ConflictRow[]>(
    `
      SELECT
        ib.material_id AS materialId,
        CASE
          WHEN w.workshop_name = '主仓' THEN 'MAIN'
          WHEN w.workshop_name = '研发小仓' THEN 'RD_SUB'
          ELSE '__UNMAPPED__'
        END AS targetScopeCode,
        COUNT(*) AS duplicateCount
      FROM inventory_balance ib
      JOIN workshop w ON w.id = ib.workshop_id
      GROUP BY
        ib.material_id,
        CASE
          WHEN w.workshop_name = '主仓' THEN 'MAIN'
          WHEN w.workshop_name = '研发小仓' THEN 'RD_SUB'
          ELSE '__UNMAPPED__'
        END
      HAVING targetScopeCode <> '__UNMAPPED__' AND COUNT(*) > 1
      ORDER BY duplicateCount DESC, material_id ASC
    `,
  );
}

async function getUnmappedWorkshopReferences(
  connection: Queryable,
): Promise<WorkshopRefRow[]> {
  const balanceHasWorkshopId = await hasTableColumn(
    connection,
    "inventory_balance",
    "workshop_id",
  );
  const inventoryBalanceBranch = balanceHasWorkshopId
    ? "SELECT 'inventory_balance' AS tableName, workshop_id AS workshopId FROM inventory_balance WHERE stock_scope_id IS NULL UNION ALL"
    : "";

  return connection.query<WorkshopRefRow[]>(
    `
      SELECT
        refs.tableName AS tableName,
        refs.workshopId AS workshopId,
        w.workshop_name AS workshopName,
        COUNT(*) AS totalRows
      FROM (
        ${inventoryBalanceBranch}
        SELECT 'inventory_log' AS tableName, workshop_id AS workshopId FROM inventory_log WHERE stock_scope_id IS NULL
        UNION ALL
        SELECT 'factory_number_reservation' AS tableName, workshop_id AS workshopId FROM factory_number_reservation WHERE stock_scope_id IS NULL
        UNION ALL
        SELECT 'rd_procurement_request' AS tableName, workshop_id AS workshopId FROM rd_procurement_request WHERE stock_scope_id IS NULL
        UNION ALL
        SELECT 'rd_stocktake_order' AS tableName, workshop_id AS workshopId FROM rd_stocktake_order WHERE stock_scope_id IS NULL
        UNION ALL
        SELECT 'rd_handoff_order.source' AS tableName, source_workshop_id AS workshopId FROM rd_handoff_order WHERE source_stock_scope_id IS NULL
        UNION ALL
        SELECT 'rd_handoff_order.target' AS tableName, target_workshop_id AS workshopId FROM rd_handoff_order WHERE target_stock_scope_id IS NULL
      ) refs
      JOIN workshop w ON w.id = refs.workshopId
      WHERE w.workshop_name NOT IN ('主仓', '研发小仓')
      GROUP BY refs.tableName, refs.workshopId, w.workshop_name
      ORDER BY refs.tableName ASC, refs.workshopId ASC
    `,
  );
}

async function executeBackfill(
  connection: Queryable,
  stockScopeIds: { MAIN: number; RD_SUB: number },
): Promise<Record<string, number>> {
  const updates: Record<string, number> = {};

  const stockInResult = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE stock_in_order
      SET stock_scope_id = ?
      WHERE stock_scope_id IS NULL
    `,
    [stockScopeIds.MAIN],
  );
  updates.stockInOrder = Number(stockInResult.affectedRows ?? 0);

  const customerResult = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE sales_stock_order
      SET stock_scope_id = ?
      WHERE stock_scope_id IS NULL
    `,
    [stockScopeIds.MAIN],
  );
  updates.salesStockOrder = Number(customerResult.affectedRows ?? 0);

  const workshopMaterialResult = await connection.query<{
    affectedRows?: number;
  }>(
    `
      UPDATE workshop_material_order wmo
      JOIN workshop w ON w.id = wmo.workshop_id
      SET wmo.stock_scope_id =
        CASE
          WHEN wmo.order_type = 'SCRAP' AND w.workshop_name = '研发小仓' THEN ?
          ELSE ?
        END
      WHERE wmo.stock_scope_id IS NULL
    `,
    [stockScopeIds.RD_SUB, stockScopeIds.MAIN],
  );
  updates.workshopMaterialOrder = Number(
    workshopMaterialResult.affectedRows ?? 0,
  );

  const projectResult = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE rd_project p
      JOIN workshop w ON w.id = p.workshop_id
      SET p.stock_scope_id =
        CASE
          WHEN w.workshop_name = '研发小仓' THEN ?
          ELSE ?
        END
      WHERE p.stock_scope_id IS NULL
    `,
    [stockScopeIds.RD_SUB, stockScopeIds.MAIN],
  );
  updates.rdProject = Number(projectResult.affectedRows ?? 0);

  const rdHandoffResult = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE rd_handoff_order rho
      JOIN workshop sw ON sw.id = rho.source_workshop_id
      JOIN workshop tw ON tw.id = rho.target_workshop_id
      SET
        rho.source_stock_scope_id =
          CASE
            WHEN sw.workshop_name = '研发小仓' THEN ?
            WHEN sw.workshop_name = '主仓' THEN ?
            ELSE rho.source_stock_scope_id
          END,
        rho.target_stock_scope_id =
          CASE
            WHEN tw.workshop_name = '研发小仓' THEN ?
            WHEN tw.workshop_name = '主仓' THEN ?
            ELSE rho.target_stock_scope_id
          END
      WHERE rho.source_stock_scope_id IS NULL OR rho.target_stock_scope_id IS NULL
    `,
    [
      stockScopeIds.RD_SUB,
      stockScopeIds.MAIN,
      stockScopeIds.RD_SUB,
      stockScopeIds.MAIN,
    ],
  );
  updates.rdHandoffOrder = Number(rdHandoffResult.affectedRows ?? 0);

  const rdProcurementResult = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE rd_procurement_request
      SET stock_scope_id = ?
      WHERE stock_scope_id IS NULL
    `,
    [stockScopeIds.RD_SUB],
  );
  updates.rdProcurementRequest = Number(rdProcurementResult.affectedRows ?? 0);

  const rdStocktakeResult = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE rd_stocktake_order
      SET stock_scope_id = ?
      WHERE stock_scope_id IS NULL
    `,
    [stockScopeIds.RD_SUB],
  );
  updates.rdStocktakeOrder = Number(rdStocktakeResult.affectedRows ?? 0);

  const inventoryLogResult = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE inventory_log il
      JOIN workshop w ON w.id = il.workshop_id
      SET il.stock_scope_id =
        CASE
          WHEN w.workshop_name = '研发小仓' THEN ?
          WHEN w.workshop_name = '主仓' THEN ?
          ELSE il.stock_scope_id
        END
      WHERE il.stock_scope_id IS NULL
    `,
    [stockScopeIds.RD_SUB, stockScopeIds.MAIN],
  );
  updates.inventoryLog = Number(inventoryLogResult.affectedRows ?? 0);

  const reservationResult = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE factory_number_reservation fnr
      JOIN workshop w ON w.id = fnr.workshop_id
      SET fnr.stock_scope_id =
        CASE
          WHEN w.workshop_name = '研发小仓' THEN ?
          WHEN w.workshop_name = '主仓' THEN ?
          ELSE fnr.stock_scope_id
        END
      WHERE fnr.stock_scope_id IS NULL
    `,
    [stockScopeIds.RD_SUB, stockScopeIds.MAIN],
  );
  updates.factoryNumberReservation = Number(
    reservationResult.affectedRows ?? 0,
  );

  const balanceHasWorkshopId = await hasTableColumn(
    connection,
    "inventory_balance",
    "workshop_id",
  );
  const balanceResult = balanceHasWorkshopId
    ? await connection.query<{ affectedRows?: number }>(
        `
          UPDATE inventory_balance ib
          JOIN workshop w ON w.id = ib.workshop_id
          SET ib.stock_scope_id =
            CASE
              WHEN w.workshop_name = '研发小仓' THEN ?
              WHEN w.workshop_name = '主仓' THEN ?
              ELSE ib.stock_scope_id
            END
          WHERE ib.stock_scope_id IS NULL
        `,
        [stockScopeIds.RD_SUB, stockScopeIds.MAIN],
      )
    : await connection.query<{ affectedRows?: number }>(
        `
          UPDATE inventory_balance
          SET stock_scope_id = ?
          WHERE stock_scope_id IS NULL
        `,
        [stockScopeIds.MAIN],
      );
  updates.inventoryBalance = Number(balanceResult.affectedRows ?? 0);

  return updates;
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(
    cliOptions,
    cliOptions.execute
      ? "stock-scope-phase2-execute-report.json"
      : "stock-scope-phase2-dry-run-report.json",
  );
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: false });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );

  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    const report = await withPoolConnection(targetPool, async (connection) => {
      const [nullCounts, conflicts, unmappedReferences] = await Promise.all([
        getNullCounts(connection),
        getInventoryBalanceConflicts(connection),
        getUnmappedWorkshopReferences(connection),
      ]);

      const executeBlockers: Array<Record<string, unknown>> = [];
      if (conflicts.length > 0) {
        executeBlockers.push({
          reason:
            "inventory_balance contains multiple rows that would collapse into the same materialId + stockScopeId bucket.",
          conflictCount: conflicts.length,
          sample: conflicts.slice(0, 20),
        });
      }
      if (unmappedReferences.length > 0) {
        executeBlockers.push({
          reason:
            "Some legacy workshop references cannot be mapped to canonical MAIN / RD_SUB.",
          unmappedCount: unmappedReferences.length,
          sample: unmappedReferences.slice(0, 20),
        });
      }

      const dryRunReport = {
        mode: cliOptions.execute ? "execute" : "dry-run",
        targetDatabaseName,
        nullCounts,
        inventoryBalanceConflicts: conflicts,
        unmappedWorkshopReferences: unmappedReferences,
        executeBlockers,
      };

      if (!cliOptions.execute) {
        writeStableReport(reportPath, dryRunReport);
        console.log(
          `stock-scope-phase2 dry-run completed. report=${reportPath}`,
        );
        if (executeBlockers.length > 0) {
          process.exitCode = 1;
        }
        return dryRunReport;
      }

      if (executeBlockers.length > 0 && !cliOptions.allowBlockers) {
        writeStableReport(reportPath, dryRunReport);
        process.exitCode = 1;
        return dryRunReport;
      }

      await connection.beginTransaction();
      try {
        const stockScopeTypeColumn =
          await ensureStockScopeTypeColumn(connection);
        await ensureStockScopeSeed(connection);
        const stockScopeIds = await readStockScopeIds(connection);
        const executionResult = await executeBackfill(
          connection,
          stockScopeIds,
        );
        await connection.commit();

        const executeReport = {
          ...dryRunReport,
          executionRequested: true,
          allowBlockers: cliOptions.allowBlockers,
          stockScopeTypeColumn,
          stockScopeIds,
          executionResult,
          postExecuteNullCounts: await getNullCounts(connection),
        };
        writeStableReport(reportPath, executeReport);
        console.log(
          `stock-scope-phase2 execute completed. report=${reportPath}`,
        );
        return executeReport;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    const executeBlockers = (report as { executeBlockers?: unknown[] })
      .executeBlockers;
    if (
      Array.isArray(executeBlockers) &&
      executeBlockers.length > 0 &&
      !cliOptions.execute
    ) {
      process.exitCode = 1;
    }
  } finally {
    await closePools(targetPool);
  }
}

void main();
