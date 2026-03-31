# Migration Workshop Return Formal Admission

## Metadata

- Scope: `batch3e-workshop-return-formal-admission` to admit structurally valid legacy `saifute_return_order` and `saifute_return_detail` rows into `workshop_material_order` and `workshop_material_order_line` even when upstream pick relations cannot yet be proven; nullable `sourceDocumentType/sourceDocumentId/sourceDocumentLineId` is acceptable on migrated rows and later relation work is deferred to the shared post-admission phase
- Related requirement: `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder:
- Reviewer: `code-reviewer`
- Last updated: `2026-03-20`
- Related files:
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/modules/workshop-material.md`
  - `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - `prisma/schema.prisma`
  - `package.json`
  - `scripts/migration/workshop-return/**`
  - `test/migration/workshop-return.spec.ts`
  - `test/migration/workshop-return-execute-guard.spec.ts`

## Goal And Acceptance Criteria

- Goal: realign the workshop-return migration slice to the confirmed business rule so that formal business admission happens first and relation reconstruction becomes later enrichment rather than an admission gate.
- Acceptance criteria:
  - The slice processes all `3` legacy workshop-return headers and all `4` legacy workshop-return details under one of two admission outcomes only:
    - live formal business admission
    - true structural exclusion
  - Lack of provable upstream pick relation is not an exclusion reason.
  - Every admitted header writes `orderType = RETURN` and the current runtime status axes.
  - Every admitted line may legitimately keep `sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` as `NULL`; non-null fill is optional enrichment only when a unique deterministic upstream target already exists.
  - `migration_staging.excluded_documents` is reserved for structurally invalid headers only, with explicit structural reason codes.
  - Family-local `pending_relations` or `archived_relations` draining is no longer the target completion model for this admission slice.
  - The slice still does not write `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, `inventory_source_usage`, or `factory_number_reservation`.
  - Dry-run, execute, and validate reports surface admitted rows, true exclusions, and any later relation-enrichment backlog separately.

## Scope And Ownership

- Allowed code paths:
  - `scripts/migration/workshop-return/**`
  - `package.json`
  - `test/migration/workshop-return.spec.ts`
  - `test/migration/workshop-return-execute-guard.spec.ts`
  - this task doc only if the parent explicitly reassigns ownership
- Frozen or shared paths:
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/modules/workshop-material.md`
  - `scripts/migration/workshop-pick/**`
  - `scripts/migration/shared/**`
  - `scripts/migration/workshop-return-finalize/**`
  - `document_relation`
  - `document_line_relation`
  - `workflow_audit_document`
  - `factory_number_reservation`
  - `inventory_balance`
  - `inventory_log`
  - `inventory_source_usage`
- Task doc owner: `planner`
- Contracts that must not change silently:
  - `inventory-core` remains the only stock write entry point, so this slice must not write inventory tables and must not attempt replay.
  - `workflow` owns `workflow_audit_document`, so this slice may only set `auditStatusSnapshot` on business rows and must not create workflow projection rows.
  - Existing workshop-pick baseline rows are read-only evidence for optional enrichment and must not be rewritten by this slice.
  - `prisma/schema.prisma` already permits nullable `workshop_material_order_line.sourceDocument*`; the coder must preserve that contract rather than reintroduce non-null admission assumptions.
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md` now holds the repository-level migration baseline, but this task doc remains the active runtime source of truth for the workshop-return formal-admission slice when the narrower slice guidance is more specific.
  - Only structural invalidity may drive `migration_staging.excluded_documents`.

## Implementation Plan

- [ ] Step 1: replace recoverable-only partitioning with structural-validation-first admission:
  - separate structural invalidity from relation reconstruction
  - define explicit structural exclusion reasons such as missing required master-data mapping after frozen fallbacks, broken header-detail integrity, missing deterministic business date or document number after frozen fallback rules, or impossible quantity or amount transformation at current schema precision
  - treat missing or ambiguous upstream pick relation as later enrichment, not exclusion
- [ ] Step 2: preserve deterministic business-row transformation for all admitted headers and lines:
  - `orderType = RETURN`
  - `bizDate = return_date`
  - `workshopId` comes from mapped legacy workshop data when available, otherwise the frozen default workshop `WS-LEGACY-DEFAULT`
  - `lifecycleStatus`, `auditStatusSnapshot`, and `inventoryEffectStatus` continue to map from `del_flag` plus legacy audit evidence under current runtime semantics
  - `documentNo` rewrite and `lineNo` ordering remain deterministic against the already non-empty `workshop_material_order` family
  - `handlerPersonnelId` should continue to use deterministic legacy personnel resolution without depending on relation recovery
- [ ] Step 3: relax source-field handling:
  - make `sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` optional at admission
  - if current deterministic evidence collapses to one target pick line, the slice may populate `sourceDocument*`
  - if evidence is absent or ambiguous, admit the line with null `sourceDocument*` and archive the relation evidence for later shared enrichment
- [ ] Step 4: re-scope evidence handling:
  - treat `source_id`, `source_type`, `remark`, and `saifute_inventory_used` as evidence inputs or archived payload, not as blockers by themselves
  - keep `excluded_documents` only for structural invalidity
  - any later relation-enrichment backlog must be clearly separated from true exclusion and must not imply family-admission failure by itself
- [ ] Step 5: update execute guards, validate logic, and focused tests so they prove formal admission semantics rather than pending-finalization semantics.

## Coder Handoff

- Execution brief: update `scripts/migration/workshop-return/**` so live admission is controlled only by structural validity, while source relation proof becomes optional enrichment. Reuse current deterministic document and mapping rules, but stop turning relation ambiguity into exclusion or family-local finalization work.
- Required source docs or files:
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/modules/workshop-material.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - `prisma/schema.prisma`
  - `scripts/migration/workshop-return/**`
- Owned paths:
  - `scripts/migration/workshop-return/**`
  - `package.json`
  - `test/migration/workshop-return.spec.ts`
  - `test/migration/workshop-return-execute-guard.spec.ts`
- Forbidden shared files:
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `scripts/migration/workshop-pick/**`
  - `scripts/migration/shared/**`
  - `scripts/migration/workshop-return-finalize/**`
- Constraints and non-goals:
  - do not require non-null `sourceDocument*` for admission
  - do not exclude or queue-finalize a header only because upstream relation is unprovable
  - do not write `document_relation` or `document_line_relation`
  - do not write `workflow_audit_document`
  - do not write `factory_number_reservation`
  - do not write `inventory_balance`, `inventory_log`, or `inventory_source_usage`
  - do not reinterpret legacy `source_type` as target `sourceDocumentType`
  - do not mutate previously admitted workshop-pick baseline rows
  - do not convert this slice back into a family-local pending-queue drain
- Validation command for this scope:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/workshop-return.spec.ts test/migration/workshop-return-execute-guard.spec.ts`
  - `pnpm migration:workshop-return:dry-run`
- Iteration report gates:
  - `sourceCounts.orders = 3`
  - `sourceCounts.lines = 4`
  - admitted plus structurally excluded headers fully partition the legacy header set
  - relation-only reason families such as `no-upstream-pick-line-candidate` or `multiple-upstream-pick-line-candidates` no longer appear as exclusion reasons
  - admitted lines may be either null or non-null in `sourceDocument*`
  - forbidden tables remain unchanged

## Reviewer Handoff

- Review focus:
  - confirm relation proof is no longer an admission gate
  - confirm structurally valid workshop returns are not excluded merely because `sourceDocument*` cannot be proven
  - confirm nullable `sourceDocument*` on admitted rows is treated as valid, not as validation failure
  - confirm `excluded_documents` carries only structural invalidity reasons
  - confirm archived evidence or backlog, if produced, is non-gating and compatible with later shared post-admission enrichment
  - confirm no writes occur to relation, workflow, reservation, or inventory tables
- Final validation gate:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/workshop-return.spec.ts test/migration/workshop-return-execute-guard.spec.ts`
  - `pnpm migration:workshop-return:dry-run`
  - `pnpm migration:workshop-return:execute`
  - `pnpm migration:workshop-return:validate`
  - DB and report gates:
    - full header and line counts partition the legacy dataset
    - admitted lines with null `sourceDocument*` do not fail validation
    - no exclusion reason is relation-only
    - `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, `inventory_source_usage`, and `factory_number_reservation` remain unchanged
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status`

## Architecture And Repository Considerations

- `workshop_material_order` and `workshop_material_order_line` are the formal business result tables; later relation enrichment must not be allowed to become a hidden admission prerequisite.
- Keep the migration logic isolated to the migration directory and avoid spreading admission work into runtime modules.
- Use set-based reads for legacy rows, workshop-pick baselines, master-data maps, and archived evidence; avoid per-line lookup loops.
- Preserve deterministic number rewrite, line ordering, and stable report ordering so reruns reproduce the same admission outcome.
- Business-table admission is direct copy-and-transform work for the current runtime schema; `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, and `inventory_source_usage` remain later shared projection work.

## Risks And Contract-Sensitive Areas

- Stale repository text:
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md` preserves the repository-level migration baseline, but this narrower brief supersedes any older recoverable-only workshop-return wording and remains authoritative for execution.
- Workshop identity handling:
  - `workshopId` must come from mapped legacy workshop data or the frozen default workshop, not from a guessed upstream pick relation.
- Structural-invalidity boundary:
  - The coder must keep the exclusion boundary narrow and explicit so relation uncertainty does not drift back into exclusion logic.
- Later enrichment safety:
  - Shared downstream relation reconstruction must not silently rewrite admitted workshop facts when later evidence conflicts; those cases need explicit follow-up handling, not invisible mutation.
- Validation drift:
  - Current tests, reports, and validate logic encode non-null source assumptions and pending-queue gates; all of them must be rewritten to match the new model.

## Validation Plan

- Narrow iteration commands:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/workshop-return.spec.ts test/migration/workshop-return-execute-guard.spec.ts`
  - `pnpm migration:workshop-return:dry-run`
- Final command or gate aligned to the risk surface:
  - `pnpm migration:workshop-return:execute`
  - `pnpm migration:workshop-return:validate`
- Required report and DB gates:
  - dry-run reports admitted and structurally excluded counts for the full legacy dataset
  - validate explicitly accepts null `sourceDocument*` on admitted historical rows
  - validate fails if relation-only reasons still drive exclusion
  - validate fails if forbidden-table counts change

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `workshop_material_order`
  - `workshop_material_order_line`
  - `migration_staging.map_workshop_material_order`
  - `migration_staging.map_workshop_material_order_line`
  - `migration_staging.excluded_documents`
  - `package.json`
  - the shared workshop-material baseline and report contract

## Review Log

- Validation results:
  - Parent ran `pnpm migration:typecheck`; it passed.
  - Parent ran `pnpm test -- --runTestsByPath test/migration/workshop-return.spec.ts test/migration/workshop-return-execute-guard.spec.ts`; it passed.
  - Parent ran `pnpm migration:workshop-return:dry-run`; it passed and the refreshed dry-run report shows `sourceCounts.orders = 3`, `sourceCounts.details = 4`, `admittedOrders = 3`, `admittedLines = 4`, `admittedLinesWithNullSource = 4`, `excludedHeaders = 0`, and `pendingRelationLines = 4`.
  - Parent ran `pnpm migration:workshop-return:execute`; it passed and the refreshed execute report shows `insertedOrUpdatedOrders = 3`, `insertedOrUpdatedLines = 4`, `excludedDocumentCount = 0`, `pendingRelationCount = 4`, preserved zero counts for `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, and `inventory_source_usage`, and preserved `factory_number_reservation = 80`.
  - Reviewer reran `pnpm migration:typecheck`; it passed.
  - Reviewer reran `pnpm test -- --runTestsByPath test/migration/workshop-return.spec.ts test/migration/workshop-return-execute-guard.spec.ts`; it passed with `48` tests.
  - Reviewer reran `pnpm migration:workshop-return:dry-run`; it passed and refreshed `scripts/migration/reports/workshop-return-dry-run-report.json`.
  - Reviewer reran `pnpm migration:workshop-return:validate`; it passed and refreshed `scripts/migration/reports/workshop-return-validate-report.json` with `cutoverReady = true`, `mapCounts.orders = 3`, `mapCounts.lines = 4`, `linesWithNullSource = 4`, `pendingRelationCount = 4`, `excludedDocumentCount = 0`, `integrityIssues = []`, and `forbiddenTableIssues = []`.
- Findings:
  - none; rereview confirms the prior `[blocking]` and `[important]` issues are resolved in the current scoped files.
- Follow-up action:
  - none for this slice; later shared post-admission relation enrichment remains tracked separately.

## Final Status

- Outcome:
  - rereview completed with no remaining `[blocking]` or `[important]` findings; the current workshop-return formal-admission slice is safe to sign off for this scoped admission phase.
- Residual risks or testing gaps:
  - the slice still intentionally leaves `pending_relations` and nullable `sourceDocument*` rows for later shared post-admission enrichment; that backlog is expected and non-blocking for this admission-only scope.
  - the validate step depends on the fresh deterministic dry-run artifact and now fails if that artifact is missing or if the report-partition expectations drift; that matches the scoped final gate for this migration slice.
- Next action:
  - no further coder changes are required for this slice; parent should sync `docs/requirements/**`, `docs/requirements/REQUIREMENT_CENTER.md`, and `docs/tasks/TASK_CENTER.md`, then move this task doc into `docs/tasks/archive/retained-completed/` as the retained execution record for the completed formal-admission phase.
