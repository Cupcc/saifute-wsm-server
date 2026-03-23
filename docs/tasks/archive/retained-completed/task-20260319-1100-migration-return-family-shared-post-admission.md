# Migration Return-Family Shared Post-Admission Phases

## Metadata

- Scope: shared downstream implementation after reviewed-no-findings formal admission of `SALES_RETURN` and `RETURN` rows under the nullable-source rule, covering deterministic relation reconstruction and optional source backfill, relation-table projection, inventory replay, `inventory_source_usage`, and `workflow_audit_document` projection without reopening admitted-row eligibility
- Related requirement: `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder:
- Reviewer: `code-reviewer`
- Last updated: `2026-03-20`
- Related files:
  - `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/modules/customer.md`
  - `docs/architecture/modules/workshop-material.md`
  - `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `prisma/schema.prisma`
  - `package.json`
  - `scripts/migration/shared/**`
  - `scripts/migration/customer-sales-return/**`
  - `scripts/migration/workshop-return/**`
  - `scripts/migration/return-post-admission/**`

## Requirement Alignment

- Requirement doc: `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`
- Requirement status: `confirmed`; scope is clear enough for planning and resume.
- User intent summary:
  - Complete only the remaining shared post-admission migration phase after the return-family formal-admission subtasks.
  - Preserve already admitted sales-return and workshop-return business rows as the formal baseline even when later relation enrichment remains incomplete.
- Acceptance criteria carried into this task:
  - Start shared work from admitted live `SALES_RETURN` and `RETURN` rows plus their existing staging evidence and baseline maps.
  - Backfill line-level `sourceDocument*` fields only when a unique deterministic upstream relation is proven.
  - Project `document_relation` and `document_line_relation` only for proven links.
  - Replay `inventory_balance` and `inventory_log` from the full admitted business baseline, not a recoverable-only subset.
  - Derive `inventory_source_usage` only for provable source chains and keep unresolved gaps explicit in reports.
  - Project `workflow_audit_document` under current runtime eligibility rules.
  - Add deterministic shared-phase tests, commands, and reports.
- Open questions requiring user confirmation:
  - None.

## Goal And Acceptance Criteria

- Goal: resume the only remaining active return-family migration scope by building a shared post-admission phase that consumes the already reviewed formal-admission baselines from sales returns and workshop returns, then performs downstream relation, replay, source-usage, and workflow projections.
- Acceptance criteria:
  - The reviewed-no-findings formal-admission slices for sales returns and workshop returns remain the frozen input baseline for this phase; shared work must not reopen admission eligibility or change their admitted-versus-structural-exclusion boundary.
  - Relation reconstruction starts from admitted live return-family rows, not from excluded-only or queue-drain-only subsets.
  - Shared post-admission work may backfill `sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` on already admitted rows only when a unique deterministic relation is proven; unresolved rows remain admitted with nullable source fields.
  - `document_relation` and `document_line_relation` are projected only for proven links; missing relation proof does not remove or exclude already admitted business rows.
  - Inventory replay reads the full formal business baseline, including admitted return-family rows whose `sourceDocument*` fields remain null, and rebuilds `inventory_balance` and `inventory_log` through replay rather than direct copy.
  - `inventory_source_usage` is derived from replayed source logs and proven source chains only; unresolved source-usage cases are surfaced as reconciliation items rather than converted into `excluded_documents`.
  - `workflow_audit_document` projection is based on current runtime eligibility rules for effective historical documents and is not blocked solely because return-family source relations are still unresolved.
  - Family-local pending-relation finalization is no longer the active downstream model.
  - Final reports distinguish formal business admission completeness from later enrichment completeness.

## Scope And Ownership

- Delivered code paths (historical ownership record):
  - `scripts/migration/return-post-admission/**`
  - `package.json` (migration scripts for this scope)
  - `test/migration/return-post-admission.relation.spec.ts`
  - `test/migration/return-post-admission.replay.spec.ts`
  - `test/migration/return-post-admission.execute-guard.spec.ts`
- Frozen or shared paths:
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `scripts/migration/shared/**` unless the parent explicitly expands ownership
  - `scripts/migration/customer-sales-return/**`
  - `scripts/migration/workshop-return/**`
  - `scripts/migration/customer-sales-return-finalize/**`
  - `scripts/migration/workshop-return-finalize/**`
  - `document_relation`
  - `document_line_relation`
  - `workflow_audit_document`
  - `inventory_balance`
  - `inventory_log`
  - `inventory_source_usage`
