# Migration Workshop Pick Base Slice

## Metadata

- Scope: `batch3b-workshop-pick-base` to migrate only `saifute_pick_order` and `saifute_pick_detail` into `workshop_material_order` and `workshop_material_order_line`
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
  - `docs/architecture/modules/workshop-material.md`
  - `prisma/schema.prisma`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `package.json`
  - `scripts/migration/stock-in/**`
  - `scripts/migration/outbound/**`
  - `scripts/migration/project/**`
  - `scripts/migration/workshop-pick/migrate.ts` (new)
  - `scripts/migration/workshop-pick/legacy-reader.ts` (new)
  - `scripts/migration/workshop-pick/transformer.ts` (new)
  - `scripts/migration/workshop-pick/writer.ts` (new)
  - `scripts/migration/workshop-pick/validate.ts` (new)
  - `scripts/migration/workshop-pick/execute-guard.ts` (new)
  - `scripts/migration/workshop-pick/types.ts` (new)
  - `test/migration/workshop-pick.spec.ts` (new)
  - `test/migration/workshop-pick-execute-guard.spec.ts` (new)
  - `scripts/migration/reports/workshop-pick-dry-run-report.json` (generated)
  - `scripts/migration/reports/workshop-pick-execute-report.json` (generated)
  - `scripts/migration/reports/workshop-pick-validate-report.json` (generated)
  - `E:/Projects/saifute-wms-server/ruoyi-admin/src/main/resources/saifute_202600201_1629001.sql`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/take/SaifutePickOrderMapper.xml`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/take/SaifuteReturnOrderMapper.xml`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/stock/SaifuteInventoryUsedMapper.xml`

## Goal And Acceptance Criteria

- Goal: deliver the next smallest credible migration slice after completed `batch0`, `batch1`, `batch2a-stock-in`, `batch2b-project exclusion-only`, `batch2c-outbound-base`, and `batch3a-outbound-order-type4-reservation` by admitting only legacy pick documents into the workshop-material business tables, without widening unresolved return, scrap, relation, workflow, or inventory-source semantics.
- Acceptance criteria:
  - A dedicated migration slice exists for `batch3b-workshop-pick-base` with dry-run, execute, and validate commands.
  - The slice reads only:
    - `saifute_pick_order`
    - `saifute_pick_detail`
    - `saifute_audit_document` filtered to `document_type = 3`
  - The slice does not ingest `saifute_return_order`, `saifute_return_detail`, `saifute_scrap_order`, `saifute_scrap_detail`, or live `saifute_inventory_used` relations into target business tables.
  - Target writes are limited to:
    - `workshop_material_order`
    - `workshop_material_order_line`
    - `migration_staging.map_workshop_material_order`
    - `migration_staging.map_workshop_material_order_line`
    - `migration_staging.archived_field_payload`
    - `migration_staging.excluded_documents`
  - Every migrated header has:
    - `orderType = PICK`
    - deterministic `documentNo`
    - deterministic `lineNo`
    - `workshopId` resolved from the batch1 workshop map, with only legacy `workshop_id IS NULL` allowed to fall back to `WS-LEGACY-DEFAULT`
    - status fields aligned to the frozen migration plan
  - Every migrated line keeps `sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` as `NULL`.
  - Pick-only unmapped legacy fields, especially `project_id`, raw `picker`, raw `charge_by`, line `instruction`, raw legacy price evidence, and original document numbers when rewritten, are archived instead of silently dropped.
  - Legacy `saifute_pick_detail.unit_price` is treated as line-amount evidence for this slice because the legacy SQL samples and header totals show it behaves as line total, not target per-unit price:
    - target `amount = legacy.unit_price`
    - target `unitPrice = amount / quantity` only when the result is deterministic at target precision
    - any document containing a line that cannot derive a stable target `unitPrice` is excluded whole-document rather than mixing price semantics
  - Blocking header or line issues exclude the whole pick document deterministically into `migration_staging.excluded_documents`; no heuristic project linking, return linking, or source reconstruction is introduced.
  - Validation proves:
    - `counts.orders.migrated + counts.orders.excluded = 75`
    - `counts.lines.migrated + counts.lines.excluded = 197`
    - no writes occur to `document_relation`, `document_line_relation`, `factory_number_reservation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, or `inventory_source_usage`
    - rerun cleanup and map consistency are deterministic from the current non-empty target state
  - The slice executes against the current migrated baseline and does not require `--reset`, schema reset, or database reset.

