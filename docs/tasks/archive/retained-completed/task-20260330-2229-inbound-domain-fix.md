# 入库模块 review findings 修复

## Metadata

- Scope: 修复 `inbound` review 中确认的 3 个问题：普通验收单/生产入库单必须归主仓、查询/详情/修改/作废按真实库存轴判断、补齐对应测试。
- Related requirement: `docs/requirements/archive/retained-completed/req-20260330-2229-inbound-domain-fix.md`
- Status: `completed`
- Review status: `validated-no-independent-review`
- Lifecycle disposition: `retained-completed`
- Planner: `parent`
- Coder: `coder`
- Reviewer: `pending`
- Last updated: `2026-03-30`
- Related checklist: `None`

## Goal

- 修复 `inbound` 当前不满足需求对齐的关键问题
- 保持 `stockScope` 持久化轴与主仓语义一致
- 跑过相应验证并给出最终结论

## Initial Plan

- [x] 修复普通验收单/生产入库单的主仓约束
- [x] 修复查询/详情/修改/作废的真实库存轴判断
- [x] 补 service / controller / scope tests
- [x] 跑 focused tests
- [x] 跑 `pnpm swagger:metadata && pnpm typecheck && pnpm migration:typecheck && pnpm test`

## Final Status

- Outcome: `completed - inbound findings fixed`
- Validation:
  - `pnpm typecheck`
  - `pnpm test -- --runTestsByPath src/modules/inbound/application/inbound.service.spec.ts src/modules/rbac/application/workshop-scope.service.spec.ts`
  - `pnpm swagger:metadata && pnpm typecheck && pnpm migration:typecheck && pnpm test`
- Next action: `None`
