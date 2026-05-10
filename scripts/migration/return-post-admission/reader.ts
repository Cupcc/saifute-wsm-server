import type {
  AdmittedLineRow,
  AdmittedOrderRow,
  AdmittedStockInLineRow,
  PostAdmissionBaseline,
  UpstreamOutboundLineRow,
  UpstreamPickLineRow,
} from "./types";

export async function readPostAdmissionBaseline(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<PostAdmissionBaseline> {
  const salesReturnOrders = await connection.query<AdmittedOrderRow[]>(
    `
      SELECT
        id,
        document_no AS documentNo,
        order_type AS orderType,
        DATE_FORMAT(biz_date, '%Y-%m-%d') AS bizDate,
        workshop_id AS workshopId,
        customer_id AS customerId,
        lifecycle_status AS lifecycleStatus,
        audit_status_snapshot AS auditStatusSnapshot,
        inventory_effect_status AS inventoryEffectStatus
      FROM sales_stock_order
      WHERE order_type = 'SALES_RETURN'
      ORDER BY biz_date ASC, document_no ASC
    `,
  );

  const outboundOrders = await connection.query<AdmittedOrderRow[]>(
    `
      SELECT
        id,
        document_no AS documentNo,
        order_type AS orderType,
        DATE_FORMAT(biz_date, '%Y-%m-%d') AS bizDate,
        workshop_id AS workshopId,
        customer_id AS customerId,
        lifecycle_status AS lifecycleStatus,
        audit_status_snapshot AS auditStatusSnapshot,
        inventory_effect_status AS inventoryEffectStatus
      FROM sales_stock_order
      WHERE order_type = 'OUTBOUND'
      ORDER BY biz_date ASC, document_no ASC
    `,
  );

  const salesReturnLines = await readSalesStockOrderLines(
    connection,
    "SALES_RETURN",
  );
  const outboundLines = await readOutboundLines(connection);

  const workshopReturnOrders = await connection.query<AdmittedOrderRow[]>(
    `
      SELECT
        id,
        document_no AS documentNo,
        order_type AS orderType,
        DATE_FORMAT(biz_date, '%Y-%m-%d') AS bizDate,
        workshop_id AS workshopId,
        NULL AS customerId,
        lifecycle_status AS lifecycleStatus,
        audit_status_snapshot AS auditStatusSnapshot,
        inventory_effect_status AS inventoryEffectStatus
      FROM workshop_material_order
      WHERE order_type = 'RETURN'
      ORDER BY biz_date ASC, document_no ASC
    `,
  );

  const pickOrders = await connection.query<AdmittedOrderRow[]>(
    `
      SELECT
        id,
        document_no AS documentNo,
        order_type AS orderType,
        DATE_FORMAT(biz_date, '%Y-%m-%d') AS bizDate,
        workshop_id AS workshopId,
        NULL AS customerId,
        lifecycle_status AS lifecycleStatus,
        audit_status_snapshot AS auditStatusSnapshot,
        inventory_effect_status AS inventoryEffectStatus
      FROM workshop_material_order
      WHERE order_type = 'PICK'
      ORDER BY biz_date ASC, document_no ASC
    `,
  );

  const workshopReturnLines = await readWorkshopMaterialOrderLines(
    connection,
    "RETURN",
  );
  const pickLines = await readPickLines(connection);

  const stockInOrders = await connection.query<AdmittedOrderRow[]>(
    `
      SELECT
        id,
        document_no AS documentNo,
        order_type AS orderType,
        DATE_FORMAT(biz_date, '%Y-%m-%d') AS bizDate,
        workshop_id AS workshopId,
        NULL AS customerId,
        lifecycle_status AS lifecycleStatus,
        audit_status_snapshot AS auditStatusSnapshot,
        inventory_effect_status AS inventoryEffectStatus
      FROM stock_in_order
      ORDER BY biz_date ASC, document_no ASC
    `,
  );

  const stockInLines = await readStockInLines(connection);

  return {
    salesReturnOrders: salesReturnOrders as AdmittedOrderRow[],
    salesReturnLines,
    workshopReturnOrders: workshopReturnOrders as AdmittedOrderRow[],
    workshopReturnLines,
    outboundLines,
    pickLines,
    stockInLines,
    outboundOrders: outboundOrders as AdmittedOrderRow[],
    pickOrders: pickOrders as AdmittedOrderRow[],
    stockInOrders: stockInOrders as AdmittedOrderRow[],
  };
}

async function readSalesStockOrderLines(
  connection: {
    query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  },
  orderType: "SALES_RETURN" | "OUTBOUND",
): Promise<AdmittedLineRow[]> {
  return connection.query<AdmittedLineRow[]>(
    `
      SELECT
        line_row.id,
        line_row.order_id AS orderId,
        line_row.line_no AS lineNo,
        line_row.material_id AS materialId,
        line_row.quantity,
        order_row.stock_scope_id AS stockScopeId,
        line_row.source_document_type AS sourceDocumentType,
        line_row.source_document_id AS sourceDocumentId,
        line_row.source_document_line_id AS sourceDocumentLineId,
        order_row.document_no AS documentNo,
        order_row.order_type AS orderType,
        DATE_FORMAT(order_row.biz_date, '%Y-%m-%d') AS bizDate,
        order_row.workshop_id AS workshopId,
        order_row.customer_id AS customerId,
        order_row.lifecycle_status AS lifecycleStatus,
        order_row.inventory_effect_status AS inventoryEffectStatus
      FROM sales_stock_order_line line_row
      INNER JOIN sales_stock_order order_row
        ON order_row.id = line_row.order_id
      WHERE order_row.order_type = ?
      ORDER BY order_row.biz_date ASC, order_row.document_no ASC, line_row.line_no ASC
    `,
    [orderType],
  );
}

async function readOutboundLines(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<UpstreamOutboundLineRow[]> {
  return connection.query<UpstreamOutboundLineRow[]>(
    `
      SELECT
        line_row.id,
        line_row.order_id AS orderId,
        line_row.line_no AS lineNo,
        line_row.material_id AS materialId,
        line_row.quantity,
        order_row.stock_scope_id AS stockScopeId,
        order_row.document_no AS documentNo,
        DATE_FORMAT(order_row.biz_date, '%Y-%m-%d') AS bizDate,
        order_row.workshop_id AS workshopId,
        order_row.customer_id AS customerId,
        order_row.lifecycle_status AS lifecycleStatus,
        order_row.inventory_effect_status AS inventoryEffectStatus
      FROM sales_stock_order_line line_row
      INNER JOIN sales_stock_order order_row
        ON order_row.id = line_row.order_id
      WHERE order_row.order_type = 'OUTBOUND'
      ORDER BY order_row.biz_date ASC, order_row.document_no ASC, line_row.line_no ASC
    `,
  );
}

async function readWorkshopMaterialOrderLines(
  connection: {
    query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  },
  orderType: "RETURN" | "PICK",
): Promise<AdmittedLineRow[]> {
  return connection.query<AdmittedLineRow[]>(
    `
      SELECT
        line_row.id,
        line_row.order_id AS orderId,
        line_row.line_no AS lineNo,
        line_row.material_id AS materialId,
        line_row.quantity,
        order_row.stock_scope_id AS stockScopeId,
        line_row.source_document_type AS sourceDocumentType,
        line_row.source_document_id AS sourceDocumentId,
        line_row.source_document_line_id AS sourceDocumentLineId,
        order_row.document_no AS documentNo,
        order_row.order_type AS orderType,
        DATE_FORMAT(order_row.biz_date, '%Y-%m-%d') AS bizDate,
        order_row.workshop_id AS workshopId,
        NULL AS customerId,
        order_row.lifecycle_status AS lifecycleStatus,
        order_row.inventory_effect_status AS inventoryEffectStatus
      FROM workshop_material_order_line line_row
      INNER JOIN workshop_material_order order_row
        ON order_row.id = line_row.order_id
      WHERE order_row.order_type = ?
      ORDER BY order_row.biz_date ASC, order_row.document_no ASC, line_row.line_no ASC
    `,
    [orderType],
  );
}

async function readPickLines(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<UpstreamPickLineRow[]> {
  return connection.query<UpstreamPickLineRow[]>(
    `
      SELECT
        line_row.id,
        line_row.order_id AS orderId,
        line_row.line_no AS lineNo,
        line_row.material_id AS materialId,
        line_row.quantity,
        order_row.stock_scope_id AS stockScopeId,
        order_row.document_no AS documentNo,
        DATE_FORMAT(order_row.biz_date, '%Y-%m-%d') AS bizDate,
        order_row.workshop_id AS workshopId,
        order_row.lifecycle_status AS lifecycleStatus,
        order_row.inventory_effect_status AS inventoryEffectStatus
      FROM workshop_material_order_line line_row
      INNER JOIN workshop_material_order order_row
        ON order_row.id = line_row.order_id
      WHERE order_row.order_type = 'PICK'
      ORDER BY order_row.biz_date ASC, order_row.document_no ASC, line_row.line_no ASC
    `,
  );
}

async function readStockInLines(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<AdmittedStockInLineRow[]> {
  return connection.query<AdmittedStockInLineRow[]>(
    `
      SELECT
        line_row.id,
        line_row.order_id AS orderId,
        line_row.line_no AS lineNo,
        line_row.material_id AS materialId,
        line_row.quantity,
        order_row.stock_scope_id AS stockScopeId,
        order_row.document_no AS documentNo,
        order_row.order_type AS orderType,
        DATE_FORMAT(order_row.biz_date, '%Y-%m-%d') AS bizDate,
        order_row.workshop_id AS workshopId,
        order_row.lifecycle_status AS lifecycleStatus,
        order_row.inventory_effect_status AS inventoryEffectStatus
      FROM stock_in_order_line line_row
      INNER JOIN stock_in_order order_row
        ON order_row.id = line_row.order_id
      ORDER BY order_row.biz_date ASC, order_row.document_no ASC, line_row.line_no ASC
    `,
  );
}

export async function readSharedTableCounts(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<Record<string, number>> {
  const rows = await connection.query<
    Array<{ tableName: string; total: number }>
  >(
    `
      SELECT 'document_relation' AS tableName, COUNT(*) AS total FROM document_relation
      UNION ALL
      SELECT 'document_line_relation' AS tableName, COUNT(*) AS total FROM document_line_relation
      UNION ALL
      SELECT 'inventory_balance' AS tableName, COUNT(*) AS total FROM inventory_balance
      UNION ALL
      SELECT 'inventory_log' AS tableName, COUNT(*) AS total FROM inventory_log
      UNION ALL
      SELECT 'inventory_source_usage' AS tableName, COUNT(*) AS total FROM inventory_source_usage
      UNION ALL
      SELECT 'approval_document' AS tableName, COUNT(*) AS total FROM approval_document
      UNION ALL
      SELECT 'factory_number_reservation' AS tableName, COUNT(*) AS total FROM factory_number_reservation
    `,
  );

  return Object.fromEntries(
    rows.map((row) => [row.tableName, Number(row.total)] as const),
  );
}

export async function stagingSchemaExists(connection: {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}): Promise<boolean> {
  const rows = await connection.query<Array<{ schemaName: string }>>(
    `
      SELECT schema_name AS schemaName
      FROM information_schema.schemata
      WHERE schema_name = 'migration_staging'
    `,
  );

  return rows.length > 0;
}
