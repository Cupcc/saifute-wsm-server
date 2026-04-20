-- Backfill inventory_log.bizDate before applying the required Prisma schema.
-- Strategy:
-- 1. Add the column as nullable if it does not exist yet.
-- 2. Backfill from the owning business document's bizDate whenever possible.
-- 3. Fall back to DATE(occurredAt) for legacy/smoke rows that do not map to a
--    persisted business document header.
-- 4. Leave the final NOT NULL / index / dropped-column enforcement to
--    `prisma db push` so the runtime schema remains the single source of truth.

ALTER TABLE inventory_log
  ADD COLUMN bizDate DATE NULL AFTER projectTargetId;

UPDATE inventory_log log_row
LEFT JOIN stock_in_order stock_in_order_row
  ON log_row.businessDocumentType = 'StockInOrder'
 AND stock_in_order_row.id = log_row.businessDocumentId
LEFT JOIN stock_in_price_correction_order price_correction_row
  ON log_row.businessDocumentType = 'StockInPriceCorrectionOrder'
 AND price_correction_row.id = log_row.businessDocumentId
LEFT JOIN sales_stock_order customer_order_row
  ON log_row.businessDocumentType = 'SalesStockOrder'
 AND customer_order_row.id = log_row.businessDocumentId
LEFT JOIN workshop_material_order workshop_order_row
  ON log_row.businessDocumentType = 'WorkshopMaterialOrder'
 AND workshop_order_row.id = log_row.businessDocumentId
LEFT JOIN rd_project project_row
  ON log_row.businessDocumentType = 'RdProject'
 AND project_row.id = log_row.businessDocumentId
LEFT JOIN rd_project_material_action project_action_row
  ON log_row.businessDocumentType = 'RdProjectMaterialAction'
 AND project_action_row.id = log_row.businessDocumentId
LEFT JOIN rd_handoff_order rd_handoff_row
  ON log_row.businessDocumentType = 'RdHandoffOrder'
 AND rd_handoff_row.id = log_row.businessDocumentId
LEFT JOIN rd_stocktake_order rd_stocktake_row
  ON log_row.businessDocumentType = 'RdStocktakeOrder'
 AND rd_stocktake_row.id = log_row.businessDocumentId
SET log_row.bizDate = COALESCE(
  DATE(stock_in_order_row.bizDate),
  DATE(price_correction_row.bizDate),
  DATE(customer_order_row.bizDate),
  DATE(workshop_order_row.bizDate),
  DATE(project_row.bizDate),
  DATE(project_action_row.bizDate),
  DATE(rd_handoff_row.bizDate),
  DATE(rd_stocktake_row.bizDate),
  DATE(log_row.occurredAt)
)
WHERE log_row.bizDate IS NULL;
