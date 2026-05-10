import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  resolveReportPath,
} from "../config";
import {
  closePools,
  createMariaDbPool,
  type QueryResultWithInsertId,
  withPoolConnection,
} from "../db";
import { BusinessDocumentType } from "../shared/business-document-type";
import { writeStableReport } from "../shared/report-writer";

const REHEARSAL_CREATED_BY = "stock-scope-rehearsal";
const STOCK_IN_DOCUMENT_TYPE = BusinessDocumentType.StockInOrder;
const SALES_STOCK_DOCUMENT_TYPE = BusinessDocumentType.SalesStockOrder;

type Queryable = {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
};

async function getTableCounts(connection: Queryable) {
  return connection.query<Array<{ tableName: string; total: number }>>(
    `
      SELECT 'inventory_balance' AS tableName, COUNT(*) AS total FROM inventory_balance
      UNION ALL
      SELECT 'inventory_log' AS tableName, COUNT(*) AS total FROM inventory_log
      UNION ALL
      SELECT 'factory_number_reservation' AS tableName, COUNT(*) AS total FROM factory_number_reservation
      UNION ALL
      SELECT 'stock_in_order' AS tableName, COUNT(*) AS total FROM stock_in_order
      UNION ALL
      SELECT 'sales_stock_order' AS tableName, COUNT(*) AS total FROM sales_stock_order
      UNION ALL
      SELECT 'workshop_material_order' AS tableName, COUNT(*) AS total FROM workshop_material_order
      UNION ALL
      SELECT 'rd_project' AS tableName, COUNT(*) AS total FROM rd_project
      UNION ALL
      SELECT 'rd_handoff_order' AS tableName, COUNT(*) AS total FROM rd_handoff_order
      UNION ALL
      SELECT 'rd_procurement_request' AS tableName, COUNT(*) AS total FROM rd_procurement_request
      UNION ALL
      SELECT 'rd_stocktake_order' AS tableName, COUNT(*) AS total FROM rd_stocktake_order
    `,
  );
}

async function insertOne(
  connection: Queryable,
  sql: string,
  values: readonly unknown[],
): Promise<number> {
  const result = await connection.query<QueryResultWithInsertId>(sql, values);
  if (!result.insertId) {
    throw new Error(`Insert did not return insertId for SQL: ${sql}`);
  }
  return Number(result.insertId);
}

