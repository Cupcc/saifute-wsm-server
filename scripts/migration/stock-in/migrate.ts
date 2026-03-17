import {
  assertDistinctSourceAndTargetDatabases,
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseMigrationCliOptions,
  resolveReportPath,
} from "../config";
import { closePools, createMariaDbPool, withPoolConnection } from "../db";
import { writeStableReport } from "../shared/report-writer";
import {
  buildMissingMapTargetBlockers,
  buildSliceDirtyTargetBlockers,
} from "./execute-guard";
import {
  readLegacyStockInSnapshot,
  readStockInDependencySnapshot,
} from "./legacy-reader";
import {
  buildDryRunSummary,
  buildStockInMigrationPlan,
  hasExecutionBlockers,
} from "./transformer";
import { executeStockInPlan, MAP_TABLES, TARGET_TABLES } from "./writer";

async function getTableCount(
  connection: {
    query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  },
  tableName: string,
): Promise<number> {
  const rows = await connection.query<Array<{ total: number }>>(
    `SELECT COUNT(*) AS total FROM ${tableName}`,
  );
  return Number(rows[0]?.total ?? 0);
}

async function getBatchMapCount(
  connection: {
    query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  },
  mapTableName: string,
  migrationBatch: string,
): Promise<number> {
  const rows = await connection.query<Array<{ total: number }>>(
    `
      SELECT COUNT(*) AS total
      FROM migration_staging.${mapTableName}
      WHERE migration_batch = ?
    `,
    [migrationBatch],
  );
  return Number(rows[0]?.total ?? 0);
}

async function getMissingMapTargets(
  connection: {
    query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  },
  mapTableName: string,
  targetTableName: string,
  migrationBatch: string,
): Promise<number> {
  const rows = await connection.query<Array<{ total: number }>>(
    `
      SELECT COUNT(*) AS total
      FROM migration_staging.${mapTableName} map_row
      LEFT JOIN ${targetTableName} target_row
        ON target_row.id = map_row.target_id
      WHERE map_row.migration_batch = ?
        AND target_row.id IS NULL
    `,
    [migrationBatch],
  );

  return Number(rows[0]?.total ?? 0);
}

async function stagingSchemaExists(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<boolean> {
  const rows = await connection.query<Array<{ schemaName: string }>>(
    `
      SELECT schema_name AS schemaName
      FROM information_schema.schemata
      WHERE schema_name = 'migration_staging'
    `,
  );

  return rows.length > 0;
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(
    cliOptions,
    cliOptions.execute
      ? "stock-in-execute-report.json"
      : "stock-in-dry-run-report.json",
  );
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: true });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );
  assertDistinctSourceAndTargetDatabases(
    env.legacyDatabaseUrl,
    env.databaseUrl,
  );

  const legacyPool = createMariaDbPool(env.legacyDatabaseUrl ?? "");
  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    const { snapshot, dependencies, plan } = await withPoolConnection(
      legacyPool,
      async (legacyConnection) => {
        const snapshot = await readLegacyStockInSnapshot(legacyConnection);
        const dependencies = await withPoolConnection(
          targetPool,
          async (targetConnection) =>
            readStockInDependencySnapshot(targetConnection),
        );

        return {
          snapshot,
          dependencies,
          plan: buildStockInMigrationPlan(snapshot, dependencies),
        };
      },
    );

    const dryRunReport = {
      mode: cliOptions.execute ? "execute" : "dry-run",
      targetDatabaseName,
      sourceCounts: {
        orders: snapshot.orders.length,
        lines: snapshot.lines.length,
        audits: snapshot.audits.length,
      },
      dependencyBaseline: dependencies.batch1Baseline,
      ...buildDryRunSummary(plan),
    };

    if (!cliOptions.execute) {
      writeStableReport(reportPath, dryRunReport);
      console.log(`Stock-in dry-run completed. report=${reportPath}`);

      if (hasExecutionBlockers(plan)) {
        process.exitCode = 1;
      }
      return;
    }

    let orderTargetRows = 0;
    let lineTargetRows = 0;
    let orderBatchMapRows = 0;
    let lineBatchMapRows = 0;
    let missingMappedOrders = 0;
    let missingMappedLines = 0;
    let stagingReady = false;

    const executionReport = await withPoolConnection(
      targetPool,
      async (targetConnection) => {
        stagingReady = await stagingSchemaExists(targetConnection);
        const executeBlockers: Array<Record<string, unknown>> = [];

        if (!stagingReady) {
          executeBlockers.push({
            reason:
              "migration_staging schema is missing. Run pnpm migration:bootstrap-staging first.",
          });
        } else {
          orderTargetRows = await getTableCount(
            targetConnection,
            TARGET_TABLES.order,
          );
          lineTargetRows = await getTableCount(
            targetConnection,
            TARGET_TABLES.line,
          );
          orderBatchMapRows = await getBatchMapCount(
            targetConnection,
            MAP_TABLES.order,
            plan.migrationBatch,
          );
          lineBatchMapRows = await getBatchMapCount(
            targetConnection,
            MAP_TABLES.line,
            plan.migrationBatch,
          );
          missingMappedOrders = await getMissingMapTargets(
            targetConnection,
            MAP_TABLES.order,
            TARGET_TABLES.order,
            plan.migrationBatch,
          );
          missingMappedLines = await getMissingMapTargets(
            targetConnection,
            MAP_TABLES.line,
            TARGET_TABLES.line,
            plan.migrationBatch,
          );

          executeBlockers.push(
            ...buildSliceDirtyTargetBlockers({
              targetTable: TARGET_TABLES.order,
              targetRows: orderTargetRows,
              batchMapRows: orderBatchMapRows,
            }),
            ...buildSliceDirtyTargetBlockers({
              targetTable: TARGET_TABLES.line,
              targetRows: lineTargetRows,
              batchMapRows: lineBatchMapRows,
            }),
            ...buildMissingMapTargetBlockers({
              targetTable: TARGET_TABLES.order,
              missingMappedTargets: missingMappedOrders,
            }),
            ...buildMissingMapTargetBlockers({
              targetTable: TARGET_TABLES.line,
              missingMappedTargets: missingMappedLines,
            }),
          );
        }

        if (hasExecutionBlockers(plan)) {
          executeBlockers.push(
            ...plan.globalBlockers.map((blocker) => ({
              reason: blocker.reason,
              ...blocker.details,
            })),
          );
        }

        if (executeBlockers.length > 0) {
          const blockedReport = {
            ...dryRunReport,
            executionRequested: true,
            stagingReady,
            targetSummary: {
              orderTargetRows,
              lineTargetRows,
              orderBatchMapRows,
              lineBatchMapRows,
              missingMappedOrders,
              missingMappedLines,
            },
            executeBlockers,
          };
          writeStableReport(reportPath, blockedReport);
          process.exitCode = 1;
          return blockedReport;
        }

        const executionResult = await executeStockInPlan(
          targetConnection,
          plan,
        );
        const report = {
          ...dryRunReport,
          executionRequested: true,
          stagingReady,
          targetSummary: {
            orderTargetRows,
            lineTargetRows,
            orderBatchMapRows,
            lineBatchMapRows,
            missingMappedOrders,
            missingMappedLines,
          },
          executionResult,
        };
        writeStableReport(reportPath, report);
        return report;
      },
    );

    console.log(`Stock-in execute completed. report=${reportPath}`);

    if (
      Array.isArray(
        (executionReport as { executeBlockers?: unknown[] }).executeBlockers,
      )
    ) {
      process.exitCode = 1;
    }
  } finally {
    await closePools(legacyPool, targetPool);
  }
}

void main();
