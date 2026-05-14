import type { MigrationConnectionLike } from "../db";

export const DRY_RUN_REPORT_FILE_NAME =
  "sales-project-live-forward-repair-dry-run-report.json";
export const EXECUTE_REPORT_FILE_NAME =
  "sales-project-live-forward-repair-execute-report.json";
export const VALIDATE_REPORT_FILE_NAME =
  "sales-project-live-forward-repair-validate-report.json";
export const REPAIR_MIGRATION_BATCH = "sales-project-live-forward-repair";
export const EXPECTED_WRONG_PROJECT_COUNT = 21;
export const REPAIR_UPDATED_BY = "sales-project-live-forward-repair";
export const REPAIR_VOID_REASON =
  "Forward-repaired wrong legacy /product migration into sales_project; rd_project runtime is retired.";
export const PROJECT_AUDIT_PAYLOAD_KIND =
  "sales-project-live-forward-repair-project-remap";
export const LINE_AUDIT_PAYLOAD_KIND =
  "sales-project-live-forward-repair-line-remap";
export const PROJECT_AUDIT_ARCHIVE_REASON =
  "Archive wrong rd_project canonical mapping before remapping legacy sales project to sales_project.";
export const LINE_AUDIT_ARCHIVE_REASON =
  "Archive wrong rd_project_material_line canonical mapping before remapping legacy sales project material line to sales_project_material_line.";

export interface RepairSetRow {
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
  auditStatusSnapshot: string;
  inventoryEffectStatus: string;
  revisionNo: number;
  remark: string | null;
  voidReason: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
  projectTargetId: number | null;
  materialLineCount: number;
  wrongInventoryLogCount: number;
  lastWrongInventoryLogAt: string | null;
}

export interface RepairLineRow {
  legacyId: number;
  wrongRdProjectId: number;
  wrongRdProjectCode: string;
  wrongRdProjectMaterialLineId: number;
  targetCode: string;
  lineNo: number;
  materialId: number;
  materialCodeSnapshot: string;
  materialNameSnapshot: string;
  materialSpecSnapshot: string | null;
  unitCodeSnapshot: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  remark: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface DownstreamCountsRow {
  rdProjectMaterialActionCount: number;
  rdHandoffOrderLineCount: number;
  rdStocktakeOrderLineCount: number;
  documentRelationCount: number;
  documentLineRelationCount: number;
}

export interface RepairSummaryRow {
  wrongProjectCount: number;
  salesProjectCount: number;
  salesProjectLineCount: number;
  rdProjectCount: number;
  rdProjectLineCount: number;
  wrongInventoryLogCount: number;
  priceCorrectionOrderCount: number;
  priceCorrectionLineCount: number;
}

export interface ProjectTargetCountRow {
  targetType: string;
  count: number;
}

export interface SalesProjectCodeConflictRow {
  salesProjectCode: string;
  id: number;
}

export interface ProjectTargetConflictRow {
  id: number;
  targetType: string;
  targetCode: string;
  sourceDocumentType: string | null;
  sourceDocumentId: number | null;
}

export interface LiveGrowthRow {
  firstMapCreatedAt: string | null;
  lastMapCreatedAt: string | null;
  stockInCreatedAfterMap: number;
  salesOrderCreatedAfterMap: number;
}

export interface DryRunBlocker {
  reason: string;
  details?: Record<string, unknown>;
}

export interface RepairPreview {
  wouldCreateSalesProjects: number;
  wouldCreateSalesProjectMaterialLines: number;
  wouldCreateProjectTargets: number;
  wouldRetireWrongRdProjects: number;
  wouldRetireWrongInventoryLogs: number;
}

export interface RepairSnapshot {
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
  preview: RepairPreview;
  repairSet: RepairSetRow[];
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

export async function loadRepairSnapshot(
  connection: MigrationConnectionLike,
): Promise<RepairSnapshot> {
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
        rp.audit_status_snapshot AS auditStatusSnapshot,
        rp.inventory_effect_status AS inventoryEffectStatus,
        rp.revision_no AS revisionNo,
        rp.remark AS remark,
        rp.void_reason AS voidReason,
        rp.voided_by AS voidedBy,
        rp.voided_at AS voidedAt,
        rp.created_by AS createdBy,
        rp.created_at AS createdAt,
        rp.updated_by AS updatedBy,
        rp.updated_at AS updatedAt,
        rp.project_target_id AS projectTargetId,
        COALESCE(material_line_stats.materialLineCount, 0) AS materialLineCount,
        COALESCE(inventory_log_stats.wrongInventoryLogCount, 0) AS wrongInventoryLogCount,
        inventory_log_stats.lastWrongInventoryLogAt AS lastWrongInventoryLogAt
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

  const projectTargetCounts = await connection.query<ProjectTargetCountRow[]>(
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
        rdStocktakeOrderLineCount: downstreamCounts.rdStocktakeOrderLineCount,
        documentRelationCount: downstreamCounts.documentRelationCount,
        documentLineRelationCount: downstreamCounts.documentLineRelationCount,
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

  return {
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
      priceCorrectionOrderCount: numberValue(summary.priceCorrectionOrderCount),
      priceCorrectionLineCount: numberValue(summary.priceCorrectionLineCount),
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
      customerId: row.customerId === null ? null : numberValue(row.customerId),
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
      auditStatusSnapshot: row.auditStatusSnapshot,
      inventoryEffectStatus: row.inventoryEffectStatus,
      revisionNo: numberValue(row.revisionNo),
      remark: row.remark,
      voidReason: row.voidReason,
      voidedBy: row.voidedBy,
      voidedAt: stringValue(row.voidedAt),
      createdBy: row.createdBy,
      createdAt: String(row.createdAt),
      updatedBy: row.updatedBy,
      updatedAt: String(row.updatedAt),
      projectTargetId:
        row.projectTargetId === null ? null : numberValue(row.projectTargetId),
      materialLineCount: numberValue(row.materialLineCount),
      wrongInventoryLogCount: numberValue(row.wrongInventoryLogCount),
      lastWrongInventoryLogAt: stringValue(row.lastWrongInventoryLogAt),
    })),
  };
}

