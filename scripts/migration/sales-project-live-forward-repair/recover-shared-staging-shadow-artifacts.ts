import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseMigrationCliOptions,
  resolveReportPath,
} from "../config";
import {
  closePools,
  createMariaDbPool,
  type MigrationConnectionLike,
} from "../db";
import { writeStableReport } from "../shared/report-writer";
import {
  EXPECTED_WRONG_PROJECT_COUNT,
  LINE_AUDIT_PAYLOAD_KIND,
  PROJECT_AUDIT_PAYLOAD_KIND,
  REPAIR_MIGRATION_BATCH,
} from "./shared";

const REPORT_FILE_NAME =
  "sales-project-live-forward-repair-shared-staging-recovery-report.json";
const ORIGINAL_RD_PROJECT_MIGRATION_BATCH = "batch2b-rd-project";

interface CountRow {
  total: number;
}

interface AuditPayloadRow {
  id: number;
  legacyId: number;
  targetTable: string;
  targetId: number;
  targetCode: string | null;
  payloadJson: string;
}

interface ProjectAuditPayload {
  wrongRdProjectId: number;
  wrongRdProjectCode: string;
}

interface LineAuditPayload {
  wrongRdProjectMaterialLineId: number;
}

interface RecoveryPrecheck {
  wrongRdProjectMapCount: number;
  salesProjectMapCount: number;
  wrongRdProjectLineMapCount: number;
  salesProjectLineMapCount: number;
  liveSalesProjectCount: number;
  liveSalesProjectLineCount: number;
  projectAuditCount: number;
  lineAuditCount: number;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function affectedRowsValue(value: unknown): number {
  if (
    typeof value === "object" &&
    value !== null &&
    "affectedRows" in value &&
    typeof value.affectedRows === "number"
  ) {
    return value.affectedRows;
  }
  return 0;
}

function parsePayload<T>(row: AuditPayloadRow): T {
  const parsed = JSON.parse(row.payloadJson) as T;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Invalid audit payload JSON: id=${row.id}.`);
  }
  return parsed;
}

function readRequiredNumber(
  value: unknown,
  fieldName: string,
  row: AuditPayloadRow,
): number {
  const parsed = numberValue(value);
  if (parsed <= 0) {
    throw new Error(
      `Invalid audit payload ${fieldName}: id=${row.id}, legacyId=${row.legacyId}.`,
    );
  }
  return parsed;
}

async function singleCount(
  connection: MigrationConnectionLike,
  sql: string,
  values?: readonly unknown[],
): Promise<number> {
  const rows = await connection.query<CountRow[]>(sql, values);
  return numberValue(rows[0]?.total);
}

async function loadPrecheck(
  connection: MigrationConnectionLike,
): Promise<RecoveryPrecheck> {
  const [
    wrongRdProjectMapCount,
    salesProjectMapCount,
    wrongRdProjectLineMapCount,
    salesProjectLineMapCount,
    liveSalesProjectCount,
    liveSalesProjectLineCount,
    projectAuditCount,
    lineAuditCount,
  ] = await Promise.all([
    singleCount(
      connection,
      `
        SELECT COUNT(*) AS total
        FROM migration_staging.map_project
        WHERE legacy_table = 'saifute_composite_product'
          AND target_table = 'rd_project'
      `,
    ),
    singleCount(
      connection,
      `
        SELECT COUNT(*) AS total
        FROM migration_staging.map_project
        WHERE legacy_table = 'saifute_composite_product'
          AND target_table = 'sales_project'
          AND migration_batch = ?
      `,
      [REPAIR_MIGRATION_BATCH],
    ),
    singleCount(
      connection,
      `
        SELECT COUNT(*) AS total
        FROM migration_staging.map_project_material_line
        WHERE legacy_table = 'saifute_product_material'
          AND target_table = 'rd_project_material_line'
      `,
    ),
    singleCount(
      connection,
      `
        SELECT COUNT(*) AS total
        FROM migration_staging.map_project_material_line
        WHERE legacy_table = 'saifute_product_material'
          AND target_table = 'sales_project_material_line'
          AND migration_batch = ?
      `,
      [REPAIR_MIGRATION_BATCH],
    ),
    singleCount(connection, `SELECT COUNT(*) AS total FROM sales_project`),
    singleCount(
      connection,
      `SELECT COUNT(*) AS total FROM sales_project_material_line`,
    ),
    singleCount(
      connection,
      `
        SELECT COUNT(*) AS total
        FROM migration_staging.archived_field_payload
        WHERE migration_batch = ?
          AND payload_kind = ?
      `,
      [REPAIR_MIGRATION_BATCH, PROJECT_AUDIT_PAYLOAD_KIND],
    ),
    singleCount(
      connection,
      `
        SELECT COUNT(*) AS total
        FROM migration_staging.archived_field_payload
        WHERE migration_batch = ?
          AND payload_kind = ?
      `,
      [REPAIR_MIGRATION_BATCH, LINE_AUDIT_PAYLOAD_KIND],
    ),
  ]);

  return {
    wrongRdProjectMapCount,
    salesProjectMapCount,
    wrongRdProjectLineMapCount,
    salesProjectLineMapCount,
    liveSalesProjectCount,
    liveSalesProjectLineCount,
    projectAuditCount,
    lineAuditCount,
  };
}

function isAlreadyReady(precheck: RecoveryPrecheck): boolean {
  return (
    precheck.wrongRdProjectMapCount === EXPECTED_WRONG_PROJECT_COUNT &&
    precheck.liveSalesProjectCount === 0 &&
    precheck.projectAuditCount === 0 &&
    precheck.lineAuditCount === 0
  );
}

function isRecoverableShadowStaging(precheck: RecoveryPrecheck): boolean {
  return (
    precheck.wrongRdProjectMapCount === 0 &&
    precheck.salesProjectMapCount === EXPECTED_WRONG_PROJECT_COUNT &&
    precheck.liveSalesProjectCount === 0 &&
    precheck.liveSalesProjectLineCount === 0 &&
    precheck.projectAuditCount === EXPECTED_WRONG_PROJECT_COUNT &&
    precheck.lineAuditCount > 0 &&
    precheck.salesProjectLineMapCount === precheck.lineAuditCount
  );
}

async function loadAuditPayloadRows(
  connection: MigrationConnectionLike,
  payloadKind: string,
): Promise<AuditPayloadRow[]> {
  return connection.query<AuditPayloadRow[]>(
    `
      SELECT
        id,
        legacy_id AS legacyId,
        target_table AS targetTable,
        target_id AS targetId,
        target_code AS targetCode,
        payload_json AS payloadJson
      FROM migration_staging.archived_field_payload
      WHERE migration_batch = ?
        AND payload_kind = ?
      ORDER BY id ASC
    `,
    [REPAIR_MIGRATION_BATCH, payloadKind],
  );
}

async function assertReferencedRowsExist(
  connection: MigrationConnectionLike,
  projectPayloads: readonly {
    row: AuditPayloadRow;
    payload: ProjectAuditPayload;
  }[],
  linePayloads: readonly {
    row: AuditPayloadRow;
    payload: LineAuditPayload;
  }[],
): Promise<void> {
  const wrongRdProjectIds = projectPayloads.map(
    ({ payload }) => payload.wrongRdProjectId,
  );
  const wrongRdProjectLineIds = linePayloads.map(
    ({ payload }) => payload.wrongRdProjectMaterialLineId,
  );
  const rdProjectCount = await singleCount(
    connection,
    `
      SELECT COUNT(*) AS total
      FROM rd_project
      WHERE id IN (${wrongRdProjectIds.map(() => "?").join(", ")})
    `,
    wrongRdProjectIds,
  );
  if (rdProjectCount !== wrongRdProjectIds.length) {
    throw new Error(
      `Recovery blocked: rd_project reference count mismatch, expected=${wrongRdProjectIds.length}, actual=${rdProjectCount}.`,
    );
  }

  const rdProjectLineCount = await singleCount(
    connection,
    `
      SELECT COUNT(*) AS total
      FROM rd_project_material_line
      WHERE id IN (${wrongRdProjectLineIds.map(() => "?").join(", ")})
    `,
    wrongRdProjectLineIds,
  );
  if (rdProjectLineCount !== wrongRdProjectLineIds.length) {
    throw new Error(
      `Recovery blocked: rd_project_material_line reference count mismatch, expected=${wrongRdProjectLineIds.length}, actual=${rdProjectLineCount}.`,
    );
  }
}

async function recoverSharedStaging(
  connection: MigrationConnectionLike,
): Promise<{
  restoredProjects: number;
  restoredLines: number;
  deletedAuditPayloads: number;
}> {
  const projectRows = await loadAuditPayloadRows(
    connection,
    PROJECT_AUDIT_PAYLOAD_KIND,
  );
  const lineRows = await loadAuditPayloadRows(
    connection,
    LINE_AUDIT_PAYLOAD_KIND,
  );

  const projectPayloads = projectRows.map((row) => {
    const payload = parsePayload<ProjectAuditPayload>(row);
    return {
      row,
      payload: {
        wrongRdProjectId: readRequiredNumber(
          payload.wrongRdProjectId,
          "wrongRdProjectId",
          row,
        ),
        wrongRdProjectCode: String(payload.wrongRdProjectCode ?? ""),
      },
    };
  });
  const linePayloads = lineRows.map((row) => {
    const payload = parsePayload<LineAuditPayload>(row);
    return {
      row,
      payload: {
        wrongRdProjectMaterialLineId: readRequiredNumber(
          payload.wrongRdProjectMaterialLineId,
          "wrongRdProjectMaterialLineId",
          row,
        ),
      },
    };
  });

  await assertReferencedRowsExist(connection, projectPayloads, linePayloads);
  await connection.beginTransaction();

  try {
    let restoredProjects = 0;
    let restoredLines = 0;

    for (const { row, payload } of projectPayloads) {
      const result = await connection.query(
        `
          UPDATE migration_staging.map_project
          SET
            target_table = 'rd_project',
            target_id = ?,
            target_code = ?,
            migration_batch = ?
          WHERE legacy_table = 'saifute_composite_product'
            AND legacy_id = ?
            AND target_table = 'sales_project'
            AND migration_batch = ?
        `,
        [
          payload.wrongRdProjectId,
          payload.wrongRdProjectCode,
          ORIGINAL_RD_PROJECT_MIGRATION_BATCH,
          row.legacyId,
          REPAIR_MIGRATION_BATCH,
        ],
      );
      const affectedRows = affectedRowsValue(result);
      if (affectedRows !== 1) {
        throw new Error(
          `Recovery blocked: expected one map_project row, legacyId=${row.legacyId}, affected=${affectedRows}.`,
        );
      }
      restoredProjects += 1;
    }

    for (const { row, payload } of linePayloads) {
      const result = await connection.query(
        `
          UPDATE migration_staging.map_project_material_line
          SET
            target_table = 'rd_project_material_line',
            target_id = ?,
            migration_batch = ?
          WHERE legacy_table = 'saifute_product_material'
            AND legacy_id = ?
            AND target_table = 'sales_project_material_line'
            AND migration_batch = ?
        `,
        [
          payload.wrongRdProjectMaterialLineId,
          ORIGINAL_RD_PROJECT_MIGRATION_BATCH,
          row.legacyId,
          REPAIR_MIGRATION_BATCH,
        ],
      );
      const affectedRows = affectedRowsValue(result);
      if (affectedRows !== 1) {
        throw new Error(
          `Recovery blocked: expected one map_project_material_line row, legacyId=${row.legacyId}, affected=${affectedRows}.`,
        );
      }
      restoredLines += 1;
    }

    const deleteResult = await connection.query(
      `
        DELETE FROM migration_staging.archived_field_payload
        WHERE migration_batch = ?
          AND payload_kind IN (?, ?)
      `,
      [
        REPAIR_MIGRATION_BATCH,
        PROJECT_AUDIT_PAYLOAD_KIND,
        LINE_AUDIT_PAYLOAD_KIND,
      ],
    );
    const deletedAuditPayloads = affectedRowsValue(deleteResult);

    await connection.commit();
    return {
      restoredProjects,
      restoredLines,
      deletedAuditPayloads,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(cliOptions, REPORT_FILE_NAME);
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: false });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );
  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    const connection = await targetPool.getConnection();
    try {
      const before = await loadPrecheck(connection);
      let action: "noop" | "recovered" = "noop";
      let recoveryResult = {
        restoredProjects: 0,
        restoredLines: 0,
        deletedAuditPayloads: 0,
      };

      if (isAlreadyReady(before)) {
        action = "noop";
      } else if (isRecoverableShadowStaging(before)) {
        recoveryResult = await recoverSharedStaging(connection);
        action = "recovered";
      } else {
        throw new Error(
          `Shared staging recovery blocked: unsupported state ${JSON.stringify(
            before,
          )}.`,
        );
      }

      const after = await loadPrecheck(connection);
      const report = {
        mode: "execute",
        scope: "sales-project-live-forward-repair-shared-staging-recovery",
        targetDatabaseName,
        migrationBatch: REPAIR_MIGRATION_BATCH,
        action,
        before,
        after,
        ...recoveryResult,
      };
      writeStableReport(reportPath, report);
      console.log(
        `Sales-project shared staging recovery ${action}. report=${reportPath}`,
      );
    } finally {
      connection.release();
    }
  } finally {
    await closePools(targetPool);
  }
}

void main();
