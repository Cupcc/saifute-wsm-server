# RD 采购需求与主仓验收联动基础切片

## Metadata

- ID: `req-20260328-1831-rd-procurement-main-acceptance-linkage`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Topic requirement: `docs/requirements/topics/rd-subwarehouse.md`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260328-1831-rd-procurement-main-acceptance-linkage.md`

## 用户需求

- [x] 研发小仓管理员需要能录入研发采购需求，由采购角色执行采购。
- [x] 主仓验收时应能直接选择对应研发采购信息并自动带出内容，避免重复录入。
- [x] 当前切片只处理“研发采购需求录入 + 主仓验收联动 foundation”，不把研发物料独立状态链、小仓盘点 / 库存调整混入同一切片。
- [x] 库存仍先入主仓，不能因为采购联动在验收时直接写入 RD 小仓；真实转入 RD 仍沿用已完成的 `RD handoff` 能力。

## 当前进展

- 阶段进度: Phase 3 已完成，并已归档对应 task / workspace。
- 当前状态: 本文档只保留 Phase 3 交付摘要；`RD 小仓` 的长期约束、能力清单和阶段路线图统一收口到 `docs/requirements/topics/rd-subwarehouse.md`。
- 阻塞项: None
- 下一步: 归档；若继续推进 RD 后续能力，应另开“物料状态链”或“小仓盘点 / 调整”等新切片。

## 待确认

- None
