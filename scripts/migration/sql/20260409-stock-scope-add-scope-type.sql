ALTER TABLE stock_scope
ADD COLUMN scopeType ENUM('MAIN', 'RD_SUB') NOT NULL DEFAULT 'MAIN'
AFTER scopeName;

UPDATE stock_scope
SET scopeType =
  CASE
    WHEN scopeCode = 'RD_SUB' THEN 'RD_SUB'
    ELSE 'MAIN'
  END;
