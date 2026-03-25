export const WORKSHOP_SCRAP_MIGRATION_BATCH = "batch3g-workshop-scrap";
export const BATCH1_MASTER_DATA_BATCH = "batch1-master-data";

export type ScrapOrderSourceTable = "saifute_scrap_order";
export type ScrapDetailSourceTable = "saifute_scrap_detail";
export type WorkshopMaterialOrderTypeValue = "SCRAP";
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

export interface LegacyScrapOrderRow {
  legacyTable: ScrapOrderSourceTable;
  legacyId: number;
  sourceDocumentNo: string | null;
  bizDate: string | null;
  disposalMethod: string | null;
  chargeBy: string | null;
  attn: string | null;
  remark: string | null;
  delFlag: string | number | null;
  voidReason: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface LegacyScrapDetailRow {
  legacyTable: ScrapDetailSourceTable;
  legacyId: number;
  parentLegacyTable: ScrapOrderSourceTable;
  parentLegacyId: number;
  materialLegacyId: number | string | null;
  quantity: string | number | null;
  unit: string | null;
  estimatedLoss: string | number | null;
  scrapReason: string | null;
  remark: string | null;
}

export interface LegacyScrapSnapshot {
  orders: LegacyScrapOrderRow[];
  details: LegacyScrapDetailRow[];
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

export interface ScrapDependencySnapshot {
  materialByLegacyKey: Map<string, ResolvedMaterialDependency>;
  defaultWorkshop: ResolvedWorkshopDependency | null;
  personnelByNormalizedName: Map<string, ResolvedPersonnelDependency>;
  ambiguousPersonnelNames: Set<string>;
  blockedMaterialLegacyIds: Set<number>;
  batch1Baseline: Batch1BaselineSummary;
}

export interface ScrapWarning {
  legacyTable: string;
  legacyId: number | null;
  reason: string;
  details?: Record<string, unknown>;
}

export interface ScrapGlobalBlocker {
  reason: string;
  details?: Record<string, unknown>;
}

export interface DocumentNoRewriteSummary {
  originalDocumentNo: string;
  keptLegacyTable: ScrapOrderSourceTable;
  keptLegacyId: number;
  rewritten: Array<{
    legacyTable: ScrapOrderSourceTable;
    legacyId: number;
    rewrittenDocumentNo: string;
  }>;
}

export interface ArchivedFieldPayloadRecord {
  legacyTable: string;
  legacyId: number;
  targetTable: "workshop_material_order" | "workshop_material_order_line";
  targetCode: string;
  payloadKind: "legacy-unmapped-fields";
  archiveReason: string;
  payload: Record<string, unknown>;
}

export interface ExcludedScrapPlanRecord {
  legacyTable: ScrapOrderSourceTable;
  legacyId: number;
  exclusionReason: string;
  payload: Record<string, unknown>;
}

export interface WorkshopMaterialOrderTargetInsert {
  documentNo: string;
  orderType: WorkshopMaterialOrderTypeValue;
  bizDate: string;
  handlerPersonnelId: number | null;
  workshopId: number;
  lifecycleStatus: DocumentLifecycleStatusValue;
  auditStatusSnapshot: AuditStatusSnapshotValue;
  inventoryEffectStatus: InventoryEffectStatusValue;
  revisionNo: number;
  handlerNameSnapshot: string | null;
  workshopNameSnapshot: string;
  totalQty: string;
  totalAmount: string;
  remark: string | null;
  voidReason: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface WorkshopMaterialOrderLineTargetInsert {
  lineNo: number;
  materialId: number;
  materialCodeSnapshot: string;
  materialNameSnapshot: string;
  materialSpecSnapshot: string | null;
  unitCodeSnapshot: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sourceDocumentType: null;
  sourceDocumentId: null;
  sourceDocumentLineId: null;
  remark: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ScrapLinePlanRecord {
  legacyTable: ScrapDetailSourceTable;
  legacyId: number;
  parentLegacyTable: ScrapOrderSourceTable;
  parentLegacyId: number;
  targetTable: "workshop_material_order_line";
  targetCode: string;
  target: WorkshopMaterialOrderLineTargetInsert;
  archivedPayload: ArchivedFieldPayloadRecord;
}

export interface ScrapOrderPlanRecord {
  legacyTable: ScrapOrderSourceTable;
  legacyId: number;
  sourceDocumentNo: string;
  targetTable: "workshop_material_order";
  targetCode: string;
  target: WorkshopMaterialOrderTargetInsert;
  lines: ScrapLinePlanRecord[];
  archivedPayload: ArchivedFieldPayloadRecord;
}

export interface ScrapPlanCounts {
  orders: {
    source: number;
    migrated: number;
    excluded: number;
  };
  details: {
    source: number;
    migrated: number;
    excluded: number;
  };
  sourceOrderTables: Record<ScrapOrderSourceTable, number>;
  sourceDetailTables: Record<ScrapDetailSourceTable, number>;
}

export interface ScrapMigrationPlan {
  migrationBatch: string;
  migratedOrders: ScrapOrderPlanRecord[];
  excludedDocuments: ExcludedScrapPlanRecord[];
  documentNoRewrites: DocumentNoRewriteSummary[];
  warnings: ScrapWarning[];
  globalBlockers: ScrapGlobalBlocker[];
  counts: ScrapPlanCounts;
  context: {
    defaultWorkshopCode: string | null;
    defaultWorkshopName: string | null;
    blockedMaterialLegacyIds: number[];
    batch1Baseline: Batch1BaselineSummary;
  };
}

export interface ScrapExecutionResult {
  insertedOrUpdatedOrders: number;
  insertedOrUpdatedLines: number;
  archivedPayloadCount: number;
  excludedDocumentCount: number;
}
