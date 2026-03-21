# Migration Outbound Base Slice

## Metadata

- Scope: `batch2c-outbound-base` to migrate only `saifute_outbound_order` and `saifute_outbound_detail` into `customer_stock_order` and `customer_stock_order_line`
- Related requirement: `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder:
- Reviewer: `code-reviewer`
- Last updated: `2026-03-20`
- Related files:
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/outbound.md`
  - `docs/architecture/modules/workshop-material.md`
  - `prisma/schema.prisma`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `package.json`
  - `scripts/migration/stock-in/migrate.ts`
  - `scripts/migration/stock-in/legacy-reader.ts`
  - `scripts/migration/stock-in/transformer.ts`
  - `scripts/migration/project/migrate.ts`
  - `scripts/migration/project/legacy-reader.ts`
  - `scripts/migration/project/transformer.ts`
  - `scripts/migration/outbound/migrate.ts` (new)
  - `scripts/migration/outbound/legacy-reader.ts` (new)
  - `scripts/migration/outbound/transformer.ts` (new)
  - `scripts/migration/outbound/writer.ts` (new)
  - `scripts/migration/outbound/validate.ts` (new)
  - `scripts/migration/outbound/execute-guard.ts` (new)
  - `scripts/migration/outbound/types.ts` (new)
  - `scripts/migration/reports/outbound-dry-run-report.json` (generated)
  - `scripts/migration/reports/outbound-execute-report.json` (generated)
  - `scripts/migration/reports/outbound-validate-report.json` (generated)

## Goal And Acceptance Criteria

- Goal: implement the smallest credible next execution slice after `batch0`, `batch1`, `batch2a-stock-in`, and `batch2b-project`, by migrating only legacy outbound documents into the current customer-stock business tables without widening unresolved sales-return, relation, interval, workflow, or inventory semantics.
- Acceptance criteria:
  - New migration commands exist for `outbound` dry-run, execute, and validate.
  - The slice reads only `saifute_outbound_order`, `saifute_outbound_detail`, and legacy audit rows for outbound `document_type = 4`; it does not ingest `saifute_sales_return_*`.
  - Target writes are limited to `customer_stock_order`, `customer_stock_order_line`, `migration_staging.map_customer_stock_order`, `migration_staging.map_customer_stock_order_line`, `migration_staging.archived_field_payload`, and `migration_staging.excluded_documents`.
  - Every migrated target header has `orderType = OUTBOUND`, deterministic `documentNo`, deterministic `lineNo`, a resolved `workshopId` using the frozen default workshop, and status fields aligned to the frozen migration plan.
  - Every migrated target line keeps `startNumber`, `endNumber`, `sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` as `NULL` in this slice.
  - Raw outbound-only legacy fields that do not have direct target columns, especially `bookkeeping`, original interval text, and original document numbers when rewritten, are archived instead of silently dropped.
  - Blocking header or line issues exclude the whole outbound document deterministically into `migration_staging.excluded_documents`; no heuristic material remap or relation reconstruction is added.
  - Validation proves count reconciliation for the slice, deterministic rerun protection, no dirty-target execution, and no accidental writes to `document_relation`, `document_line_relation`, `factory_number_reservation`, `workflow_audit_document`, `inventory_log`, or `inventory_source_usage`.
  - Execution continues from the current target and staging state; no `--reset`, schema reset, or database reset is introduced.

## Scope And Ownership

- Allowed code paths:
  - `scripts/migration/outbound/**`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `package.json`
  - this task doc only if the parent explicitly keeps planner ownership
- Frozen or shared paths:
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `document_relation`
  - `document_line_relation`
  - `factory_number_reservation`
  - `workflow_audit_document`
  - `inventory_balance`
  - `inventory_log`
  - `inventory_source_usage`
