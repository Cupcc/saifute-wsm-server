-- Add supplier-return enum values used by the inbound supplier return feature.
-- Run against MariaDB/MySQL after reviewing current enum definitions.

ALTER TABLE inventory_log
  MODIFY COLUMN operation_type ENUM(
    'ACCEPTANCE_IN',
    'PRODUCTION_RECEIPT_IN',
    'PRICE_CORRECTION_IN',
    'OUTBOUND_OUT',
    'PRICE_CORRECTION_OUT',
    'SUPPLIER_RETURN_OUT',
    'SALES_RETURN_IN',
    'PICK_OUT',
    'RETURN_IN',
    'SCRAP_OUT',
    'RD_PROJECT_OUT',
    'RD_HANDOFF_OUT',
    'RD_HANDOFF_IN',
    'RD_STOCKTAKE_IN',
    'RD_STOCKTAKE_OUT',
    'REVERSAL_IN',
    'REVERSAL_OUT'
  ) NOT NULL;

ALTER TABLE stock_in_order
  MODIFY COLUMN order_type ENUM(
    'ACCEPTANCE',
    'PRODUCTION_RECEIPT',
    'SUPPLIER_RETURN'
  ) NOT NULL;

ALTER TABLE document_relation
  MODIFY COLUMN relation_type ENUM(
    'SALES_RETURN_FROM_OUTBOUND',
    'WORKSHOP_RETURN_FROM_PICK',
    'STOCK_IN_RETURN_TO_SUPPLIER',
    'REVERSAL_REFERENCE',
    'TRACEABILITY_REFERENCE'
  ) NOT NULL;

ALTER TABLE document_line_relation
  MODIFY COLUMN relation_type ENUM(
    'SALES_RETURN_FROM_OUTBOUND',
    'WORKSHOP_RETURN_FROM_PICK',
    'STOCK_IN_RETURN_TO_SUPPLIER',
    'REVERSAL_REFERENCE',
    'TRACEABILITY_REFERENCE'
  ) NOT NULL;
