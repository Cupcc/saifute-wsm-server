# stockScope RD 持久化补齐 follow-up

## Metadata

- Scope: 在已完成首波 `stockScope` cutover 的基础上，继续把 `rd-subwarehouse` 持久化表与运行时代码补齐到 `stockScope` 口径，重点覆盖 `rd_handoff_order`、`rd_procurement_request`、`rd_stocktake_order` 及其相关 schema / service / repository / tests。
- Related requirement: `docs/requirements/archive/retained-completed/req-20260330-2205-stock-scope-rd-persistence-followup.md`
- Status: `completed`
- Review status: `validated-no-independent-review`
- Lifecycle disposition: `retained-completed`
- Planner: `parent`
- Coder: `coder`
- Reviewer: `pending`
- Last updated: `2026-03-30`
- Related checklist: `None`

## Requirement Alignment

- Requirement doc: `docs/requirements/req-20260330-2205-stock-scope-rd-persistence-followup.md`
- User intent summary:
  - 继续补齐此前首波故意排除的 `rd-subwarehouse` 持久化轴
  - 不重开全仓 cutover 规划，而是聚焦 RD 协同相关表与代码
  - 继续保持 `inventory-core` 单写入口与 `workshop` 归属语义

## Goal

- 给 `rd_handoff_order`、`rd_procurement_request`、`rd_stocktake_order` 等 RD 协同表补 `stockScopeId`
- 让 RD 相关服务/仓储/测试跟随新持久化轴
- 保证全量测试继续为绿

## Initial Plan

- [x] 盘点 `prisma/schema.prisma` 中 RD 相关表的当前字段
- [x] 修改 schema 与生成 Prisma client
- [x] 修改 `rd-subwarehouse` 相关 application / repository / tests
- [x] 跑 focused tests
- [x] 跑 `pnpm swagger:metadata && pnpm typecheck && pnpm migration:typecheck && pnpm test`

## Current Notes

- 上一轮已完成非 RD 首波范围与目标库 `saifute-wsm` 的空库路径验证。
- 本轮已补齐 RD 协同主表的 `stockScope` 持久化轴，并再次通过目标库的安全 schema apply 与 `stock-scope-phase2` 脚本验证。

## Final Status

- Outcome: `completed - rd-subwarehouse persistence aligned`
- Validation:
  - `pnpm prisma:generate`
  - `pnpm typecheck`
  - `pnpm migration:typecheck`
  - focused RD tests
  - `pnpm swagger:metadata && pnpm typecheck && pnpm migration:typecheck && pnpm test`
  - target DB safe apply + `migration:stock-scope-phase2:dry-run / execute / validate`
- Residual risks:
  - 当前目标库首波相关表仍为 `0` 行，因此验证的是 schema/path 正确性，而不是非空历史数据回填效果。
- Next action: `None`
