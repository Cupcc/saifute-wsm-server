### Review Scope

- Task `docs/tasks/task-20260317-1416-migration-outbound-base.md`
- Reviewed `scripts/migration/outbound/**`, `scripts/migration/sql/000-create-migration-staging.sql`, `test/migration/outbound.spec.ts`, `test/migration/outbound-execute-guard.spec.ts`, and the outbound migration scripts in `package.json`
- Risk surface: pure outbound base migration, rerun safety, staging-map integrity, archive and exclusion determinism, validation sufficiency

### Fix Checklist

- [ ] [important] `scripts/migration/outbound/migrate.ts`, `scripts/migration/outbound/validate.ts`, and `scripts/migration/outbound/writer.ts`: strengthen `map_customer_stock_order` and `map_customer_stock_order_line` integrity checks so execute and validate compare each batch-owned map row against the deterministic plan (`legacy_table`, `legacy_id`, `target_id`, `target_code`), not just counts and missing-target existence. A stale or manually corrupted map row that still points at an existing target can currently pass preflight and make `cleanupSliceStagingRows()` delete unrelated `customer_stock_order*` rows on rerun.
- [ ] [important] `scripts/migration/outbound/validate.ts`: validate this slice against batch-owned rows and forbidden-table deltas instead of whole-table totals alone. The current validator never proves that `document_relation`, `document_line_relation`, `factory_number_reservation`, `workflow_audit_document`, `inventory_log`, and `inventory_source_usage` stayed unchanged, and its total-table row-count assertions will false-fail once later `CustomerStockOrder` slices add legitimate rows to `customer_stock_order` or `customer_stock_order_line`.

### Validation Results

- `pnpm migration:typecheck` passed.
- `pnpm test -- --runInBand test/migration/outbound.spec.ts test/migration/outbound-execute-guard.spec.ts` passed.
- `pnpm migration:outbound:dry-run` failed locally because `LEGACY_DATABASE_URL` was not configured in `.env.dev`, so no DB-backed `dry-run -> execute -> validate` evidence was available during this review.
- Required final gate status: not satisfied.

### Residual Risks Or Testing Gaps

- No database-backed test currently exercises `executeOutboundPlan()` and `validate.ts` end to end against real staging maps and pre-existing target rows.
- The current unit coverage focuses on transformer and guard helpers, so map-row corruption and forbidden-table delta checks can regress without test failures.

### Short Summary

- Review found two open important items before safe sign-off: map-table integrity needs stronger enforcement, and validation needs to prove slice-scoped results plus unchanged downstream tables. TypeScript and focused unit tests passed, but the database-backed migration gate could not be completed in this environment.
