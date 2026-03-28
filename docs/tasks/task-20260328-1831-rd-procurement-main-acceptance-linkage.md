# RD Procurement Main-Acceptance Linkage Foundation

## Metadata

- Scope: open the next bounded RD slice by making RD procurement requests a truthful upstream business fact and linking them to main-warehouse acceptance selection/autofill, while preserving the already-landed `RD handoff` stock boundary and explicitly deferring RD material-state chain, stocktake, and final smoke
- Related requirement: `docs/requirements/req-20260328-1831-rd-procurement-main-acceptance-linkage.md`
- Status: `planned`
- Review status: `not-reviewed`
- Lifecycle disposition: `active`
- Planner: `assistant`
- Coder: `assistant`
- Reviewer: `assistant`
- Last updated: `2026-03-28`

## Requirement Alignment

- Requirement doc:
  - `docs/requirements/req-20260328-1831-rd-procurement-main-acceptance-linkage.md`
- User intent summary:
  - continue RD with a fresh slice instead of smoke-testing now
  - defer live smoke until the broader RD bundle is complete
  - prioritize the smallest upstream slice after `RD handoff foundation`
- Acceptance criteria carried into this task:
  - RD procurement request becomes a real, queryable upstream fact instead of requirement-only wording
  - main-warehouse acceptance can select/link the RD procurement request and auto-fill relevant content
  - stock still posts into main warehouse first; RD inventory is not written at acceptance time
  - this slice does not silently absorb RD material-state chain or RD stocktake/adjustment

## Requirement Sync

- Req-facing phase progress:
  - `RD handoff foundation` has been moved to archive, and this new procurement/acceptance linkage slice is now the active RD anchor
- Req-facing current state:
  - the next upstream RD gap is the procurement request truth source plus main acceptance linkage; smoke remains deferred until RD slices are completed as a bundle
- Req-facing blockers:
  - None
- Req-facing next step:
  - define the narrow procurement request contract and acceptance-side linkage/autofill path, then implement focused backend/frontend changes without widening into state-chain work
- Requirement doc sync owner:
  - `assistant`

## Goal And Acceptance Criteria

- Goal:
  - land the smallest safe RD follow-up slice after handoff foundation by introducing an honest procurement-request source and main-warehouse acceptance linkage, so later RD material-state and reporting slices can build on it
- Acceptance criteria:
  - RD-side procurement request has an explicit persistence/read model and can be created/listed truthfully
  - procurement request remains project-bound or project-style attributable, consistent with RD rules
  - main-warehouse acceptance can reference the RD procurement request and auto-fill request-derived content without changing “先入主仓”的 inventory semantics
  - the linkage is traceable and queryable from both sides where appropriate
  - no stock write goes to RD at acceptance time; real RD stock movement still waits for the archived handoff capability
  - live smoke is intentionally deferred and not treated as a blocker for this slice alone

## Scope And Ownership

