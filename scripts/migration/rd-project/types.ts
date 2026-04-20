export const RD_PROJECT_MIGRATION_BATCH = "batch2b-rd-project";
export const BATCH1_MASTER_DATA_BATCH = "batch1-master-data";
export const PENDING_RELATION_TYPE_RD_PROJECT_LINE_MATERIAL =
  "RD_PROJECT_LINE_MATERIAL" as const;
export const RD_PROJECT_AUTO_CREATED_MATERIAL_SOURCE_DOCUMENT_TYPE =
  "RdProjectAutoCreatedMaterial" as const;

export type RdProjectSourceTable = "saifute_composite_product";
export type RdProjectLineSourceTable = "saifute_product_material";
export type DocumentLifecycleStatusValue = "EFFECTIVE" | "VOIDED";
export type AuditStatusSnapshotValue =
  | "NOT_REQUIRED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";
export type InventoryEffectStatusValue = "POSTED" | "REVERSED";
export type PendingRelationTypeValue =
  typeof PENDING_RELATION_TYPE_RD_PROJECT_LINE_MATERIAL;

export type MasterDataBaselineEntity =
  | "materialCategory"
  | "workshop"
  | "supplier"
  | "personnel"
  | "customer"
  | "material";

/**
 * Stable rule identifiers for material resolution.
 * - legacy-material-id: primary path — material_id maps to batch1 map and is not blocked
 * - unique-normalized-name-spec-unit: fallback — materialId is null but name+spec+unit uniquely
 *   identifies exactly one material in the batch1 map
 * - auto-created-rd-project-material: no existing target material matches the normalized
 *   name+spec+unit key, so rd-project migration deterministically auto-creates one
 * - pending-null-material-id: materialId is null and materialName is also absent; no evidence at all
 * - pending-no-candidate: materialId is null, name present, but zero batch1 materials match
 * - pending-ambiguous-candidate: materialId is null, name present, but multiple batch1 materials match
 * - pending-blocked-material: line references a blocked batch1 material
 * - pending-missing-from-map: line has a material_id but it is absent from the batch1 material map
 */
export type MaterialResolutionRuleId =
  | "legacy-material-id"
  | "unique-normalized-name-spec-unit"
  | "auto-created-rd-project-material"
  | "pending-null-material-id"
  | "pending-no-candidate"
  | "pending-ambiguous-candidate"
  | "pending-blocked-material"
  | "pending-missing-from-map";