- Task doc owner: `planner`
- Contracts that must not change silently:
  - Reviewed-no-findings `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md` and `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md` define the admitted return-family baseline; this shared phase may consume that baseline but must not widen back into family-local admission rework.
  - Already admitted sales-return and workshop-return rows remain formal business truth even if later relation enrichment is incomplete.
  - No downstream phase may reclassify an admitted row into `excluded_documents` solely because source reconstruction stays unresolved.
  - `inventory-core` remains the only stock write entry point, so replay and derived projections must align with current runtime semantics rather than direct legacy-table copy.
  - `workflow` owns `workflow_audit_document`; relation completeness alone does not determine workflow eligibility.
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md` is now the repository-level migration planning home, but this task doc remains the durable execution record for the shared return-family post-admission scope when the narrower slice guidance is more specific.

## Implementation Plan

- [x] Step 1: create the new shared `scripts/migration/return-post-admission/**` scope and a read-only dry-run relation-classification slice:
  - read the already admitted sales-return and workshop-return rows from the reviewed-no-findings formal-admission baselines, especially rows whose `sourceDocument*` fields are null
  - classify each admitted return-family line into `proven`, `unresolved`, or `ambiguous` relation outcomes using only deterministic evidence from admitted business facts, legacy evidence, archived payloads, outbound baselines, and workshop-pick baselines
  - emit deterministic dry-run/report output that preserves the signed-off admitted row counts and separates later enrichment backlog from structural blockers
- [x] Step 2: backfill admitted-line `sourceDocument*` fields and project `document_relation` and `document_line_relation` only from proven links:
  - populate line-level `sourceDocumentType`, `sourceDocumentId`, and `sourceDocumentLineId` only when the shared dry-run proof collapses to one unique deterministic upstream target
  - header and line relations are additive downstream projections, not admission prerequisites
  - lifecycle-derived `isActive` semantics must continue to follow current runtime rules for effective versus voided downstream documents
- [x] Step 3: replay inventory from the full formal business baseline:
  - rebuild `inventory_balance` and `inventory_log` from all admitted inventory-affecting business rows in deterministic order
  - admitted return-family rows with null `sourceDocument*` still replay their increase or reverse inventory effect based on family, lifecycle, and business quantity data
  - do not directly copy `saifute_inventory` or `saifute_inventory_log`
- [x] Step 4: derive `inventory_source_usage` only where source chains are provable:
  - use replayed inventory logs plus proven source relations to derive `inventory_source_usage`
  - unresolved source-usage cases must stay explicit reconciliation outputs instead of guessed allocations or business-row exclusion
- [x] Step 5: project `workflow_audit_document` after replay surfaces are stable:
  - create workflow rows only for effective historical documents that require workflow under the frozen runtime rules
  - missing relation completeness alone must not suppress valid workflow projection
- [x] Step 6: add execute guards, validation, and focused tests only after the shared dry-run/report contract is stable:
  - keep the first coder slice read-only with respect to shared downstream tables so relation proof classification and baseline preservation are validated before execute or replay paths are enabled
  - once relation projection semantics are stable, add replay, source-usage, and workflow tests plus execute and validate gates without changing the signed-off admission baseline

## Coder Handoff

- Delivered: `scripts/migration/return-post-admission/**`, package scripts, dry-run / execute / validate flows, and the three focused migration tests are implemented; readiness policy allows only `accepted-historical-negative-balance` as non-blocking.
- Required source docs or files:
  - `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/modules/customer.md`
  - `docs/architecture/modules/workshop-material.md`
  - `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - `prisma/schema.prisma`
  - `scripts/migration/customer-sales-return/**`
  - `scripts/migration/workshop-return/**`
  - `scripts/migration/shared/**`
- Owned paths:
  - `scripts/migration/return-post-admission/**`
  - `package.json`
  - `test/migration/return-post-admission.relation.spec.ts`
  - `test/migration/return-post-admission.replay.spec.ts`
  - `test/migration/return-post-admission.execute-guard.spec.ts`
- Forbidden shared files:
  - `prisma/schema.prisma`
  - `src/**`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `scripts/migration/customer-sales-return/**`
  - `scripts/migration/workshop-return/**`
  - `scripts/migration/customer-sales-return-finalize/**`
  - `scripts/migration/workshop-return-finalize/**`
  - `scripts/migration/shared/**` unless the parent explicitly expands ownership
- Constraints and non-goals:
  - do not reopen or edit the signed-off formal-admission slices for `outbound-sales-return` or `workshop-return`
  - do not re-exclude admitted return-family rows because enrichment is incomplete
  - do not require non-null `sourceDocument*` before planning replay or workflow projection
  - do not invent upstream links, relation rows, or source-usage chains from ambiguous evidence
  - do not directly copy legacy inventory tables
  - do not let workflow projection depend on relation reconstruction completeness unless a current runtime rule truly requires it
- Validation command for this scope:
  - first shared slice:
    - `pnpm migration:typecheck`
    - `pnpm test -- --runTestsByPath test/migration/return-post-admission.relation.spec.ts`
    - `pnpm migration:return-post-admission:dry-run`
  - after replay and execute surfaces exist:
    - `pnpm test -- --runTestsByPath test/migration/return-post-admission.replay.spec.ts test/migration/return-post-admission.execute-guard.spec.ts`
    - `pnpm migration:return-post-admission:execute`
    - `pnpm migration:return-post-admission:validate`
- Iteration report gates:
  - preserve the signed-off formal-admission baseline counts: sales-return `9` admitted orders and `13` admitted lines with `1` structural exclusion; workshop-return `3` admitted orders and `4` admitted lines with `0` structural exclusions
  - classify admitted return-family lines into `proven`, `unresolved`, or `ambiguous` outcomes without reducing admitted business-row counts
  - relation-only gaps surface in report output rather than `excluded_documents`
  - forbidden shared tables remain unchanged during the first read-only slice

## Reviewer Handoff

- Review focus:
  - confirm the shared implementation starts from the signed-off formal-admission baselines and does not reopen family-local admission eligibility
  - confirm the shared pipeline starts from admitted live rows instead of recoverable-only subsets
  - confirm unresolved relations leave rows live and nullable rather than excluded
  - confirm relation tables are written only for proven links
  - confirm inventory replay uses the full admitted business baseline and preserves deterministic ordering
  - confirm `inventory_source_usage` is only written for provable source chains and that reconciliation gaps remain explicit
  - confirm workflow projection follows runtime eligibility rules rather than relation-completeness shortcuts
  - confirm family-local finalize assumptions are no longer the active downstream model
- Requirement alignment check:
  - confirm delivered behavior matches `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`
  - confirm the reviewed-no-findings formal-admission slices remain frozen input baselines and that shared post-admission work is the only active implementation scope
- Final validation gate:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/return-post-admission.relation.spec.ts test/migration/return-post-admission.replay.spec.ts test/migration/return-post-admission.execute-guard.spec.ts`
  - `pnpm migration:return-post-admission:dry-run`
  - `pnpm migration:return-post-admission:execute`
  - `pnpm migration:return-post-admission:validate`
  - DB and report gates:
    - signed-off admission baseline counts stay unchanged: sales-return `9` admitted orders and `13` admitted lines with `1` structural exclusion; workshop-return `3` admitted orders and `4` admitted lines with `0` structural exclusions
    - relation table rows exist only for proven links
    - `inventory_balance` and `inventory_log` are replayed from the full formal baseline
    - `inventory_source_usage` gaps are explicit reconciliation outputs, not hidden row loss or business-row exclusion
    - `workflow_audit_document` row set matches current runtime eligibility rules
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status`

## Architecture And Repository Considerations

- This is a shared cross-family projection phase and should stay isolated from runtime module code.
- Start with a read-only shared dry-run/report slice before enabling writes to shared downstream tables; this gives deterministic resume evidence and keeps the first coder step minimal.
- `document_relation`, `document_line_relation`, `inventory_balance`, `inventory_log`, `inventory_source_usage`, and `workflow_audit_document` are shared tables, so the downstream implementation must remain single-writer by default.
- Nullable `sourceDocument*` in the current schema is what makes post-admission backfill safe; do not re-harden those fields into an admission contract.
- Inventory replay remains replay, not copy. Derived operational tables must come from admitted business facts under current runtime semantics.
- Relation reconstruction should prefer set-based matching against admitted rows and baseline maps over per-row ad hoc lookups.

## Risks And Contract-Sensitive Areas

- Resume-state boundary:
  - `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md` and `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md` are already reviewed-no-findings; reopening those family-local admission slices would widen scope and contradict the confirmed requirement.
- Stale repository text:
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md` preserves the repository-level migration baseline, but the later formal-admission and shared post-admission task docs remain authoritative for the return-family execution contract.
- Shared-table coupling:
  - relation, inventory, and workflow projections all hit shared tables and therefore require careful phase ordering and single-writer coordination.
- Reconciliation visibility:
  - unresolved source reconstruction after admission must remain visible without silently mutating or excluding business rows.
- Historical finalize directories:
  - `scripts/migration/customer-sales-return-finalize/**` and `scripts/migration/workshop-return-finalize/**` are historical artifacts of the superseded family-local queue-drain model and should not be treated as the default downstream design.
- Inventory-source sensitivity:
  - `inventory_source_usage` is stricter than business-row admission because it needs provable source chains; unresolved cases must be explicit rather than guessed.

## Validation Plan

- Narrow iteration commands:
  - `pnpm migration:typecheck`
  - `pnpm test -- --runTestsByPath test/migration/return-post-admission.relation.spec.ts`
  - `pnpm migration:return-post-admission:dry-run`
- Expand after replay and execute surfaces exist:
  - `pnpm test -- --runTestsByPath test/migration/return-post-admission.replay.spec.ts test/migration/return-post-admission.execute-guard.spec.ts`
- Final command or gate aligned to the risk surface:
  - `pnpm migration:return-post-admission:execute`
  - `pnpm migration:return-post-admission:validate`
- Completed pre-execute gates (for provenance):
  - `scripts/migration/return-post-admission/**`, focused tests, and `package.json` commands exist and preserve the signed-off admission baseline; relation-proof classification separates `proven`, `unresolved`, and `ambiguous` outcomes without reducing admitted business-row counts
- Required report and DB gates:
  - validate proves the signed-off admission baseline counts stay unchanged
  - validate proves relation projection only covers proven links
  - validate proves replayed inventory tables come from the full formal baseline
  - validate proves unresolved source-usage gaps remain explicit reconciliation outputs
  - validate proves workflow projection follows runtime eligibility rules

## Parallelization Safety

- Status: `not safe` (historical; phase closed)
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `document_relation`
  - `document_line_relation`
  - `inventory_balance`
  - `inventory_log`
  - `inventory_source_usage`
  - `workflow_audit_document`
  - `package.json`
  - the shared post-admission report and replay contract

## Review Log

- Validation results:
  - Parent reran `pnpm migration:typecheck`; it passed.
  - Parent reran `pnpm test -- --runTestsByPath test/migration/return-post-admission.execute-guard.spec.ts`; it passed.
  - Parent reran `pnpm migration:return-post-admission:validate`; it passed and refreshed `scripts/migration/reports/return-post-admission-validate-report.json` with the reviewed baseline counts still fixed at sales-return `9` orders / `13` lines and workshop-return `3` orders / `4` lines, plus `negativeBalanceCount = 102`, `validationIssues[0].warningType = accepted-historical-negative-balance`, `manualReviewRequired = false`, and `cutoverReady = true`.
  - Reviewer reran `pnpm migration:typecheck`; it passed.
  - Reviewer reran `pnpm test -- --runTestsByPath test/migration/return-post-admission.execute-guard.spec.ts`; it passed with `16` tests.
  - Reviewer inspected `scripts/migration/return-post-admission/execute-guard.ts`, `scripts/migration/return-post-admission/validate.ts`, `test/migration/return-post-admission.execute-guard.spec.ts`, the linked requirement doc, and the refreshed validate report.
- Findings:
  - none; rereview confirms the prior `[important]` readiness-policy findings are resolved in the current scoped files.
- Follow-up action:
  - none for this follow-up fix; the approved policy is now enforced as intended: only `accepted-historical-negative-balance` remains non-blocking, while any other warning forces `manualReviewRequired = true` and `cutoverReady = false`.

## Final Status

- Outcome:
  - rereview completed with no remaining `[blocking]` or `[important]` findings; this readiness-policy follow-up is safe to sign off. Task scope is **completed** and this document is archived under `retained-completed` as the durable execution record.
- Requirement alignment:
  - fully aligned to `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`; the code now keeps only the accepted historical negative-balance warning non-blocking and still treats all other warning-class validation drift as manual-review-required and not cutover-ready.
- Residual risks or testing gaps:
  - the current validate report still intentionally surfaces `negativeBalanceCount = 102` and `17` unresolved source-usage gaps / nullable-source return lines; those remain explicit historical/reconciliation outputs for the shared post-admission model rather than defects in the rereviewed readiness policy.
  - this follow-up rereview targeted only the changed policy surface, so the independent reviewer rerun covered `migration:typecheck` and the focused execute-guard regression test while relying on the parent's refreshed `pnpm migration:return-post-admission:validate` report for the unchanged wider migration output.
- Next action:
  - no further coder work for this scope; downstream orchestration treats return-post-admission as **reviewed-no-findings / completed** under the approved negative-balance warning policy.
