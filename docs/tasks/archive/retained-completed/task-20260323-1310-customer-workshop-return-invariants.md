# Return Invariant Fixes For Customer And Workshop Material

## Metadata

- Scope: fix only the review-confirmed return-path invariant blockers in `customer` sales returns and `workshop-material` return orders, without widening into unrelated module behavior, shared inventory contracts, schema changes, or architecture doc edits
- Related requirement: `docs/requirements/archive/retained-completed/req-20260321-1109-architecture-review-clarity.md`
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Last updated: `2026-03-23`
- Related checklist:
- Related files:
  - `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/modules/customer.md`
  - `docs/architecture/modules/workshop-material.md`
  - `src/modules/customer/application/customer.service.ts`
  - `src/modules/customer/application/customer.service.spec.ts`
  - `src/modules/workshop-material/application/workshop-material.service.ts`
  - `src/modules/workshop-material/application/workshop-material.service.spec.ts`

## Requirement Alignment

- Requirement doc: `docs/requirements/archive/retained-completed/req-20260321-1109-architecture-review-clarity.md`
- Requirement status: clear enough for planning. The linked requirement is `confirmed`, the review task is complete, and the user explicitly approved continuing with the two follow-up slices plus parallelization when safe.
- User intent summary:
  - continue from the completed architecture review instead of reopening the original review scope
  - isolate the blocking code fixes for `customer` and `workshop-material` return invariants into one execution-ready brief
  - keep the slice tightly limited to the return findings already recorded in `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`
- Acceptance criteria carried into this task:
  - `customer` sales returns must reject cumulative active returned quantity above the source outbound-line quantity
  - `workshop-material` return orders must reject cumulative active returned quantity above the source pick-line quantity
  - `workshop-material` return processing must release `inventory_source_usage` incrementally by the actual returned quantity instead of fully releasing all remaining allocations for the source pick line
  - focused unit tests must cover split or repeated returns and voided-return recovery for the changed invariants
  - no edits may widen into shared files or unrelated behavior
- Open questions requiring user confirmation:
  - None for planning.

## Requirement Sync

- Req-facing phase progress: 已从架构 review findings 中拆出 `customer` / `workshop-material` return invariant 代码修复切片，并完成执行 brief。
- Req-facing current state: 已锁定 blocking 问题、精确默认文件范围、冻结契约、并行边界与最小验证命令，可直接进入 coder。
- Req-facing blockers: 当前无规划阻塞；若执行时发现必须扩大到共享模块或超出本 brief 允许的条件性 module-local support 文件，需先回到 parent 确认。
- Req-facing next step: 将本 task 交给 `coder` 在严格 scope 内修复 service 与单测，再由 `code-reviewer` 复核 invariant、边界与验证结果。
- Requirement doc sync owner: `parent-orchestrator`

## Goal And Acceptance Criteria

- Goal: close the two `[blocking][code gap]` findings from the completed architecture review by restoring return-quantity and source-release invariants in the `customer` and `workshop-material` application services.
- Acceptance criteria:
  - `src/modules/customer/application/customer.service.ts` enforces remaining returnable quantity against the source outbound line using active downstream sales-return state, not just the original source-line quantity
  - the `customer` fix aggregates both already-active returned quantity and the current request's quantity per `sourceOutboundLineId`, so split lines or split documents cannot over-return
  - `src/modules/workshop-material/application/workshop-material.service.ts` enforces remaining returnable quantity against the source pick line using active downstream return state
  - the `workshop-material` fix releases source usage in deterministic incremental order and only by the quantity being returned in the current operation
  - voided downstream returns no longer consume remaining return capacity for either module
  - the service-spec coverage proves the fixed behavior without widening into unrelated modules or contracts

## Scope And Ownership

- Allowed code paths:
  - `docs/tasks/archive/retained-completed/task-20260323-1310-customer-workshop-return-invariants.md`
  - `src/modules/customer/application/customer.service.ts`
  - `src/modules/customer/application/customer.service.spec.ts`
  - `src/modules/workshop-material/application/workshop-material.service.ts`
  - `src/modules/workshop-material/application/workshop-material.service.spec.ts`
- Conditional expansion paths, only if the four-file plan is insufficient and the coder records the reason in this task doc before editing:
  - `src/modules/customer/infrastructure/customer.repository.ts`
  - `src/modules/workshop-material/infrastructure/workshop-material.repository.ts`
