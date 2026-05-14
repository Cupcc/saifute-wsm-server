ALTER TABLE `stock_in_order`
  ADD COLUMN `sales_project_id` INT NULL AFTER `biz_date`,
  ADD COLUMN `sales_project_code_snapshot` VARCHAR(64) NULL AFTER `revision_no`,
  ADD COLUMN `sales_project_name_snapshot` VARCHAR(128) NULL AFTER `sales_project_code_snapshot`,
  ADD KEY `idx_stock_in_order_sales_project_id` (`sales_project_id`),
  ADD CONSTRAINT `fk_stock_in_order_sales_project`
    FOREIGN KEY (`sales_project_id`) REFERENCES `sales_project` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
