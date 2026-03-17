import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseMigrationCliOptions,
  resolveReportPath,
} from "./config";
import {
  closePools,
  createMariaDbPool,
  splitSqlStatements,
  withPoolConnection,
} from "./db";
import { writeStableReport } from "./shared/report-writer";

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(
    cliOptions,
    "bootstrap-staging-report.json",
  );
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: false });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );
  const targetPool = createMariaDbPool(env.databaseUrl);
  const sqlPath = join(
    process.cwd(),
    "scripts",
    "migration",
    "sql",
    "000-create-migration-staging.sql",
  );
  const sqlStatements = splitSqlStatements(readFileSync(sqlPath, "utf8"));

  try {
    await withPoolConnection(targetPool, async (connection) => {
      if (cliOptions.resetStaging) {
        await connection.query("DROP SCHEMA IF EXISTS migration_staging");
      }

      for (const sqlStatement of sqlStatements) {
        await connection.query(sqlStatement);
      }

      const tables = await connection.query<Array<{ tableName: string }>>(
        `
          SELECT table_name AS tableName
          FROM information_schema.tables
          WHERE table_schema = 'migration_staging'
          ORDER BY table_name ASC
        `,
      );

      const report = {
        scope: "batch0-bootstrap-staging",
        resetApplied: cliOptions.resetStaging,
        sqlPath,
        statementsExecuted: sqlStatements.length,
        targetDatabaseName,
        tables: tables.map((table) => table.tableName),
      };

      writeStableReport(reportPath, report);

      console.log(
        `Staging bootstrap completed. reset=${cliOptions.resetStaging} tables=${tables.length} report=${reportPath}`,
      );
    });
  } finally {
    await closePools(targetPool);
  }
}

void main();