- Task doc owner: `planner` for planning updates; downstream `coder` should treat it as read-only unless explicitly reassigned
- Contracts that must not change silently:
  - `inventory-core` remains the only stock write entry point, so this slice must not write inventory tables and must not attempt replay.
  - `workflow` owns `workflow_audit_document`, so this slice may only set `auditStatusSnapshot` on business rows and must not create workflow projection rows.
  - `customer_stock_order` stays a business-fact import here; relation recovery for sales returns remains separate.
  - `factory_number_reservation` remains a later reconstruction slice; raw legacy interval strings are archived here, not parsed into live reservation rows.
  - Ambiguous or unresolved upstream relations stay unresolved; no synthetic `sourceDocument*` values are invented.
  - Current target DB state is authoritative; no reset or "clean slate" assumptions are allowed.

## Implementation Plan

- [ ] Step 1: extend `migration_staging` bootstrap SQL with `map_customer_stock_order` and `map_customer_stock_order_line`, matching the existing map table shape and uniqueness rules used by `map_stock_in_order` and `map_stock_in_order_line`.
- [ ] Step 2: scaffold `scripts/migration/outbound/` by mirroring the `stock-in` and `project` folder structure, naming the batch `batch2c-outbound-base`.
- [ ] Step 3: implement `legacy-reader.ts` for only:
  - `saifute_outbound_order`
  - `saifute_outbound_detail`
  - `saifute_audit_document` filtered to outbound `document_type = 4`
  - optional customer name join from `saifute_customer`
- [ ] Step 4: implement dependency snapshot loading from batch1 maps:
  - `map_material`
  - `map_customer`
  - `map_workshop`
  - `map_personnel`
  - batch1 blocked material baseline
  - frozen default workshop `WS-LEGACY-DEFAULT / 历史默认车间`
- [ ] Step 5: implement transformer rules for the outbound-only slice:
  - header scope is only legacy `saifute_outbound_order`
  - line scope is only legacy `saifute_outbound_detail`
  - `orderType = OUTBOUND`
  - `bizDate = outbound_date`
  - `workshopId = frozen default workshop` because legacy outbound has no `workshop_id`
  - `lifecycleStatus = EFFECTIVE` when `del_flag = 0`, else `VOIDED`
  - `auditStatusSnapshot = NOT_REQUIRED` when voided, else derive from legacy audit row with missing row -> `PENDING`
  - `inventoryEffectStatus = POSTED` when effective, else `REVERSED`
  - `lineNo` generated by parent header key plus legacy detail ID ascending
  - `documentNo` preserved unless a duplicate is detected, then rewritten deterministically with the same active-first and `-LEGACY-<legacyId>` strategy already used in `stock-in`
  - header customer handling:
    - legacy `customer_id IS NULL` is allowed and keeps `customerId = NULL`
    - non-null customer IDs missing from batch1 map exclude the document
    - available customer map rows populate `customerId` and snapshots
  - personnel handling follows the safe pattern used by existing slices:
    - ambiguous personnel names do not become blockers by themselves
    - preserve `handlerNameSnapshot` when `handlerPersonnelId` cannot be set safely
  - blocked or missing material lines exclude the entire document
  - line raw interval text is archived, not parsed into `startNumber` and `endNumber`
  - all `sourceDocument*` target fields remain `NULL`
- [ ] Step 6: implement writer and execute guard behavior:
  - reject execute if target tables already contain dirty rows for this slice without matching batch maps
  - reject execute if mapped target rows are missing
  - reject rerun when downstream consumers already reference `CustomerStockOrder`, especially:
    - `document_relation`
    - `document_line_relation`
    - `factory_number_reservation`
    - `workflow_audit_document`
    - `inventory_log`
    - `inventory_source_usage`
  - continue using the current target DB state without reset
- [ ] Step 7: archive or exclude deterministically:
  - archive header-only fields such as `bookkeeping`, original document number, and any legacy audit payload the slice needs to preserve for later evidence
  - archive line-only fields such as raw `interval`
  - exclude whole documents for missing `documentNo`, missing `bizDate`, blocked or unmapped materials, or any other condition that would require semantic widening
