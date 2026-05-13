import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MIGRATION_STAGING_SCHEMA = "migration_staging";
export const MATERIAL_CATEGORY_DICT_TYPE = "saifute_material_category";
export const EXPECTED_LEGACY_DATABASE_NAME = "saifute";
export const EXPECTED_TARGET_DATABASE_NAME = "DATABASE_URL";
export const ENV_EXAMPLE_TARGET_DATABASE_NAME = "saifute_wms";

export interface MigrationEnvironment {
  databaseUrl: string;
  legacyDatabaseUrl: string | null;
}

export interface MigrationCliOptions {
  execute: boolean;
  allowBlockers: boolean;
  resetStaging: boolean;
  reportPath: string | null;
  envExamplePath: string;
}

export function parseMigrationCliOptions(
  argv: readonly string[] = process.argv.slice(2),
): MigrationCliOptions {
  let execute = false;
  let allowBlockers = false;
  let resetStaging = false;
  let reportPath: string | null = null;
  let envExamplePath = join(process.cwd(), ".env.example");

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--execute") {
      execute = true;
      continue;
    }

    if (argument === "--allow-blockers") {
      allowBlockers = true;
      continue;
    }

    if (argument === "--reset") {
      resetStaging = true;
      continue;
    }

    if (argument === "--report") {
      reportPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (argument === "--env-example") {
      envExamplePath = argv[index + 1] ?? envExamplePath;
      index += 1;
    }
  }

  return {
    execute,
    allowBlockers,
    resetStaging,
    reportPath,
    envExamplePath,
  };
}

export function loadMigrationEnvironment(options?: {
  requireLegacyDatabaseUrl?: boolean;
}): MigrationEnvironment {
  const requireLegacyDatabaseUrl = options?.requireLegacyDatabaseUrl ?? true;
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const legacyDatabaseUrl = process.env.LEGACY_DATABASE_URL?.trim() ?? null;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for migration tooling.");
  }

  if (requireLegacyDatabaseUrl && !legacyDatabaseUrl) {
    throw new Error("LEGACY_DATABASE_URL is required for migration tooling.");
  }

  return {
    databaseUrl,
    legacyDatabaseUrl,
  };
}

export function parseDatabaseName(
  connectionString: string | null,
): string | null {
  if (!connectionString) {
    return null;
  }

  try {
    const url = new URL(connectionString);
    const databaseName = url.pathname.replace(/^\/+/, "").trim();
    return databaseName.length > 0 ? databaseName : null;
  } catch {
    return null;
  }
}

export function parseHostAndPort(connectionString: string | null): {
  host: string | null;
  port: number | null;
} {
  if (!connectionString) {
    return {
      host: null,
      port: null,
    };
  }

  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname || null,
      port: url.port ? Number(url.port) : 3306,
    };
  } catch {
    return {
      host: null,
      port: null,
    };
  }
}

export function resolveConfiguredTargetDatabaseName(
  targetConnectionString: string | null = process.env.DATABASE_URL?.trim() ??
    null,
): string | null {
  return parseDatabaseName(targetConnectionString);
}

export function assertExpectedDatabaseName(
  connectionString: string | null,
  expectedDatabaseName: string,
  label: string,
): string {
  const actualDatabaseName = parseDatabaseName(connectionString);
  const resolvedExpectedDatabaseName =
    expectedDatabaseName === EXPECTED_TARGET_DATABASE_NAME
      ? resolveConfiguredTargetDatabaseName()
      : expectedDatabaseName;

  if (!resolvedExpectedDatabaseName) {
    throw new Error(`${label} DATABASE_URL must include a database name.`);
  }

  if (actualDatabaseName !== resolvedExpectedDatabaseName) {
    throw new Error(
      `${label} database must match ${expectedDatabaseName} database ${resolvedExpectedDatabaseName}, received ${actualDatabaseName ?? "unknown"}.`,
    );
  }

  return actualDatabaseName;
}

export function assertDistinctSourceAndTargetDatabases(
  legacyConnectionString: string | null,
  targetConnectionString: string,
): void {
  const legacyDatabaseName = parseDatabaseName(legacyConnectionString);
  const targetDatabaseName = parseDatabaseName(targetConnectionString);
  const legacyHostAndPort = parseHostAndPort(legacyConnectionString);
  const targetHostAndPort = parseHostAndPort(targetConnectionString);

  if (
    legacyDatabaseName !== null &&
    targetDatabaseName !== null &&
    legacyHostAndPort.host === targetHostAndPort.host &&
    legacyHostAndPort.port === targetHostAndPort.port &&
    legacyDatabaseName === targetDatabaseName
  ) {
    throw new Error(
      "LEGACY_DATABASE_URL and DATABASE_URL must not point to the same database.",
    );
  }
}

export function readEnvExampleDatabaseName(
  envExamplePath: string,
): string | null {
  const content = readFileSync(envExamplePath, "utf8");
  const databaseUrlLine = content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.startsWith("DATABASE_URL="));

  if (!databaseUrlLine) {
    return null;
  }

  const rawValue = databaseUrlLine
    .slice("DATABASE_URL=".length)
    .replace(/^"|"$/gu, "");
  return parseDatabaseName(rawValue);
}

export function resolveReportPath(
  cliOptions: MigrationCliOptions,
  defaultFileName: string,
): string {
  return (
    cliOptions.reportPath ??
    join(process.cwd(), "scripts", "migration", "reports", defaultFileName)
  );
}
