# RD 主仓到小仓自动交接基础切片

## Metadata

- ID: `req-20260328-1640-rd-subwarehouse-main-to-rd-handoff-foundation`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260328-1640-rd-subwarehouse-main-to-rd-handoff-foundation.md`

## 用户需求

- [x] 在已确认的“主仓 + 研发小仓受限协同”前提下，继续推进下一切片，并先确认当前状态链路清晰、架构边界明确、没有 resume 混乱。
- [x] 主仓发料 / 调拨到研发小仓后，系统需要自动完成小仓侧过账，不要求研发小仓管理员做二次收货确认。
- [x] 当前 RD 侧“自动入库结果”页面需要建立在真实交接结果之上，不能继续停留在 Phase 1 的占位语义。
- [x] 本切片只处理主仓到 RD 自动交接 foundation，不把研发采购需求与主仓验收联动、研发物料独立状态链、小仓盘点 / 库存调整混在同一切片。
- [x] 所有库存写入仍必须统一经过 `inventory-core`，不允许为了交接能力旁路改库存。

## 当前进展

- 阶段进度: 已完成 foundation 实装与 clean review sign-off；`RD handoff` 真源文档、`main - / RD +` 交接编排、独立权限点与 RD 真实结果面均已落地。
- 当前状态: 本切片已作为稳定基线归档保留；后续 RD 继续推进时，应以归档 requirement / task / workspace 和 `docs/architecture/modules/rd-subwarehouse.md` 为 resume 真源，而不是重新把本切片当作活跃项。
- 阻塞项: None
- 下一步: 归档；后续继续 RD 能力时另开新切片。

## 待确认

- None
