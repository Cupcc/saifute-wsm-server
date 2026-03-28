# RD 采购需求与主仓验收联动

关联需求: `docs/requirements/req-20260328-1831-rd-procurement-main-acceptance-linkage.md`
关联任务: `docs/tasks/task-20260328-1831-rd-procurement-main-acceptance-linkage.md`
阶段: 规划中
创建: 2026-03-28
最后更新: 2026-03-28

## 当前状况

`RD handoff foundation` 已完成并归档，当前工作流用于承接下一条最上游且最小的 RD 缺口：把“研发采购需求”从 requirement 口径落实成真实上游业务事实，并让主仓验收可以直接选择对应采购信息自动带出内容。

这条切片的目标不是一次性完成 RD 全链路，而是先把“RD 采购需求 -> 主仓验收联动”打通，继续保持“先入主仓，后通过已完成的 `RD handoff` 转入 RD”的库存边界。研发物料独立状态链、小仓盘点 / 调整仍然留在后续切片。

## 待决策项

当前无待用户确认项。当前已按既有架构与归档基线，把下一条切片优先级收敛为“研发采购需求与主仓验收联动 foundation”。

## 背景与上下文

- 已归档的 handoff 基线见 `docs/workspace/archive/retained-completed/rd-subwarehouse-main-to-rd-handoff/README.md`。
- 更早的 RD Phase 1 基线见 `docs/workspace/archive/retained-completed/rd-subwarehouse/README.md`。
- 当前架构真源见 `docs/architecture/modules/rd-subwarehouse.md` 与 `docs/architecture/modules/inbound.md`。
- 本轮新增会遵守你的新要求：RD 全部切片完成前，不做 live smoke；最后统一做 smoke 测试。

## 关键里程碑

| 时间 | 事件 |
|------|------|
| 2026-03-28 | `RD handoff foundation` 完成实现、复审通过，并转入归档候选状态 |
| 2026-03-28 | 基于现有 RD 缺口排序，确定下一切片优先处理“研发采购需求与主仓验收联动 foundation” |
| 2026-03-28 | 建立本工作流 README，作为新切片的活跃 workspace 入口 |

## 本文件夹资产索引

| 文件 | 用途 |
|------|------|
| `README.md` | 当前 procurement/acceptance linkage 切片的活跃工作流入口与状态摘要 |
