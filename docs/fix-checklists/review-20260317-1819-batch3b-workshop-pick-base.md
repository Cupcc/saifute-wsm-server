# Review Checklist

## Review Scope

- Task `docs/tasks/task-20260317-2035-migration-workshop-pick-base.md`
- Reviewed `scripts/migration/workshop-pick/**`, `test/migration/workshop-pick.spec.ts`, `test/migration/workshop-pick-execute-guard.spec.ts`, and the workshop-pick migration scripts in `package.json`
- Risk surface: pick-only workshop-material writes, deterministic exclusion and archive behavior, rerun safety on the current non-empty baseline, and validation coverage for forbidden workflow/relation/reservation/inventory tables

## Fix Checklist

- [x] [important] `scripts/migration/workshop-pick/migrate.ts` and `scripts/migration/workshop-pick/validate.ts`: `inventory_balance` is now included in the downstream-consumer and forbidden-table checks, so the slice's execute/validate gates enforce the documented "no inventory table writes" contract.
- [x] [important] `scripts/migration/workshop-pick/transformer.ts`: archived payloads now preserve the literal legacy `unit_price` evidence for both migrated-line archives and excluded-document payloads, retaining raw pricing source truth for later follow-up.
- [x] [important] `scripts/migration/workshop-pick/migrate.ts` and `scripts/migration/workshop-pick/execute-guard.ts`: dirty-target detection now compares batch-owned target rows to this batch's map rows instead of full-table totals, so unrelated workshop-material rows no longer false-block a clean first execute or rerun.

## Validation Results

- `pnpm migration:typecheck`, `pnpm exec biome check "scripts/migration/outbound-reservation" "scripts/migration/workshop-pick" "test/migration/outbound-reservation-execute-guard.spec.ts" "test/migration/workshop-pick.spec.ts" "test/migration/workshop-pick-execute-guard.spec.ts"`, and `pnpm test -- --runTestsByPath test/migration/outbound-reservation-execute-guard.spec.ts test/migration/workshop-pick.spec.ts test/migration/workshop-pick-execute-guard.spec.ts` were already passing from the prior rereview and were intentionally not rerun in this continuation.
- `pnpm migration:workshop-pick:execute` initially exposed a live-environment blocker: `migration_staging.map_workshop_material_order` and `migration_staging.map_workshop_material_order_line` were missing from the target staging schema.
- `pnpm migration:bootstrap-staging` passed. `scripts/migration/reports/bootstrap-staging-report.json` now records `statementsExecuted: 22` with both workshop-material map tables created and `resetApplied: false`.
- `pnpm migration:workshop-pick:dry-run` passed. `scripts/migration/reports/workshop-pick-dry-run-report.json` reconfirmed `61` migrated + `14` excluded orders, `145` migrated + `52` excluded lines, `10` default-workshop fallbacks, three deterministic duplicate-document rewrites, and one deterministic whole-document exclusion for price derivation failure.
- `pnpm migration:workshop-pick:execute` passed and wrote `scripts/migration/reports/workshop-pick-execute-report.json`.
- `pnpm migration:workshop-pick:validate` passed. `scripts/migration/reports/workshop-pick-validate-report.json` shows `validationIssues: []`, `61` order map rows matching `61` batch-owned order rows and targets, `145` line map rows matching `145` batch-owned line rows and targets, `206` archived payload rows, `14` excluded documents, and unchanged forbidden table counts (`document_relation`, `document_line_relation`, `factory_number_reservation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, `inventory_source_usage` all stayed `0`).

## Residual Risks Or Testing Gaps

- The final DB-backed gate is now satisfied. Remaining operational caveats are environmental: `.env.dev` still omits `LEGACY_DATABASE_URL`, and environments that bootstrapped staging before the workshop-material map tables were added must rerun `pnpm migration:bootstrap-staging` before first execute.

## Short Summary

- Rereview still has no remaining `[blocking]` or `[important]` code findings in the workshop-pick slice, and the final live DB-backed `dry-run -> execute -> validate` gate now passes after refreshing the staging bootstrap to include the workshop-material map tables.
