# Review Checklist

## Review Scope

- Task `docs/tasks/task-20260317-1745-migration-outbound-order-type4-reservations.md`
- Reviewed `scripts/migration/outbound-reservation/**`, `scripts/migration/sql/000-create-migration-staging.sql`, `test/migration/outbound-reservation.spec.ts`, `test/migration/outbound-reservation-execute-guard.spec.ts`, and the reservation migration scripts in `package.json`
- Risk surface: order_type partitioning, reservation-only writes, rerun safety, deterministic archive/live splits, and validation sufficiency against the current migrated baseline

## Fix Checklist

- [x] [blocking] `scripts/migration/outbound-reservation/transformer.ts`: null or malformed `saifute_interval.order_type` values now raise a global blocker and are covered by the transformer spec, so execute no longer proceeds on malformed source distribution.
- [x] [important] `scripts/migration/outbound-reservation/migrate.ts` and `scripts/migration/outbound-reservation/execute-guard.ts`: execute safety is now slice-local. Dirty-target detection compares batch-owned reservation rows to this batch's map rows instead of full-table totals, deterministic unowned reservation-key collisions block first execute, and late first execution now blocks when downstream relation, workflow, or inventory consumers already exist before this batch owns any reservation rows.
- [x] [important] `scripts/migration/outbound-reservation/validate.ts`: validation now rechecks all current `order_type=4` mapped line ids, so lines that remain in the live source set but fall out of the retained plan are asserted back to `NULL` on rerun.

## Validation Results

- `pnpm migration:typecheck`, `pnpm exec biome check "scripts/migration/outbound-reservation" "scripts/migration/workshop-pick" "test/migration/outbound-reservation-execute-guard.spec.ts" "test/migration/workshop-pick.spec.ts" "test/migration/workshop-pick-execute-guard.spec.ts"`, and `pnpm test -- --runTestsByPath test/migration/outbound-reservation-execute-guard.spec.ts test/migration/workshop-pick.spec.ts test/migration/workshop-pick-execute-guard.spec.ts` were already passing from the prior rereview and were intentionally not rerun in this continuation.
- `pnpm migration:outbound-reservation:dry-run` passed. `scripts/migration/reports/outbound-reservation-dry-run-report.json` reconfirmed `161` source intervals split into `80` live reservations and `81` archived intervals, with `60` single-interval line backfills and `9` multi-interval live lines kept `NULL`.
- `pnpm migration:outbound-reservation:execute` passed and wrote `scripts/migration/reports/outbound-reservation-execute-report.json`.
- `pnpm migration:outbound-reservation:validate` passed. `scripts/migration/reports/outbound-reservation-validate-report.json` shows `validationIssues: []`, `80` batch-owned reservation rows, `80` reservation map rows, `80` reservation targets, `81` archived intervals, `69` touched target lines, and unchanged forbidden table counts (`document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, `inventory_source_usage` all stayed `0`).
- Required final gate status: satisfied in this environment.

## Residual Risks Or Testing Gaps

- The final DB-backed gate is now satisfied. The remaining operational caveat is local environment ergonomics: `.env.dev` still omits `LEGACY_DATABASE_URL`, so reruns require a temporary shell override until that env wiring is standardized.

## Short Summary

- Rereview still has no remaining `[blocking]` or `[important]` code findings in the outbound-reservation slice, and the final live DB-backed `dry-run -> execute -> validate` gate now passes on the current migrated baseline.
