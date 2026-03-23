# 需求文档说明

`docs/requirements/**` 用于保存面向用户的需求真源与简洁进展说明。

## 文档职责

- `PROJECT_REQUIREMENTS.md`：只记录项目级、长期稳定、跨任务持续生效的用户需求，以及理解这些需求所必需的项目背景。
- `req-*.md`：只记录单次任务、切片或会话级需求，以及面向用户的简洁 `当前进展`。
- `REQUIREMENT_CENTER.md`：只做索引看板，列出当前有哪些活跃需求、已归档需求和它们的状态。
- `_template.md`：新建 `req-*.md` 时使用的模板。
- `archive/**`：保存已闭环但仍需保留的需求文件，便于 task、review 与历史溯源继续引用。

默认不要混用：

- 项目长期需求，不写进 `req-*.md`。
- 单次任务进展，不写进 `PROJECT_REQUIREMENTS.md`。
- 详细执行计划、验证记录、review 结论，不写进 `docs/requirements/**`，继续放在 `docs/tasks/*.md`。
- 文档机制、归档规则、命名约定，统一写在本 `README.md`，不要分散写进需求正文。

## 目录布局

```text
docs/requirements/
├── PROJECT_REQUIREMENTS.md
├── REQUIREMENT_CENTER.md
├── README.md
├── _template.md
├── req-*.md
└── archive/
    ├── retained-completed/
    └── cleanup-candidate/
```

## 编写要求

- 全文用中文撰写；路径、文件名、metadata 可保留英文。
- 内容保持简洁，优先把用户需求讲清楚。
- 直接描述用户需求与用户可读的当前进展，不擅自展开实现方案。
- `当前进展` 只写关键阶段状态，不写成长执行日志。

## 命名与结构

- 固定项目需求文档使用 `PROJECT_REQUIREMENTS.md`。
- 任务需求文档使用 `req-YYYYMMDD-HHMM-short-topic.md`。
- `req-*.md` 建议固定使用 `用户需求`、`当前进展`、`待确认` 三段。
- `当前进展` 建议固定为 `阶段进度`、`当前状态`、`阻塞项`、`下一步` 四行。

## 状态与生命周期

`Status` 用于表达交互状态：

- `needs-confirmation`：刚创建或刚实质改写，必须先给用户确认。
- `confirmed`：用户已明确确认，可作为后续规划与执行依据。
- `draft`：仅用于尚未整理成可发给用户确认的草稿。

`Lifecycle disposition` 用于表达文件所处阶段，并与文件目录保持一致：

- `active`：文件位于 `docs/requirements/` 根目录，仍参与当前交互或执行。
- `retained-completed`：文件位于 `archive/retained-completed/`，需求已闭环但需保留溯源。
- `cleanup-candidate`：文件位于 `archive/cleanup-candidate/`，后续经用户确认后可删除。

## 使用规则

1. 先判断是否属于轻量直做。若需求清晰、范围很小、低风险、无需 durable handoff，可直接处理，不必强制创建需求或 task 文档。
2. 若不属于轻量直做，先创建或定位一个需求文档，再继续规划或执行。
3. 项目级长期需求写入 `PROJECT_REQUIREMENTS.md`；任务级需求写入 `req-*.md`。
4. 任务需求若尚未获用户确认，`Status` 设为 `needs-confirmation`；确认后改为 `confirmed`。
5. 在关键阶段推进、进入阻塞或准备结束当前回合前，同步简洁 `当前进展`。
6. 需求闭环后优先归档而不是删除；归档时同步更新 `REQUIREMENT_CENTER.md`、相关 task 的 `Related requirement`，以及需求内的 `Related tasks`。

## 与任务文档的关系

- `docs/tasks/*.md` 承接详细执行计划、验证过程、review 结论与运行时上下文。
- 根目录活跃 `task-*.md` 应绑定仍存在且 `Lifecycle disposition = active` 的 `req-*.md`。
- 归档 task 若继续引用 requirement，应改为归档后的完整路径。
