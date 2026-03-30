# 库存范围口径 Phase 2 cutover 规划

## Metadata

- ID: `req-20260330-1616-stock-scope-phase2-cutover`
- Status: `confirmed`
- Lifecycle disposition: `active`
- Owner: `user`
- Topic requirement:
  - `docs/requirements/topics/rd-subwarehouse.md`
- Related tasks:
  - `docs/tasks/task-20260330-1616-stock-scope-phase2-cutover.md`

## 用户需求

- [x] 在 `stockScope` Phase 1 运行时语义收敛完成后，继续规划 `Phase 2`：把库存真实维度从当前冻结的 `workshopId` 存储口径切向明确的 `stockScope` / cutover 方案。
- [x] 规划需覆盖 schema、数据迁移/回填、兼容边界、回滚策略、验证方案与切换顺序，不能直接跳成一次性实现。
- [x] 规划结果需明确哪些是必须用户确认的高风险决策，避免在库存与成本追踪语义上擅自扩 scope。

## 当前进展

- 阶段进度: Phase 2 schema/data cutover 规划已落盘（`task-20260330-1616`），含策略分段、风险面与用户确认项；尚未进入 Prisma/migration/代码实施。
- 当前状态: 运行时仍以 Phase 1 `stockScope` 为真源，`inventory-core` 仍为唯一库存写入口；DB 与多数字段仍挂在 `workshopId` 存储轴，与目标 `stockScopeId` 持久化不一致。
- 阻塞项: None
- 下一步: 用户确认 task 内关键决策；可选开 workspace 沉淀映射与 rehearsal；决策冻结后开执行 slice 并定义验证/回滚闸门。

## 待确认

- 具体 cutover 执行策略、迁移窗口与回滚方式待本轮规划后再确认。