async function seed(connection: Queryable) {
  const supplierId = await insertOne(
    connection,
    `
      INSERT INTO supplier (
        supplier_code, supplier_name, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, ?, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "SUP-REHEARSAL",
      "Rehearsal Supplier",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const customerId = await insertOne(
    connection,
    `
      INSERT INTO customer (
        customer_code, customer_name, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, ?, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "CUST-REHEARSAL",
      "Rehearsal Customer",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const personnelId = await insertOne(
    connection,
    `
      INSERT INTO personnel (
        personnelCode, personnel_name, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, ?, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "USR-REHEARSAL",
      "Rehearsal Operator",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const mainWorkshopId = await insertOne(
    connection,
    `
      INSERT INTO workshop (
        workshop_name, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    ["主仓", REHEARSAL_CREATED_BY, REHEARSAL_CREATED_BY],
  );

  const rdWorkshopId = await insertOne(
    connection,
    `
      INSERT INTO workshop (
        workshop_name, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    ["研发小仓", REHEARSAL_CREATED_BY, REHEARSAL_CREATED_BY],
  );

  const workshopAttrId = await insertOne(
    connection,
    `
      INSERT INTO workshop (
        workshop_name, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    ["装配车间", REHEARSAL_CREATED_BY, REHEARSAL_CREATED_BY],
  );

  const materialId = await insertOne(
    connection,
    `
      INSERT INTO material (
        material_code, material_name, unit_code, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, ?, ?, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        material_name = VALUES(material_name),
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "MAT-REHEARSAL",
      "Rehearsal Material",
      "PCS",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const stockInOrderId = await insertOne(
    connection,
    `
      INSERT INTO stock_in_order (
        document_no, order_type, biz_date, supplier_id, handler_personnel_id,
        workshop_id, workshop_name_snapshot, total_qty, total_amount,
        created_by, created_at, updated_by, updated_at
      )
      VALUES (?, 'ACCEPTANCE', CURDATE(), ?, ?, ?, ?, 10, 100, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "SI-REHEARSAL-001",
      supplierId,
      personnelId,
      mainWorkshopId,
      "主仓",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const salesStockOrderId = await insertOne(
    connection,
    `
      INSERT INTO sales_stock_order (
        document_no, order_type, biz_date, customer_id, handler_personnel_id,
        workshop_id, workshop_name_snapshot, total_qty, total_amount,
        created_by, created_at, updated_by, updated_at
      )
      VALUES (?, 'OUTBOUND', CURDATE(), ?, ?, ?, ?, 5, 50, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "OB-REHEARSAL-001",
      customerId,
      personnelId,
      mainWorkshopId,
      "主仓",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const workshopMaterialOrderId = await insertOne(
    connection,
    `
      INSERT INTO workshop_material_order (
        document_no, order_type, biz_date, handler_personnel_id,
        workshop_id, workshop_name_snapshot, total_qty, total_amount,
        created_by, created_at, updated_by, updated_at
      )
      VALUES (?, 'PICK', CURDATE(), ?, ?, ?, 3, 30, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "WM-REHEARSAL-001",
      personnelId,
      workshopAttrId,
      "装配车间",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const projectId = await insertOne(
    connection,
    `
      INSERT INTO rd_project (
        project_code, project_name, biz_date, customer_id, supplier_id,
        manager_personnel_id, workshop_id, workshop_name_snapshot, total_qty, total_amount,
        created_by, created_at, updated_by, updated_at
      )
      VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, 2, 20, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "PRJ-REHEARSAL-001",
      "Rehearsal Project",
      customerId,
      supplierId,
      personnelId,
      workshopAttrId,
      "装配车间",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const rdProcurementRequestId = await insertOne(
    connection,
    `
      INSERT INTO rd_procurement_request (
        document_no, biz_date, project_code, project_name, supplier_id,
        handler_personnel_id, workshop_id, workshop_name_snapshot, total_qty, total_amount,
        created_by, created_at, updated_by, updated_at
      )
      VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, 4, 40, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "RDPUR-REHEARSAL-001",
      "RD-REHEARSAL-001",
      "RD Rehearsal Project",
      supplierId,
      personnelId,
      rdWorkshopId,
      "研发小仓",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const rdHandoffOrderId = await insertOne(
    connection,
    `
      INSERT INTO rd_handoff_order (
        document_no, biz_date, handler_personnel_id, source_workshop_id, target_workshop_id,
        source_workshop_name_snapshot, target_workshop_name_snapshot, total_qty, total_amount,
        created_by, created_at, updated_by, updated_at
      )
      VALUES (?, CURDATE(), ?, ?, ?, ?, ?, 1, 10, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "RDH-REHEARSAL-001",
      personnelId,
      mainWorkshopId,
      rdWorkshopId,
      "主仓",
      "研发小仓",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const rdStocktakeOrderId = await insertOne(
    connection,
    `
      INSERT INTO rd_stocktake_order (
        document_no, biz_date, workshop_id, total_book_qty, total_count_qty, total_adjustment_qty,
        counted_by, approved_by, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, CURDATE(), ?, 6, 7, 1, ?, ?, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      "RDSTK-REHEARSAL-001",
      rdWorkshopId,
      "盘点员",
      "审核员",
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  const inventoryBalanceId = await insertOne(
    connection,
    `
      INSERT INTO inventory_balance (
        material_id, stock_scope_id, quantity_on_hand, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, NULL, 10, ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [materialId, REHEARSAL_CREATED_BY, REHEARSAL_CREATED_BY],
  );

  const inventoryLogId = await insertOne(
    connection,
    `
      INSERT INTO inventory_log (
        balance_id, material_id, stock_scope_id, workshop_id, direction, operation_type,
        business_module, business_document_type, business_document_id, business_document_number,
        business_document_line_id, change_qty, before_qty, after_qty, operator_id, idempotency_key, note
      )
      VALUES (?, ?, NULL, ?, 'IN', 'ACCEPTANCE_IN', 'inbound', '${STOCK_IN_DOCUMENT_TYPE}', ?, ?, NULL, 10, 0, 10, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)
    `,
    [
      inventoryBalanceId,
      materialId,
      mainWorkshopId,
      stockInOrderId,
      "SI-REHEARSAL-001",
      String(personnelId),
      "inv-log-rehearsal-001",
      "rehearsal inventory log",
    ],
  );

  const factoryReservationId = await insertOne(
    connection,
    `
      INSERT INTO factory_number_reservation (
        material_id, workshop_id, business_document_type, business_document_id, business_document_line_id,
        start_number, end_number, created_by, created_at, updated_by, updated_at
      )
      VALUES (?, ?, '${SALES_STOCK_DOCUMENT_TYPE}', ?, 1, 'A001', 'A005', ?, NOW(), ?, NOW())
      ON DUPLICATE KEY UPDATE
        updated_by = VALUES(updated_by),
        id = LAST_INSERT_ID(id)
    `,
    [
      materialId,
      mainWorkshopId,
      salesStockOrderId,
      REHEARSAL_CREATED_BY,
      REHEARSAL_CREATED_BY,
    ],
  );

  return {
    supplierId,
    customerId,
    personnelId,
    mainWorkshopId,
    rdWorkshopId,
    workshopAttrId,
    materialId,
    stockInOrderId,
    salesStockOrderId,
    workshopMaterialOrderId,
    projectId,
    rdProcurementRequestId,
    rdHandoffOrderId,
    rdStocktakeOrderId,
    inventoryBalanceId,
    inventoryLogId,
    factoryReservationId,
  };
}

async function main(): Promise<void> {
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: false });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );
  const reportPath = resolveReportPath(
    {
      execute: false,
      allowBlockers: false,
      resetStaging: false,
      reportPath: null,
      envExamplePath: ".env.example",
    },
    "stock-scope-phase2-seed-rehearsal-report.json",
  );

  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    const report = await withPoolConnection(targetPool, async (connection) => {
      const counts = await getTableCounts(connection);

      await connection.beginTransaction();
      try {
        const seeded = await seed(connection);
        await connection.commit();
        const successReport = {
          mode: "seed-rehearsal",
          targetDatabaseName,
          seeded,
          existingCounts: counts,
        };
        writeStableReport(reportPath, successReport);
        console.log(
          `stock-scope-phase2 rehearsal seed completed. report=${reportPath}`,
        );
        return successReport;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    void report;
  } finally {
    await closePools(targetPool);
  }
}

void main();
