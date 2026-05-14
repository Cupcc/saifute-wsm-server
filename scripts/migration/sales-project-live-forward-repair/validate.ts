import { readFileSync } from "node:fs";
import { BusinessDocumentType } from "../../../src/shared/domain/business-document-type";
import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseMigrationCliOptions,
  resolveReportPath,
} from "../config";
import { closePools, createMariaDbPool, withPoolConnection } from "../db";
import { writeStableReport } from "../shared/report-writer";
import {
  EXECUTE_REPORT_FILE_NAME,
  LINE_AUDIT_PAYLOAD_KIND,
  loadRepairSnapshot,
  PROJECT_AUDIT_PAYLOAD_KIND,
  REPAIR_MIGRATION_BATCH,
  VALIDATE_REPORT_FILE_NAME,
} from "./shared";

const SALES_PROJECT_DOCUMENT_TYPE = BusinessDocumentType.SalesProject;

interface ExecuteProjectRepair {
  legacyId: number;
  wrongRdProjectId: number;
  wrongRdProjectCode: string;
  newSalesProjectId: number;
  newProjectTargetId: number;
  materialLineCount: number;
  wrongInventoryLogCount: number;
}

interface ExecuteLineRepair {
  legacyId: number;
  wrongRdProjectId: number;
  wrongRdProjectMaterialLineId: number;
  newSalesProjectId: number;
  newSalesProjectMaterialLineId: number;
  lineNo: number;
  targetCode: string;
}

interface ExecuteReport {
  mode: "execute";
  targetDatabaseName: string;
  migrationBatch: string;
  executedAt: string;
  executedProjectCount: number;
  executedLineCount: number;
  retiredWrongProjectCount: number;
  projectedWrongInventoryLogRetirementCount: number;
  projectRepairs: ExecuteProjectRepair[];
  lineRepairs: ExecuteLineRepair[];
}

function buildPlaceholders(size: number): string {
  return Array.from({ length: size }, () => "?").join(", ");
}

