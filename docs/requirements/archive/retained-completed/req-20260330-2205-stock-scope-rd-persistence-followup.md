# stockScope RD 持久化补齐 follow-up

## Metadata

- ID: `req-20260330-2205-stock-scope-rd-persistence-followup`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Topic requirement:
  - `docs/requirements/topics/rd-subwarehouse.md`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260330-2205-stock-scope-rd-persistence-followup.md`

## 用户需求

- [x] 在已完成 `stockScope` Phase 2 首波实现后，继续把此前故意排除的 `rd-subwarehouse` 持久化表与代码层也对齐到 `stockScope` 口径。
- [x] 本 follow-up 重点是 `rd_handoff_order`、`rd_procurement_request`、`rd_stocktake_order` 及其相关运行时代码，不重新扩成新的全仓 cutover 规划。
- [x] 继续保持 `inventory-core` 是唯一库存写入口，`workshop` 只保留归属/协同语义，不再回流成真实库存池。

## 当前进展

- 阶段进度: RD follow-up 已完成：`rd_handoff_order`、`rd_procurement_request`、`rd_stocktake_order` 的 `stockScope` 持久化轴、相关 service/tests 与目标库 schema apply 都已补齐。
- 当前状态: `pnpm swagger:metadata && pnpm typecheck && pnpm migration:typecheck && pnpm test` 已通过；`stock-scope-phase2` 的 `dry-run / execute / validate` 在补齐 RD 持久化表后也再次通过。
- 阻塞项: None
- 下一步: 归档；若后续需要继续做非空历史数据 rehearsal，另开新 scope。

## 待确认

- None
