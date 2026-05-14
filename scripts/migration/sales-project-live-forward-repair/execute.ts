import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BusinessDocumentType } from "../../../src/shared/domain/business-document-type";
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
  type QueryResultWithInsertId,
  withPoolConnection,
} from "../db";
import { stableJsonStringify } from "../shared/deterministic";
import { writeStableReport } from "../shared/report-writer";
import {
  EXECUTE_REPORT_FILE_NAME,
  LINE_AUDIT_ARCHIVE_REASON,
  LINE_AUDIT_PAYLOAD_KIND,
  loadRepairLineRows,
  loadRepairSnapshot,
  PROJECT_AUDIT_ARCHIVE_REASON,
  PROJECT_AUDIT_PAYLOAD_KIND,
  REPAIR_MIGRATION_BATCH,
  REPAIR_UPDATED_BY,
  REPAIR_VOID_REASON,
  type RepairLineRow,
  type RepairSetRow,
} from "./shared";

const SALES_PROJECT_DOCUMENT_TYPE = BusinessDocumentType.SalesProject;

interface ProjectRepairResult {
  legacyId: number;
  wrongRdProjectId: number;
  wrongRdProjectCode: string;
  newSalesProjectId: number;
  newProjectTargetId: number;
  materialLineCount: number;
  wrongInventoryLogCount: number;
}

interface LineRepairResult {
  legacyId: number;
  wrongRdProjectId: number;
  wrongRdProjectMaterialLineId: number;
  newSalesProjectId: number;
  newSalesProjectMaterialLineId: number;
  lineNo: number;
  targetCode: string;
}

function writeMarkdownReport(reportPath: string, markdown: string): void {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, markdown, "utf8");
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

async function runInsert(
  connection: MigrationConnectionLike,
  sql: string,
  values: readonly unknown[],
): Promise<number> {
  const result =
    (await connection.query<QueryResultWithInsertId>(sql, values)) ?? {};
  const insertId = Number(result.insertId ?? 0);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new Error("Insert did not yield a valid id.");
  }
  return insertId;
}

async function insertSalesProject(
  connection: MigrationConnectionLike,
  row: RepairSetRow,
): Promise<number> {
  return runInsert(
    connection,
    `
      INSERT INTO sales_project (
        sales_project_code,
        sales_project_name,
        biz_date,
        customer_id,
        manager_personnel_id,
        workshop_id,
        stock_scope_id,
        lifecycle_status,
        audit_status_snapshot,
        inventory_effect_status,
        revision_no,
        customer_code_snapshot,
        customer_name_snapshot,
        manager_name_snapshot,
        workshop_name_snapshot,
        total_qty,
        total_amount,
        remark,
        void_reason,
        voided_by,
        voided_at,
        created_by,
        created_at,
        updated_by,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `,
    [
      row.wrongRdProjectCode,
      row.wrongRdProjectName,
      row.wrongRdProjectBizDate,
      row.customerId,
      row.managerPersonnelId,
      row.workshopId,
      row.stockScopeId,
      row.lifecycleStatus,
      row.auditStatusSnapshot,
      row.inventoryEffectStatus,
      row.revisionNo,
      row.customerCodeSnapshot,
      row.customerNameSnapshot,
      row.managerNameSnapshot,
      row.workshopNameSnapshot,
      row.totalQty,
      row.totalAmount,
      row.remark,
      row.voidReason,
      row.voidedBy,
      row.voidedAt,
      row.createdBy,
      row.createdAt,
      row.updatedBy,
      row.updatedAt,
    ],
  );
}

async function insertSalesProjectMaterialLine(
  connection: MigrationConnectionLike,
  projectId: number,
  row: RepairLineRow,
): Promise<number> {
  return runInsert(
    connection,
    `
      INSERT INTO sales_project_material_line (
        project_id,
        line_no,
        material_id,
        material_code_snapshot,
        material_name_snapshot,
        material_spec_snapshot,
        unit_code_snapshot,
        quantity,
        unit_price,
        amount,
        remark,
        created_by,
        created_at,
        updated_by,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `,
    [
      projectId,
      row.lineNo,
      row.materialId,
      row.materialCodeSnapshot,
      row.materialNameSnapshot,
      row.materialSpecSnapshot,
      row.unitCodeSnapshot,
      row.quantity,
      row.unitPrice,
      row.amount,
      row.remark,
      row.createdBy,
      row.createdAt,
      row.updatedBy,
      row.updatedAt,
    ],
  );
}

