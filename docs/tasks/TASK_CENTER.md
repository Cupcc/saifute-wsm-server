# 任务中心

三层结构：`TASK_CENTER.md`（看板）、`README.md`（规则）、`task-*.md`（执行记录）。

需求侧看板：`docs/requirements/REQUIREMENT_CENTER.md`。

需求真源统一维护在 `docs/requirements/topics/*.md`，不使用切片 `req-*.md`。task 的 `Related requirement` 指向对应 topic 能力（如 `docs/requirements/topics/system-management-module.md (F4)`）。

## 生命周期分类

- `active`：仍在规划、编码、review、修复或续接中。
- `retained-completed`：已完成，保留为稳定基线或 provenance。
- `cleanup-candidate`：候选清理，须用户明确确认后才能删除。

## 归档目录

- `docs/tasks/archive/retained-completed/`：已完成但保留的 task 文档。
- `docs/tasks/archive/cleanup-candidate/`：候选清理的 task 文档。

根目录只保留 `active` task。task 完成后迁入 `archive/`。

## 活跃任务

| Task 文档 | 状态 | 说明 |
| --- | --- | --- |
| 当前无 active task | `-` | `system-management` F4 已完成并归档到 `archive/retained-completed/`。 |

## 已完成（`archive/retained-completed/`）

历史 task 文档均位于 `docs/tasks/archive/retained-completed/`，通过文件名或 git log 检索溯源。

## 清理候选（`archive/cleanup-candidate/`）

当前无待处理条目。
