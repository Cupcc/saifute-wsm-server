# RD Subwarehouse Main-To-RD Handoff Foundation

## Metadata

- Scope: land the truthful main-warehouse-to-RD handoff foundation so RD auto inbound results are backed by a real handoff document and `inventory-core` stock postings rather than Phase 1 placeholder semantics
- Related requirement: `docs/requirements/archive/retained-completed/req-20260328-1640-rd-subwarehouse-main-to-rd-handoff-foundation.md`
- Status: `implemented`
- Review status: `reviewed-clean`
- Lifecycle disposition: `retained-completed`
- Planner: `assistant`
- Coder: `assistant`
- Reviewer: `assistant`
- Last updated: `2026-03-28`

## Requirement Alignment

- User intent summary:
  - close the already-confirmed “主仓完成交接后自动转入 RD 小仓” foundation gap
  - keep RD users out of secondary receipt confirmation
  - keep all stock writes inside `inventory-core`
  - avoid silently widening the system into generic multi-warehouse
- Delivered outcome:
  - added a narrow `RD handoff` persistence artifact as the only truthful handoff fact
  - posted `main - / RD +` through `inventory-core` with idempotent keys
  - switched RD “自动入库结果” and workbench recent results away from `into-orders` placeholder reads
  - added independent `rd:handoff-order:*` permissions and create/void operation audit logs

## Implementation Summary

- Backend:
  - added `RdHandoffOrder` / `RdHandoffOrderLine` in `prisma/schema.prisma`
  - added `RD_HANDOFF_OUT` / `RD_HANDOFF_IN` inventory operation types
  - implemented `src/modules/rd-subwarehouse/**` module, repository, service, controller, DTOs and tests
  - constrained source workshop to `MAIN` and target workshop to `RD`
  - ensured `create/void` is audited and `workshopScope` still gates RD-side reads
- Frontend:
  - switched `web/src/api/rd-subwarehouse.js` to `/api/rd-subwarehouse/handoff-orders`
  - updated `web/src/views/rd/inbound-results/index.vue` to show truthful source/target handoff fields
  - updated `web/src/views/rd/workbench/index.vue` to show recent real handoff results and calculate “today” using `Asia/Shanghai`
- Docs:
  - synced requirement/task/workspace/dashboard/architecture truth to reflect landed handoff foundation and clean review sign-off

## Validation

- `pnpm prisma:generate` -> passed
- `pnpm prisma:validate` -> passed
- `pnpm swagger:metadata && pnpm typecheck` -> passed
- `pnpm test -- rd-handoff` -> passed (`2` suites / `8` tests)
- `pnpm test` -> passed (`44` suites / `444` tests)
- `pnpm --dir web build:prod` -> passed
- `pnpm exec prisma db push` -> database already in sync after schema update
- reviewer final pass -> `No findings`

## Residual Risks Or Testing Gaps

- no live browser/API smoke was run after this slice because the user later chose to defer smoke until RD slices are completed as a bundle
- create/void audit log persistence is wired and reviewed, but not yet verified via live API smoke
- the main-side handoff creation UI is not part of this slice; the truthful trigger exists as backend document/API capability

## Completion

- Outcome: retained completed baseline
- Directory disposition after completion: archived to `docs/tasks/archive/retained-completed/task-20260328-1640-rd-subwarehouse-main-to-rd-handoff-foundation.md`
- Next action: continue RD with a fresh slice instead of reusing this completed handoff foundation as an active anchor
