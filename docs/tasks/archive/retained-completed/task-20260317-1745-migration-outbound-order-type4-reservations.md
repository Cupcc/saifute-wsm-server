# Migration Outbound `order_type=4` Reservation Slice

## Metadata

- Scope: `batch3a-outbound-order-type4-reservation` to recover legacy `saifute_interval` into `factory_number_reservation` for already-migrated outbound lines, while archiving unsupported or unresolved interval rows.
- Status: `completed`
- Review status: `reviewed-no-findings`
- Planner: `planner`
- Coder:
- Reviewer: `code-reviewer`
- Last updated: `2026-03-18`
- Related files:
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/customer.md`
  - `prisma/schema.prisma`
  - `package.json`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `scripts/migration/customer/**`
  - `scripts/migration/shared/deterministic.ts`
  - `E:/Projects/saifute-wms-server/ruoyi-admin/src/main/resources/saifute_202600201_1629001.sql`
  - `E:/Projects/saifute-wms-server/business/src/main/java/com/saifute/stock/domain/SaifuteInterval.java`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/stock/SaifuteIntervalMapper.xml`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/out/SaifuteOutboundOrderMapper.xml`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/out/SaifuteOutboundDetailMapper.xml`

## Goal And Acceptance Criteria

- Goal: deliver the next smallest credible execution slice after `batch2c-outbound-base` by recovering only legacy outbound `order_type=4` interval rows into the current reservation model, without mixing in sales-return admission, relation reconstruction, workflow projection, or inventory replay.
- Acceptance criteria:
  - A dedicated migration slice exists for `batch3a-outbound-order-type4-reservation` with dry-run, execute, and validate commands.
  - The slice treats `saifute_interval` as the source of truth for live reservation segments and fully partitions all `161` legacy rows into either:
    - live `factory_number_reservation` rows for eligible `order_type=4` outbound lines already migrated by `batch2c-outbound-base`, or
    - `migration_staging.archived_intervals` rows for all out-of-scope or unresolved intervals.
  - `order_type=4` rows are the only legacy intervals allowed into live tables.
  - `order_type IN (2, 7)` rows are never written to live business tables and are always archived with deterministic reasons.
  - `factory_number_reservation` rows always use:
    - `businessDocumentType = CustomerStockOrder`
    - mapped `businessDocumentId` and `businessDocumentLineId` from `batch2c-outbound-base`
    - mapped `materialId`
    - mapped outbound `workshopId`
    - `status` limited to `RESERVED` or `RELEASED`
  - `customer_stock_order_line.startNumber` and `endNumber` are backfilled only when that migrated outbound line has exactly one retained live reservation segment; multi-segment lines remain `NULL`.
  - `customer_stock_order_line.sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` remain untouched by this slice.
  - Intervals tied to excluded or unmapped outbound details are archived, not forced into live reservations.
  - Validation proves:
    - `liveReservationCount + archivedIntervalCount = 161`
    - all `79` rows from `order_type IN (2, 7)` are archived
    - no writes occur to `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, or `inventory_source_usage`
    - rerun cleanup and map consistency are deterministic from the current non-empty target state
  - The slice executes against the current migrated baseline and does not require `--reset`, schema reset, or DB reset.

## Scope And Ownership

- Allowed code paths:
  - `scripts/migration/customer-reservation/**` (new)
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `package.json`
  - this task doc only if the parent explicitly reassigns ownership
- Frozen or shared paths:
  - `prisma/schema.prisma`
  - `scripts/migration/customer/**`
  - `src/**`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `document_relation`
  - `document_line_relation`
  - `workflow_audit_document`
  - `inventory_balance`
  - `inventory_log`
  - `inventory_source_usage`
- Task doc owner: `planner`
- Contracts that must not change silently:
  - `inventory-core` remains the only stock write entry point, so this slice reconstructs reservation facts only and must not replay inventory.
  - `workflow` owns `workflow_audit_document`, so this slice must not create or mutate workflow rows.
  - `customer_stock_order` and `customer_stock_order_line` remain owned by `batch2c-outbound-base`; this slice may only read their existing migrated facts and backfill `startNumber` and `endNumber` under the frozen single-interval rule.
  - `factory_number_reservation` must stay aligned to current runtime strings and statuses rather than legacy numeric document types.
  - Sales-return and return-document relation semantics remain unresolved and must not be widened here.
  - Raw outbound line `interval` text archived by `batch2c-outbound-base` remains evidence only; live reservation generation must use `saifute_interval`, not ad hoc string parsing.

## Implementation Plan

- [ ] Step 1: add `migration_staging.map_factory_number_reservation` to `scripts/migration/sql/000-create-migration-staging.sql` with the same `(legacy_table, legacy_id)` and `(target_table, target_id)` uniqueness pattern used by other migration map tables.
- [ ] Step 2: scaffold `scripts/migration/customer-reservation/` with:
  - `types.ts`
  - `legacy-reader.ts`
  - `transformer.ts`
  - `writer.ts`
  - `execute-guard.ts`
  - `migrate.ts`
  - `validate.ts`
- [ ] Step 3: implement legacy reads for:
  - all `saifute_interval` rows
  - current `batch2c-outbound-base` map rows from `migration_staging.map_customer_stock_order` and `migration_staging.map_customer_stock_order_line`
  - mapped `customer_stock_order` and `customer_stock_order_line` target rows
  - `migration_staging.excluded_documents` for `batch2c-outbound-base` to explain why some `order_type=4` interval rows cannot land live
- [ ] Step 4: implement deterministic partitioning rules for legacy intervals:
  - `order_type=4` and mapped outbound line exists -> eligible for live reservation generation
  - `order_type=4` but mapped line or parent order is missing, excluded, or inconsistent -> archive in `migration_staging.archived_intervals`
  - `order_type IN (2, 7)` -> archive in `migration_staging.archived_intervals`
  - any unexpected `order_type` outside the documented current `{2, 4, 7}` distribution -> global blocker
- [ ] Step 5: implement live reservation transformation rules for eligible `order_type=4` rows:
  - `materialId` from mapped `customer_stock_order_line.materialId`
  - `workshopId` from mapped `customer_stock_order.workshopId`
  - `businessDocumentType = CustomerStockOrder`
  - `businessDocumentId` from mapped outbound order target id
  - `businessDocumentLineId` from mapped outbound line target id
  - `startNumber = String(start_num)`
  - `endNumber = String(end_num)`
  - `status = RESERVED` when parent outbound order is `lifecycleStatus = EFFECTIVE`
  - `status = RELEASED` when parent outbound order is `lifecycleStatus = VOIDED`
  - never write `REVERSED` in this slice
  - `reservedAt = COALESCE(customer_stock_order.createdAt, CAST(customer_stock_order.bizDate AS DATETIME))`
  - `releasedAt` only when `status = RELEASED`, using `COALESCE(customer_stock_order.voidedAt, customer_stock_order.updatedAt, customer_stock_order.createdAt, CAST(customer_stock_order.bizDate AS DATETIME))`
- [ ] Step 6: implement line backfill rules from the retained live reservation set:
  - if exactly one live reservation segment remains for a given `businessDocumentLineId`, set `customer_stock_order_line.startNumber` and `endNumber`
  - if more than one live reservation segment remains for that line, keep line `startNumber` and `endNumber` as `NULL`
  - never derive line values from archived intervals
- [ ] Step 7: implement archive records in `migration_staging.archived_intervals` with deterministic reasons, at least:
  - `unsupported-order-type-2-production-in-interval`
  - `unsupported-order-type-7-sales-return-interval`
  - `order-type-4-parent-document-excluded`
  - `order-type-4-missing-line-map`
  - `order-type-4-target-row-mismatch`
- [ ] Step 8: implement execute and rerun guards:
  - block execute if `factory_number_reservation` already contains dirty target rows not fully owned by this batch map
  - block execute if this batch map rows point to missing reservation targets
  - block rerun if already-owned outbound lines have `startNumber` and `endNumber` values that do not match the current deterministic plan
  - block rerun once downstream consumers that depend on stable outbound ids or reservation state are populated, especially inventory replay and relation slices
- [ ] Step 9: implement transactional writer behavior:
  - cleanup prior batch-owned reservation rows, prior batch `archived_intervals`, and any prior batch line backfills
  - upsert live reservation rows
  - upsert `map_factory_number_reservation`
  - insert archived interval rows
  - backfill qualifying `customer_stock_order_line.startNumber` and `endNumber`
  - commit as one transaction
- [ ] Step 10: add package scripts:
  - `migration:customer-reservation:dry-run`
  - `migration:customer-reservation:execute`
  - `migration:customer-reservation:validate`

## Coder Handoff

- Execution brief: implement `batch3a-outbound-order-type4-reservation` as a reservation-only continuation of `batch2c-outbound-base`, using legacy `saifute_interval` as input, current outbound maps as the live eligibility boundary, and `archived_intervals` as the sink for all unsupported or unresolved rows.
- Required source docs or files:
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/customer.md`
  - `prisma/schema.prisma`
  - `scripts/migration/customer/**`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `E:/Projects/saifute-wms-server/ruoyi-admin/src/main/resources/saifute_202600201_1629001.sql`
  - `E:/Projects/saifute-wms-server/business/src/main/java/com/saifute/stock/domain/SaifuteInterval.java`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/stock/SaifuteIntervalMapper.xml`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/out/SaifuteOutboundOrderMapper.xml`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/out/SaifuteOutboundDetailMapper.xml`
- Owned paths:
  - `scripts/migration/customer-reservation/**`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `package.json`
- Forbidden shared files:
  - `scripts/migration/customer/**`
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
- Constraints and non-goals:
  - do not write `document_relation` or `document_line_relation`
  - do not admit `saifute_sales_return_*` into live business tables
  - do not write `workflow_audit_document`
  - do not write `inventory_balance`, `inventory_log`, or `inventory_source_usage`
  - do not interpret raw legacy outbound `interval` strings as the live source of truth
  - do not widen reservation status semantics beyond `RESERVED` and `RELEASED`
  - do not populate `customer_stock_order_line.sourceDocument*`
  - do not reset the target DB or staging schema
- Validation command for this scope:
  - `pnpm migration:typecheck`
  - `pnpm migration:customer-reservation:dry-run`
- Iteration report gates:
  - dry-run must expose counts by `order_type`
  - dry-run must expose `eligible order_type=4 live rows`, `archived order_type=4 rows`, and `archived order_type IN (2, 7)` rows
  - `liveReservationCount + archivedIntervalCount = 161`
  - single-interval line backfill count and multi-interval line count must be reported explicitly
  - no relation, workflow, or inventory writes may appear in the plan

## Reviewer Handoff

- Review focus:
  - confirm the slice is truly smaller than full batch 3 and does not leak into relation recovery
  - confirm `saifute_interval` is partitioned deterministically and nothing is silently dropped
  - confirm `order_type IN (2, 7)` always archive and never land live
  - confirm `order_type=4` rows tied to excluded or missing outbound lines archive instead of widening semantics
  - confirm `factory_number_reservation` uses only current runtime strings and allowed statuses
  - confirm line backfill only happens for single live-segment lines
  - confirm cleanup and rerun behavior are safe from the current partially migrated state
  - confirm all writes happen in one transaction
- Final validation gate:
  - `pnpm migration:typecheck`
  - `pnpm migration:customer-reservation:dry-run`
  - `pnpm migration:customer-reservation:execute`
  - `pnpm migration:customer-reservation:validate`
  - DB and report gates:
    - `factory_number_reservation` rows inserted by this batch all have `businessDocumentType = 'CustomerStockOrder'`
    - batch-owned reservation count plus archived-interval count equals `161`
    - archived interval rows include every `order_type IN (2, 7)` legacy interval
    - `customer_stock_order_line.startNumber` and `endNumber` are populated only for single-segment live lines
    - multi-segment live lines keep `startNumber` and `endNumber` as `NULL`
    - `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, and `inventory_source_usage` counts remain unchanged
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status`

## Architecture And Repository Considerations

- `arch-feature-modules`: keep the slice isolated to migration tooling and existing outbound/inventory-core contracts; do not spread reservation logic into runtime application modules.
- `db-use-transactions`: reservation upserts, line backfills, staging map writes, and interval archives must commit in one DB transaction to avoid split-brain between live reservation rows and line snapshots.
- `perf-optimize-database`: load batch2c maps and target rows in set-based queries; do not issue per-interval lookup queries.
- `arch-avoid-circular-deps`: new migration code should depend on shared migration helpers and outbound results, but existing `scripts/migration/customer/**` should remain unchanged to avoid cross-slice coupling drift.
- `security-validate-all-input`: treat legacy interval rows as untrusted data; invalid or unexpected order types should surface as blockers or archives, not reach live rows.
- Current repository layering still applies: migration scripts adapt legacy data to the already-frozen runtime schema; they must not change current runtime behavior to fit legacy edge cases.

## Risks And Contract-Sensitive Areas

- Frozen rules:
  - `inventory-core` is the only stock write entry point; reservation recovery must not masquerade as inventory replay.
  - `workflow` owns audit projection semantics; this slice must not infer workflow state from interval data.
  - `rbac`, `session`, and other platform modules are irrelevant here and must stay untouched.
- Reservation risks:
  - live `factory_number_reservation` rows must only be created when the corresponding outbound line already exists in the migrated target state
  - excluded outbound documents from `batch2c-outbound-base` must remain excluded; their intervals cannot be used to backfill live tables
  - `customer_stock_order_line.startNumber` and `endNumber` cannot absorb multi-segment legacy lines because the target line model only has one range pair
- Deterministic rules:
  - preserve one legacy interval row to one reservation row for live `order_type=4`
  - derive line backfill from retained live reservation rows only
  - use stable archive reasons and stable report ordering
- Staging and exclusion handling:
  - `migration_staging.archived_intervals` is the mandatory sink for `order_type IN (2, 7)` and unresolved `order_type=4`
  - existing `migration_staging.excluded_documents` rows from outbound base are input evidence, not something this slice should rewrite
- Blocker list:
  - missing or inconsistent `batch2c-outbound-base` maps
  - dirty `factory_number_reservation` target baseline
  - already-mutated outbound line start/end values that disagree with the current deterministic plan
  - unexpected live `saifute_interval.order_type` values outside `{2, 4, 7}`
  - target row mismatches between customer-stock maps and live rows

## Validation Plan

- Narrow iteration commands:
  - `pnpm migration:typecheck`
  - `pnpm migration:customer-reservation:dry-run`
- Final command or gate aligned to the risk surface:
  - `pnpm migration:customer-reservation:execute`
  - `pnpm migration:customer-reservation:validate`
- Required report and DB gates:
  - report shows full partition of all `161` legacy interval rows
  - report shows exact counts for live `order_type=4`, archived `order_type=4`, archived `order_type=2`, and archived `order_type=7`
  - validation proves no forbidden table count changed
  - validation proves batch-owned line backfills and reservation rows match the deterministic plan
  - validation proves archived interval rows match the deterministic plan and do not duplicate across reruns

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `package.json`
  - `factory_number_reservation`
  - `customer_stock_order_line.startNumber/endNumber`
  - the new reservation batch contract, report format, and rerun guards

## Review Log

- Validation results:
  - `pnpm migration:typecheck`, `pnpm exec biome check "scripts/migration/customer-reservation" "scripts/migration/workshop-pick" "test/migration/customer-reservation-execute-guard.spec.ts" "test/migration/workshop-pick.spec.ts" "test/migration/workshop-pick-execute-guard.spec.ts"`, and `pnpm test -- --runTestsByPath test/migration/customer-reservation-execute-guard.spec.ts test/migration/workshop-pick.spec.ts test/migration/workshop-pick-execute-guard.spec.ts` were already passing from the prior rereview and were intentionally not rerun in this continuation.
  - `pnpm migration:customer-reservation:dry-run` passed. Report: `scripts/migration/reports/customer-reservation-dry-run-report.json`. Dry-run reconfirmed `161` source intervals partitioned into `80` live `order_type=4` reservations plus `81` archived intervals (`74` order type `2`, `2` archived order type `4`, `5` order type `7`), with `60` single-interval line backfills and `9` multi-interval live lines left `NULL`.
  - `pnpm migration:customer-reservation:execute` passed. Report: `scripts/migration/reports/customer-reservation-execute-report.json`.
  - `pnpm migration:customer-reservation:validate` passed. Report: `scripts/migration/reports/customer-reservation-validate-report.json`. `validationIssues` stayed empty; `80` batch-owned reservation rows matched `80` reservation map rows and `80` reservation targets; `81` archived intervals remained owned by the batch; `69` target lines were touched; forbidden table counts stayed unchanged at `0`.
- Findings:
  - No remaining `[blocking]` or `[important]` code findings in the scoped latest-fix rereview.
- Follow-up action:
  - No further repair work is required for this slice. Future local reruns should either persist `LEGACY_DATABASE_URL` in the operator environment or continue passing it as a temporary shell override before the DB-backed commands.

## Final Status

- Outcome:
  - The scoped outbound-reservation slice now has both `reviewed-no-findings` code status and a successful live DB-backed `dry-run -> execute -> validate` gate on the current migrated baseline.
- Residual risks or testing gaps:
  - Local reruns still depend on supplying `LEGACY_DATABASE_URL`; the checked-in `.env.dev` does not yet provide that variable.
- Next action:
  - No further coder changes are required for this slice; downstream migration work can consume the current `batch3a-outbound-order-type4-reservation` output from the non-reset baseline.
