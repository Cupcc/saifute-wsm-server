# Batch2c Outbound Base Review Checklist

## Review Scope

- Task `docs/tasks/task-20260317-1416-migration-outbound-base.md`
- Reviewed `scripts/migration/outbound/**`, `scripts/migration/sql/000-create-migration-staging.sql`, `test/migration/outbound.spec.ts`, `test/migration/outbound-execute-guard.spec.ts`, and the outbound migration scripts in `package.json`
- Risk surface: pure outbound base migration, rerun safety, staging-map integrity, archive and exclusion determinism, validation sufficiency

## Fix Checklist

- [x] [important] `scripts/migration/outbound/migrate.ts` and `scripts/migration/outbound/execute-guard.ts`: execute now compares batch map rows against the deterministic outbound plan and blocks rerun cleanup on missing expected rows, unexpected rows, stored `target_code` drift, or mismatched actual target codes for both `map_customer_stock_order` and `map_customer_stock_order_line`.
- [x] [important] `scripts/migration/outbound/validate.ts`: validator now reconciles `customer_stock_order*` through batch-owned row counts from staging maps instead of full-table totals, and it blocks when any forbidden `CustomerStockOrder` rows appear in `workflow_audit_document`, `document_relation`, `document_line_relation`, `factory_number_reservation`, `inventory_log`, or `inventory_source_usage` for this base slice.

## Validation Results

- `pnpm migration:typecheck` passed.
- `pnpm exec biome check "scripts/migration/outbound" "test/migration/outbound.spec.ts" "test/migration/outbound-execute-guard.spec.ts"` passed.
- `pnpm test -- --runTestsByPath test/migration/outbound.spec.ts test/migration/outbound-execute-guard.spec.ts` passed.
- `pnpm migration:outbound:dry-run` still failed locally because `LEGACY_DATABASE_URL` is not configured in `.env.dev`, so no fresh DB-backed `dry-run -> execute -> validate` evidence was captured during this rereview.
- Required final gate status: not fully satisfied in this environment.

## Residual Risks Or Testing Gaps

- DB-backed `migration:outbound:dry-run -> execute -> validate` was not rerun locally because `LEGACY_DATABASE_URL` is still unset.
- The current focused tests cover transformer and execute-guard behavior, but validator queries still need live staging data to confirm end-to-end behavior.

## Short Summary

- Rereview found no remaining `[blocking]` or `[important]` code findings in the scoped outbound-base slice. The latest fixes close the prior map-integrity and batch-scoped validation concerns; the remaining gap is only missing DB-backed migration evidence in this environment.
