import {
  EXPECTED_LEGACY_DATABASE_NAME,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseDatabaseName,
  parseHostAndPort,
  parseMigrationCliOptions,
  readEnvExampleDatabaseName,
  resolveReportPath,
} from "./config";
import { closePools, createMariaDbPool, withPoolConnection } from "./db";
import { writeStableReport } from "./shared/report-writer";

interface PreflightCheck {
  name: string;
  status: "ok" | "warning" | "blocker";
  detail: string;
  expected?: string | number | null;
  actual?: string | number | null;
}

const LEGACY_TABLES = [
  "sys_dict_data",
  "saifute_workshop",
  "saifute_supplier",
  "saifute_personnel",
  "saifute_customer",
  "saifute_material",
] as const;

const TARGET_TABLES = [
  "material_category",
  "workshop",
  "supplier",
  "personnel",
  "customer",
  "material",
] as const;

async function getCurrentDatabaseName(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<string | null> {
  const rows = await connection.query<Array<{ databaseName: string | null }>>(
    "SELECT DATABASE() AS databaseName",
  );
  return rows[0]?.databaseName ?? null;
}

async function getMissingTables(
  connection: {
    query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  },
  tableNames: readonly string[],
): Promise<string[]> {
  const rows = await connection.query<Array<{ tableName: string }>>(
    `
      SELECT table_name AS tableName
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name IN (${tableNames.map(() => "?").join(", ")})
    `,
    tableNames,
  );

  const existingTables = new Set(rows.map((row) => row.tableName));
  return tableNames.filter((tableName) => !existingTables.has(tableName));
}

async function getTargetTableCounts(
  connection: {
    query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  },
  tableNames: readonly string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const tableName of tableNames) {
    const rows = await connection.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM ${tableName}`,
    );
    counts[tableName] = Number(rows[0]?.total ?? 0);
  }

  return counts;
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(cliOptions, "preflight-report.json");
  const checks: PreflightCheck[] = [];
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: true });

  const legacyPool = createMariaDbPool(env.legacyDatabaseUrl ?? "");
  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    await withPoolConnection(legacyPool, async (legacyConnection) => {
      await withPoolConnection(targetPool, async (targetConnection) => {
        const legacyDatabaseName =
          (await getCurrentDatabaseName(legacyConnection)) ??
          parseDatabaseName(env.legacyDatabaseUrl);
        const targetDatabaseName =
          (await getCurrentDatabaseName(targetConnection)) ??
          parseDatabaseName(env.databaseUrl);
        const envExampleDatabaseName = readEnvExampleDatabaseName(
          cliOptions.envExamplePath,
        );
        const legacyHostAndPort = parseHostAndPort(env.legacyDatabaseUrl);
        const targetHostAndPort = parseHostAndPort(env.databaseUrl);

        checks.push({
          name: "legacy-database-name",
          status:
            legacyDatabaseName === EXPECTED_LEGACY_DATABASE_NAME
              ? "ok"
              : "warning",
          detail:
            legacyDatabaseName === EXPECTED_LEGACY_DATABASE_NAME
              ? "Legacy database name matches the migration plan."
              : "Legacy database name differs from the documented source database.",
          expected: EXPECTED_LEGACY_DATABASE_NAME,
          actual: legacyDatabaseName,
        });

        checks.push({
          name: "target-database-name",
          status:
            targetDatabaseName === EXPECTED_TARGET_DATABASE_NAME
              ? "ok"
              : "blocker",
          detail:
            targetDatabaseName === EXPECTED_TARGET_DATABASE_NAME
              ? "Target database name matches the local development baseline."
              : "Target database name differs from the documented local development target and execute must not continue.",
          expected: EXPECTED_TARGET_DATABASE_NAME,
          actual: targetDatabaseName,
        });

        if (envExampleDatabaseName !== null) {
          checks.push({
            name: "env-example-target-database-mismatch",
            status:
              envExampleDatabaseName === EXPECTED_TARGET_DATABASE_NAME &&
              envExampleDatabaseName === targetDatabaseName
                ? "ok"
                : "blocker",
            detail:
              envExampleDatabaseName === EXPECTED_TARGET_DATABASE_NAME &&
              envExampleDatabaseName === targetDatabaseName
                ? ".env.example matches the active target database."
                : ".env.example does not align with the required target database name. Fix the example env before execute.",
            expected: EXPECTED_TARGET_DATABASE_NAME,
            actual: envExampleDatabaseName,
          });
        }

        checks.push({
          name: "distinct-source-and-target-databases",
          status:
            legacyHostAndPort.host === targetHostAndPort.host &&
            legacyHostAndPort.port === targetHostAndPort.port &&
            legacyDatabaseName === targetDatabaseName
              ? "blocker"
              : "ok",
          detail:
            legacyHostAndPort.host === targetHostAndPort.host &&
            legacyHostAndPort.port === targetHostAndPort.port &&
            legacyDatabaseName === targetDatabaseName
              ? "Legacy and target DATABASE_URL values point at the same database."
              : "Legacy and target DATABASE_URL values are distinct.",
        });

        const [
          missingLegacyTables,
          missingTargetTables,
          targetTableCounts,
          stagingRows,
        ] = await Promise.all([
          getMissingTables(legacyConnection, LEGACY_TABLES),
          getMissingTables(targetConnection, TARGET_TABLES),
          getTargetTableCounts(targetConnection, TARGET_TABLES),
          targetConnection.query<Array<{ schemaName: string }>>(
            `
                SELECT schema_name AS schemaName
                FROM information_schema.schemata
                WHERE schema_name = 'migration_staging'
              `,
          ),
        ]);

        checks.push({
          name: "legacy-required-tables",
          status: missingLegacyTables.length === 0 ? "ok" : "blocker",
          detail:
            missingLegacyTables.length === 0
              ? "All batch1 legacy source tables are present."
              : `Missing legacy source tables: ${missingLegacyTables.join(", ")}`,
        });

        checks.push({
          name: "target-required-tables",
          status: missingTargetTables.length === 0 ? "ok" : "blocker",
          detail:
            missingTargetTables.length === 0
              ? "All batch1 target tables are present."
              : `Missing target tables: ${missingTargetTables.join(", ")}`,
        });

        checks.push({
          name: "migration-staging-schema",
          status: stagingRows.length > 0 ? "ok" : "warning",
          detail:
            stagingRows.length > 0
              ? "migration_staging schema already exists."
              : "migration_staging schema is not present yet. Run the bootstrap script before execute.",
        });

        for (const [tableName, rowCount] of Object.entries(targetTableCounts)) {
          checks.push({
            name: `target-row-count:${tableName}`,
            status: rowCount === 0 ? "ok" : "warning",
            detail:
              rowCount === 0
                ? `${tableName} is empty, which matches the first-cutover assumption.`
                : `${tableName} already contains rows. Inspect whether those rows are safe to overwrite or reconcile before execute.`,
            actual: rowCount,
          });
        }
      });
    });
  } finally {
    await closePools(legacyPool, targetPool);
  }

  const blockers = checks.filter((check) => check.status === "blocker");
  const warnings = checks.filter((check) => check.status === "warning");
  const report = {
    scope: "batch0-preflight",
    checks,
    summary: {
      ok: checks.filter((check) => check.status === "ok").length,
      warnings: warnings.length,
      blockers: blockers.length,
    },
  };

  writeStableReport(reportPath, report);

  console.log(
    `Preflight checks completed. ok=${report.summary.ok} warnings=${warnings.length} blockers=${blockers.length} report=${reportPath}`,
  );

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
}

void main();