async function insertProjectTarget(
  connection: MigrationConnectionLike,
  row: RepairSetRow,
  salesProjectId: number,
): Promise<number> {
  return runInsert(
    connection,
    `
      INSERT INTO project_target (
        target_type,
        target_code,
        target_name,
        source_document_type,
        source_document_id,
        is_system_default,
        remark,
        created_by,
        created_at,
        updated_by,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, FALSE, ?, ?, NOW(), ?, NOW())
    `,
    [
      "SALES_PROJECT",
      row.wrongRdProjectCode,
      row.wrongRdProjectName,
      SALES_PROJECT_DOCUMENT_TYPE,
      salesProjectId,
      `Forward repair from wrong rd_project ${row.wrongRdProjectId}.`,
      REPAIR_UPDATED_BY,
      REPAIR_UPDATED_BY,
    ],
  );
}

async function attachProjectTarget(
  connection: MigrationConnectionLike,
  salesProjectId: number,
  projectTargetId: number,
): Promise<void> {
  const result = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE sales_project
      SET
        project_target_id = ?,
        updated_by = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [projectTargetId, REPAIR_UPDATED_BY, salesProjectId],
  );
  if (affectedRowsValue(result) !== 1) {
    throw new Error(
      `Expected to attach one sales_project target, salesProjectId=${salesProjectId}.`,
    );
  }
}

async function insertAuditPayload(
  connection: MigrationConnectionLike,
  params: {
    legacyTable: string;
    legacyId: number;
    targetTable: string;
    targetId: number;
    targetCode: string | null;
    payloadKind: string;
    archiveReason: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.archived_field_payload (
        legacy_table,
        legacy_id,
        target_table,
        target_id,
        target_code,
        payload_kind,
        archive_reason,
        payload_json,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      params.legacyTable,
      params.legacyId,
      params.targetTable,
      params.targetId,
      params.targetCode,
      params.payloadKind,
      params.archiveReason,
      stableJsonStringify(params.payload),
      REPAIR_MIGRATION_BATCH,
    ],
  );
}

async function remapProjectCanonicalRow(
  connection: MigrationConnectionLike,
  row: RepairSetRow,
  salesProjectId: number,
): Promise<void> {
  const result = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE migration_staging.map_project
      SET
        target_table = 'sales_project',
        target_id = ?,
        target_code = ?,
        migration_batch = ?
      WHERE legacy_table = 'saifute_composite_product'
        AND legacy_id = ?
        AND target_table = 'rd_project'
        AND target_id = ?
    `,
    [
      salesProjectId,
      row.wrongRdProjectCode,
      REPAIR_MIGRATION_BATCH,
      row.legacyId,
      row.wrongRdProjectId,
    ],
  );
  if (affectedRowsValue(result) !== 1) {
    throw new Error(
      `Expected to remap exactly one project canonical row, legacyId=${row.legacyId}.`,
    );
  }
}

async function remapProjectLineCanonicalRow(
  connection: MigrationConnectionLike,
  row: RepairLineRow,
  salesProjectMaterialLineId: number,
): Promise<void> {
  const result = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE migration_staging.map_project_material_line
      SET
        target_table = 'sales_project_material_line',
        target_id = ?,
        target_code = ?,
        migration_batch = ?
      WHERE legacy_table = 'saifute_product_material'
        AND legacy_id = ?
        AND target_table = 'rd_project_material_line'
        AND target_id = ?
    `,
    [
      salesProjectMaterialLineId,
      row.targetCode,
      REPAIR_MIGRATION_BATCH,
      row.legacyId,
      row.wrongRdProjectMaterialLineId,
    ],
  );
  if (affectedRowsValue(result) !== 1) {
    throw new Error(
      `Expected to remap exactly one project material line canonical row, legacyId=${row.legacyId}.`,
    );
  }
}