- Allowed code paths:
  - `docs/tasks/task-20260328-1831-rd-procurement-main-acceptance-linkage.md`
  - `docs/tasks/TASK_CENTER.md`
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `src/app.module.ts`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/inbound/**`
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/**`
  - `web/src/views/rd/**`
  - `web/src/views/entry/**`
- Frozen or shared paths:
  - `docs/requirements/**`, `docs/workspace/**`, and `docs/architecture/**` stay parent-owned except for explicit progress sync in the same delivery
  - `src/modules/inventory-core/**` is frozen for this slice unless a real integration blocker appears; acceptance linkage should not need new stock semantics
  - `src/modules/project/**` remains frozen unless request-to-project attribution cannot be carried honestly without a surfaced blocker
  - `src/modules/workshop-material/**` is out of scope
- Task doc owner:
  - `assistant`
- Contracts that must not change silently:
  - `inventory-core` remains the only stock write entry point
  - external purchase arrival still enters main warehouse first
  - RD inventory must not be written during acceptance linkage
  - `RD handoff` remains the only truthful path for “main -> RD” stock transfer
  - this slice must not silently introduce the independent RD material-state chain yet

## Implementation Plan

- [ ] Confirm the narrow procurement-request domain contract: required fields, project attribution, and what is intentionally deferred
- [ ] Define the linkage contract between RD procurement request and main-warehouse acceptance selection/autofill
- [ ] Implement backend persistence/query and thin orchestration for RD procurement requests
- [ ] Implement inbound-side request selection/autofill and traceability without changing acceptance stock semantics
- [ ] Align RD/main frontend entry points and query/detail wording to the truthful linkage model
- [ ] Add focused validation for linkage correctness, no-RD-stock-at-acceptance invariants, and permission/isolation behavior

## Coder Handoff

- Execution brief:
  - implement only RD procurement request truth source plus main acceptance linkage foundation
  - keep “先入主仓，后通过 RD handoff 转入 RD” as a hard invariant
  - defer RD material-state chain and final smoke explicitly
- Required source docs or files:
  - `docs/requirements/req-20260328-1831-rd-procurement-main-acceptance-linkage.md`
  - `docs/requirements/archive/retained-completed/req-20260328-1640-rd-subwarehouse-main-to-rd-handoff-foundation.md`
  - `docs/requirements/archive/retained-completed/req-20260326-0048-rd-subwarehouse.md`
  - `docs/workspace/rd-procurement-main-acceptance-linkage/README.md`
  - `docs/workspace/archive/retained-completed/rd-subwarehouse-main-to-rd-handoff/README.md`
  - `docs/architecture/modules/rd-subwarehouse.md`
  - `docs/architecture/modules/inbound.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/rbac.md`
- Owned paths:
  - same as Allowed code paths
- Forbidden shared files:
  - `docs/requirements/**`
  - `docs/workspace/**`
  - `docs/architecture/**`
  - `src/modules/inventory-core/**` unless a real blocker requires explicit expansion
  - archived task docs
- Constraints and non-goals:
  - do not widen into generic purchase/order management or generic multi-warehouse
  - do not implement the independent RD material-state chain in this slice
  - do not re-open the already completed `RD handoff foundation`
  - do not claim smoke completion inside this slice; smoke is deferred until RD bundle completion per user instruction
- Validation command for this scope:
  - `pnpm prisma:validate`
  - `pnpm swagger:metadata && pnpm typecheck`
  - targeted `pnpm test -- <rd-procurement/inbound linkage scope>`
  - `pnpm test`
  - `pnpm --dir web build:prod`
  - no live smoke in this slice; defer to final RD bundle

## Reviewer Handoff

- Review focus:
  - procurement request is a truthful upstream fact and not just UI-only draft state
  - acceptance linkage does not write RD inventory or blur main-vs-RD stock boundaries
  - request/project attribution remains honest
  - no hidden drift into the deferred material-state chain
  - smoke deferral is recorded correctly instead of being forgotten
- Requirement alignment check:
  - confirm this slice only covers procurement request + acceptance linkage foundation
  - confirm final smoke remains intentionally deferred until RD bundle completion
- Final validation gate:
  - `pnpm prisma:validate`
  - `pnpm swagger:metadata && pnpm typecheck`
  - `pnpm test`
  - focused targeted tests for procurement/linkage scope
  - `pnpm --dir web build:prod`
  - no smoke gate in this slice

## Parallelization Safety

- Status: `not-safe`
- If not safe, list the shared files or contracts that require a single writer:
  - this slice spans RD-side request truth, inbound acceptance linkage, permissions, and frontend wording, so a single writer should preserve one consistent contract

## Review Log

- Validation results:
  - None yet
- Findings:
  - None yet
- Follow-up action:
  - start execution against this new RD procurement/acceptance linkage slice

## Final Status

- Outcome:
  - planning only; active procurement/acceptance linkage slice opened
- Requirement alignment:
  - this task continues RD with the next upstream slice after handoff foundation, while respecting the new “smoke at the end” session policy
- Residual risks or testing gaps:
  - code implementation has not started yet
  - material-state chain, stocktake/adjustment, and final smoke remain subsequent work
- Directory disposition after completion:
  - keep `active` until this slice is implemented/reviewed/closed, then archive with requirement/workspace in the same turn
- Next action:
  - execute the procurement request + main acceptance linkage slice and continue deferring live smoke until RD bundle completion
