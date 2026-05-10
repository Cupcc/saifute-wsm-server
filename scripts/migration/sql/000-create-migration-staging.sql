CREATE SCHEMA IF NOT EXISTS migration_staging;

CREATE TABLE IF NOT EXISTS migration_staging.map_material_category (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_material_category_legacy (legacy_table, legacy_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_workshop (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_workshop_legacy (legacy_table, legacy_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_supplier (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_supplier_legacy (legacy_table, legacy_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_personnel (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_personnel_legacy (legacy_table, legacy_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_customer (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_customer_legacy (legacy_table, legacy_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_material (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_material_legacy (legacy_table, legacy_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_stock_in_order (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_stock_in_order_legacy (legacy_table, legacy_id),
  UNIQUE KEY uq_map_stock_in_order_target (target_table, target_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_stock_in_order_line (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_stock_in_order_line_legacy (legacy_table, legacy_id),
  UNIQUE KEY uq_map_stock_in_order_line_target (target_table, target_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_project (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_project_legacy (legacy_table, legacy_id),
  UNIQUE KEY uq_map_project_target (target_table, target_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_project_material_line (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_project_material_line_legacy (legacy_table, legacy_id),
  UNIQUE KEY uq_map_project_material_line_target (target_table, target_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_sales_stock_order (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_sales_stock_order_legacy (legacy_table, legacy_id),
  UNIQUE KEY uq_map_sales_stock_order_target (target_table, target_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_sales_stock_order_line (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_sales_stock_order_line_legacy (legacy_table, legacy_id),
  UNIQUE KEY uq_map_sales_stock_order_line_target (target_table, target_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_workshop_material_order (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_workshop_material_order_legacy (legacy_table, legacy_id),
  UNIQUE KEY uq_map_workshop_material_order_target (target_table, target_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_workshop_material_order_line (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_workshop_material_order_line_legacy (legacy_table, legacy_id),
  UNIQUE KEY uq_map_workshop_material_order_line_target (target_table, target_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.map_factory_number_reservation (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NOT NULL,
  target_code VARCHAR(128) NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_map_factory_number_reservation_legacy (legacy_table, legacy_id),
  UNIQUE KEY uq_map_factory_number_reservation_target (target_table, target_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.archived_field_payload (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  target_table VARCHAR(128) NOT NULL,
  target_id BIGINT NULL,
  target_code VARCHAR(128) NULL,
  payload_kind VARCHAR(64) NOT NULL,
  archive_reason VARCHAR(255) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_archived_field_payload_identity (
    legacy_table,
    legacy_id,
    target_table,
    payload_kind,
    migration_batch
  )
);

CREATE TABLE IF NOT EXISTS migration_staging.pending_relations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  legacy_line_id BIGINT NULL,
  relation_type VARCHAR(128) NULL,
  pending_reason VARCHAR(255) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_pending_relations_lookup (legacy_table, legacy_id, legacy_line_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.archived_relations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  legacy_line_id BIGINT NULL,
  archive_reason VARCHAR(255) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_archived_relations_lookup (legacy_table, legacy_id, legacy_line_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.archived_intervals (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  archive_reason VARCHAR(255) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_archived_intervals_lookup (legacy_table, legacy_id)
);

CREATE TABLE IF NOT EXISTS migration_staging.excluded_documents (
  id BIGINT NOT NULL AUTO_INCREMENT,
  legacy_table VARCHAR(128) NOT NULL,
  legacy_id BIGINT NOT NULL,
  exclusion_reason TEXT NOT NULL,
  payload_json LONGTEXT NOT NULL,
  migration_batch VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_excluded_documents_lookup (legacy_table, legacy_id)
);

ALTER TABLE migration_staging.excluded_documents
  MODIFY exclusion_reason TEXT NOT NULL;