## Scope And Ownership

- Allowed code paths:
  - `scripts/migration/workshop-pick/**`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `package.json`
  - `test/migration/workshop-pick.spec.ts`
  - `test/migration/workshop-pick-execute-guard.spec.ts`
  - this task doc only if the parent explicitly reassigns ownership
- Frozen or shared paths:
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `scripts/migration/stock-in/**`
  - `scripts/migration/outbound/**`
  - `scripts/migration/outbound-reservation/**`
  - `scripts/migration/project/**`
  - `scripts/migration/shared/deterministic.ts`
  - `document_relation`
  - `document_line_relation`
  - `factory_number_reservation`
  - `workflow_audit_document`
  - `inventory_balance`
  - `inventory_log`
  - `inventory_source_usage`
- Task doc owner: `planner`
- Contracts that must not change silently:
  - `inventory-core` remains the only stock write entry point, so this slice must not write inventory tables or attempt replay.
  - `workflow` owns `workflow_audit_document`, so this slice may only set `auditStatusSnapshot` on business rows and must not create workflow projection rows.
  - `workshop-material` return relationships and source usage remain separate slices; no `sourceDocument*` values may be invented here.
  - `project` linkage is not part of the workshop-material write model in the current schema; legacy `project_id` stays archived, not live-mapped.
  - The current target DB state is authoritative; no reset or clean-slate assumptions are allowed.

## Implementation Plan

- [ ] Step 1: extend `migration_staging` bootstrap SQL with:
  - `map_workshop_material_order`
  - `map_workshop_material_order_line`
  matching the existing map-table shape and uniqueness rules used by the already executed slices.
- [ ] Step 2: scaffold `scripts/migration/workshop-pick/` by mirroring the `stock-in` and `outbound` folder structure, naming the batch `batch3b-workshop-pick-base`.
- [ ] Step 3: implement `legacy-reader.ts` for only:
  - `saifute_pick_order`
  - `saifute_pick_detail`
  - `saifute_audit_document` filtered to `document_type = 3`
  - dependency snapshots from batch1 maps:
    - `map_material`
    - `map_workshop`
    - `map_personnel`
    - batch1 blocked material baseline
    - frozen default workshop `WS-LEGACY-DEFAULT / 历史默认车间`
- [ ] Step 4: implement deterministic header transformation rules:
  - `orderType = PICK`
  - `bizDate = pick_date`
  - `workshopId` uses mapped legacy `workshop_id`; only `NULL` may use the frozen default workshop
  - `lifecycleStatus = EFFECTIVE` when `del_flag = 0`, else `VOIDED`
  - `auditStatusSnapshot = NOT_REQUIRED` when voided, else derive from legacy audit row with missing row -> `PENDING`
  - `inventoryEffectStatus = POSTED` when effective, else `REVERSED`
  - `documentNo` preserved unless duplicate, then rewritten with the same active-first and `-LEGACY-<legacyId>` rule already frozen for earlier slices
  - `handlerPersonnelId` resolution prefers the operational actor field `picker`; ambiguous personnel names do not block by themselves and fall back to snapshot-only
  - raw `charge_by` stays archived because the target model has only one handler slot and this slice should not widen family semantics
  - legacy `project_id` stays archived, not mapped to live tables
- [ ] Step 5: implement deterministic line transformation rules:
  - `lineNo` generated by parent header key plus legacy detail ID ascending
  - blocking or unmapped material lines exclude the whole document
  - `sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` remain `NULL`
  - line `instruction` and other unmapped detail fields are archived
  - price handling for pick lines is explicit and slice-local:
    - treat legacy `unit_price` as line total evidence
    - `amount = normalize(legacy.unit_price, 2)`
    - `unitPrice = amount / quantity` only when quantity is non-zero and the result is stable at target 2-decimal precision
    - if any line fails deterministic price derivation, exclude the whole document
- [ ] Step 6: implement writer and execute-guard behavior:
  - reject execute if target tables already contain dirty rows for this slice without matching batch maps
  - reject execute if mapped target rows are missing
  - reject late first execution or rerun once downstream consumers already reference `WorkshopMaterialOrder`, especially:
    - `document_relation`
    - `document_line_relation`
    - `workflow_audit_document`
    - `inventory_log`
    - `inventory_source_usage`
  - continue using the current target DB state without reset