- Conditional expansion activated: `customer.repository.ts` and `workshop-material.repository.ts` are both edited. Justification: the cumulative active-return lookup requires a DB query that joins `document_line_relation` with downstream order status to exclude voided returns. Placing this query in the application service would bypass the repository layer and couple the service directly to the Prisma schema — exactly the pattern the module boundary exists to prevent. Each query is a small read-only helper that belongs in the repository layer consistent with all other DB access in these modules.
- Frozen or shared paths:
  - `docs/requirements/**`
  - `docs/architecture/**`
  - `docs/tasks/TASK_CENTER.md`
  - `src/app.module.ts`
  - `src/swagger-metadata.ts`
  - `src/shared/**`
  - `src/modules/inventory-core/**`
  - `src/modules/workflow/**`
  - `src/modules/master-data/**`
  - `prisma/**`
  - `scripts/**`
- Task doc owner: `planner` during planning; `coder` owns execution updates for this task doc; `code-reviewer` owns review-phase updates in this same task doc
- Contracts that must not change silently:
  - `inventory-core` remains the only stock-write entry point; do not bypass it with direct inventory table writes
  - `workflow` remains the audit owner; this slice must not change review-state semantics
  - `customer` return-to-outbound links and `workshop-material` return-to-pick links remain expressed through `document_relation` and `document_line_relation`
  - `inventory_source_usage` is the canonical source-tracking record and must stay incrementally correct for pick / return flows
  - quantity arithmetic must continue to use `Prisma.Decimal` semantics rather than JS number accumulation

## Implementation Plan

- [ ] Step 1: re-anchor the fix in the completed review finding, the module docs, the relevant frozen schema-flow clauses in `docs/architecture/20-wms-business-flow-and-optimized-schema.md`, and the current service/spec files.
  - confirm the frozen rules: sales return must respect source outbound `可退数量`; workshop return must preserve `inventory_source_usage` accuracy and relation-table semantics
- [ ] Step 2: tighten `customer` sales-return validation in `src/modules/customer/application/customer.service.ts`.
  - compute active returned quantity per source outbound line from currently active downstream relations before insert
  - aggregate current-request quantity per `sourceOutboundLineId` as well, so the same request cannot bypass the cap by splitting one source line across multiple return lines
  - reject when `alreadyActiveReturned + incomingRequested > sourceOutboundLineQty`
  - make sure voided downstream returns no longer count toward the remaining quantity
- [ ] Step 3: tighten `workshop-material` return validation and source release in `src/modules/workshop-material/application/workshop-material.service.ts`.
  - compute active returned quantity per source pick line from active downstream relations before relation upsert
  - aggregate current-request quantity per `sourceDocumentLineId` so split lines in one return order cannot over-return
  - reject when `alreadyActiveReturned + incomingRequested > sourcePickLineQty`
  - release `inventory_source_usage` only by the quantity being returned now, in deterministic order, instead of pushing every matching usage to fully released
  - if source-usage reads are paginated, avoid silent truncation; consume all relevant usages needed to release the exact returned quantity
- [ ] Step 4: expand the focused service specs.
  - add `customer` cases for split returns, cumulative returns across active documents, and voided-return recovery
  - add `workshop-material` cases for repeated partial returns, incremental source release, and voided-return recovery
- [ ] Step 5: run the narrow validation commands, record exact results in this task doc, and hand the slice to `code-reviewer`.

## Coder Handoff

- Execution brief:
  - stay inside the owned files by default and implement the smallest fix that restores the two review-confirmed invariants
  - prefer keeping the logic in the application services unless a tiny module-local repository helper is clearly cleaner and still inside the conditional expansion scope
  - preserve existing transaction boundaries inside the application services
- Required source docs or files:
  - `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/modules/customer.md`
  - `docs/architecture/modules/workshop-material.md`
  - `src/modules/customer/application/customer.service.ts`
  - `src/modules/customer/application/customer.service.spec.ts`
  - `src/modules/workshop-material/application/workshop-material.service.ts`
  - `src/modules/workshop-material/application/workshop-material.service.spec.ts`
- Owned paths:
  - `docs/tasks/archive/retained-completed/task-20260323-1310-customer-workshop-return-invariants.md`
  - `src/modules/customer/application/customer.service.ts`
  - `src/modules/customer/application/customer.service.spec.ts`
  - `src/modules/workshop-material/application/workshop-material.service.ts`
  - `src/modules/workshop-material/application/workshop-material.service.spec.ts`
- Forbidden shared files:
  - `docs/tasks/TASK_CENTER.md`
  - `docs/requirements/**`
  - `docs/architecture/**`
  - `src/app.module.ts`
  - `src/swagger-metadata.ts`
  - `src/shared/**`
  - `src/modules/inventory-core/**`
  - `src/modules/workflow/**`
  - `src/modules/master-data/**`
  - `prisma/**`
  - `scripts/**`
- Constraints and non-goals:
  - do not change controller, DTO, route, Swagger, module wiring, migration, schema, or shared helper behavior
  - do not refactor unrelated outbound, pick, scrap, or general query behavior while touching the services
  - do not change `InventoryService` or `WorkflowService` public contracts in this slice
  - do not weaken the invariant by only checking each line independently; the protection must hold across existing active downstream documents and the current request payload
  - do not fully release all source usages on partial workshop returns
