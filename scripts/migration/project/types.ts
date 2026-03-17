export const PROJECT_MIGRATION_BATCH = "batch2b-project";
export const BATCH1_MASTER_DATA_BATCH = "batch1-master-data";

export type ProjectSourceTable = "saifute_composite_product";
export type ProjectLineSourceTable = "saifute_product_material";
export type DocumentLifecycleStatusValue = "EFFECTIVE" | "VOIDED";
export type AuditStatusSnapshotValue =
  | "NOT_REQUIRED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";
export type InventoryEffectStatusValue = "POSTED" | "REVERSED";

export type MasterDataBaselineEntity =
  | "materialCategory"
  | "workshop"
  | "supplier"
  | "personnel"
  | "customer"
  | "material";

export interface LegacyProjectRow {
  legacyTable: ProjectSourceTable;
  legacyId: number;
  projectName: string | null;
  customerLegacyId: number | null;
  customerName: string | null;
  classification: string | null;
  salesman: string | null;
  totalAmount: string | number | null;
  orderDate: string | null;
  outBoundDate: string | null;
  remark: string | null;
  delFlag: string | number | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface LegacyProjectLineRow {
  legacyTable: ProjectLineSourceTable;
  legacyId: number;
  parentLegacyTable: ProjectSourceTable;
  parentLegacyId: number;
  materialLegacyId: number | null;
  materialName: string | null;
  materialSpec: string | null;
  quantity: string | number | null;
  unitPrice: string | number | null;
  instruction: string | null;
  interval: string | null;
  remark: string | null;
  acceptanceDate: string | null;
  supplierLegacyId: number | null;
  unit: string | null;
  taxIncludedPrice: string | number | null;
}

export interface LegacyProjectSnapshot {
  projects: LegacyProjectRow[];
  lines: LegacyProjectLineRow[];
}

export interface ResolvedMaterialDependency {
  targetId: number;
  materialCode: string;
  materialName: string;
  specModel: string | null;
  unitCode: string;
}

export interface ResolvedWorkshopDependency {
  targetId: number;
  workshopCode: string;
  workshopName: string;
}

export interface ResolvedCustomerDependency {
  targetId: number;
  customerCode: string;
  customerName: string;
}

export interface ResolvedPersonnelDependency {
  targetId: number;
  personnelCode: string;
  personnelName: string;
}

export interface Batch1BaselineSummary {
  expectedMapCounts: Record<MasterDataBaselineEntity, number>;
  actualMapCounts: Record<MasterDataBaselineEntity, number>;
  expectedBlockedMaterialCount: number;
  actualBlockedMaterialCount: number;
  issues: string[];
}

export interface ProjectDependencySnapshot {
  materialByLegacyKey: Map<string, ResolvedMaterialDependency>;
  customerByLegacyKey: Map<string, ResolvedCustomerDependency>;
  defaultWorkshop: ResolvedWorkshopDependency | null;
  personnelByNormalizedName: Map<string, ResolvedPersonnelDependency>;
  ambiguousPersonnelNames: Set<string>;
  blockedMaterialLegacyIds: Set<number>;
  batch1Baseline: Batch1BaselineSummary;
}

export interface ProjectWarning {
  legacyTable: string;
  legacyId: number | null;
  reason: string;
  details?: Record<string, unknown>;
}

export interface ProjectGlobalBlocker {
  reason: string;
  details?: Record<string, unknown>;
}

export interface ArchivedFieldPayloadRecord {
  legacyTable: string;
  legacyId: number;
  targetTable: "project" | "project_material_line";
  targetCode: string;
  payloadKind: "legacy-unmapped-fields";
  archiveReason: string;
  payload: Record<string, unknown>;
}

export interface ExcludedProjectPlanRecord {
  legacyTable: ProjectSourceTable;
  legacyId: number;
  exclusionReason: string;
  payload: Record<string, unknown>;
}

export interface ProjectTargetInsert {
  projectCode: string;
  projectName: string;
  bizDate: string;
  customerId: number | null;
  supplierId: null;
  managerPersonnelId: number | null;
  workshopId: number;
  lifecycleStatus: DocumentLifecycleStatusValue;
  auditStatusSnapshot: AuditStatusSnapshotValue;
  inventoryEffectStatus: InventoryEffectStatusValue;
  revisionNo: number;
  customerCodeSnapshot: string | null;
  customerNameSnapshot: string | null;
  supplierCodeSnapshot: null;
  supplierNameSnapshot: null;
  managerNameSnapshot: string | null;
  workshopNameSnapshot: string;
  totalQty: string;
  totalAmount: string;
  remark: string | null;
  voidReason: null;
  voidedBy: string | null;
  voidedAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ProjectMaterialLineTargetInsert {
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
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ProjectLinePlanRecord {
  legacyTable: ProjectLineSourceTable;
  legacyId: number;
  parentLegacyTable: ProjectSourceTable;
  parentLegacyId: number;
  targetTable: "project_material_line";
  targetCode: string;
  target: ProjectMaterialLineTargetInsert;
  archivedPayload: ArchivedFieldPayloadRecord;
}

export interface ProjectPlanRecord {
  legacyTable: ProjectSourceTable;
  legacyId: number;
  targetTable: "project";
  targetCode: string;
  target: ProjectTargetInsert;
  lines: ProjectLinePlanRecord[];
  archivedPayload: ArchivedFieldPayloadRecord;
}

export interface ProjectPlanCounts {
  projects: {
    source: number;
    migrated: number;
    excluded: number;
  };
  lines: {
    source: number;
    migrated: number;
    excluded: number;
  };
  sourceProjectTables: Record<ProjectSourceTable, number>;
  sourceLineTables: Record<ProjectLineSourceTable, number>;
}

export interface ProjectMigrationPlan {
  migrationBatch: string;
  migratedProjects: ProjectPlanRecord[];
  excludedProjects: ExcludedProjectPlanRecord[];
  warnings: ProjectWarning[];
  globalBlockers: ProjectGlobalBlocker[];
  counts: ProjectPlanCounts;
  context: {
    defaultWorkshopCode: string | null;
    defaultWorkshopName: string | null;
    blockedMaterialLegacyIds: number[];
    batch1Baseline: Batch1BaselineSummary;
  };
}

export interface ProjectExecutionResult {
  insertedOrUpdatedProjects: number;
  insertedOrUpdatedLines: number;
  archivedPayloadCount: number;
  excludedDocumentCount: number;
}