- [ ] Step 7: archive or exclude deterministically:
  - archive header-only fields such as raw `project_id`, raw `charge_by`, and original document number when rewritten
  - archive line-only fields such as raw `instruction` and raw price evidence
  - exclude whole documents for missing `documentNo`, missing `bizDate`, non-null `workshop_id` missing from the workshop map, blocked or unmapped materials, missing lines, or price derivation failures
- [ ] Step 8: add package scripts:
  - `migration:workshop-pick:dry-run`
  - `migration:workshop-pick:execute`
  - `migration:workshop-pick:validate`
- [ ] Step 9: add focused tests covering:
  - duplicate document-number rewrites
  - `NULL` workshop fallback versus unmapped non-null workshop exclusion
  - picker-name personnel resolution fallback
  - pick-specific price derivation and exclusion behavior
  - execute guards for dirty targets, missing maps, and late-first-execute downstream blockers
- [ ] Step 10: run iteration validation first, then execute and validate from the current DB state.

## Coder Handoff

- Execution brief: implement `batch3b-workshop-pick-base` as a pick-only workshop-material business-table migration that intentionally excludes return, scrap, relation reconstruction, workflow projection, inventory replay, and `inventory_source_usage`.
- Required source docs or files:
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/workshop-material.md`
  - `prisma/schema.prisma`
  - `scripts/migration/stock-in/**`
  - `scripts/migration/outbound/**`
  - `scripts/migration/project/**`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `E:/Projects/saifute-wms-server/ruoyi-admin/src/main/resources/saifute_202600201_1629001.sql`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/take/SaifutePickOrderMapper.xml`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/take/SaifuteReturnOrderMapper.xml`
  - `E:/Projects/saifute-wms-server/business/src/main/resources/mapper/stock/SaifuteInventoryUsedMapper.xml`
- Owned paths:
  - `scripts/migration/workshop-pick/**`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `package.json`
  - `test/migration/workshop-pick.spec.ts`
  - `test/migration/workshop-pick-execute-guard.spec.ts`
- Forbidden shared files:
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `scripts/migration/shared/deterministic.ts`
  - `scripts/migration/stock-in/**`
  - `scripts/migration/outbound/**`
  - `scripts/migration/outbound-reservation/**`
  - `scripts/migration/project/**`
- Constraints and non-goals:
  - do not read or migrate `saifute_return_order` or `saifute_return_detail` into live business tables
  - do not read or migrate `saifute_scrap_order` or `saifute_scrap_detail` into live business tables
  - do not write `document_relation` or `document_line_relation`
  - do not populate `workshop_material_order_line.sourceDocumentType`, `sourceDocumentId`, or `sourceDocumentLineId`
  - do not write `workflow_audit_document`
  - do not write any inventory tables and do not add replay logic
  - do not write `inventory_source_usage`
  - do not infer project relations from legacy `project_id`
  - do not mix pick pricing heuristics; use one deterministic rule or exclude
  - do not reset staging or target data
- Validation command for this scope:
  - `pnpm migration:typecheck`
  - `pnpm migration:workshop-pick:dry-run`
- Iteration report gates:
  - `counts.orders.migrated + counts.orders.excluded = 75`
  - `counts.lines.migrated + counts.lines.excluded = 197`
  - every migrated document reports `orderType = PICK`
  - every migrated line reports `sourceDocumentType = NULL`, `sourceDocumentId = NULL`, and `sourceDocumentLineId = NULL`
  - dry-run reports deterministic document-number rewrites for the three duplicate `pick_no` groups
  - dry-run reports how many `NULL` workshop rows were defaulted
  - dry-run reports `priceDerivationFailureCount = 0` for admitted rows, otherwise blocks execution

## Reviewer Handoff

- Review focus:
  - confirm the slice does not widen return or scrap semantics
  - confirm pick documents are admitted without inventing `sourceDocument*` fields
  - confirm raw `project_id`, `charge_by`, `instruction`, and price evidence are archived instead of silently dropped
  - confirm the pick-specific price rule is deterministic and does not silently mix amount and unit-price interpretations
  - confirm duplicate document-number rewrites match the frozen rule
  - confirm `NULL` workshop fallback is limited to the frozen default-workshop rule
  - confirm no writes occur to workflow, relation, reservation, or inventory tables
  - confirm late first execution is blocked once downstream workshop-material consumers exist
- Final validation gate:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/workshop-pick.spec.ts test/migration/workshop-pick-execute-guard.spec.ts`
  - `pnpm migration:workshop-pick:dry-run`
  - `pnpm migration:workshop-pick:execute`
  - `pnpm migration:workshop-pick:validate`
  - DB and report gates:
    - `workshop_material_order` rows inserted by this batch all have `orderType = 'PICK'`
    - `workshop_material_order_line` rows inserted by this batch all keep `sourceDocumentType IS NULL`, `sourceDocumentId IS NULL`, and `sourceDocumentLineId IS NULL`
    - `migration_staging.map_workshop_material_order` batch row count matches inserted target headers
    - `migration_staging.map_workshop_material_order_line` batch row count matches inserted target lines
    - excluded rows for this batch appear only for deterministic blockers
    - `document_relation`, `document_line_relation`, `factory_number_reservation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, and `inventory_source_usage` counts remain unchanged
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status`

## Architecture And Repository Considerations

- `arch-feature-modules`: keep the slice isolated to migration tooling and the frozen workshop-material write model; do not spread this work into runtime application modules.
- `db-use-transactions`: target headers, target lines, staging maps, archived payload rows, and excluded-document rows must commit in one DB transaction to avoid split-brain between live facts and staging ownership.
- `perf-optimize-database`: load master-data maps and legacy rows in set-based queries; do not do per-line DB lookups during transformation or validation.
- `security-validate-all-input`: treat legacy pick rows as untrusted input; unexpected audit codes, invalid price derivations, or missing required fields should surface as blockers or exclusions, not reach live tables.
- Current repository layering still applies: migration scripts adapt legacy data to the already frozen runtime schema; they must not change current runtime behavior to fit legacy quirks.

## Risks And Contract-Sensitive Areas

- Frozen rules:
  - `inventory-core` is the only stock write entry point; this slice must not masquerade as inventory replay.
  - `workflow` owns audit projection semantics; this slice must not infer workflow rows from legacy pick data.
  - `workshop-material` return linkage and source usage remain unresolved and must not be widened here.
- Why this slice is safer than alternatives:
  - `saifute_pick_order` and `saifute_pick_detail` do not require upstream-source reconstruction to admit the business facts.
  - `saifute_return_order` still has `source_id/source_type` unresolved in the frozen migration plan, and the legacy runtime falls back to `inventory_used`, so any return slice would widen semantics into relation and source reconstruction immediately.
  - `saifute_scrap_order` currently has zero rows in the legacy SQL dump and lacks the workshop dimension on the header, so adding scrap now increases code surface without moving executed data.
  - `workflow`, relation recovery, and inventory replay are all shared-contract slices that become safer after pick business rows are admitted first.
- Pick-specific data risks:
  - legacy pick detail pricing is the main contained ambiguity; dry-run must prove the slice-local price rule fits all admitted lines or fail fast
  - `saifute_pick_order` has three duplicate active `pick_no` groups, so document-number rewrites must be deterministic
  - the migration plan already records `10` legacy pick headers with `workshop_id IS NULL`; only those may use the default workshop
  - `project_id` is present on pick headers but has no live target field in the current schema and must stay archived
- Staging and exclusion handling:
  - `migration_staging.excluded_documents` is the mandatory sink for blocking pick documents in this slice
  - `migration_staging.archived_field_payload` must keep raw evidence needed for later project, return, or pricing follow-up
  - this slice must not create `pending_relations`; unresolved return semantics remain out of scope
- Replay-vs-copy judgment:
  - `workshop_material_order` and `workshop_material_order_line` are direct copy-and-transform targets for this slice
  - `inventory_balance`, `inventory_log`, and `inventory_source_usage` remain replay targets for a later stock-rebuild slice
  - `workflow_audit_document` remains a later projection slice, not a direct copy target here
- Blocker list:
  - missing or inconsistent batch1 `material`, `workshop`, or `personnel` maps
  - dirty target baseline or missing batch-owned target rows on rerun
  - any admitted pick line whose amount-to-unit-price derivation is not deterministic at target precision
  - unexpected legacy audit status codes outside the documented `0/1/2`
  - downstream workshop-material consumers already populated before this slice first executes

## Validation Plan

- Narrow iteration commands:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/workshop-pick.spec.ts test/migration/workshop-pick-execute-guard.spec.ts`
  - `pnpm migration:workshop-pick:dry-run`
- Final command or gate aligned to the risk surface:
  - `pnpm migration:workshop-pick:execute`
  - `pnpm migration:workshop-pick:validate`
- Required report and DB gates:
  - dry-run proves the full partition of all `75` pick headers and `197` pick lines into migrated versus excluded
  - report explicitly lists rewritten duplicate `pick_no` outcomes
  - report explicitly lists `NULL` workshop fallback count
  - report explicitly lists price-derivation failures and blocks execute when non-zero
  - validation proves batch-owned map rows equal batch-owned target rows
  - validation proves forbidden table counts remain unchanged
  - validation proves rerun cleanup does not duplicate archived payload or exclusion rows

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `package.json`
  - `workshop_material_order`
  - `workshop_material_order_line`
  - `migration_staging.excluded_documents`
  - the new batch contract, report format, and execute-guard rules

## Review Log

- Validation results:
  - `pnpm migration:typecheck`, `pnpm exec biome check "scripts/migration/outbound-reservation" "scripts/migration/workshop-pick" "test/migration/outbound-reservation-execute-guard.spec.ts" "test/migration/workshop-pick.spec.ts" "test/migration/workshop-pick-execute-guard.spec.ts"`, and `pnpm test -- --runTestsByPath test/migration/outbound-reservation-execute-guard.spec.ts test/migration/workshop-pick.spec.ts test/migration/workshop-pick-execute-guard.spec.ts` were already passing from the prior rereview and were intentionally not rerun in this continuation.
  - `pnpm migration:workshop-pick:execute` initially failed on the current target because `migration_staging.map_workshop_material_order` and `migration_staging.map_workshop_material_order_line` were missing from the live staging schema.
  - `pnpm migration:bootstrap-staging` was rerun to align the target staging schema with the checked-in SQL. Report: `scripts/migration/reports/bootstrap-staging-report.json`. The refreshed bootstrap completed with `resetApplied = false`, `statementsExecuted = 22`, and now includes both workshop-material map tables.
  - `pnpm migration:workshop-pick:dry-run` then passed. Report: `scripts/migration/reports/workshop-pick-dry-run-report.json`. Dry-run reconfirmed `75` source headers split into `61` migrated + `14` excluded orders and `197` source lines split into `145` migrated + `52` excluded lines, with `10` `NULL`-workshop fallbacks, three deterministic duplicate-document rewrites, and one deterministic whole-document price-derivation exclusion.
  - `pnpm migration:workshop-pick:execute` passed. Report: `scripts/migration/reports/workshop-pick-execute-report.json`.
  - `pnpm migration:workshop-pick:validate` passed. Report: `scripts/migration/reports/workshop-pick-validate-report.json`. `validationIssues` stayed empty; `61` batch-owned order rows matched `61` order map rows and targets; `145` batch-owned line rows matched `145` line map rows and targets; `206` archived payload rows and `14` excluded documents matched expectations; forbidden table counts stayed unchanged at `0`.
- Findings:
  - No remaining `[blocking]` or `[important]` code findings in the scoped latest-fix rereview.
- Follow-up action:
  - No further repair work is required for this slice. Future local reruns should either persist `LEGACY_DATABASE_URL` in the operator environment or continue passing it as a temporary shell override, and environments with stale staging bootstrap should rerun `pnpm migration:bootstrap-staging` before first execute.

## Final Status

- Outcome:
  - The scoped workshop-pick slice now has both `reviewed-no-findings` code status and a successful live DB-backed `dry-run -> execute -> validate` gate on the current migrated baseline.
- Residual risks or testing gaps:
  - Local reruns still depend on supplying `LEGACY_DATABASE_URL`; the checked-in `.env.dev` does not yet provide that variable.
  - Environments that bootstrapped `migration_staging` before the workshop-material map tables were added will need a fresh `pnpm migration:bootstrap-staging` before the first `batch3b-workshop-pick-base` execute.
- Next action:
  - No further coder changes are required for this slice; downstream migration work can consume the current `batch3b-workshop-pick-base` output from the non-reset baseline.
