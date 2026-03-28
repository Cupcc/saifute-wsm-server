# RD 主仓到小仓自动交接

关联需求: `docs/requirements/archive/retained-completed/req-20260328-1640-rd-subwarehouse-main-to-rd-handoff-foundation.md`
关联任务: `docs/tasks/archive/retained-completed/task-20260328-1640-rd-subwarehouse-main-to-rd-handoff-foundation.md`
阶段: 已归档
创建: 2026-03-28
最后更新: 2026-03-28

## 当前状况

本工作流已完成并归档。它为 RD 后续切片提供的稳定基线是：主仓到 RD 的真实交接已经有了独立 `RD handoff` 文档承载，`main - / RD +` 过账统一经 `inventory-core` 完成，RD “自动入库结果”与工作台最近结果也已经改查真实交接结果。

这条工作流不再作为活跃 resume 锚点使用。后续继续 RD 时，应直接在新的 requirement / task / workspace 上推进研发采购需求联动、物料状态链或盘点/调整等后续切片。

## 保留原因

- 保留“主仓 -> RD”真实交接 foundation 的决策与实现 provenance
- 为后续 RD 采购链路、物料状态链与盘点/调整提供已落地上游基线
- 保留“smoke 延后到 RD 全部切片完成后再统一执行”的衔接背景

## 关键里程碑

| 时间 | 事件 |
|------|------|
| 2026-03-28 | 完成 RD 状态澄清，确认本切片只处理主仓到 RD 自动交接 foundation |
| 2026-03-28 | 落地窄化 `RD handoff` 文档、`main - / RD +` 过账与 RD 真实结果面 |
| 2026-03-28 | 修正主仓硬约束、独立权限点、业务日口径与操作审计，最终 reviewer `No findings` |
