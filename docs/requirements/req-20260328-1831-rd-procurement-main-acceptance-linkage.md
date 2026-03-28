# RD 采购需求与主仓验收联动基础切片

## Metadata

- ID: `req-20260328-1831-rd-procurement-main-acceptance-linkage`
- Status: `confirmed`
- Lifecycle disposition: `active`
- Owner: `user`
- Related tasks:
  - `docs/tasks/task-20260328-1831-rd-procurement-main-acceptance-linkage.md`

## 用户需求

- [x] 在 `RD handoff foundation` 已收口并归档前提下，继续新开 RD 下一切片，而不是现在做 smoke。
- [x] RD 全部切片完成前，先不做 live smoke；最终统一收口后再集中做 smoke 测试。
- [x] 研发小仓管理员需要能录入研发采购需求，由采购角色执行采购。
- [x] 主仓验收时应能直接选择对应研发采购信息并自动带出内容，避免重复录入。
- [x] 当前切片只处理“研发采购需求录入 + 主仓验收联动 foundation”，不把研发物料独立状态链、小仓盘点 / 库存调整混入同一切片。
- [x] 库存仍先入主仓，不能因为采购联动在验收时直接写入 RD 小仓；真实转入 RD 仍沿用已完成的 `RD handoff` 能力。

## 当前进展

- 阶段进度: 已完成上一切片 `RD handoff foundation` 的归档决策；当前新切片已重开为活跃锚点。
- 当前状态: 基于现有架构文档与已归档 RD 基线，下一条最小且上游的 RD 切片确定为“研发采购需求与主仓验收联动 foundation”。目标是先把“RD 采购需求 -> 主仓验收可选取并自动带出”的协同链路落成真实业务事实，同时显式维持“先入主仓、后交接到 RD”的库存边界。按照你的最新要求，live smoke 将延后到 RD 全部切片完成后再统一执行。
- 阻塞项: None
- 下一步: 规划并落地 RD 采购需求真源、主仓验收选取/带出联动、权限与页面入口收口，以及对应 focused validation；继续不做 live smoke。

## 待确认

- None
