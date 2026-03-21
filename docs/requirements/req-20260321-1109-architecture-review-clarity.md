# 架构 Review 与澄清

## Metadata

- ID: `req-20260321-1109-architecture-review-clarity`
- Status: `needs-confirmation`
- Lifecycle disposition: `active`
- Owner: `user`
- Related tasks: （待确认后补充）
- Related requirement:
  - None

## 用户需求

- 对当前仓库的 `docs/architecture/**` 与实际模块组织做一次架构 review，目标是让系统架构、模块职责、依赖边界、共享层规则，以及“哪些是冻结语义 / 哪些是目标设计”的表达更加清晰明确。
- review 过程中，如发现需要用户拍板的范围、目标、取舍或冻结基线调整事项，统一记录到 `待确认`，在未确认前不擅自改写成既定结论。
- 当前初读结果显示：`docs/architecture/00-architecture-overview.md` 已定义 `15` 个模块与 shared 层约束，`src/app.module.ts` 也注册了同一组模块；因此本轮更可能聚焦“边界表达是否清楚、文档是否区分当前态/目标态、模块约束是否可执行”，而不只是补模块清单。

## 当前进展

- 阶段进度: 已完成现有架构总览、部分模块文档与模块注册骨架初读，正在收敛本轮架构 review 的确认口径。
- 当前状态: 仓库已有较完整的架构文档框架，但尚未确认本轮是“文档澄清为主”还是“文档 + 代码边界/目录调整建议一起做”；当前先停留在需求澄清阶段。
- 阻塞项: review 范围、交付物、当前态 vs 目标态口径，以及是否允许调整冻结基线文档尚未确认。
- 下一步: 待用户确认 `待确认` 后，再创建对应 `docs/tasks/*.md` 并进入正式架构 review 与文档收敛。

## 待确认

### Q1. 本轮 review 的直接交付物希望是什么？

- 选项 A：只整理 / 重写 `docs/architecture/**`，让文档更清楚。
- 选项 B：先做文档澄清，同时输出“当前文档与代码结构的差距清单”。
- 选项 C：除文档外，还要给出后续代码 / 目录 / 模块边界调整方案。

### Q2. 本轮架构文档应主要描述哪一种口径？

- 选项 A：以“当前仓库已实现现状”为准。
- 选项 B：以“目标迁移架构 / 理想设计”为准。
- 选项 C：同时保留“当前态”和“目标态”，明确差距与演进路径。

### Q3. 本轮 review 范围是全仓还是先聚焦关键域？

- 选项 A：全仓 `15` 个模块 + shared 层一起 review。
- 选项 B：先 review 平台与横切模块（`auth` / `session` / `rbac` / `audit-log` / `scheduler` / `file-storage`）。
- 选项 C：先 review 业务域与共享核心（`master-data` / `inventory-core` / `workflow` / 单据域 / `project` / `reporting`）。
- 选项 D：由用户指定优先模块或模块组合。

### Q4. 如果 review 发现冻结基线本身需要调整，是否允许本轮一并修改？

- 选项 A：允许，但每处基线变更都需要单独列出供我确认。
- 选项 B：只指出问题，不改 `docs/architecture/00-architecture-overview.md` 与 `docs/architecture/20-wms-business-flow-and-optimized-schema.md` 的基线正文。
- 选项 C：仅允许调整 `docs/architecture/00-architecture-overview.md`，`docs/architecture/20-wms-business-flow-and-optimized-schema.md` 继续保持冻结。

### Q5. 你想优先澄清哪类“不清晰”？（可多选）

- 选项 A：模块职责不清。
- 选项 B：模块依赖 / 跨模块访问规则不清。
- 选项 C：shared 层与业务层边界不清。
- 选项 D：当前实现与目标架构关系不清。
- 选项 E：文档组织方式与阅读路径不清。
