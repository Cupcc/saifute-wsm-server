# Migration Outbound Sales Return Formal Admission

## Metadata

- Scope: `batch3c-outbound-sales-return-formal-admission` to admit structurally valid legacy `saifute_sales_return_order` and `saifute_sales_return_detail` rows into `customer_stock_order` and `customer_stock_order_line` even when upstream outbound relations cannot yet be proven; nullable `sourceDocumentType/sourceDocumentId/sourceDocumentLineId` is acceptable on migrated rows and later relation work is deferred to the shared post-admission phase
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
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/modules/outbound.md`
  - `docs/tasks/task-20260317-1416-migration-outbound-base.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - `prisma/schema.prisma`
  - `package.json`
  - `scripts/migration/outbound-sales-return/**`
  - `test/migration/outbound-sales-return.spec.ts`
  - `test/migration/outbound-sales-return-execute-guard.spec.ts`

## Goal And Acceptance Criteria

- Goal: realign the sales-return migration slice to the confirmed business rule so that formal business admission happens first and relation reconstruction becomes later enrichment rather than an admission gate.
- Acceptance criteria:
  - The slice processes all `10` legacy sales-return headers and all `14` legacy sales-return details under one of two admission outcomes only:
    - live formal business admission
    - true structural exclusion
  - Lack of provable upstream outbound relation is not an exclusion reason.
  - Every admitted header writes `orderType = SALES_RETURN` and the current runtime status axes.
  - Every admitted line may legitimately keep `sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` as `NULL`; non-null fill is optional enrichment only when a unique deterministic upstream target already exists.
  - `migration_staging.excluded_documents` is reserved for structurally invalid headers only, with explicit structural reason codes.
  - Family-local `pending_relations` or `archived_relations` draining is no longer the target completion model for this admission slice.
  - The slice still does not write `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, `inventory_source_usage`, or `factory_number_reservation`.
  - Dry-run, execute, and validate reports surface admitted rows, true exclusions, and any later relation-enrichment backlog separately.

## Scope And Ownership

- Allowed code paths:
  - `scripts/migration/outbound-sales-return/**`
  - `package.json`
  - `test/migration/outbound-sales-return.spec.ts`
  - `test/migration/outbound-sales-return-execute-guard.spec.ts`
  - this task doc only if the parent explicitly reassigns ownership
- Frozen or shared paths:
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/modules/outbound.md`
  - `scripts/migration/outbound/**`
  - `scripts/migration/outbound-reservation/**`
  - `scripts/migration/shared/**`
  - `scripts/migration/outbound-sales-return-finalize/**`
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
  - Existing outbound baseline rows are read-only evidence for optional enrichment and must not be rewritten by this slice.
  - `prisma/schema.prisma` already permits nullable `customer_stock_order_line.sourceDocument*`; the coder must preserve that contract rather than reintroduce non-null admission assumptions.
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md` now holds the repository-level migration baseline, but this task doc remains the active runtime source of truth for the sales-return formal-admission slice when the narrower slice guidance is more specific.
  - Only structural invalidity may drive `migration_staging.excluded_documents`.

## Implementation Plan

- [ ] Step 1: replace recoverable-only partitioning with structural-validation-first admission:
  - separate structural invalidity from relation reconstruction
  - define explicit structural exclusion reasons such as missing required master-data mapping after frozen fallbacks, broken header-detail integrity, missing deterministic business date or document number after frozen fallback rules, or impossible quantity or amount transformation at current schema precision
  - treat missing or ambiguous upstream outbound relation as later enrichment, not exclusion
- [ ] Step 2: preserve deterministic business-row transformation for all admitted headers and lines:
  - `orderType = SALES_RETURN`
  - `bizDate = return_date`
  - `customerId` comes from mapped legacy customer data
  - `workshopId` uses a deterministic priority:
    - uniquely recovered outbound workshop when already available and compatible
    - otherwise the frozen default workshop `WS-LEGACY-DEFAULT`
  - `lifecycleStatus`, `auditStatusSnapshot`, and `inventoryEffectStatus` continue to map from `del_flag` plus legacy audit evidence under current runtime semantics
  - `documentNo` rewrite and `lineNo` ordering remain deterministic against the already non-empty `customer_stock_order` family
- [ ] Step 3: relax source-field handling:
  - make `sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` optional at admission
  - if current deterministic evidence collapses to one target outbound line, the slice may populate `sourceDocument*`
  - if evidence is absent or ambiguous, admit the line with null `sourceDocument*` and archive the relation evidence for later shared enrichment
- [ ] Step 4: re-scope staging and reporting:
  - keep `excluded_documents` only for structural invalidity
  - any later relation-enrichment backlog must be clearly separated from true exclusion and must not imply family-admission failure by itself
  - preserve raw `source_id`, `source_type`, interval text, remarks, original document numbers, and matching evidence in `archived_field_payload` or equivalent reporting output as needed
- [ ] Step 5: update execute guards, validate logic, and focused tests so they prove formal admission semantics rather than pending-finalization semantics.

## Coder Handoff

- Execution brief: update `scripts/migration/outbound-sales-return/**` so live admission is controlled only by structural validity, while source relation proof becomes optional enrichment. Reuse current deterministic document and mapping rules, but stop turning relation ambiguity into exclusion or family-local finalization work.
- Required source docs or files:
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/modules/outbound.md`
  - `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - `prisma/schema.prisma`
  - `scripts/migration/outbound-sales-return/**`
- Owned paths:
  - `scripts/migration/outbound-sales-return/**`
  - `package.json`
  - `test/migration/outbound-sales-return.spec.ts`
  - `test/migration/outbound-sales-return-execute-guard.spec.ts`
- Forbidden shared files:
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `scripts/migration/outbound/**`
  - `scripts/migration/outbound-reservation/**`
  - `scripts/migration/shared/**`
  - `scripts/migration/outbound-sales-return-finalize/**`
- Constraints and non-goals:
  - do not require non-null `sourceDocument*` for admission
  - do not exclude or queue-finalize a header only because upstream relation is unprovable
  - do not write `document_relation` or `document_line_relation`
  - do not write `workflow_audit_document`
  - do not write `factory_number_reservation`
  - do not write `inventory_balance`, `inventory_log`, or `inventory_source_usage`
  - do not reinterpret legacy `source_type` as target `sourceDocumentType`
  - do not mutate previously admitted outbound baseline rows
  - do not convert this slice back into a family-local pending-queue drain
- Validation command for this scope:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/outbound-sales-return.spec.ts test/migration/outbound-sales-return-execute-guard.spec.ts`
  - `pnpm migration:outbound-sales-return:dry-run`
- Iteration report gates:
  - `sourceCounts.orders = 10`
  - `sourceCounts.lines = 14`
  - admitted plus structurally excluded headers fully partition the legacy header set
  - relation-only reason families such as `no-upstream-line-candidate` or `multiple-upstream-line-candidates` no longer appear as exclusion reasons
  - admitted lines may be either null or non-null in `sourceDocument*`
  - forbidden tables remain unchanged

## Reviewer Handoff

- Review focus:
  - confirm relation proof is no longer an admission gate
  - confirm structurally valid sales returns are not excluded merely because `sourceDocument*` cannot be proven
  - confirm nullable `sourceDocument*` on admitted rows is treated as valid, not as validation failure
  - confirm `excluded_documents` carries only structural invalidity reasons
  - confirm archived evidence or backlog, if produced, is non-gating and compatible with later shared post-admission enrichment
  - confirm no writes occur to relation, workflow, reservation, or inventory tables
- Final validation gate:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/outbound-sales-return.spec.ts test/migration/outbound-sales-return-execute-guard.spec.ts`
  - `pnpm migration:outbound-sales-return:dry-run`
  - `pnpm migration:outbound-sales-return:execute`
  - `pnpm migration:outbound-sales-return:validate`
  - DB and report gates:
    - full header and line counts partition the legacy dataset
    - admitted lines with null `sourceDocument*` do not fail validation
    - no exclusion reason is relation-only
    - `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, `inventory_source_usage`, and `factory_number_reservation` remain unchanged
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status`

## Architecture And Repository Considerations

- `customer_stock_order` and `customer_stock_order_line` are the formal business result tables; later relation enrichment must not be allowed to become a hidden admission prerequisite.
- Keep the migration logic isolated to the migration directory and avoid spreading admission work into runtime modules.
- Use set-based reads for legacy rows, outbound baselines, master-data maps, and archived evidence; avoid per-line lookup loops.
- Preserve deterministic number rewrite, line ordering, and stable report ordering so reruns reproduce the same admission outcome.
- Business-table admission is direct copy-and-transform work for the current runtime schema; `document_relation`, `document_line_relation`, `workflow_audit_document`, `inventory_balance`, `inventory_log`, and `inventory_source_usage` remain later shared projection work.

## Risks And Contract-Sensitive Areas

- Stale repository text:
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md` preserves the repository-level migration baseline, but this narrower brief supersedes any older recoverable-only sales-return wording and remains authoritative for execution.
- Workshop fallback sensitivity:
  - Sales-return headers lack a reliable legacy workshop dimension, so default-workshop fallback must be explicit and deterministic whenever no unique upstream workshop is already safely available.
- Structural-invalidity boundary:
  - The coder must keep the exclusion boundary narrow and explicit so relation uncertainty does not drift back into exclusion logic.
- Later enrichment safety:
  - Shared downstream relation reconstruction must not silently rewrite admitted customer or workshop facts when later evidence conflicts; those cases need explicit follow-up handling, not invisible mutation.
- Validation drift:
  - Current tests, reports, and validate logic encode non-null source assumptions and pending-queue gates; all of them must be rewritten to match the new model.

## Validation Plan

- Narrow iteration commands:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/outbound-sales-return.spec.ts test/migration/outbound-sales-return-execute-guard.spec.ts`
  - `pnpm migration:outbound-sales-return:dry-run`
- Final command or gate aligned to the risk surface:
  - `pnpm migration:outbound-sales-return:execute`
  - `pnpm migration:outbound-sales-return:validate`
- Required report and DB gates:
  - dry-run reports admitted and structurally excluded counts for the full legacy dataset
  - validate explicitly accepts null `sourceDocument*` on admitted historical rows
  - validate fails if relation-only reasons still drive exclusion
  - validate fails if forbidden-table counts change

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `customer_stock_order`
  - `customer_stock_order_line`
  - `migration_staging.map_customer_stock_order`
  - `migration_staging.map_customer_stock_order_line`
  - `migration_staging.excluded_documents`
  - `package.json`
  - the shared outbound baseline and report contract

## Review Log

- Validation results:
  - Parent validation already ran `pnpm migration:typecheck`, `pnpm test -- --runTestsByPath test/migration/outbound-sales-return.spec.ts test/migration/outbound-sales-return-execute-guard.spec.ts`, `pnpm migration:outbound-sales-return:dry-run`, `pnpm migration:outbound-sales-return:execute`, and `pnpm migration:outbound-sales-return:validate`; reviewer inspected the resulting artifacts instead of rerunning the same gate.
  - `scripts/migration/reports/outbound-sales-return-dry-run-report.json` shows `sourceCounts.orders = 10`, `sourceCounts.details = 14`, `admittedOrders = 9`, `admittedLines = 13`, `admittedLinesWithNullSourceDocument = 12`, `excludedHeaders = 1`, `pendingRelationLines = 0`, and no global blockers.
  - `scripts/migration/reports/outbound-sales-return-execute-report.json` shows `insertedOrUpdatedOrders = 9`, `insertedOrUpdatedLines = 13`, `excludedDocumentCount = 1`, `pendingRelationCount = 0`, and zero downstream consumer counts in `targetSummary.downstreamConsumerCounts`.
  - `scripts/migration/reports/outbound-sales-return-validate-report.json` shows `cutoverReady = true`, `validationIssues = []`, batch-owned rows and staging maps aligned at `9` order rows and `13` line rows, and forbidden table counts remained `0`.
  - The current outputs fully partition the fixed legacy dataset: `9` admitted headers plus `1` structurally excluded header cover all `10` source headers, and the remaining excluded header (`legacyId = 17`) carries the last source detail so the `13` admitted lines plus `1` excluded-header detail cover all `14` source details.
- Findings:
  - No remaining `[blocking]` or `[important]` code findings in this final rereview. The earlier customer-mapping and default-workshop issues are fixed in the current scoped files and reflected in the current report set.
- Follow-up action:
  - No further coder work is required inside `scripts/migration/outbound-sales-return/**` for this formal-admission slice. Downstream relation, replay, and workflow work should continue in the shared post-admission scope.

## Final Status

- Outcome:
  - The scoped sales-return formal-admission slice now has `reviewed-no-findings` status and a successful reviewed `typecheck -> focused tests -> dry-run -> execute -> validate` gate on the current migrated baseline.
- Residual risks or testing gaps:
  - The slice intentionally reuses migration batch id `batch3c-outbound-sales-return-recoverable`, so validate still surfaces historical `archived_relations` rows from the superseded recoverable model as non-blocking report noise; downstream teams should treat family-local finalize scripts as historical only and use the shared post-admission plan for new work.
  - The focused transformer tests cover the current live dataset semantics and the nullable-source admission rule, but they do not explicitly exercise a mixed-valid and mixed-invalid detail header case; if that edge case becomes relevant outside the fixed current dataset, the intended header-vs-line structural exclusion rule should be clarified before changing this slice.
- Next action:
  - No further coder changes are required for this slice; parent should sync `docs/requirements/**`, `docs/requirements/REQUIREMENT_CENTER.md`, and `docs/tasks/TASK_CENTER.md`, then move this task doc into `docs/tasks/archive/retained-completed/` as the retained execution record for the completed formal-admission phase.