- Validation command for this scope:
  - iteration:
    - `pnpm exec jest --runInBand src/modules/customer/application/customer.service.spec.ts`
    - `pnpm exec jest --runInBand src/modules/workshop-material/application/workshop-material.service.spec.ts`
  - final:
    - `git diff --name-only -- "docs/tasks/archive/retained-completed/task-20260323-1310-customer-workshop-return-invariants.md" "src/modules/customer/application/customer.service.ts" "src/modules/customer/application/customer.service.spec.ts" "src/modules/workshop-material/application/workshop-material.service.ts" "src/modules/workshop-material/application/workshop-material.service.spec.ts" "src/modules/customer/infrastructure/customer.repository.ts" "src/modules/workshop-material/infrastructure/workshop-material.repository.ts"`
    - `pnpm exec biome check docs/tasks/archive/retained-completed/task-20260323-1310-customer-workshop-return-invariants.md src/modules/customer/application/customer.service.ts src/modules/customer/application/customer.service.spec.ts src/modules/workshop-material/application/workshop-material.service.ts src/modules/workshop-material/application/workshop-material.service.spec.ts`
    - `pnpm exec jest --runInBand src/modules/customer/application/customer.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts`
  - no repo-wide `pnpm verify` gate is required for this slice because the repository currently contains unrelated active changes outside the owned paths

## Reviewer Handoff

- Review focus:
  - verify `customer` now enforces cumulative active return quantity by source outbound line, including same-request split lines and already-existing active downstream returns
  - verify voided customer sales returns no longer consume return capacity
  - verify `workshop-material` now enforces cumulative active return quantity by source pick line, including same-request split lines and already-existing active downstream returns
  - verify source-usage release is incremental, deterministic, and capped by the current return quantity rather than the full remaining allocation
  - verify the tests directly exercise the bug stories called out in the review findings instead of only asserting happy paths
  - verify no forbidden shared files changed and no direct inventory-table mutation bypassed `inventory-core`
- Requirement alignment check:
  - confirm the change closes only the two `[blocking][code gap]` findings from `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`
  - confirm no architecture-doc, requirement-doc, route, or shared-contract drift was introduced
- Final validation gate:
  - the final command set in `## Coder Handoff` passes or any failure is proven to be unrelated to the owned scope and documented here
  - the diff stays within the owned paths plus any explicitly justified conditional expansion path
  - this task doc records the exact validation result and any residual risk
- Required doc updates:
  - update `## Metadata` -> `Status` and `Review status`
  - update `## Review Log`
  - update `## Final Status`

## Parallelization Safety

- Status: `safe`
- If safe, list the exact disjoint writable scopes:
  - writer A, code slice: `docs/tasks/archive/retained-completed/task-20260323-1310-customer-workshop-return-invariants.md`, `src/modules/customer/application/customer.service.ts`, `src/modules/customer/application/customer.service.spec.ts`, `src/modules/workshop-material/application/workshop-material.service.ts`, `src/modules/workshop-material/application/workshop-material.service.spec.ts`, plus the two explicitly-listed conditional repository files only if justified
  - writer B, docs slice: `docs/tasks/archive/retained-completed/task-20260323-1320-architecture-doc-clarity-followups.md`, `docs/architecture/README.md`, `docs/architecture/modules/project.md`, `docs/architecture/modules/reporting.md`, `docs/architecture/modules/master-data.md`
- If not safe, list the shared files or contracts that require a single writer:
  - `docs/tasks/TASK_CENTER.md` and requirement-doc sync remain parent-owned shared surfaces and must not be edited by either slice writer during parallel execution

## Review Log

