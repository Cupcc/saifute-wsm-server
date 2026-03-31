# Workspace Dashboard

> 最后更新: 2026-04-01

## 当前状态

**活跃工作流** 当前主要剩余 `fifo-costing-default-fifo`、`rd-subwarehouse-frontend-display-dual-primary`、`migration-stage-planning` 与 `monthly-reporting` 四条线；其中 `fifo-costing-default-fifo` 已形成默认 FIFO 成本核算草案，主张保留汇总库存并以入库 `inventory_log` 作为 FIFO 成本层、`inventory_source_usage` 记录来源消耗，从而避免当前就扩到完整批次模型。`system-management-module` 已完成 `F2/F3` 基线收口并归档，后续若继续推进持久化方案或邻接能力边界，应另开新的切片 requirement / task / workspace。`stock-scope-phase2-cutover` 也已在空库与最小非空样本两条路径上完成验证并归档，若后续要验证更大规模真实历史数据，应另开新的 rehearsal scope。

## 需要你确认的

- `rd-subwarehouse-frontend-display-dual-primary`: 请继续确认 `研发协同` 一级界面内部应如何组织，才能同时满足“大仓管理员查看小仓全部物料状态 / 库存状态”和“顺手完成验收、发放 / 交接、退回处理”等大仓侧动作；详见 [draft.md](rd-subwarehouse-frontend-display-dual-primary/draft.md)。
- `migration-stage-planning`: 请确认阶段划分更偏 `业务价值可见性` / `技术底座先行` / `需求确认→实现→验收` / `混合口径`。

## AI 待办

| 优先级 | 任务                             | 状态       | 说明                                                                                                   |
| --- | ------------------------------ | -------- | ---------------------------------------------------------------------------------------------------- |
| 1   | fifo-costing-default-fifo      | 方案已成稿，待细化 | 已沉淀默认 FIFO 成本核算草案；下一步适合进入 schema 变更清单与库存核心改造拆解；[详情](fifo-costing-default-fifo/README.md) |
| 2   | rd-subwarehouse-frontend-display-dual-primary | 探索中 / 等待用户输入 | 已确认一级菜单命名与退回闭环；当前待收敛 `研发协同` 的信息组织与操作分区，阻塞于上方确认项；[详情](rd-subwarehouse-frontend-display-dual-primary/README.md) |
| 3   | migration-stage-planning       | 等待用户输入 | 新工作流已创建并启用 `draft.md`；迁移范围与成功展示主受众已澄清，当前待确认阶段拆分主轴；确认后即可进入阶段拆解与展示模板头脑风暴；[详情](migration-stage-planning/README.md) |
| 4   | monthly-reporting              | 需求已确认，待设计 | 已确认“全包含”指标与销售域口径、固定正式月报 + 人工重算 + 日期范围报表、系统查看 + Excel 导出，以及补录后重算且需保证追溯；[详情](monthly-reporting/README.md) |

## 活跃工作流

| 工作流                                                            | 阶段   | 健康度    | 简述                |
| -------------------------------------------------------------- | ---- | ------ | ----------------- |
| [fifo-costing-default-fifo](fifo-costing-default-fifo/README.md) | 方案草拟 | ● 就绪 | 已沉淀默认 FIFO 成本核算 draft，主张以 `inventory_log(IN)` 作为成本层、`inventory_source_usage` 作为来源消耗明细，避免当前就扩到完整批次模型 |
| [rd-subwarehouse-frontend-display-dual-primary](rd-subwarehouse-frontend-display-dual-primary/README.md) | 需求确认 | ○ 等待输入 | 澄清 RD 小仓前端应为「大仓 / 小仓两个一级操作面」及系统管理员双侧可见；业务层功能清单见 `draft.md` |
| [migration-stage-planning](migration-stage-planning/README.md) | 需求确认 | ○ 等待输入 | 目标是明确迁移开发阶段、每阶段的成功展示口径与后续沉淀方式；已启用 `draft.md` 沉淀脑暴与意图挖掘，当前等待用户确认阶段拆分主轴 |
| [monthly-reporting](monthly-reporting/README.md)               | 需求已确认 | ● 稳定   | 5 项核心口径已确认，下一步进入详细设计与实施规划 |

## 已归档

| 工作流                                                                                       | 完成时间       | 简述                      |
| ----------------------------------------------------------------------------------------- | ---------- | ----------------------- |
| [system-management-module](archive/retained-completed/system-management-module/README.md) | 2026-03-31 | 已完成 `system-management` 主题 `F2/F3` 基线与运行态收口：真实部门、主角色、预留查看角色、账号维护职责，以及 `在线用户 / 登录日志 / 操作日志` 的主题归属已同步到 topic、项目级需求、架构文档、运行态样例矩阵与前端治理菜单分组 |
| [stock-scope-phase2-cutover](archive/retained-completed/stock-scope-phase2-cutover/README.md) | 2026-03-30 | 已完成 `stockScope` Phase 2 全体代码与脚本收口：首波与 `rd-subwarehouse` follow-up 的持久化轴、目标库 schema apply、`dry-run / execute / validate` 均已通过，并已在最小非空样本上补过 rehearsal；若后续要验证更大规模真实历史数据，应另开新的 rehearsal scope |
| [system-readiness](archive/retained-completed/system-readiness/README.md)                 | 2026-03-26 | 最终 `customer` / 销售域缺口已关闭；首页、菜单、四个页面与关键动作入口均通过 fresh login 浏览器验证 |
| [outbound-customer-rename](archive/retained-completed/outbound-customer-rename/README.md) | 2026-03-26 | repo 内 `outbound` 兼容层已清理完成；工作流已归档 |
| [migration-java-to-nestjs](archive/retained-completed/migration-java-to-nestjs/README.md) | 2026-03-25 | 全域数据搬家 + 库存重放已完成；工作流已归档 |
| [rd-subwarehouse-main-to-rd-handoff](archive/retained-completed/rd-subwarehouse-main-to-rd-handoff/README.md) | 2026-03-28 | 主仓到 RD 自动交接 foundation 已落地并 clean sign-off；当前作为 RD 后续切片的上游基线保留 |
| [rd-subwarehouse](archive/retained-completed/rd-subwarehouse/README.md)                   | 2026-03-28 | RD Phase 1 已归档为稳定基线；后续主仓到 RD 自动交接、采购链路、状态链与盘点/调整需另开新切片 |
| [rd-procurement-main-acceptance-linkage](archive/retained-completed/rd-procurement-main-acceptance-linkage/README.md) | 2026-03-29 | RD 采购需求真源与主仓验收联动 foundation 已落地；累计验收量保护、权限/入口与前后端联动已收口，live smoke 继续留待 RD 全切片完成后统一执行 |
