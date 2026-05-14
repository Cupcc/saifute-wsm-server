import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseMigrationCliOptions,
  resolveReportPath,
} from "../config";
import { closePools, createMariaDbPool, withPoolConnection } from "../db";
import { writeStableReport } from "../shared/report-writer";

const REPORT_FILE_NAME =
  "sales-project-live-forward-repair-dry-run-report.json";
const EXPECTED_WRONG_PROJECT_COUNT = 21;

interface RepairSetRow {
  legacyId: number;
  mappingCreatedAt: string;
  wrongRdProjectId: number;
  wrongRdProjectCode: string;
  wrongRdProjectName: string;
  wrongRdProjectBizDate: string;
  customerId: number | null;
  managerPersonnelId: number | null;
  workshopId: number;
  stockScopeId: number | null;
  customerCodeSnapshot: string | null;
  customerNameSnapshot: string | null;
  managerNameSnapshot: string | null;
  workshopNameSnapshot: string;
  totalQty: string;
  totalAmount: string;
  lifecycleStatus: string;
  inventoryEffectStatus: string;
  projectTargetId: number | null;
  materialLineCount: number;
  wrongInventoryLogCount: number;
  lastWrongInventoryLogAt: string | null;
  wrongRdProjectUpdatedAt: string;
}

interface DownstreamCountsRow {
  rdProjectMaterialActionCount: number;
  rdHandoffOrderLineCount: number;
  rdStocktakeOrderLineCount: number;
  documentRelationCount: number;
  documentLineRelationCount: number;
}

interface RepairSummaryRow {
  wrongProjectCount: number;
  salesProjectCount: number;
  salesProjectLineCount: number;
  rdProjectCount: number;
  rdProjectLineCount: number;
  wrongInventoryLogCount: number;
  priceCorrectionOrderCount: number;
  priceCorrectionLineCount: number;
}

interface ProjectTargetCountRow {
  targetType: string;
  count: number;
}

interface SalesProjectCodeConflictRow {
  salesProjectCode: string;
  id: number;
}

interface ProjectTargetConflictRow {
  id: number;
  targetType: string;
  targetCode: string;
  sourceDocumentType: string | null;
  sourceDocumentId: number | null;
}

interface LiveGrowthRow {
  firstMapCreatedAt: string | null;
  lastMapCreatedAt: string | null;
  stockInCreatedAfterMap: number;
  salesOrderCreatedAfterMap: number;
}

interface DryRunBlocker {
  reason: string;
  details?: Record<string, unknown>;
}

function writeMarkdownReport(reportPath: string, markdown: string): void {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, markdown, "utf8");
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function stringValue(value: unknown): string | null {
  if (value === null || typeof value === "undefined") return null;
  return String(value);
}

function escapeCell(value: unknown): string {
  if (value === null || typeof value === "undefined") return "";
  return String(value).replace(/\|/gu, "\\|");
}

