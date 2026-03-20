# 需求中心

`docs/requirements/**` 与 `docs/tasks/**` 对称分层：

- `REQUIREMENT_CENTER.md`：当前需求文档清单、生命周期与 task 绑定的索引看板。
- `README.md`：目录机制与归档规则。
- `req-*.md`（根目录）：仍参与编排或尚未归档的活跃需求。
- `archive/**`：已闭环的需求，保留文件以便 task 与 provenance 继续引用真实路径。

看板保持简短，不复制各需求正文中的长篇说明。

## 生命周期（与 task 文档对齐）

- `active`：仍用于用户侧交互、规划、执行或同步 `当前进展`。
- `retained-completed`：需求已闭环，但保留为稳定真源或溯源；文件应位于 `archive/retained-completed/`。
- `cleanup-candidate`：后续在用户明确确认后可删除；文件应位于 `archive/cleanup-candidate/`。

## 目录约定

- 根目录仅保留 `README.md`、`REQUIREMENT_CENTER.md`、`_template.md` 与 **`Lifecycle disposition` 为 `active`** 的 `req-*.md`。
- 需求归档时**移动文件**到对应 `archive/` 子目录，文件名不变；**禁止**在仍被引用的前提下直接删除需求文件（应优先归档以保留路径可解析性）。

## 与 task 的绑定规则

- 每个根目录 `task-*.md` 的 `Related requirement` 必须指向**仍存在**的 `docs/requirements/**/*.md`，且目标需求的 `Lifecycle disposition` 应为 **`active`**（即文件仍在 `docs/requirements/` 根目录）。需求归档后，对应执行工作应已收口：关联 task 应已迁入 `docs/tasks/archive/**`，或已改绑到新的活跃需求。
- 已归档 task 文档中的 `Related requirement` 应更新为归档后的完整路径（例如 `docs/requirements/archive/retained-completed/req-….md`），便于全文检索与双向追溯。
- 需求文档 Metadata 中的 `Related tasks` 建议维护关联的 `docs/tasks/**/*.md` 路径；需求归档时核对并更新 task 侧路径。

## 活跃需求

| 需求文档 | Status（交互） | 关联 task（便于跳转，可节选） |
| --- | --- | --- |
| `req-20260320-1830-migration-active-slices.md` | 见文件 Metadata | `task-20260317-1416-migration-outbound-base.md`、`task-20260319-1035-migration-outbound-sales-return-formal-admission.md`、`task-20260319-1045-migration-workshop-return-formal-admission.md` |
| `req-20260319-1300-return-post-admission.md` | 见文件 Metadata | `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md` |

## 已归档（`archive/retained-completed/`）

当前无条目。迁入后在此逐行登记文件名与保留原因（一行）。

## 清理候选（`archive/cleanup-candidate/`）

当前无条目。删除前须用户明确确认，并对仓库内引用做全文检索。

## 维护

- 新增或迁入/迁出归档时，同步更新本看板与 `docs/tasks/TASK_CENTER.md` 中涉及该需求的行。
- 详细流程见 `docs/requirements/README.md`。
