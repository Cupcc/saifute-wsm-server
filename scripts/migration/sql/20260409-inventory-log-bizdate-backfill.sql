-- Backfill inventory_log.biz_date before applying the required Prisma schema.
-- Strategy:
-- 1. Add the column as nullable if it does not exist yet.
-- 2. Backfill from the owning business document's biz_date whenever possible.
-- 3. Fall back to DATE(occurred_at) for legacy/smoke rows that do not map to a
--    persisted business document header.
-- 4. Leave the final NOT NULL / index / dropped-column enforcement to
--    `prisma db push` so the runtime schema remains the single source of truth.

ALTER TABLE inventory_log
  ADD COLUMN biz_date DATE NULL AFTER project_target_id;

UPDATE inventory_log log_row
LEFT JOIN stock_in_order stock_in_order_row
  ON log_row.business_document_type = 'StockInOrder'
 AND stock_in_order_row.id = log_row.business_document_id
LEFT JOIN stock_in_price_correction_order price_correction_row
  ON log_row.business_document_type = 'StockInPriceCorrectionOrder'
 AND price_correction_row.id = log_row.business_document_id
LEFT JOIN sales_stock_order customer_order_row
  ON log_row.business_document_type = 'SalesStockOrder'
 AND customer_order_row.id = log_row.business_document_id
LEFT JOIN workshop_material_order workshop_order_row
  ON log_row.business_document_type = 'WorkshopMaterialOrder'
 AND workshop_order_row.id = log_row.business_document_id
LEFT JOIN rd_project project_row
  ON log_row.business_document_type = 'RdProject'
 AND project_row.id = log_row.business_document_id
LEFT JOIN rd_project_material_action project_action_row
  ON log_row.business_document_type = 'RdProjectMaterialAction'
 AND project_action_row.id = log_row.business_document_id
LEFT JOIN rd_handoff_order rd_handoff_row
  ON log_row.business_document_type = 'RdHandoffOrder'
 AND rd_handoff_row.id = log_row.business_document_id
LEFT JOIN rd_stocktake_order rd_stocktake_row
  ON log_row.business_document_type = 'RdStocktakeOrder'
 AND rd_stocktake_row.id = log_row.business_document_id
SET log_row.biz_date = COALESCE(
  DATE(stock_in_order_row.biz_date),
  DATE(price_correction_row.biz_date),
  DATE(customer_order_row.biz_date),
  DATE(workshop_order_row.biz_date),
  DATE(project_row.biz_date),
  DATE(project_action_row.biz_date),
  DATE(rd_handoff_row.biz_date),
  DATE(rd_stocktake_row.biz_date),
  DATE(log_row.occurred_at)
)
WHERE log_row.biz_date IS NULL;
