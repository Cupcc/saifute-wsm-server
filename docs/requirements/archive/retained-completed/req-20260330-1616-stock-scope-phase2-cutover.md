# 库存范围口径 Phase 2 cutover 规划

## Metadata

- ID: `req-20260330-1616-stock-scope-phase2-cutover`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Topic requirement:
  - `docs/requirements/topics/rd-subwarehouse.md`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260330-1616-stock-scope-phase2-cutover.md`

## 用户需求

- [x] 在 `stockScope` Phase 1 运行时语义收敛完成后，继续规划 `Phase 2`：把库存真实维度从当前冻结的 `workshopId` 存储口径切向明确的 `stockScope` / cutover 方案。
- [x] 规划需覆盖 schema、数据迁移/回填、兼容边界、回滚策略、验证方案与切换顺序，不能直接跳成一次性实现。
- [x] 规划结果需明确哪些是必须用户确认的高风险决策，避免在库存与成本追踪语义上擅自扩 scope。

## 当前进展

- 阶段进度: 首波 `schema expand + runtime shift` 代码、生成代码与 `stock-scope-phase2` migration 脚本已实现，并已在目标库 `saifute-wsm` 上通过更安全的 `prisma migrate diff --script | prisma db execute` 路径完成 schema apply。
- 当前状态: `pnpm swagger:metadata && pnpm typecheck && pnpm test`、`pnpm migration:typecheck` 已通过；`migration:stock-scope-phase2:dry-run` / `execute` / `validate` 也已执行通过。当前目标库首波相关表均为 `0` 行，因此本轮验证的是 schema/path 正确性，而不是非空历史数据回填效果。
- 阻塞项: None
- 下一步: 归档；若需要继续验证非空历史数据场景，应另开新 scope 在带数据的目标库上 rehearse。

## 待确认

- None