export interface LegacyRdProjectRow {
  legacyTable: RdProjectSourceTable;
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

export interface LegacyRdProjectLineRow {
  legacyTable: RdProjectLineSourceTable;
  legacyId: number;
  parentLegacyTable: RdProjectSourceTable;
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

export interface LegacyRdProjectSnapshot {
  projects: LegacyRdProjectRow[];
  lines: LegacyRdProjectLineRow[];
}

export interface ResolvedMaterialDependency {
  targetId: number | null;
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

export interface RdProjectAutoCreatedMaterialConflict {
  normalizedKey: string;
  materialCodes: string[];
}

export interface RdProjectDependencySnapshot {
  materialByLegacyKey: Map<string, ResolvedMaterialDependency>;
  autoCreatedMaterialByNormalizedKey: Map<string, ResolvedMaterialDependency>;
  autoCreatedMaterialConflicts: RdProjectAutoCreatedMaterialConflict[];
  existingMaterialCodes: Set<string>;
  customerByLegacyKey: Map<string, ResolvedCustomerDependency>;
  defaultWorkshop: ResolvedWorkshopDependency | null;
  personnelByNormalizedName: Map<string, ResolvedPersonnelDependency>;
  ambiguousPersonnelNames: Set<string>;
  blockedMaterialLegacyIds: Set<number>;
  batch1Baseline: Batch1BaselineSummary;
}

export interface RdProjectWarning {
  legacyTable: string;
  legacyId: number | null;
  reason: string;
  details?: Record<string, unknown>;
}

export interface RdProjectGlobalBlocker {
  reason: string;
  details?: Record<string, unknown>;
}

export interface ArchivedFieldPayloadRecord {
  legacyTable: string;
  legacyId: number;
  targetTable: "material" | "rd_project" | "rd_project_material_line";
  targetCode: string;
  payloadKind:
    | "legacy-unmapped-fields"
    | "pending-material-resolution-summary"
    | "rd-project-auto-created-material";
  archiveReason: string;
  payload: Record<string, unknown>;
}

export interface ExcludedRdProjectPlanRecord {
  legacyTable: RdProjectSourceTable;
  legacyId: number;
  exclusionReason: string;
  payload: Record<string, unknown>;
}

/** Auditable evidence for a single line's material resolution attempt. */
export interface MaterialResolutionEvidence {
  ruleId: MaterialResolutionRuleId;
  materialLegacyId: number | null;
  resolved: boolean;
  targetMaterialId: number | null;
  targetMaterialCode: string | null;
  pendingReason: string | null;
  /**
   * For pending-no-candidate: empty array confirming zero matches were found.
   * For pending-ambiguous-candidate: summary of all matching candidates so the backlog
   * can be reviewed and resolved without re-querying the source system.
   * Absent for other rule IDs.
   */
  candidateSummary?: Array<{
    materialCode: string;
    materialName: string;
    specModel: string | null;
    unitCode: string;
  }>;
}

/**
 * A single line that could not be resolved to a unique target material.
 * Written to pending_relations; payload includes full source evidence and rule attempt.
 */
export interface PendingLinePlanRecord {
  legacyTable: RdProjectLineSourceTable;
  legacyId: number;
  parentLegacyTable: RdProjectSourceTable;
  parentLegacyId: number;
  /** Stable, concise reason string written to pending_relations.pending_reason. */
  pendingReason: string;
  resolutionEvidence: MaterialResolutionEvidence;
  /** Source line evidence snapshot written to pending_relations.payload_json. */
  sourcePayload: Record<string, unknown>;
}

/**
 * A project that is structurally valid but has at least one line without a
 * uniquely provable material mapping.  Not admitted to live tables; evidence
 * written to pending_relations + archived_field_payload.
 */
export interface PendingRdProjectPlanRecord {
  legacyTable: RdProjectSourceTable;
  legacyId: number;
  targetProjectCodeCandidate: string;
  resolvedLineCount: number;
  pendingLineCount: number;
  pendingLines: PendingLinePlanRecord[];
  /** Header-level summary evidence written to archived_field_payload with target_id = NULL. */
  summaryArchivedPayload: ArchivedFieldPayloadRecord;
}

export interface RdProjectTargetInsert {
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

export interface RdProjectAutoCreatedMaterialTargetInsert {
  materialCode: string;
  materialName: string;
  specModel: string | null;
  unitCode: string;
  warningMinQty: null;
  warningMaxQty: null;
  status: "ACTIVE";
  creationMode: "AUTO_CREATED";
  sourceDocumentType: typeof RD_PROJECT_AUTO_CREATED_MATERIAL_SOURCE_DOCUMENT_TYPE;
  sourceDocumentId: number;
  createdBy: string;
  createdAt: null;
  updatedBy: string;
  updatedAt: null;
}

export interface RdProjectAutoCreatedMaterialPlanRecord {
  normalizedKey: string;
  representativeLineLegacyId: number;
  targetTable: "material";
  targetCode: string;
  target: RdProjectAutoCreatedMaterialTargetInsert;
  archivedPayload: ArchivedFieldPayloadRecord;
}

export interface RdProjectMaterialLineTargetInsert {
  lineNo: number;
  materialId: number | null;
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

export interface RdProjectLinePlanRecord {
  legacyTable: RdProjectLineSourceTable;
  legacyId: number;
  parentLegacyTable: RdProjectSourceTable;
  parentLegacyId: number;
  targetTable: "rd_project_material_line";
  targetCode: string;
  target: RdProjectMaterialLineTargetInsert;
  archivedPayload: ArchivedFieldPayloadRecord;
}

export interface RdProjectPlanRecord {
  legacyTable: RdProjectSourceTable;
  legacyId: number;
  targetTable: "rd_project";
  targetCode: string;
  target: RdProjectTargetInsert;
  lines: RdProjectLinePlanRecord[];
  archivedPayload: ArchivedFieldPayloadRecord;
}

export interface RdProjectPlanCounts {
  projects: {
    source: number;
    migrated: number;
    pending: number;
    excluded: number;
  };
  lines: {
    source: number;
    migrated: number;
    pending: number;
    excluded: number;
  };
  sourceProjectTables: Record<RdProjectSourceTable, number>;
  sourceLineTables: Record<RdProjectLineSourceTable, number>;
}

export interface RdProjectMigrationPlan {
  migrationBatch: string;
  autoCreatedMaterials: RdProjectAutoCreatedMaterialPlanRecord[];
  migratedProjects: RdProjectPlanRecord[];
  pendingProjects: PendingRdProjectPlanRecord[];
  excludedProjects: ExcludedRdProjectPlanRecord[];
  warnings: RdProjectWarning[];
  globalBlockers: RdProjectGlobalBlocker[];
  counts: RdProjectPlanCounts;
  context: {
    defaultWorkshopCode: string | null;
    defaultWorkshopName: string | null;
    blockedMaterialLegacyIds: number[];
    batch1Baseline: Batch1BaselineSummary;
  };
}

export interface RdProjectExecutionResult {
  insertedOrUpdatedAutoCreatedMaterials: number;
  insertedOrUpdatedProjects: number;
  insertedOrUpdatedLines: number;
  archivedPayloadCount: number;
  excludedDocumentCount: number;
  pendingRelationCount: number;
  pendingArchivedPayloadCount: number;
}
