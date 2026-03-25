export const INVENTORY_REPLAY_MIGRATION_BATCH = "batch4-inventory-replay";

export type StockDirection = "IN" | "OUT";

export type InventoryOperationType =
  | "ACCEPTANCE_IN"
  | "PRODUCTION_RECEIPT_IN"
  | "OUTBOUND_OUT"
  | "SALES_RETURN_IN"
  | "PICK_OUT"
  | "RETURN_IN"
  | "SCRAP_OUT"
  | "PROJECT_CONSUMPTION_OUT";

export interface InventoryEvent {
  bizDate: string;
  direction: StockDirection;
  operationType: InventoryOperationType;
  businessModule: string;
  businessDocumentType: string;
  businessDocumentId: number;
  businessDocumentNumber: string;
  businessDocumentLineId: number;
  materialId: number;
  workshopId: number;
  changeQty: string;
  idempotencyKey: string;
  operatorId: string | null;
  occurredAt: string;
  sortPriority: number;
}

export interface PlannedBalanceRow {
  materialId: number;
  workshopId: number;
  quantityOnHand: string;
}

export interface PlannedLogInsert {
  materialId: number;
  workshopId: number;
  direction: StockDirection;
  operationType: InventoryOperationType;
  businessModule: string;
  businessDocumentType: string;
  businessDocumentId: number;
  businessDocumentNumber: string;
  businessDocumentLineId: number;
  changeQty: string;
  beforeQty: string;
  afterQty: string;
  operatorId: string | null;
  occurredAt: string;
  idempotencyKey: string;
}

export interface InventoryReplayPlan {
  migrationBatch: string;
  events: InventoryEvent[];
  plannedBalances: PlannedBalanceRow[];
  plannedLogs: PlannedLogInsert[];
  eventCounts: Record<InventoryOperationType, number>;
  uniqueBalanceBuckets: number;
  warnings: string[];
  negativeBalanceMaterials: Array<{
    materialId: number;
    workshopId: number;
    finalQty: string;
  }>;
}

export interface InventoryReplayExecutionResult {
  insertedBalances: number;
  insertedLogs: number;
}