function buildMarkdownReport(report: {
  mode: "dry-run";
  targetDatabaseName: string;
  generatedAt: string;
  dbScopedExecuteEligible: boolean;
  formalExecuteEligible: boolean;
  manualPendingGates: string[];
  summary: RepairSummaryRow;
  downstreamCounts: DownstreamCountsRow;
  liveGrowthSinceWrongMapping: LiveGrowthRow;
  projectTargetCounts: ProjectTargetCountRow[];
  salesProjectCodeConflicts: SalesProjectCodeConflictRow[];
  salesProjectTargetCodeConflicts: ProjectTargetConflictRow[];
  blockers: DryRunBlocker[];
  preview: {
    wouldCreateSalesProjects: number;
    wouldCreateSalesProjectMaterialLines: number;
    wouldCreateProjectTargets: number;
    wouldRetireWrongRdProjects: number;
    wouldRetireWrongInventoryLogs: number;
  };
  repairSet: RepairSetRow[];
}): string {
  const lines = [
    "# Sales Project Live Forward Repair Dry-Run",
    "",
    `模式：${report.mode}`,
    `目标库：${report.targetDatabaseName}`,
    `生成时间：${report.generatedAt}`,
    `DB 范围 execute 资格：${report.dbScopedExecuteEligible ? "yes" : "no"}`,
    `正式 execute 资格：${report.formalExecuteEligible ? "yes" : "no"}`,
    "",
    "## 结论",
    "",
    `- 当前误写 repair set 数量：\`${report.summary.wrongProjectCount}\`。`,
    `- 当前 \`sales_project\` / \`sales_project_material_line\` 行数：\`${report.summary.salesProjectCount}\` / \`${report.summary.salesProjectLineCount}\`。`,
    `- 当前误写 \`RdProject / RD_PROJECT_OUT\` 库存流水数：\`${report.summary.wrongInventoryLogCount}\`。`,
    `- DB 范围可预演创建：\`sales_project=${report.preview.wouldCreateSalesProjects}\`、\`sales_project_material_line=${report.preview.wouldCreateSalesProjectMaterialLines}\`、\`project_target(SALES_PROJECT)=${report.preview.wouldCreateProjectTargets}\`。`,
    `- 正式 execute 仍待人工门禁：${report.manualPendingGates.join("、")}。`,
    "",
    "## DB Blockers",
    "",
    "| reason | details |",
    "| --- | --- |",
  ];

  if (report.blockers.length === 0) {
    lines.push("| none | DB 范围内未发现阻断 execute 的结构性冲突 |");
  } else {
    for (const blocker of report.blockers) {
      lines.push(
        `| ${escapeCell(blocker.reason)} | ${escapeCell(JSON.stringify(blocker.details ?? {}))} |`,
      );
    }
  }

  lines.push(
    "",
    "## Manual Gates",
    "",
    "| gate | status | note |",
    "| --- | --- | --- |",
    "| backup-required | pending | 正式库全量备份与可恢复流程需人工确认 |",
    "| shadow-rehearsal-required | pending | shadow repair dry-run -> execute -> validate -> replay dry-run -> execute -> validate 尚未完成 |",
    "| maintenance-window-required | pending | 停写窗口、preflight 重跑、post-verify 与回滚责任人尚未冻结 |",
    "",
    "## Summary",
    "",
    "| metric | value |",
    "| --- | ---: |",
    `| wrong_project_count | ${report.summary.wrongProjectCount} |`,
    `| sales_project_count | ${report.summary.salesProjectCount} |`,
    `| sales_project_material_line_count | ${report.summary.salesProjectLineCount} |`,
    `| rd_project_count | ${report.summary.rdProjectCount} |`,
    `| rd_project_material_line_count | ${report.summary.rdProjectLineCount} |`,
    `| wrong_inventory_log_count | ${report.summary.wrongInventoryLogCount} |`,
    `| price_correction_order_count | ${report.summary.priceCorrectionOrderCount} |`,
    `| price_correction_line_count | ${report.summary.priceCorrectionLineCount} |`,
    "",
    "## Downstream Counts",
    "",
    "| metric | value |",
    "| --- | ---: |",
    `| rd_project_material_action_count | ${report.downstreamCounts.rdProjectMaterialActionCount} |`,
    `| rd_handoff_order_line_count | ${report.downstreamCounts.rdHandoffOrderLineCount} |`,
    `| rd_stocktake_order_line_count | ${report.downstreamCounts.rdStocktakeOrderLineCount} |`,
    `| document_relation_count | ${report.downstreamCounts.documentRelationCount} |`,
    `| document_line_relation_count | ${report.downstreamCounts.documentLineRelationCount} |`,
    "",
    "## Live Growth Since Wrong Mapping",
    "",
    "| metric | value |",
    "| --- | --- |",
    `| first_map_created_at | ${escapeCell(report.liveGrowthSinceWrongMapping.firstMapCreatedAt)} |`,
    `| last_map_created_at | ${escapeCell(report.liveGrowthSinceWrongMapping.lastMapCreatedAt)} |`,
    `| stock_in_created_after_map | ${report.liveGrowthSinceWrongMapping.stockInCreatedAfterMap} |`,
    `| sales_order_created_after_map | ${report.liveGrowthSinceWrongMapping.salesOrderCreatedAfterMap} |`,
    "",
    "## Project Target Counts",
    "",
    "| target_type | count |",
    "| --- | ---: |",
  );

  for (const row of report.projectTargetCounts) {
    lines.push(`| ${escapeCell(row.targetType)} | ${row.count} |`);
  }

  lines.push(
    "",
    "## Repair Set",
    "",
    "| legacy_id | wrong_rd_project_id | wrong_rd_project_code | project_name | material_lines | wrong_inventory_logs | last_wrong_inventory_log_at | project_target_id | wrong_rd_project_updated_at |",
    "| ---: | ---: | --- | --- | ---: | ---: | --- | ---: | --- |",
  );

  for (const row of report.repairSet) {
    lines.push(
      `| ${row.legacyId} | ${row.wrongRdProjectId} | ${escapeCell(row.wrongRdProjectCode)} | ${escapeCell(row.wrongRdProjectName)} | ${row.materialLineCount} | ${row.wrongInventoryLogCount} | ${escapeCell(row.lastWrongInventoryLogAt)} | ${row.projectTargetId ?? ""} | ${escapeCell(row.wrongRdProjectUpdatedAt)} |`,
    );
  }

  if (report.salesProjectCodeConflicts.length > 0) {
    lines.push(
      "",
      "## Sales Project Code Conflicts",
      "",
      "| sales_project_code | id |",
      "| --- | ---: |",
    );
    for (const row of report.salesProjectCodeConflicts) {
      lines.push(`| ${escapeCell(row.salesProjectCode)} | ${row.id} |`);
    }
  }

  if (report.salesProjectTargetCodeConflicts.length > 0) {
    lines.push(
      "",
      "## Sales Project Target Conflicts",
      "",
      "| id | target_type | target_code | source_document_type | source_document_id |",
      "| ---: | --- | --- | --- | ---: |",
    );
    for (const row of report.salesProjectTargetCodeConflicts) {
      lines.push(
        `| ${row.id} | ${escapeCell(row.targetType)} | ${escapeCell(row.targetCode)} | ${escapeCell(row.sourceDocumentType)} | ${row.sourceDocumentId ?? ""} |`,
      );
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  if (cliOptions.execute) {
    throw new Error(
      "sales-project-live-forward-repair execute is not implemented yet; use the dry-run report to finish repair dry-run, execute, validate, and shadow rehearsal design first.",
    );
  }

  const reportPath = resolveReportPath(cliOptions, REPORT_FILE_NAME);
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
      const repairSet = await connection.query<RepairSetRow[]>(
        `
          SELECT
            mp.legacy_id AS legacyId,
            mp.created_at AS mappingCreatedAt,
            mp.target_id AS wrongRdProjectId,
            rp.project_code AS wrongRdProjectCode,
            rp.project_name AS wrongRdProjectName,
            DATE_FORMAT(rp.biz_date, '%Y-%m-%d') AS wrongRdProjectBizDate,
            rp.customer_id AS customerId,
            rp.manager_personnel_id AS managerPersonnelId,
            rp.workshop_id AS workshopId,
            rp.stock_scope_id AS stockScopeId,
            rp.customer_code_snapshot AS customerCodeSnapshot,
            rp.customer_name_snapshot AS customerNameSnapshot,
            rp.manager_name_snapshot AS managerNameSnapshot,
            rp.workshop_name_snapshot AS workshopNameSnapshot,
            rp.total_qty AS totalQty,
            rp.total_amount AS totalAmount,
            rp.lifecycle_status AS lifecycleStatus,
            rp.inventory_effect_status AS inventoryEffectStatus,
            rp.project_target_id AS projectTargetId,
            COALESCE(material_line_stats.materialLineCount, 0) AS materialLineCount,
            COALESCE(inventory_log_stats.wrongInventoryLogCount, 0) AS wrongInventoryLogCount,
            inventory_log_stats.lastWrongInventoryLogAt AS lastWrongInventoryLogAt,
            rp.updated_at AS wrongRdProjectUpdatedAt
          FROM migration_staging.map_project mp
          INNER JOIN rd_project rp
            ON rp.id = mp.target_id
          LEFT JOIN (
            SELECT
              project_id AS rdProjectId,
              COUNT(*) AS materialLineCount
            FROM rd_project_material_line
            GROUP BY project_id
          ) material_line_stats
            ON material_line_stats.rdProjectId = rp.id
          LEFT JOIN (
            SELECT
              business_document_id AS rdProjectId,
              COUNT(*) AS wrongInventoryLogCount,
              MAX(occurred_at) AS lastWrongInventoryLogAt
            FROM inventory_log
            WHERE business_document_type = 'RdProject'
              AND operation_type = 'RD_PROJECT_OUT'
            GROUP BY business_document_id
          ) inventory_log_stats
            ON inventory_log_stats.rdProjectId = rp.id
          WHERE mp.legacy_table = 'saifute_composite_product'
            AND mp.target_table = 'rd_project'
          ORDER BY mp.legacy_id ASC
        `,
      );

      const repairSummaryRows = await connection.query<RepairSummaryRow[]>(
        `
          SELECT
            (SELECT COUNT(*)
             FROM migration_staging.map_project
             WHERE legacy_table = 'saifute_composite_product'
               AND target_table = 'rd_project') AS wrongProjectCount,
            (SELECT COUNT(*) FROM sales_project) AS salesProjectCount,
            (SELECT COUNT(*) FROM sales_project_material_line) AS salesProjectLineCount,
            (SELECT COUNT(*) FROM rd_project) AS rdProjectCount,
            (SELECT COUNT(*) FROM rd_project_material_line) AS rdProjectLineCount,
            (SELECT COUNT(*)
             FROM inventory_log log_row
             INNER JOIN migration_staging.map_project mp
               ON mp.target_id = log_row.business_document_id
              AND mp.legacy_table = 'saifute_composite_product'
              AND mp.target_table = 'rd_project'
             WHERE log_row.business_document_type = 'RdProject'
               AND log_row.operation_type = 'RD_PROJECT_OUT') AS wrongInventoryLogCount,
            (SELECT COUNT(*) FROM stock_in_price_correction_order) AS priceCorrectionOrderCount,
            (SELECT COUNT(*) FROM stock_in_price_correction_order_line) AS priceCorrectionLineCount
        `,
      );
      const summary = repairSummaryRows[0];

      const downstreamCountRows = await connection.query<DownstreamCountsRow[]>(
        `
          SELECT
            (SELECT COUNT(*)
             FROM rd_project_material_action action_row
             INNER JOIN migration_staging.map_project mp
               ON mp.target_id = action_row.project_id
              AND mp.legacy_table = 'saifute_composite_product'
              AND mp.target_table = 'rd_project') AS rdProjectMaterialActionCount,
            (SELECT COUNT(*)
             FROM rd_handoff_order_line line_row
             INNER JOIN migration_staging.map_project mp
               ON mp.target_id = line_row.rd_project_id
              AND mp.legacy_table = 'saifute_composite_product'
              AND mp.target_table = 'rd_project') AS rdHandoffOrderLineCount,
            (SELECT COUNT(*)
             FROM rd_stocktake_order_line line_row
             INNER JOIN migration_staging.map_project mp
               ON mp.target_id = line_row.rd_project_id
              AND mp.legacy_table = 'saifute_composite_product'
              AND mp.target_table = 'rd_project') AS rdStocktakeOrderLineCount,
            (
              (SELECT COUNT(*)
               FROM document_relation relation_row
               INNER JOIN migration_staging.map_project mp
                 ON mp.target_id = relation_row.upstream_document_id
                AND mp.legacy_table = 'saifute_composite_product'
                AND mp.target_table = 'rd_project'
               WHERE relation_row.upstream_document_type = 'RdProject')
              +
              (SELECT COUNT(*)
               FROM document_relation relation_row
               INNER JOIN migration_staging.map_project mp
                 ON mp.target_id = relation_row.downstream_document_id
                AND mp.legacy_table = 'saifute_composite_product'
                AND mp.target_table = 'rd_project'
               WHERE relation_row.downstream_document_type = 'RdProject')
            ) AS documentRelationCount,
            (
              (SELECT COUNT(*)
               FROM document_line_relation relation_row
               INNER JOIN migration_staging.map_project mp
                 ON mp.target_id = relation_row.upstream_document_id
                AND mp.legacy_table = 'saifute_composite_product'
                AND mp.target_table = 'rd_project'
               WHERE relation_row.upstream_document_type = 'RdProject')
              +
              (SELECT COUNT(*)
               FROM document_line_relation relation_row
               INNER JOIN migration_staging.map_project mp
                 ON mp.target_id = relation_row.downstream_document_id
                AND mp.legacy_table = 'saifute_composite_product'
                AND mp.target_table = 'rd_project'
               WHERE relation_row.downstream_document_type = 'RdProject')
            ) AS documentLineRelationCount
        `,
      );
      const downstreamCounts = downstreamCountRows[0];

      const projectTargetCounts = await connection.query<
        ProjectTargetCountRow[]
      >(
        `
          SELECT
            target_type AS targetType,
            COUNT(*) AS count
          FROM project_target
          GROUP BY target_type
          ORDER BY target_type ASC
        `,
      );

      const salesProjectCodeConflicts = await connection.query<
        SalesProjectCodeConflictRow[]
      >(
        `
            SELECT
              sales_project_code AS salesProjectCode,
              id
            FROM sales_project
            WHERE sales_project_code IN (
              SELECT rp.project_code
              FROM migration_staging.map_project mp
              INNER JOIN rd_project rp
                ON rp.id = mp.target_id
              WHERE mp.legacy_table = 'saifute_composite_product'
                AND mp.target_table = 'rd_project'
            )
            ORDER BY sales_project_code ASC
          `,
      );

      const salesProjectTargetCodeConflicts = await connection.query<
        ProjectTargetConflictRow[]
      >(
        `
            SELECT
              id,
              target_type AS targetType,
              target_code AS targetCode,
              source_document_type AS sourceDocumentType,
              source_document_id AS sourceDocumentId
            FROM project_target
            WHERE target_type = 'SALES_PROJECT'
              AND target_code IN (
                SELECT rp.project_code
                FROM migration_staging.map_project mp
                INNER JOIN rd_project rp
                  ON rp.id = mp.target_id
                WHERE mp.legacy_table = 'saifute_composite_product'
                  AND mp.target_table = 'rd_project'
              )
            ORDER BY target_code ASC, id ASC
          `,
      );

      const liveGrowthRows = await connection.query<LiveGrowthRow[]>(
        `
          SELECT
            (SELECT MIN(created_at)
             FROM migration_staging.map_project
             WHERE legacy_table = 'saifute_composite_product'
               AND target_table = 'rd_project') AS firstMapCreatedAt,
            (SELECT MAX(created_at)
             FROM migration_staging.map_project
             WHERE legacy_table = 'saifute_composite_product'
               AND target_table = 'rd_project') AS lastMapCreatedAt,
            (SELECT COUNT(*)
             FROM stock_in_order
             WHERE created_at > (
               SELECT MAX(created_at)
               FROM migration_staging.map_project
               WHERE legacy_table = 'saifute_composite_product'
                 AND target_table = 'rd_project'
             )) AS stockInCreatedAfterMap,
            (SELECT COUNT(*)
             FROM sales_stock_order
             WHERE created_at > (
               SELECT MAX(created_at)
               FROM migration_staging.map_project
               WHERE legacy_table = 'saifute_composite_product'
                 AND target_table = 'rd_project'
             )) AS salesOrderCreatedAfterMap
        `,
      );
      const liveGrowthSinceWrongMapping = liveGrowthRows[0];

      const blockers: DryRunBlocker[] = [];
      if (summary.wrongProjectCount !== EXPECTED_WRONG_PROJECT_COUNT) {
        blockers.push({
          reason: "repair-set-drift",
          details: {
            expectedWrongProjectCount: EXPECTED_WRONG_PROJECT_COUNT,
            actualWrongProjectCount: summary.wrongProjectCount,
          },
        });
      }
      if (
        downstreamCounts.rdProjectMaterialActionCount > 0 ||
        downstreamCounts.rdHandoffOrderLineCount > 0 ||
        downstreamCounts.rdStocktakeOrderLineCount > 0 ||
        downstreamCounts.documentRelationCount > 0 ||
        downstreamCounts.documentLineRelationCount > 0
      ) {
        blockers.push({
          reason: "wrong-rd-project-downstream-consumers-exist",
          details: {
            rdProjectMaterialActionCount:
              downstreamCounts.rdProjectMaterialActionCount,
            rdHandoffOrderLineCount: downstreamCounts.rdHandoffOrderLineCount,
            rdStocktakeOrderLineCount:
              downstreamCounts.rdStocktakeOrderLineCount,
            documentRelationCount: downstreamCounts.documentRelationCount,
            documentLineRelationCount:
              downstreamCounts.documentLineRelationCount,
          },
        });
      }
      if (
        summary.priceCorrectionOrderCount > 0 ||
        summary.priceCorrectionLineCount > 0
      ) {
        blockers.push({
          reason: "price-correction-documents-exist",
          details: {
            priceCorrectionOrderCount: summary.priceCorrectionOrderCount,
            priceCorrectionLineCount: summary.priceCorrectionLineCount,
          },
        });
      }
      if (salesProjectCodeConflicts.length > 0) {
        blockers.push({
          reason: "sales-project-code-conflicts",
          details: {
            conflictCount: salesProjectCodeConflicts.length,
            codes: salesProjectCodeConflicts.map((row) => row.salesProjectCode),
          },
        });
      }
      if (salesProjectTargetCodeConflicts.length > 0) {
        blockers.push({
          reason: "sales-project-target-code-conflicts",
          details: {
            conflictCount: salesProjectTargetCodeConflicts.length,
            targetCodes: salesProjectTargetCodeConflicts.map(
              (row) => row.targetCode,
            ),
          },
        });
      }
      const wrongRdProjectsWithExistingTargets = repairSet.filter(
        (row) => row.projectTargetId !== null,
      );
      if (wrongRdProjectsWithExistingTargets.length > 0) {
        blockers.push({
          reason: "wrong-rd-project-already-has-project-target",
          details: {
            count: wrongRdProjectsWithExistingTargets.length,
            wrongRdProjectIds: wrongRdProjectsWithExistingTargets.map(
              (row) => row.wrongRdProjectId,
            ),
          },
        });
      }

      const conflictingSalesProjectCodes = new Set(
        salesProjectCodeConflicts.map((row) => row.salesProjectCode),
      );
      const conflictingSalesProjectTargetCodes = new Set(
        salesProjectTargetCodeConflicts.map((row) => row.targetCode),
      );
      const creatableRepairRows = repairSet.filter(
        (row) =>
          !conflictingSalesProjectCodes.has(row.wrongRdProjectCode) &&
          !conflictingSalesProjectTargetCodes.has(row.wrongRdProjectCode),
      );
      const preview = {
        wouldCreateSalesProjects: creatableRepairRows.length,
        wouldCreateSalesProjectMaterialLines: creatableRepairRows.reduce(
          (total, row) => total + row.materialLineCount,
          0,
        ),
        wouldCreateProjectTargets: creatableRepairRows.length,
        wouldRetireWrongRdProjects: repairSet.length,
        wouldRetireWrongInventoryLogs: repairSet.reduce(
          (total, row) => total + row.wrongInventoryLogCount,
          0,
        ),
      };

      const report = {
        mode: "dry-run" as const,
        targetDatabaseName,
        generatedAt: new Date().toISOString(),
        dbScopedExecuteEligible: blockers.length === 0,
        formalExecuteEligible: false,
        manualPendingGates: [
          "backup-required",
          "shadow-rehearsal-required",
          "maintenance-window-required",
        ],
        summary: {
          wrongProjectCount: numberValue(summary.wrongProjectCount),
          salesProjectCount: numberValue(summary.salesProjectCount),
          salesProjectLineCount: numberValue(summary.salesProjectLineCount),
          rdProjectCount: numberValue(summary.rdProjectCount),
          rdProjectLineCount: numberValue(summary.rdProjectLineCount),
          wrongInventoryLogCount: numberValue(summary.wrongInventoryLogCount),
          priceCorrectionOrderCount: numberValue(
            summary.priceCorrectionOrderCount,
          ),
          priceCorrectionLineCount: numberValue(
            summary.priceCorrectionLineCount,
          ),
        },
        downstreamCounts: {
          rdProjectMaterialActionCount: numberValue(
            downstreamCounts.rdProjectMaterialActionCount,
          ),
          rdHandoffOrderLineCount: numberValue(
            downstreamCounts.rdHandoffOrderLineCount,
          ),
          rdStocktakeOrderLineCount: numberValue(
            downstreamCounts.rdStocktakeOrderLineCount,
          ),
          documentRelationCount: numberValue(
            downstreamCounts.documentRelationCount,
          ),
          documentLineRelationCount: numberValue(
            downstreamCounts.documentLineRelationCount,
          ),
        },
        liveGrowthSinceWrongMapping: {
          firstMapCreatedAt: stringValue(
            liveGrowthSinceWrongMapping.firstMapCreatedAt,
          ),
          lastMapCreatedAt: stringValue(
            liveGrowthSinceWrongMapping.lastMapCreatedAt,
          ),
          stockInCreatedAfterMap: numberValue(
            liveGrowthSinceWrongMapping.stockInCreatedAfterMap,
          ),
          salesOrderCreatedAfterMap: numberValue(
            liveGrowthSinceWrongMapping.salesOrderCreatedAfterMap,
          ),
        },
        projectTargetCounts: projectTargetCounts.map((row) => ({
          targetType: row.targetType,
          count: numberValue(row.count),
        })),
        salesProjectCodeConflicts: salesProjectCodeConflicts.map((row) => ({
          salesProjectCode: row.salesProjectCode,
          id: numberValue(row.id),
        })),
        salesProjectTargetCodeConflicts: salesProjectTargetCodeConflicts.map(
          (row) => ({
            id: numberValue(row.id),
            targetType: row.targetType,
            targetCode: row.targetCode,
            sourceDocumentType: row.sourceDocumentType,
            sourceDocumentId:
              row.sourceDocumentId === null
                ? null
                : numberValue(row.sourceDocumentId),
          }),
        ),
        blockers,
        preview,
        repairSet: repairSet.map((row) => ({
          legacyId: numberValue(row.legacyId),
          mappingCreatedAt: String(row.mappingCreatedAt),
          wrongRdProjectId: numberValue(row.wrongRdProjectId),
          wrongRdProjectCode: row.wrongRdProjectCode,
          wrongRdProjectName: row.wrongRdProjectName,
          wrongRdProjectBizDate: row.wrongRdProjectBizDate,
          customerId:
            row.customerId === null ? null : numberValue(row.customerId),
          managerPersonnelId:
            row.managerPersonnelId === null
              ? null
              : numberValue(row.managerPersonnelId),
          workshopId: numberValue(row.workshopId),
          stockScopeId:
            row.stockScopeId === null ? null : numberValue(row.stockScopeId),
          customerCodeSnapshot: row.customerCodeSnapshot,
          customerNameSnapshot: row.customerNameSnapshot,
          managerNameSnapshot: row.managerNameSnapshot,
          workshopNameSnapshot: row.workshopNameSnapshot,
          totalQty: String(row.totalQty),
          totalAmount: String(row.totalAmount),
          lifecycleStatus: row.lifecycleStatus,
          inventoryEffectStatus: row.inventoryEffectStatus,
          projectTargetId:
            row.projectTargetId === null
              ? null
              : numberValue(row.projectTargetId),
          materialLineCount: numberValue(row.materialLineCount),
          wrongInventoryLogCount: numberValue(row.wrongInventoryLogCount),
          lastWrongInventoryLogAt: stringValue(row.lastWrongInventoryLogAt),
          wrongRdProjectUpdatedAt: String(row.wrongRdProjectUpdatedAt),
        })),
      };

      writeStableReport(reportPath, report);
      writeMarkdownReport(markdownReportPath, buildMarkdownReport(report));

      console.log(
        `Sales-project live forward repair dry-run completed. blockers=${report.blockers.length}, report=${reportPath}`,
      );
      if (report.blockers.length > 0) {
        console.log(
          "BLOCKED: DB-scoped blockers must be resolved before execute.",
        );
      }
      if (report.manualPendingGates.length > 0) {
        console.log(
          `PENDING MANUAL GATES: ${report.manualPendingGates.join(", ")}`,
        );
      }
    });
  } finally {
    await closePools(targetPool);
  }
}

if (require.main === module) {
  void main();
}
