# 任务中心

`docs/tasks/**` 现在明确分成三层：

- `TASK_CENTER.md`：维护当前 task 文档清单、生命周期分类和清理候选的实时看板。
- `README.md`：说明目录机制、角色分工和编写规则。
- `task-*.md`：承载某一个具体 scope 的详细执行、review 和溯源记录。

需求侧对称看板：`docs/requirements/REQUIREMENT_CENTER.md`（活跃/归档需求与关联 task 索引）。

这份文档应保持简洁，只做索引和分类，不复制 task 文档里的长篇验收条件、review 记录或附录内容。

## 生命周期分类

- `active`：仍处于规划、编码、review、修复或续接状态。
- `retained-completed`：已完成，但仍需保留，原因可能是它仍然是稳定真源、重要基线，或仍被后续 task 引用。
- `cleanup-candidate`：后续可能可以清理，但当前只能列入候选，必须等用户明确确认后才能删除。
- 已被当前真源完全承接、且没有单独保留价值的旧 brief，不再单独设“已替代归档”分类；应在当前文档写明变更说明后直接删除。

## 归档目录布局

`docs/tasks/` 根目录只保留 `TASK_CENTER.md`、`README.md`、`_template.md` 和仍绑定 **`docs/requirements/req-*.md`（根目录、Lifecycle `active`）** 的 `active` task 文档。需求已闭环时应**归档**到 `docs/requirements/archive/**` 并更新引用路径，而不是删除；若需求文件已从仓库移除且未保留归档路径，则关联 task 不得留在根目录（应迁入 `archive/**` 或按治理删除）。需求侧索引见 `docs/requirements/REQUIREMENT_CENTER.md`。

- `docs/tasks/archive/retained-completed/`：存放已完成但仍需保留的稳定基线、治理溯源或上游真源 task 文档。
- `docs/tasks/archive/cleanup-candidate/`：存放当前只做保留归档、后续若用户明确确认才允许删除的候选 task 文档。

## 看板规则

- 跨 task 的实时总览统一维护在这里，不写回 `README.md`，也不要分散写在多个 task 文档里。
- 每条记录尽量保持一行理由，避免看板再次膨胀。
- 如果某个文档是否可清理存在歧义，优先归类为 `retained-completed`，不要激进推进清理。
- `cleanup-candidate` 只是建议分类；若尚未获得当前归档 scope 的用户明确确认，不得删除、重命名或移动相关 task 文档。即使已进入归档执行，删除仍需单独确认。
- 已被当前真源承接的旧 brief，默认不再保留单独目录或分类；如需说明差异，应写进当前 requirement / task 文档，而不是继续保留旧 brief。
- 较早的 task 文档可能还没有 `Lifecycle disposition` metadata 字段；在这些旧文档自然再次被修改前，以本看板作为当前分类真源。
- 根目录每一条活跃 task 须在 Metadata 中列出仍存在于 **`docs/requirements/` 根目录** 且 **`Lifecycle disposition` 为 `active`** 的 `Related requirement` 路径。需求归档时更新 task 与需求双向路径，并将已收口的 task 迁入 `docs/tasks/archive/**`；勿在根目录保留「仅绑定已归档或已删需求」的活跃 task。

## 活跃任务

当前无活跃任务。

## 已完成但保留（归档至 `archive/retained-completed/`）

以下条目按生命周期已归为 `retained-completed`，并保留为稳定真源、执行 provenance 或后续切片依赖基线。

| Task 文档 | 保留原因 |
| --- | --- |
| `docs/tasks/archive/retained-completed/task-20260317-1416-migration-outbound-base.md` | 已完成并在最新 DB-backed dry-run + batch-owned rows/maps 证据下确认收口；当前 `execute` / `validate` 非零来自后续已复审切片扩展 baseline，不再构成该 slice blocker。 |
| `docs/tasks/archive/retained-completed/task-20260319-1035-migration-outbound-sales-return-formal-admission.md` | 已 `reviewed-no-findings`，formal admission 结论稳定，保留为后续 customer-stock 家族迁移的 admitted baseline 与 provenance 真源。 |
| `docs/tasks/archive/retained-completed/task-20260319-1045-migration-workshop-return-formal-admission.md` | 已 `reviewed-no-findings`，formal admission 结论稳定，保留为后续 workshop-material 家族迁移的 admitted baseline 与 provenance 真源。 |
| `docs/tasks/archive/retained-completed/task-20260320-1244-task-doc-center-and-cleanup.md` | 已完成本轮 `docs/tasks/**` 治理机制落地，并作为新任务中心模型的溯源记录继续保留。 |
| `docs/tasks/archive/retained-completed/task-20260320-1343-task-doc-archival-cleanup.md` | 已完成首次 task 文档归档清理，并保留为 `archive/` 布局落地的治理记录。 |
| `docs/tasks/archive/retained-completed/task-20260320-1740-task-doc-obsolete-brief-removal.md` | 已完成机制简化：删除专门的“已替代归档”模块与对应旧 brief，并把变更说明收口到当前真源文档。 |
| `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md` | 已完成，但仍是后续 outbound reservation 相关迁移 slice 的稳定基线。 |
| `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md` | 已完成，但仍是后续 workshop return 工作依赖的 workshop pick admitted baseline。 |
| `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md` | 已完成，但仍是旧顶层迁移计划删除后的仓库级 migration master plan 真源。 |
| `docs/tasks/archive/retained-completed/task-20260319-1605-feishu-runtime-summary.md` | 已完成：`task_complete` 会话级运行时长与失败语义修复；需求文件已删，保留为 provenance。 |
| `docs/tasks/archive/retained-completed/task-20260319-1715-feishu-subagent-runtime-duration.md` | 已完成：`subagent_complete` 显式时长入参与规则/测试一致；保留为飞书通知合约变更真源。 |
| `docs/tasks/archive/retained-completed/task-20260320-1400-architecture-doc-relocation.md` | 已完成架构文档目录迁移、说明补充与仓库级旧路径引用清理，并保留为本轮结构治理的执行与 review 记录。 |
| `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md` | 已完成退货族准入后共享下游迁移（relation / replay / validate / readiness policy），复审通过与需求对齐，仍作为该 scope 的执行与 provenance 真源。 |

## 清理候选（归档至 `archive/cleanup-candidate/`）

当前无待处理条目。历史条目 `task-20260319-1632-req-interaction-layer.md` 已于 2026-03-20 经用户确认删除；`cleanup-candidate/` 目录保留供日后候选归档。

## 下一步

- 已完成机制简化：不再为“已被替代但当前没有保留价值”的旧 brief 设单独归档模块；此类变更说明统一写入当前真源文档。
- `task-20260317-1416`、`task-20260319-1035`、`task-20260319-1045` 已全部迁入 `archive/retained-completed/`；当前只需在后续新需求出现时按新 requirement / task 锚点继续推进。
- 退货族迁移的人机交互锚点 `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md` 已完成闭环，并继续作为这些 retained-completed task 的 `Related requirement` 真源。
- 将需求迁入 `docs/requirements/archive/**` 或从仓库移除需求文件时，同步更新 `Related requirement` / `Related tasks` 全文路径，检查并迁出根目录上已无**活跃**需求绑定的 task；优先归档需求文件以保留可追溯链接（见 `docs/requirements/README.md`）。
- 今后若新增 `cleanup-candidate`，删除前须再次对全文做引用检索，并取得用户明确确认。