- Validation results:
  - Re-read this task doc first, then re-reviewed only the round-2 `workshop-material` changes in `src/modules/workshop-material/application/workshop-material.service.ts`, `src/modules/workshop-material/application/workshop-material.service.spec.ts`, and `src/modules/workshop-material/infrastructure/workshop-material.repository.ts` against the scoped requirement and architecture constraints.
  - Confirmed the exact-release guard in `validateAndRecordReturnRelation()` now throws before relation persistence when the source-usage scan cannot release the full `linkedQty`.
  - Confirmed the RETURN void path now restores released `inventory_source_usage` through `restoreSourceUsageForReturnVoid()` before deactivating relations, using reverse `sourceLogId` order and `targetReleasedQty` decrements that match the `inventory-core.releaseInventorySource()` contract.
  - Confirmed the new tests directly cover the repaired stories: insufficient-release guard rejection, restored-usage re-return acceptance, the `return -> void return -> partial re-return` regression story, and `voidReturnOrder()` restore behavior across both single-usage and multi-usage cases.
  - Ran `pnpm exec biome check "src/modules/workshop-material/infrastructure/workshop-material.repository.ts" "src/modules/workshop-material/application/workshop-material.service.ts" "src/modules/workshop-material/application/workshop-material.service.spec.ts"`; **passed** (`Checked 3 files`, no fixes applied).
  - Ran `pnpm exec jest --runInBand src/modules/workshop-material/application/workshop-material.service.spec.ts`; **passed** (`19/19` tests).
  - Re-ran the task's final scoped Jest gate `pnpm exec jest --runInBand src/modules/customer/application/customer.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts`; **passed** (`33/33` tests).
  - Ran `git diff --name-only -- "docs/tasks/archive/retained-completed/task-20260323-1310-customer-workshop-return-invariants.md" "src/modules/customer/application/customer.service.ts" "src/modules/customer/application/customer.service.spec.ts" "src/modules/workshop-material/application/workshop-material.service.ts" "src/modules/workshop-material/application/workshop-material.service.spec.ts" "src/modules/customer/infrastructure/customer.repository.ts" "src/modules/workshop-material/infrastructure/workshop-material.repository.ts"` plus the matching scoped `git status --short`; no new boundary drift or forbidden shared-file edits were found beyond the already-owned task doc plus `customer` / `workshop-material` paths.
- Findings:
  - Re-review complete: no blocking or important findings remain in the round-2 `workshop-material` slice.
  - The previous blocker is now closed: exact-release is enforced before relation writes, return void restores source-usage state, the targeted regression coverage is materially stronger, and the slice remains inside the approved module-local boundaries.
- Follow-up action:
  - This task is sign-off ready from the `code-reviewer` perspective; parent can sync requirement progress and close or reclassify the task per the task center workflow.

## Final Status

- Outcome:
  - review completed with no remaining findings; the scoped `customer` + `workshop-material` return-invariant slice is sign-off ready
- Files changed:
  - `src/modules/customer/infrastructure/customer.repository.ts` — added `sumActiveReturnedQtyByOutboundLine` (conditional expansion, justified in scope section)
  - `src/modules/customer/application/customer.service.ts` — added cumulative active-return pre-validation in `createSalesReturn` before `linesWithSnapshots`
  - `src/modules/customer/application/customer.service.spec.ts` — 3 focused tests for customer slice (unchanged from round 1)
  - `src/modules/workshop-material/infrastructure/workshop-material.repository.ts` — added `sumActiveReturnedQtyByPickLine` (conditional expansion, justified in scope section)
  - `src/modules/workshop-material/application/workshop-material.service.ts` — cumulative pre-validation in RETURN branch; incremental deterministic source release in `validateAndRecordReturnRelation`; **round 2 adds**: guard after release loop (`remainingToRelease > 0` throws); `restoreSourceUsageForReturnVoid` private method; `voidOrder` RETURN branch calls restore for each source-linked line before deactivating relations
  - `src/modules/workshop-material/application/workshop-material.service.spec.ts` — **round 2 changes**: voided-return recovery test replaced with version using actual usage rows; guard rejection test added; full `return -> void return -> partial re-return` sequence test added; `describe("voidReturnOrder")` added with 2 tests proving restore calls with correct `targetReleasedQty`
- Invariant logic changed:
  - `customer.createSalesReturn`: aggregates `incomingBySourceLine` per `sourceOutboundLineId`, fetches `activeReturnedByLine` from DB (excluding voided downstream), rejects if `alreadyReturned + incoming > sourceQty`
  - `workshop-material.createOrder (RETURN)`: pre-validates cumulative return qty per source pick line including same-request splits; `validateAndRecordReturnRelation` releases source usage only up to `linkedQty` in deterministic ascending `sourceLogId` order; **round 2**: guard throws if full `linkedQty` cannot be released; relations only persist when exact release succeeds
  - `workshop-material.voidOrder (RETURN)`: **round 2**: iterates return lines with source references and calls `restoreSourceUsageForReturnVoid` (reverse sourceLogId order, decrements `targetReleasedQty` by restored amount) before deactivating document relations
- Requirement alignment:
  - all acceptance criteria from the requirement and architecture review findings are now met; no architecture-doc, requirement-doc, route, or shared-contract drift introduced
- Residual risks:
  - cumulative check in `createSalesReturn` runs outside the transaction (consistent with existing module pre-validation pattern); very narrow TOCTOU window exists in theory
  - source-usage pagination uses page size 200; pick orders with > 200 usages per line are handled via the while-loop but worth monitoring in production
  - `restoreSourceUsageForReturnVoid` is best-effort if the usage rows have already been externally modified; in normal system operation this cannot occur
- Directory disposition after completion: `active` until parent performs closure or reclassification per `TASK_CENTER.md`
- Next action:
  - `parent-orchestrator` syncs concise requirement progress and closes or reclassifies this task as appropriate