function readExecuteReport(path: string): ExecuteReport {
  return JSON.parse(readFileSync(path, "utf8")) as ExecuteReport;
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(cliOptions, VALIDATE_REPORT_FILE_NAME);
  const executeReportPath = cliOptions.reportPath
    ? cliOptions.reportPath.replace(
        VALIDATE_REPORT_FILE_NAME,
        EXECUTE_REPORT_FILE_NAME,
      )
    : resolveReportPath(cliOptions, EXECUTE_REPORT_FILE_NAME);
  const executeReport = readExecuteReport(executeReportPath);
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: false });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );
  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    await withPoolConnection(targetPool, async (connection) => {
      const validationErrors: string[] = [];
      const snapshot = await loadRepairSnapshot(connection);

      if (executeReport.mode !== "execute") {
        validationErrors.push("execute report mode is not execute.");
      }
      if (executeReport.migrationBatch !== REPAIR_MIGRATION_BATCH) {
        validationErrors.push(
          `execute report migrationBatch drifted: expected=${REPAIR_MIGRATION_BATCH}, actual=${executeReport.migrationBatch}.`,
        );
      }
      if (snapshot.summary.wrongProjectCount !== 0) {
        validationErrors.push(
          `wrong rd_project repair set still exists after execute: count=${snapshot.summary.wrongProjectCount}.`,
        );
      }

      const projectIds = executeReport.projectRepairs.map(
        (row) => row.newSalesProjectId,
      );
      const wrongProjectIds = executeReport.projectRepairs.map(
        (row) => row.wrongRdProjectId,
      );
      const projectTargetIds = executeReport.projectRepairs.map(
        (row) => row.newProjectTargetId,
      );
      const projectLegacyIds = executeReport.projectRepairs.map(
        (row) => row.legacyId,
      );
      const lineIds = executeReport.lineRepairs.map(
        (row) => row.newSalesProjectMaterialLineId,
      );
      const lineLegacyIds = executeReport.lineRepairs.map(
        (row) => row.legacyId,
      );

      const salesProjects =
        projectIds.length === 0
          ? []
          : await connection.query<
              Array<{
                id: number;
                salesProjectCode: string;
                projectTargetId: number | null;
                lifecycleStatus: string;
                inventoryEffectStatus: string;
              }>
            >(
              `
                SELECT
                  id,
                  sales_project_code AS salesProjectCode,
                  project_target_id AS projectTargetId,
                  lifecycle_status AS lifecycleStatus,
                  inventory_effect_status AS inventoryEffectStatus
                FROM sales_project
                WHERE id IN (${buildPlaceholders(projectIds.length)})
              `,
              projectIds,
            );
      const salesProjectById = new Map(
        salesProjects.map((row) => [Number(row.id), row] as const),
      );

      const wrongRdProjects =
        wrongProjectIds.length === 0
          ? []
          : await connection.query<
              Array<{
                id: number;
                lifecycleStatus: string;
                inventoryEffectStatus: string;
                projectTargetId: number | null;
              }>
            >(
              `
                SELECT
                  id,
                  lifecycle_status AS lifecycleStatus,
                  inventory_effect_status AS inventoryEffectStatus,
                  project_target_id AS projectTargetId
                FROM rd_project
                WHERE id IN (${buildPlaceholders(wrongProjectIds.length)})
              `,
              wrongProjectIds,
            );
      const wrongRdProjectById = new Map(
        wrongRdProjects.map((row) => [Number(row.id), row] as const),
      );

      const projectTargets =
        projectTargetIds.length === 0
          ? []
          : await connection.query<
              Array<{
                id: number;
                targetType: string;
                targetCode: string;
                sourceDocumentType: string | null;
                sourceDocumentId: number | null;
              }>
            >(
              `
                SELECT
                  id,
                  target_type AS targetType,
                  target_code AS targetCode,
                  source_document_type AS sourceDocumentType,
                  source_document_id AS sourceDocumentId
                FROM project_target
                WHERE id IN (${buildPlaceholders(projectTargetIds.length)})
              `,
              projectTargetIds,
            );
      const projectTargetById = new Map(
        projectTargets.map((row) => [Number(row.id), row] as const),
      );

      const canonicalProjects =
        projectLegacyIds.length === 0
          ? []
          : await connection.query<
              Array<{
                legacyId: number;
                targetTable: string;
                targetId: number;
                targetCode: string | null;
                migrationBatch: string;
              }>
            >(
              `
                SELECT
                  legacy_id AS legacyId,
                  target_table AS targetTable,
                  target_id AS targetId,
                  target_code AS targetCode,
                  migration_batch AS migrationBatch
                FROM migration_staging.map_project
                WHERE legacy_table = 'saifute_composite_product'
                  AND legacy_id IN (${buildPlaceholders(projectLegacyIds.length)})
              `,
              projectLegacyIds,
            );
      const canonicalProjectByLegacyId = new Map(
        canonicalProjects.map((row) => [Number(row.legacyId), row] as const),
      );

      const salesProjectLines =
        lineIds.length === 0
          ? []
          : await connection.query<
              Array<{
                id: number;
                projectId: number;
                lineNo: number;
              }>
            >(
              `
                SELECT
                  id,
                  project_id AS projectId,
                  line_no AS lineNo
                FROM sales_project_material_line
                WHERE id IN (${buildPlaceholders(lineIds.length)})
              `,
              lineIds,
            );
      const salesProjectLineById = new Map(
        salesProjectLines.map((row) => [Number(row.id), row] as const),
      );

      const canonicalLines =
        lineLegacyIds.length === 0
          ? []
          : await connection.query<
              Array<{
                legacyId: number;
                targetTable: string;
                targetId: number;
                targetCode: string | null;
                migrationBatch: string;
              }>
            >(
              `
                SELECT
                  legacy_id AS legacyId,
                  target_table AS targetTable,
                  target_id AS targetId,
                  target_code AS targetCode,
                  migration_batch AS migrationBatch
                FROM migration_staging.map_project_material_line
                WHERE legacy_table = 'saifute_product_material'
                  AND legacy_id IN (${buildPlaceholders(lineLegacyIds.length)})
              `,
              lineLegacyIds,
            );
      const canonicalLineByLegacyId = new Map(
        canonicalLines.map((row) => [Number(row.legacyId), row] as const),
      );

      const auditRows =
        executeReport.projectRepairs.length +
          executeReport.lineRepairs.length ===
        0
          ? []
          : await connection.query<
              Array<{ payloadKind: string; total: number }>
            >(
              `
                SELECT
                  payload_kind AS payloadKind,
                  COUNT(*) AS total
                FROM migration_staging.archived_field_payload
                WHERE migration_batch = ?
                  AND payload_kind IN (?, ?)
                GROUP BY payload_kind
              `,
              [
                executeReport.migrationBatch,
                PROJECT_AUDIT_PAYLOAD_KIND,
                LINE_AUDIT_PAYLOAD_KIND,
              ],
            );
      const auditCountByKind = new Map(
        auditRows.map((row) => [row.payloadKind, Number(row.total)] as const),
      );

      for (const projectRepair of executeReport.projectRepairs) {
        const salesProject = salesProjectById.get(
          projectRepair.newSalesProjectId,
        );
        if (!salesProject) {
          validationErrors.push(
            `sales_project missing: id=${projectRepair.newSalesProjectId}.`,
          );
          continue;
        }
        if (
          salesProject.salesProjectCode !== projectRepair.wrongRdProjectCode
        ) {
          validationErrors.push(
            `sales_project code drift: id=${projectRepair.newSalesProjectId}, expected=${projectRepair.wrongRdProjectCode}, actual=${salesProject.salesProjectCode}.`,
          );
        }
        if (
          Number(salesProject.projectTargetId ?? 0) !==
          projectRepair.newProjectTargetId
        ) {
          validationErrors.push(
            `sales_project project_target_id drift: id=${projectRepair.newSalesProjectId}, expected=${projectRepair.newProjectTargetId}, actual=${salesProject.projectTargetId ?? "null"}.`,
          );
        }

        const wrongRdProject = wrongRdProjectById.get(
          projectRepair.wrongRdProjectId,
        );
        if (!wrongRdProject) {
          validationErrors.push(
            `wrong rd_project missing: id=${projectRepair.wrongRdProjectId}.`,
          );
        } else {
          if (wrongRdProject.lifecycleStatus !== "VOIDED") {
            validationErrors.push(
              `wrong rd_project lifecycle drift: id=${projectRepair.wrongRdProjectId}, actual=${wrongRdProject.lifecycleStatus}.`,
            );
          }
          if (wrongRdProject.inventoryEffectStatus !== "REVERSED") {
            validationErrors.push(
              `wrong rd_project inventoryEffect drift: id=${projectRepair.wrongRdProjectId}, actual=${wrongRdProject.inventoryEffectStatus}.`,
            );
          }
          if (wrongRdProject.projectTargetId !== null) {
            validationErrors.push(
              `wrong rd_project still has project_target_id: id=${projectRepair.wrongRdProjectId}, actual=${wrongRdProject.projectTargetId}.`,
            );
          }
        }

        const projectTarget = projectTargetById.get(
          projectRepair.newProjectTargetId,
        );
        if (!projectTarget) {
          validationErrors.push(
            `project_target missing: id=${projectRepair.newProjectTargetId}.`,
          );
        } else {
          if (projectTarget.targetType !== "SALES_PROJECT") {
            validationErrors.push(
              `project_target type drift: id=${projectRepair.newProjectTargetId}, actual=${projectTarget.targetType}.`,
            );
          }
          if (projectTarget.targetCode !== projectRepair.wrongRdProjectCode) {
            validationErrors.push(
              `project_target code drift: id=${projectRepair.newProjectTargetId}, expected=${projectRepair.wrongRdProjectCode}, actual=${projectTarget.targetCode}.`,
            );
          }
          if (
            projectTarget.sourceDocumentType !== SALES_PROJECT_DOCUMENT_TYPE
          ) {
            validationErrors.push(
              `project_target sourceDocumentType drift: id=${projectRepair.newProjectTargetId}, actual=${projectTarget.sourceDocumentType ?? "null"}.`,
            );
          }
          if (
            Number(projectTarget.sourceDocumentId ?? 0) !==
            projectRepair.newSalesProjectId
          ) {
            validationErrors.push(
              `project_target sourceDocumentId drift: id=${projectRepair.newProjectTargetId}, expected=${projectRepair.newSalesProjectId}, actual=${projectTarget.sourceDocumentId ?? "null"}.`,
            );
          }
        }

        const canonicalProject = canonicalProjectByLegacyId.get(
          projectRepair.legacyId,
        );
        if (!canonicalProject) {
          validationErrors.push(
            `map_project missing: legacyId=${projectRepair.legacyId}.`,
          );
        } else {
          if (canonicalProject.targetTable !== "sales_project") {
            validationErrors.push(
              `map_project target_table drift: legacyId=${projectRepair.legacyId}, actual=${canonicalProject.targetTable}.`,
            );
          }
          if (
            Number(canonicalProject.targetId) !==
            projectRepair.newSalesProjectId
          ) {
            validationErrors.push(
              `map_project target_id drift: legacyId=${projectRepair.legacyId}, expected=${projectRepair.newSalesProjectId}, actual=${canonicalProject.targetId}.`,
            );
          }
          if (
            canonicalProject.targetCode !== projectRepair.wrongRdProjectCode
          ) {
            validationErrors.push(
              `map_project target_code drift: legacyId=${projectRepair.legacyId}, expected=${projectRepair.wrongRdProjectCode}, actual=${canonicalProject.targetCode ?? "null"}.`,
            );
          }
          if (
            canonicalProject.migrationBatch !== executeReport.migrationBatch
          ) {
            validationErrors.push(
              `map_project migration_batch drift: legacyId=${projectRepair.legacyId}, actual=${canonicalProject.migrationBatch}.`,
            );
          }
        }
      }

      for (const lineRepair of executeReport.lineRepairs) {
        const salesProjectLine = salesProjectLineById.get(
          lineRepair.newSalesProjectMaterialLineId,
        );
        if (!salesProjectLine) {
          validationErrors.push(
            `sales_project_material_line missing: id=${lineRepair.newSalesProjectMaterialLineId}.`,
          );
          continue;
        }
        if (
          Number(salesProjectLine.projectId) !== lineRepair.newSalesProjectId
        ) {
          validationErrors.push(
            `sales_project_material_line project drift: id=${lineRepair.newSalesProjectMaterialLineId}, expectedProjectId=${lineRepair.newSalesProjectId}, actualProjectId=${salesProjectLine.projectId}.`,
          );
        }
        if (Number(salesProjectLine.lineNo) !== lineRepair.lineNo) {
          validationErrors.push(
            `sales_project_material_line line_no drift: id=${lineRepair.newSalesProjectMaterialLineId}, expected=${lineRepair.lineNo}, actual=${salesProjectLine.lineNo}.`,
          );
        }

        const canonicalLine = canonicalLineByLegacyId.get(lineRepair.legacyId);
        if (!canonicalLine) {
          validationErrors.push(
            `map_project_material_line missing: legacyId=${lineRepair.legacyId}.`,
          );
        } else {
          if (canonicalLine.targetTable !== "sales_project_material_line") {
            validationErrors.push(
              `map_project_material_line target_table drift: legacyId=${lineRepair.legacyId}, actual=${canonicalLine.targetTable}.`,
            );
          }
          if (
            Number(canonicalLine.targetId) !==
            lineRepair.newSalesProjectMaterialLineId
          ) {
            validationErrors.push(
              `map_project_material_line target_id drift: legacyId=${lineRepair.legacyId}, expected=${lineRepair.newSalesProjectMaterialLineId}, actual=${canonicalLine.targetId}.`,
            );
          }
          if (canonicalLine.targetCode !== lineRepair.targetCode) {
            validationErrors.push(
              `map_project_material_line target_code drift: legacyId=${lineRepair.legacyId}, expected=${lineRepair.targetCode}, actual=${canonicalLine.targetCode ?? "null"}.`,
            );
          }
          if (canonicalLine.migrationBatch !== executeReport.migrationBatch) {
            validationErrors.push(
              `map_project_material_line migration_batch drift: legacyId=${lineRepair.legacyId}, actual=${canonicalLine.migrationBatch}.`,
            );
          }
        }
      }

      if (
        auditCountByKind.get(PROJECT_AUDIT_PAYLOAD_KIND) !==
        executeReport.projectRepairs.length
      ) {
        validationErrors.push(
          `project audit payload count drift: expected=${executeReport.projectRepairs.length}, actual=${auditCountByKind.get(PROJECT_AUDIT_PAYLOAD_KIND) ?? 0}.`,
        );
      }
      if (
        auditCountByKind.get(LINE_AUDIT_PAYLOAD_KIND) !==
        executeReport.lineRepairs.length
      ) {
        validationErrors.push(
          `line audit payload count drift: expected=${executeReport.lineRepairs.length}, actual=${auditCountByKind.get(LINE_AUDIT_PAYLOAD_KIND) ?? 0}.`,
        );
      }

      const report = {
        scope: "sales-project-live-forward-repair-validate",
        targetDatabaseName,
        executeReportPath,
        executeReportMigrationBatch: executeReport.migrationBatch,
        currentRepairSummary: snapshot.summary,
        validationErrors,
        valid: validationErrors.length === 0,
      };

      writeStableReport(reportPath, report);

      if (validationErrors.length > 0) {
        throw new Error(
          `sales-project live forward repair validation failed: ${validationErrors.join(" | ")}`,
        );
      }

      console.log(
        `sales-project live forward repair validation passed. report=${reportPath}`,
      );
    });
  } finally {
    await closePools(targetPool);
  }
}

void main();
