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
import { readLegacyMasterDataSnapshot } from "./legacy-reader";
import {
  buildDryRunSummary,
  buildMasterDataMigrationPlan,
  hasExecutionBlockers,
} from "./transformer";
import type { MasterDataEntity } from "./types";
import {
  executeMasterDataPlan,
  MAP_TABLE_BY_ENTITY,
  TARGET_TABLE_BY_ENTITY,
} from "./writer";

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

async function getTargetAndMapCounts(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<Record<MasterDataEntity, { targetRows: number; mapRows: number }>> {
  const counts = {} as Record<
    MasterDataEntity,
    { targetRows: number; mapRows: number }
  >;

  for (const entity of Object.keys(
    TARGET_TABLE_BY_ENTITY,
  ) as MasterDataEntity[]) {
    counts[entity] = {
      targetRows: await getTableCount(
        connection,
        TARGET_TABLE_BY_ENTITY[entity],
      ),
      mapRows: await getTableCount(
        connection,
        `migration_staging.${MAP_TABLE_BY_ENTITY[entity]}`,
      ),
    };
  }

  return counts;
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(
    cliOptions,
    cliOptions.execute
      ? "master-data-execute-report.json"
      : "master-data-dry-run-report.json",
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
    const dryRunReport = await withPoolConnection(
      legacyPool,
      async (legacyConnection) => {
        const snapshot = await readLegacyMasterDataSnapshot(legacyConnection);
        const plan = buildMasterDataMigrationPlan(snapshot);

        return {
          snapshot,
          plan,
          report: {
            mode: cliOptions.execute ? "execute" : "dry-run",
            targetDatabaseName,
            ...buildDryRunSummary(plan),
          },
        };
      },
    );

    if (!cliOptions.execute) {
      writeStableReport(reportPath, dryRunReport.report);
      console.log(`Master-data dry-run completed. report=${reportPath}`);
      return;
    }

    let targetCounts: Record<
      MasterDataEntity,
      { targetRows: number; mapRows: number }
    > = {} as Record<MasterDataEntity, { targetRows: number; mapRows: number }>;
    let stagingReady = false;

    const executionReport = await withPoolConnection(
      targetPool,
      async (targetConnection) => {
        stagingReady = await stagingSchemaExists(targetConnection);

        if (stagingReady) {
          targetCounts = await getTargetAndMapCounts(targetConnection);
        }

        const executeBlockers: Array<Record<string, unknown>> = [];

        if (!stagingReady) {
          executeBlockers.push({
            reason:
              "migration_staging schema is missing. Run pnpm migration:bootstrap-staging first.",
          });
        }

        for (const [entity, counts] of Object.entries(targetCounts) as Array<
          [MasterDataEntity, { targetRows: number; mapRows: number }]
        >) {
          if (counts.targetRows > 0 && counts.mapRows === 0) {
            executeBlockers.push({
              entity,
              reason:
                "Target table already contains rows, but no staging map rows exist for a safe rerun.",
              targetRows: counts.targetRows,
              mapRows: counts.mapRows,
            });
          }
        }

        if (
          hasExecutionBlockers(dryRunReport.plan) &&
          !cliOptions.allowBlockers
        ) {
          executeBlockers.push({
            reason:
              "Dry-run reported source blockers. Re-run with --allow-blockers only if you explicitly accept skipping blocked rows.",
            blockerCount: dryRunReport.plan.blockers.length,
          });
        }

        if (executeBlockers.length > 0) {
          const blockedReport = {
            ...dryRunReport.report,
            executionRequested: true,
            allowBlockers: cliOptions.allowBlockers,
            stagingReady,
            targetCounts,
            executeBlockers,
          };
          writeStableReport(reportPath, blockedReport);
          process.exitCode = 1;
          return blockedReport;
        }

        const executionResult = await executeMasterDataPlan(
          targetConnection,
          dryRunReport.plan,
          {
            allowBlockers: cliOptions.allowBlockers,
          },
        );

        const report = {
          ...dryRunReport.report,
          executionRequested: true,
          allowBlockers: cliOptions.allowBlockers,
          stagingReady,
          targetCounts,
          executionResult,
        };

        writeStableReport(reportPath, report);
        return report;
      },
    );

    console.log(`Master-data execute completed. report=${reportPath}`);

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
