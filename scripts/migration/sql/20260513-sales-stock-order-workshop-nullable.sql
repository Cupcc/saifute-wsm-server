ALTER TABLE `sales_stock_order`
  MODIFY COLUMN `workshop_id` INT NULL,
  MODIFY COLUMN `workshop_name_snapshot` VARCHAR(128) NULL;