- [ ] Step 8: add package scripts:
  - `migration:outbound:dry-run`
  - `migration:outbound:execute`
  - `migration:outbound:validate`
- [ ] Step 9: run iteration validation first, then execute and validate from the current DB state.

## Coder Handoff

- Execution brief: implement `batch2c-outbound-base` as an outbound-only business-table migration that intentionally excludes sales returns, relations, number reservations, workflow projections, and inventory replay.
- Required source docs or files:
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/outbound.md`
  - `prisma/schema.prisma`
  - `scripts/migration/stock-in/**`
  - `scripts/migration/project/**`
  - `E:/Projects/saifute-wms-server/ruoyi-admin/src/main/resources/saifute_202600201_1629001.sql`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/out/SaifuteOutboundOrderMapper.xml`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/out/SaifuteSalesReturnOrderMapper.xml`
- Constraints and non-goals:
  - do not read or migrate `saifute_sales_return_order` or `saifute_sales_return_detail` in this slice
  - do not write `document_relation` or `document_line_relation`
  - do not write `factory_number_reservation`
  - do not populate `customer_stock_order_line.startNumber` or `endNumber`
  - do not populate `customer_stock_order_line.sourceDocumentType`, `sourceDocumentId`, or `sourceDocumentLineId`
  - do not write `workflow_audit_document`
  - do not write any inventory tables and do not add replay logic
  - do not widen semantics to infer sales-return relations or split multi-interval strings
  - do not reset staging or target data
- Iteration validation:
  - `pnpm migration:typecheck`
  - `pnpm migration:outbound:dry-run`
  - inspect the dry-run report for:
    - `counts.orders.migrated + counts.orders.excluded = sourceCounts.orders`
    - `counts.lines.migrated + counts.lines.excluded = sourceCounts.lines`
    - every migrated document reports `orderType = OUTBOUND`
    - no migrated line carries non-null `startNumber`, `endNumber`, or `sourceDocument*`
    - no sales-return source tables appear in the dry-run summary

## Reviewer Handoff

- Review focus:
  - confirm the slice does not widen runtime semantics
  - confirm sales returns are untouched and no relation recovery logic leaks in
  - confirm archived raw interval text is preserved for later slices
  - confirm execute guards block dirty reruns once downstream consumers exist
  - confirm deterministic `documentNo` and `lineNo` rules match earlier slices
  - confirm exclusions happen at whole-document granularity for blocking line issues
  - confirm no writes happen to inventory, workflow projection, relation, or reservation tables
- Final validation gate:
  - `pnpm migration:typecheck`
  - `pnpm migration:outbound:dry-run`
  - `pnpm migration:outbound:execute`
  - `pnpm migration:outbound:validate`
  - DB and report gates:
    - `customer_stock_order` rows added by this slice all have `orderType = OUTBOUND`
    - `customer_stock_order_line` rows added by this slice all have `sourceDocumentType IS NULL`, `sourceDocumentId IS NULL`, `sourceDocumentLineId IS NULL`, `startNumber IS NULL`, and `endNumber IS NULL`
    - `migration_staging.map_customer_stock_order` batch row count matches inserted target headers
    - `migration_staging.map_customer_stock_order_line` batch row count matches inserted target lines
    - excluded rows for this batch appear only for legacy outbound documents that hit deterministic blockers
    - `factory_number_reservation`, `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_log`, and `inventory_source_usage` counts remain unchanged by this slice
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status`
  - do not rewrite source-of-truth module docs as part of this slice unless the parent explicitly expands scope

## Parallelization Safety

- State: `not safe`
- Reason:
  - this slice needs single-owner sequencing across one new migration directory plus shared staging SQL and `package.json`
  - rerun guards and batch naming are contract-sensitive shared surfaces
  - later dependent slices will consume the same target tables and staging maps
  - there is no disjoint writable split that avoids shared migration contracts

## Review Log

- Validation results:
  - Parent reran `pnpm migration:typecheck`; it passed.
  - Parent reran `pnpm migration:outbound:dry-run`; it passed and refreshed `scripts/migration/reports/outbound-dry-run-report.json` with the historical `batch2c-outbound-base` partition still intact at `108` migrated orders + `4` excluded orders = `112` source orders and `137` migrated lines + `4` excluded lines = `141` source lines, with no new global blockers.
  - Parent reran `pnpm migration:outbound:execute`; it wrote `scripts/migration/reports/outbound-execute-report.json` and exited non-zero because rerun guards now see an evolved baseline: `customer_stock_order` totals `117` rows vs this batch's `108` owned rows and `customer_stock_order_line` totals `150` rows vs this batch's `137` owned rows, which matches the already-reviewed sales-return formal-admission delta of `+9` orders / `+13` lines. The same execute report also shows downstream `CustomerStockOrder` consumers now populated at `factory_number_reservation = 80`, `workflow_audit_document = 113`, and `inventory_log = 154`, so rerunning `batch2c` is correctly refused from the current non-reset baseline.
  - Parent reran `pnpm migration:outbound:validate`; it wrote `scripts/migration/reports/outbound-validate-report.json` and exited non-zero. Reviewer inspected the refreshed report together with `scripts/migration/outbound/validate.ts` and confirmed the validator still enforces the original immediate-post-`batch2c` contract that all `CustomerStockOrder`-linked downstream tables remain empty and all outbound-base-owned lines keep `startNumber/endNumber = NULL`. Those checks are now stale on the evolved baseline because the reviewed `batch3a-outbound-order-type4-reservation` slice intentionally created `80` live reservations and backfilled qualifying line ranges, and the reviewed shared post-admission phase intentionally projected `workflow_audit_document` and replayed `inventory_log` for the customer-stock family.
  - Reviewer confirmed the outbound-base-owned evidence itself still reconciles on the current baseline: `orderBatchMapRows = 108`, `batchOwnedOrderRows = 108`, `lineBatchMapRows = 137`, `batchOwnedLineRows = 137`, `missingMappedOrders = 0`, `missingMappedLines = 0`, `excludedDocumentCount = 4`, and `archivedPayloadCount = 177`.
- Findings:
  - No remaining `[blocking]` or `[important]` findings for `batch2c-outbound-base` closure. The current non-zero `execute` result is expected rerun-guard behavior on a later evolved baseline, and the current non-zero `validate` result reflects stale immediate-post-slice assumptions rather than an unresolved defect in the batch-owned outbound-base output.
- Follow-up action:
  - No further coder work is required inside `scripts/migration/outbound/**` for the outbound-base slice. Parent should treat the refreshed dry-run plus intact batch-owned map/row evidence as the closure baseline, and should not use the current evolved-baseline `migration:outbound:validate` exit code as a blocker for closing this slice.

## Final Status

- Outcome:
  - Closure is confirmed for `batch2c-outbound-base` on the current repository baseline. The owned outbound-base rows, staging maps, exclusions, and archived payloads still match the deterministic plan, while the current non-zero `execute` / `validate` results come from later reviewed slices legally extending the baseline rather than from a remaining outbound-base defect.
- Residual risks or testing gaps:
  - `scripts/migration/outbound/validate.ts` is no longer a reusable whole-baseline validator once `batch3a-outbound-order-type4-reservation` and the shared post-admission phase have already populated `factory_number_reservation`, `workflow_audit_document`, `inventory_log`, and qualifying outbound line `startNumber/endNumber`. That operational drift should be understood during archive/closure handling, but it is not a remaining blocker for `batch2c` itself.
  - This rereview relied on the refreshed DB-backed reports and current task-history authority map rather than introducing a new evolved-baseline validator for the historical slice.
- Next action:
  - No further coder changes are required for `batch2c`. Parent should update requirement/index bookkeeping, archive this task with a completed/retained-completed disposition alongside the already-completed sales-return and workshop-return task docs, and archive the active requirement as well if no migration slices remain open.