async function retireWrongRdProject(
  connection: MigrationConnectionLike,
  row: RepairSetRow,
): Promise<void> {
  const result = await connection.query<{ affectedRows?: number }>(
    `
      UPDATE rd_project
      SET
        lifecycle_status = 'VOIDED',
        inventory_effect_status = 'REVERSED',
        project_target_id = NULL,
        void_reason = CASE
          WHEN void_reason IS NULL OR CHAR_LENGTH(TRIM(void_reason)) = 0 THEN ?
          WHEN INSTR(void_reason, ?) > 0 THEN void_reason
          ELSE CONCAT(void_reason, ' | ', ?)
        END,
        voided_by = COALESCE(NULLIF(voided_by, ''), ?),
        voided_at = COALESCE(voided_at, NOW()),
        updated_by = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      REPAIR_VOID_REASON,
      REPAIR_VOID_REASON,
      REPAIR_VOID_REASON,
      REPAIR_UPDATED_BY,
      REPAIR_UPDATED_BY,
      row.wrongRdProjectId,
    ],
  );
  if (affectedRowsValue(result) !== 1) {
    throw new Error(
      `Expected to retire exactly one wrong rd_project, id=${row.wrongRdProjectId}.`,
    );
  }
}

function buildMarkdownReport(report: {
  mode: "execute";
  targetDatabaseName: string;
  migrationBatch: string;
  executedAt: string;
  executedProjectCount: number;
  executedLineCount: number;
  retiredWrongProjectCount: number;
  projectedWrongInventoryLogRetirementCount: number;
  projectRepairs: ProjectRepairResult[];
}): string {
  const lines = [
    "# Sales Project Live Forward Repair Execute Report",
    "",
    `模式：${report.mode}`,
    `目标库：${report.targetDatabaseName}`,
    `migration_batch：${report.migrationBatch}`,
    `执行时间：${report.executedAt}`,
    "",
    "## 结果",
    "",
    `- 已创建 \`sales_project\`：\`${report.executedProjectCount}\`。`,
    `- 已创建 \`sales_project_material_line\`：\`${report.executedLineCount}\`。`,
    `- 已退役错误 \`rd_project\`：\`${report.retiredWrongProjectCount}\`。`,
    `- 预计后续 replay 将替换的错误 \`RdProject / RD_PROJECT_OUT\` 流水数：\`${report.projectedWrongInventoryLogRetirementCount}\`。`,
    "- 本次 execute 只迁正业务真源与 canonical mapping，不触碰 `inventory_balance` / `inventory_log` / `inventory_source_usage`。",
    "",
    "## 项目迁正",
    "",
    "| legacy_id | wrong_rd_project_id | project_code | new_sales_project_id | new_project_target_id | material_lines | wrong_inventory_logs |",
    "| ---: | ---: | --- | ---: | ---: | ---: | ---: |",
  ];

  for (const row of report.projectRepairs) {
    lines.push(
      `| ${row.legacyId} | ${row.wrongRdProjectId} | ${row.wrongRdProjectCode} | ${row.newSalesProjectId} | ${row.newProjectTargetId} | ${row.materialLineCount} | ${row.wrongInventoryLogCount} |`,
    );
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function executeRepair(
  connection: MigrationConnectionLike,
  repairSet: RepairSetRow[],
  repairLineRows: RepairLineRow[],
): Promise<{
  executedProjectCount: number;
  executedLineCount: number;
  projectRepairs: ProjectRepairResult[];
  lineRepairs: LineRepairResult[];
}> {
  const linesByWrongProjectId = new Map<number, RepairLineRow[]>();
  for (const lineRow of repairLineRows) {
    const bucket = linesByWrongProjectId.get(lineRow.wrongRdProjectId) ?? [];
    bucket.push(lineRow);
    linesByWrongProjectId.set(lineRow.wrongRdProjectId, bucket);
  }

  await connection.beginTransaction();
  try {
    const projectRepairs: ProjectRepairResult[] = [];
    const lineRepairs: LineRepairResult[] = [];

    for (const repairRow of repairSet) {
      const lineRows =
        linesByWrongProjectId.get(repairRow.wrongRdProjectId) ?? [];
      if (lineRows.length !== repairRow.materialLineCount) {
        throw new Error(
          `Line count drift for wrongRdProjectId=${repairRow.wrongRdProjectId}: expected=${repairRow.materialLineCount}, actual=${lineRows.length}.`,
        );
      }

      const newSalesProjectId = await insertSalesProject(connection, repairRow);
      const newProjectTargetId = await insertProjectTarget(
        connection,
        repairRow,
        newSalesProjectId,
      );
      await attachProjectTarget(
        connection,
        newSalesProjectId,
        newProjectTargetId,
      );

      await insertAuditPayload(connection, {
        legacyTable: "saifute_composite_product",
        legacyId: repairRow.legacyId,
        targetTable: "sales_project",
        targetId: newSalesProjectId,
        targetCode: repairRow.wrongRdProjectCode,
        payloadKind: PROJECT_AUDIT_PAYLOAD_KIND,
        archiveReason: PROJECT_AUDIT_ARCHIVE_REASON,
        payload: {
          wrongRdProjectId: repairRow.wrongRdProjectId,
          wrongRdProjectCode: repairRow.wrongRdProjectCode,
          wrongProjectTargetId: repairRow.projectTargetId,
          newSalesProjectId,
          newProjectTargetId,
          mapProjectCreatedAt: repairRow.mappingCreatedAt,
        },
      });
      await remapProjectCanonicalRow(connection, repairRow, newSalesProjectId);

      for (const lineRow of lineRows) {
        const newSalesProjectMaterialLineId =
          await insertSalesProjectMaterialLine(
            connection,
            newSalesProjectId,
            lineRow,
          );
        await insertAuditPayload(connection, {
          legacyTable: "saifute_product_material",
          legacyId: lineRow.legacyId,
          targetTable: "sales_project_material_line",
          targetId: newSalesProjectMaterialLineId,
          targetCode: lineRow.targetCode,
          payloadKind: LINE_AUDIT_PAYLOAD_KIND,
          archiveReason: LINE_AUDIT_ARCHIVE_REASON,
          payload: {
            wrongRdProjectId: lineRow.wrongRdProjectId,
            wrongRdProjectMaterialLineId: lineRow.wrongRdProjectMaterialLineId,
            newSalesProjectId,
            newSalesProjectMaterialLineId,
            lineNo: lineRow.lineNo,
          },
        });
        await remapProjectLineCanonicalRow(
          connection,
          lineRow,
          newSalesProjectMaterialLineId,
        );
        lineRepairs.push({
          legacyId: lineRow.legacyId,
          wrongRdProjectId: lineRow.wrongRdProjectId,
          wrongRdProjectMaterialLineId: lineRow.wrongRdProjectMaterialLineId,
          newSalesProjectId,
          newSalesProjectMaterialLineId,
          lineNo: lineRow.lineNo,
          targetCode: lineRow.targetCode,
        });
      }

      await retireWrongRdProject(connection, repairRow);
      projectRepairs.push({
        legacyId: repairRow.legacyId,
        wrongRdProjectId: repairRow.wrongRdProjectId,
        wrongRdProjectCode: repairRow.wrongRdProjectCode,
        newSalesProjectId,
        newProjectTargetId,
        materialLineCount: lineRows.length,
        wrongInventoryLogCount: repairRow.wrongInventoryLogCount,
      });
    }

    await connection.commit();
    return {
      executedProjectCount: projectRepairs.length,
      executedLineCount: lineRepairs.length,
      projectRepairs,
      lineRepairs,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(cliOptions, EXECUTE_REPORT_FILE_NAME);
  const markdownReportPath = reportPath.replace(/\.json$/u, ".md");
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: false });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );
  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    await withPoolConnection(targetPool, async (connection) => {
      const snapshot = await loadRepairSnapshot(connection);
      if (!cliOptions.allowBlockers && snapshot.blockers.length > 0) {
        throw new Error(
          `sales-project live forward repair execute blocked: ${snapshot.blockers
            .map((blocker) => blocker.reason)
            .join(", ")}`,
        );
      }
      if (snapshot.repairSet.length === 0) {
        throw new Error(
          "sales-project live forward repair execute found no wrong rd_project repair set. The live repair may already be executed or the canonical mapping drifted.",
        );
      }

      const repairLineRows = await loadRepairLineRows(connection);
      const result = await executeRepair(
        connection,
        snapshot.repairSet,
        repairLineRows,
      );

      const report = {
        mode: "execute" as const,
        targetDatabaseName,
        migrationBatch: REPAIR_MIGRATION_BATCH,
        executedAt: new Date().toISOString(),
        executedProjectCount: result.executedProjectCount,
        executedLineCount: result.executedLineCount,
        retiredWrongProjectCount: result.projectRepairs.length,
        projectedWrongInventoryLogRetirementCount: result.projectRepairs.reduce(
          (total, row) => total + row.wrongInventoryLogCount,
          0,
        ),
        projectRepairs: result.projectRepairs,
        lineRepairs: result.lineRepairs,
      };

      writeStableReport(reportPath, report);
      writeMarkdownReport(markdownReportPath, buildMarkdownReport(report));

      console.log(
        `Sales-project live forward repair execute completed. projects=${report.executedProjectCount}, lines=${report.executedLineCount}, report=${reportPath}`,
      );
    });
  } finally {
    await closePools(targetPool);
  }
}

void main();