export async function loadRepairLineRows(
  connection: MigrationConnectionLike,
): Promise<RepairLineRow[]> {
  const rows = await connection.query<RepairLineRow[]>(
    `
      SELECT
        mpl.legacy_id AS legacyId,
        rp.id AS wrongRdProjectId,
        rp.project_code AS wrongRdProjectCode,
        mpl.target_id AS wrongRdProjectMaterialLineId,
        mpl.target_code AS targetCode,
        line_row.line_no AS lineNo,
        line_row.material_id AS materialId,
        line_row.material_code_snapshot AS materialCodeSnapshot,
        line_row.material_name_snapshot AS materialNameSnapshot,
        line_row.material_spec_snapshot AS materialSpecSnapshot,
        line_row.unit_code_snapshot AS unitCodeSnapshot,
        line_row.quantity AS quantity,
        line_row.unit_price AS unitPrice,
        line_row.amount AS amount,
        line_row.remark AS remark,
        line_row.created_by AS createdBy,
        line_row.created_at AS createdAt,
        line_row.updated_by AS updatedBy,
        line_row.updated_at AS updatedAt
      FROM migration_staging.map_project_material_line mpl
      INNER JOIN rd_project_material_line line_row
        ON line_row.id = mpl.target_id
      INNER JOIN rd_project rp
        ON rp.id = line_row.project_id
      INNER JOIN migration_staging.map_project mp
        ON mp.target_id = rp.id
       AND mp.legacy_table = 'saifute_composite_product'
       AND mp.target_table = 'rd_project'
      WHERE mpl.legacy_table = 'saifute_product_material'
        AND mpl.target_table = 'rd_project_material_line'
      ORDER BY rp.id ASC, line_row.line_no ASC
    `,
  );

  return rows.map((row) => ({
    legacyId: numberValue(row.legacyId),
    wrongRdProjectId: numberValue(row.wrongRdProjectId),
    wrongRdProjectCode: row.wrongRdProjectCode,
    wrongRdProjectMaterialLineId: numberValue(row.wrongRdProjectMaterialLineId),
    targetCode: row.targetCode,
    lineNo: numberValue(row.lineNo),
    materialId: numberValue(row.materialId),
    materialCodeSnapshot: row.materialCodeSnapshot,
    materialNameSnapshot: row.materialNameSnapshot,
    materialSpecSnapshot: row.materialSpecSnapshot,
    unitCodeSnapshot: row.unitCodeSnapshot,
    quantity: String(row.quantity),
    unitPrice: String(row.unitPrice),
    amount: String(row.amount),
    remark: row.remark,
    createdBy: row.createdBy,
    createdAt: String(row.createdAt),
    updatedBy: row.updatedBy,
    updatedAt: String(row.updatedAt),
  }));
}
