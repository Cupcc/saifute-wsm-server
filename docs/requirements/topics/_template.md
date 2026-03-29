# [主题需求标题]

> 本模板仅用于 `docs/requirements/topics/*.md` 主题级需求文档，不用于固定项目需求文档 `docs/requirements/PROJECT_REQUIREMENTS.md` 或切片需求文档 `docs/requirements/req-*.md`。
>
> 这里只写长期约束、能力清单、阶段路线图和文档关系；不要写单次切片进展、执行日志或 review 记录。

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

| 编号 | 能力 | 验收口径 | 阶段 | 状态 | 关联需求 |
| --- | --- | --- | --- | --- | --- |
| `F1` | [能力名称] | [一句话验收口径] | Phase 1 | `未开始` | `-` |

## 阶段路线图

| 阶段 | 目标 | 当前状态 |
| --- | --- | --- |
| Phase 1 | [阶段目标] | `未开始` |

## 待确认（可选）

- 记录仍需用户确认的长期边界、阶段划分或能力归类。
- 如果没有待确认项，可写 `None`。

## 文档关系（可选）

- 项目级长期背景：`docs/requirements/PROJECT_REQUIREMENTS.md`
- 阶段切片需求：`docs/requirements/req-*.md` 或 `docs/requirements/archive/**/req-*.md`
- 执行与验证：`docs/tasks/*.md` 或 `docs/tasks/archive/**/task-*.md`

主题文档负责“长期分类”，不负责“当前进展”。
新开切片时，应从能力清单中挑出本次要交付的 1-2 项，写入新的 `req-*.md`。
如果某份已归档切片仍是后续工作的关键基线，可在主题文档的 `文档关系` 中明确指出，不必为了统一格式强行删除。
