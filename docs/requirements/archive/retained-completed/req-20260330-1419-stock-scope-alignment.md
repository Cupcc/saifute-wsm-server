# 库存范围与归属口径对齐切片

## Metadata

- ID: `req-20260330-1419-stock-scope-alignment`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Topic requirement:
  - `docs/requirements/topics/rd-subwarehouse.md`
- Related tasks:
- `docs/tasks/archive/retained-completed/task-20260330-1419-stock-scope-alignment.md`

## 用户需求

- [x] 按最新确认口径对齐需求文档与运行时设计：真实库存范围仅包含主仓与研发小仓，车间只承担主仓领退料归属与成本核算，不建立车间库存余额。
- [x] 研发小仓需要保持真实独立库存，小仓管理员可独立执行领料、退料、报废、盘点/调整，并记录本仓物料使用情况。
- [x] 同一物料 / 型号在不同入库批次下可能存在不同单价，库存来源与成本口径需按来源层追踪，不能用物料静态单价替代。
- [x] 在仓库内开一轮对齐切片：基于已更新的项目级需求与架构文档，继续调整代码实现。

## 当前进展

- 阶段进度: Phase 1 运行时 `stockScope` 语义收敛已完成，post-commit 收口已复核通过。
- 当前状态: scoped runtime surfaces 已以 canonical `stockScope` 作为真实库存范围真源；`inventory-core` 仍是唯一库存写入口；最终闸门已通过。
- 阻塞项: None
- 下一步: 归档；若后续继续推进库存维度真切换，另开 `Phase 2` schema / data cutover 切片。

## 待确认

- None
