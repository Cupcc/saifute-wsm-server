# stockScope 非空历史数据 rehearsal

## Metadata

- Scope: 在目标库 `saifute-wsm` 中构造最小代表性非空数据，验证 `stockScope` 对齐的 `dry-run / execute / validate` 在非空数据场景下也能成立。
- Related requirement: `docs/requirements/archive/retained-completed/req-20260330-2235-stock-scope-nonempty-rehearsal.md`
- Status: `completed`
- Review status: `validated-no-independent-review`
- Lifecycle disposition: `retained-completed`
- Planner: `parent`
- Coder: `coder`
- Reviewer: `pending`
- Last updated: `2026-03-30`
- Related checklist: `None`

## Goal

- 在目标库上插入最小代表性历史数据
- 重跑 `stock-scope-phase2` migration 路径
- 证明非空场景也能对齐，不只空库路径为绿

## Initial Plan

- [x] 编写 rehearsal seed script
- [x] 执行 seed
- [x] 重跑 `migration:stock-scope-phase2:dry-run / execute / validate`
- [x] 记录结果并归档

## Final Status

- Outcome: `completed - nonempty rehearsal validated`
- Validation:
  - `pnpm migration:typecheck`
  - `pnpm migration:stock-scope-phase2:seed-rehearsal`
  - `pnpm migration:stock-scope-phase2:dry-run`
  - `pnpm migration:stock-scope-phase2:execute`
  - `pnpm migration:stock-scope-phase2:validate`
- Notes:
  - 使用了目标库最小代表性样本数据，而不是只依赖空库
  - dry-run blocker 逻辑已修正，不再把 `project` / `workshop_material_order` 的归属车间误判成硬 blocker
