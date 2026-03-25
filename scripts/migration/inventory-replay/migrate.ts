import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseMigrationCliOptions,
  resolveReportPath,
} from "../config";
import { closePools, createMariaDbPool, withPoolConnection } from "../db";
import { writeStableReport } from "../shared/report-writer";
import { buildInventoryReplayPlan } from "./planner";
import { readAllInventoryEvents } from "./reader";
import { executeInventoryReplayPlan } from "./writer";

async function getExistingInventoryCounts(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<{
  balanceCount: number;
  logCount: number;
  sourceUsageCount: number;
}> {
  const rows = await connection.query<
    Array<{ tableName: string; total: number }>
  >(
    `
      SELECT 'inventory_balance' AS tableName, COUNT(*) AS total FROM inventory_balance
      UNION ALL
      SELECT 'inventory_log' AS tableName, COUNT(*) AS total FROM inventory_log
      UNION ALL
      SELECT 'inventory_source_usage' AS tableName, COUNT(*) AS total FROM inventory_source_usage
    `,
  );

  const counts = Object.fromEntries(
    rows.map((row) => [row.tableName, Number(row.total)] as const),
  );

  return {
    balanceCount: counts.inventory_balance ?? 0,
    logCount: counts.inventory_log ?? 0,
    sourceUsageCount: counts.inventory_source_usage ?? 0,
  };
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(
    cliOptions,
    cliOptions.execute
      ? "inventory-replay-execute-report.json"
      : "inventory-replay-dry-run-report.json",
  );
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: false });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );

  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    const report = await withPoolConnection(
      targetPool,
      async (targetConnection) => {
        const events = await readAllInventoryEvents(targetConnection);
        const plan = buildInventoryReplayPlan(events);

        const existingCounts =
          await getExistingInventoryCounts(targetConnection);

        const dryRunReport = {
          mode: cliOptions.execute ? "execute" : "dry-run",
          targetDatabaseName,
          migrationBatch: plan.migrationBatch,
          totalEvents: plan.events.length,
          eventCounts: plan.eventCounts,
          plannedBalances: plan.uniqueBalanceBuckets,
          plannedLogs: plan.plannedLogs.length,
          existingCounts,
          warnings: plan.warnings,
          negativeBalanceMaterials: plan.negativeBalanceMaterials,
        };

        if (!cliOptions.execute) {
          writeStableReport(reportPath, dryRunReport);
          console.log(
            `Inventory-replay dry-run completed. report=${reportPath}`,
          );

          if (plan.negativeBalanceMaterials.length > 0) {
            console.log(
              `WARNING: ${plan.negativeBalanceMaterials.length} balance bucket(s) would go negative.`,
            );
          }
          return dryRunReport;
        }

        if (existingCounts.sourceUsageCount > 0) {
          const blockedReport = {
            ...dryRunReport,
            executionRequested: true,
            executeBlockers: [
              {
                reason:
                  "inventory_source_usage already contains rows. Replay only manages inventory_balance and inventory_log; source usage cleanup is not supported.",
                sourceUsageCount: existingCounts.sourceUsageCount,
              },
            ],
          };
          writeStableReport(reportPath, blockedReport);
          process.exitCode = 1;
          return blockedReport;
        }

        const executionResult = await executeInventoryReplayPlan(
          targetConnection,
          plan,
        );

        const executeReport = {
          ...dryRunReport,
          executionRequested: true,
          executionResult,
          cleanedUp: {
            previousBalanceCount: existingCounts.balanceCount,
            previousLogCount: existingCounts.logCount,
          },
        };
        writeStableReport(reportPath, executeReport);
        console.log(`Inventory-replay execute completed. report=${reportPath}`);
        return executeReport;
      },
    );

    if (
      Array.isArray((report as { executeBlockers?: unknown[] }).executeBlockers)
    ) {
      process.exitCode = 1;
    }
  } finally {
    await closePools(targetPool);
  }
}

void main();
