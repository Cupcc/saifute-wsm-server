# [主题需求标题]

> 本模板仅用于 `docs/requirements/topics/*.md` 主题级需求文档。
>
> 这里只写长期约束、能力清单、阶段路线图和文档关系；不要写单次切片进展、执行日志或 review 记录。
>
> 能力合同信息供 AI 直接创建 `task-*.md`，不再需要中间切片 `req-*.md`。

## Metadata

- ID: `topic-`
- Status: `draft` | `confirmed` | `needs-confirmation`
- Scope: `topic-level`
- Owner:

## 主题定义

- [ ] 用 1-3 条说明这个主题解决什么问题、覆盖哪些业务边界。

## 长期约束

- `C1` [约束名称]：[约束内容]。状态：`生效中`

## 能力清单

| 编号 | 能力 | 验收口径 | 阶段 | 状态 | 关联任务 |
| --- | --- | --- | --- | --- | --- |
| `F1` | [能力名称] | [一句话验收口径] | Phase 1 | `未开始` | `-` |

## 能力合同（推荐）

> 若 topic 要作为 AI 自动派生切片的长期锚点，请至少为每个未完成能力补齐以下合同信息。

### `F1` [能力名称]

- In scope:
- Out of scope / non-goals:
- Completion criteria:
  - `[TC-1]`
  - `[TC-2]`
- Evidence expectation:
- Default derived slice acceptance mode: `none` | `light` | `full`
- AI derivation note:
  - 说明 AI 后续直接创建 `task-*.md` 时默认应选哪一块、哪些边界不能重写。

## 阶段路线图

| 阶段 | 目标 | 当前状态 |
| --- | --- | --- |
| Phase 1 | [阶段目标] | `未开始` |

## 待确认（可选）

- 记录仍需用户确认的长期边界、阶段划分或能力归类。
- 如果没有待确认项，可写 `None`。

## 文档关系（可选）

- 项目级长期背景：`docs/requirements/PROJECT_REQUIREMENTS.md`
- 执行任务：`docs/tasks/*.md` 或 `docs/tasks/archive/**/task-*.md`（Metadata 中 `Related requirement` 指向本 topic `Fx`）
- 执行与验证：`docs/tasks/*.md` 或 `docs/tasks/archive/**/task-*.md`

主题文档负责”长期分类”和”长期合同锚点”，不负责”当前进展”。
新开能力时，从能力清单中挑出本次要交付的 1-2 项，直接创建 `docs/tasks/task-*.md`（在 Metadata 中填 `Related requirement: docs/requirements/topics/*.md (Fx)`）。
能力交付完成后，更新能力清单中对应行的状态与 task 链接。
