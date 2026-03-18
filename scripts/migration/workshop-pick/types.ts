export const WORKSHOP_PICK_MIGRATION_BATCH = "batch3b-workshop-pick-base";
export const BATCH1_MASTER_DATA_BATCH = "batch1-master-data";

export type PickOrderSourceTable = "saifute_pick_order";
export type PickLineSourceTable = "saifute_pick_detail";
export type WorkshopMaterialOrderTypeValue = "PICK";
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

export interface LegacyPickOrderRow {
  legacyTable: PickOrderSourceTable;
  legacyId: number;
  legacyAuditDocumentType: 3;
  sourceDocumentNo: string | null;
  projectId: string | number | null;
  bizDate: string | null;
  totalAmount: string | number | null;
  picker: string | null;
  workshopLegacyId: number | string | null;
  chargeBy: string | null;
  remark: string | null;
  delFlag: string | number | null;
  voidReason: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface LegacyPickLineRow {
  legacyTable: PickLineSourceTable;
  legacyId: number;
  parentLegacyTable: PickOrderSourceTable;
  parentLegacyId: number;
  materialLegacyId: number | string | null;
  quantity: string | number | null;
  priceEvidence: string | number | null;
  instruction: string | null;
  remark: string | null;
}

export interface LegacyAuditDocumentRow {
  legacyId: number;
  documentType: 3;
  documentId: number;
  auditStatus: string | null;
  auditor: string | null;
  auditTime: string | null;
  auditOpinion: string | null;
}

export interface LegacyPickSnapshot {
  orders: LegacyPickOrderRow[];
  lines: LegacyPickLineRow[];
  audits: LegacyAuditDocumentRow[];
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

export interface WorkshopPickDependencySnapshot {
  materialByLegacyKey: Map<string, ResolvedMaterialDependency>;
  workshopByLegacyKey: Map<string, ResolvedWorkshopDependency>;
  defaultWorkshop: ResolvedWorkshopDependency | null;
  personnelByNormalizedName: Map<string, ResolvedPersonnelDependency>;
  ambiguousPersonnelNames: Set<string>;
  blockedMaterialLegacyIds: Set<number>;
  batch1Baseline: Batch1BaselineSummary;
}

export interface WorkshopPickWarning {
  legacyTable: string;
  legacyId: number | null;
  reason: string;
  details?: Record<string, unknown>;
}

export interface WorkshopPickGlobalBlocker {
  reason: string;
  details?: Record<string, unknown>;
}

export interface DocumentNoRewriteSummary {
  originalDocumentNo: string;
  keptLegacyTable: PickOrderSourceTable;
  keptLegacyId: number;
  rewritten: Array<{
    legacyTable: PickOrderSourceTable;
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

export interface ExcludedWorkshopPickPlanRecord {
  legacyTable: PickOrderSourceTable;
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

export interface WorkshopPickLinePlanRecord {
  legacyTable: PickLineSourceTable;
  legacyId: number;
  parentLegacyTable: PickOrderSourceTable;
  parentLegacyId: number;
  targetTable: "workshop_material_order_line";
  targetCode: string;
  target: WorkshopMaterialOrderLineTargetInsert;
  archivedPayload: ArchivedFieldPayloadRecord;
}

export interface WorkshopPickOrderPlanRecord {
  legacyTable: PickOrderSourceTable;
  legacyId: number;
  sourceDocumentNo: string;
  targetTable: "workshop_material_order";
  targetCode: string;
  target: WorkshopMaterialOrderTargetInsert;
  lines: WorkshopPickLinePlanRecord[];
  archivedPayload: ArchivedFieldPayloadRecord;
}

export interface WorkshopPickPlanCounts {
  orders: {
    source: number;
    migrated: number;
    excluded: number;
  };
  lines: {
    source: number;
    migrated: number;
    excluded: number;
  };
  sourceOrderTables: Record<PickOrderSourceTable, number>;
  sourceLineTables: Record<PickLineSourceTable, number>;
}

export interface WorkshopPickMigrationPlan {
  migrationBatch: string;
  migratedOrders: WorkshopPickOrderPlanRecord[];
  excludedDocuments: ExcludedWorkshopPickPlanRecord[];
  documentNoRewrites: DocumentNoRewriteSummary[];
  warnings: WorkshopPickWarning[];
  globalBlockers: WorkshopPickGlobalBlocker[];
  counts: WorkshopPickPlanCounts;
  context: {
    defaultWorkshopCode: string | null;
    defaultWorkshopName: string | null;
    blockedMaterialLegacyIds: number[];
    batch1Baseline: Batch1BaselineSummary;
    nullWorkshopFallbackCount: number;
    priceDerivationFailureCount: number;
  };
}

export interface WorkshopPickExecutionResult {
  insertedOrUpdatedOrders: number;
  insertedOrUpdatedLines: number;
  archivedPayloadCount: number;
  excludedDocumentCount: number;
}
