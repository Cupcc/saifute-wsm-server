# 用户需求文档

`docs/requirements/**` 用于保存面向用户的需求与进展交互真源。

## 目录布局

```text
docs/requirements/
├── REQUIREMENT_CENTER.md              # 活跃/归档需求索引与 task 绑定看板
├── README.md                          # 本文件：机制与归档规则
├── _template.md                       # 新建需求模板
├── req-*.md                           # 仍参与编排的活跃需求（Lifecycle：active）
└── archive/
    ├── retained-completed/            # 已闭环但仍需保留真源与溯源
    └── cleanup-candidate/             # 待用户明确确认后可删除
```

活跃需求留在根目录；**需求闭环后优先迁入 `archive/` 保留文件**，而不是删除，以便 `docs/tasks/**` 中的 `Related requirement` 可继续指向真实路径，便于双向追踪。跨需求总览与绑定关系维护在 `REQUIREMENT_CENTER.md`，与 `docs/tasks/TASK_CENTER.md` 配合使用。

## 基本要求

- 全文用中文撰写；路径、文件名、metadata可保留英文。
- 内容保持简洁，优先帮助用户把需求说清楚。
- 直接描述用户需求，不擅自补充实现方案。
- 允许记录面向用户的简洁 orchestration 进展，但不要写成长执行日志。

## 命名

- 使用 `req-YYYYMMDD-HHMM-short-topic.md`

## 建议结构

- `用户需求`
- `当前进展`
- `待确认`

`待确认` 用于记录 AI 的疑问、需要用户确认的问题，以及需要用户做决定的事项。

`当前进展` 建议固定为四行简洁信息：

- `阶段进度`
- `当前状态`
- `阻塞项`
- `下一步`

## 状态（面向交互）

- `needs-confirmation`：新建或刚修改，必须先给用户确认。
- `confirmed`：用户已明确确认，可作为计划与执行依据。
- `draft`：仅用于尚未整理成可发给用户确认的草稿。

## 生命周期（与 task 文档一致）

在 Metadata 中使用 `Lifecycle disposition`（与 `docs/tasks/_template.md` 同名），与文件所在目录一致：

- `active`：文件位于 `docs/requirements/` 根目录；仍可作为根目录活跃 task 的关联需求。
- `retained-completed`：需求已闭环；文件应位于 `archive/retained-completed/`，保留以便已归档 task 与 provenance 引用。
- `cleanup-candidate`：文件应位于 `archive/cleanup-candidate/`；删除前必须经用户明确确认并全文检索引用。

需求闭环并归档时，将 `Lifecycle disposition` 改为 `retained-completed`（或 `cleanup-candidate`），移动文件到对应目录，并在需求内 `Related tasks` 与各 task 的 `Related requirement` 中**写全归档后的路径**，同步更新 `REQUIREMENT_CENTER.md` 与 `docs/tasks/TASK_CENTER.md` 的相关行。

## 流程

1. 在实质性规划前先创建或定位一个需求文档。
2. 用简洁中文整理出用户需求。
3. 如果文档已可直接发给用户确认，状态设为 `needs-confirmation`。
4. 等用户明确确认或做出决定后，将待确定内容并入用户需求，再改为 `confirmed` 并进入规划或编码。
5. 在关键阶段推进、进入阻塞或即将结束本轮对话前，把简洁的 `当前进展` 同步回该文档。
6. `planner`、`coder`、`code-reviewer` 都要以该文档为准，检查是否偏离用户意图，并保持其面向用户的状态描述同步。
7. **优先归档而非删除**：需求闭环后迁入 `archive/`，并更新所有引用路径。若必须删除，须先检查 `docs/tasks/**/*.md` 与仓库内全文引用；根目录 `task-*.md` 不得绑定已删除或仅存在于 cleanup 候选且未确认清理的需求路径。
8. 维护 `REQUIREMENT_CENTER.md`：新增需求、归档或变更 task 绑定时更新看板，便于与 `TASK_CENTER.md` 对照。

## 确认要求

- 状态不是 `confirmed` 时，先向用户确认，不直接进入规划或编码。
- 如果只是同步 `当前进展`，且用户需求理解没有被改写，文档可保持 `confirmed`。
