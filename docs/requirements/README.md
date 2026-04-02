# 需求文档说明

`docs/requirements/**` 保存面向用户的需求真源。

## 目录职责

| 路径 | 作用 |
| --- | --- |
| `PROJECT_REQUIREMENTS.md` | 项目级、长期稳定、跨主题持续生效的需求与背景 |
| `topics/*.md` | 某个长期业务主题的约束、能力清单、阶段路线图与能力合同 |
| `REQUIREMENT_CENTER.md` | 需求索引看板 |

不再使用切片 `req-*.md` 文件。需求真源统一维护在 `topics/*.md`；执行计划、验证过程与验收记录写在 `docs/tasks/*.md`。

## 目录布局

```text
docs/requirements/
├── PROJECT_REQUIREMENTS.md
├── REQUIREMENT_CENTER.md
├── README.md
└── topics/
    ├── _template.md
    └── *.md
```

## 怎么写 topic

每个 topic 包含：

- **长期约束**：`C*` 编号，长期生效，不随切片变化。
- **能力清单**：`F*` 编号，每项包含验收口径、阶段、状态、关联 task。
- **能力合同**（可选）：为 AI 自动创建 task 提供 `In scope / Out of scope / Completion criteria / Evidence expectation`。
- **阶段路线图**：当前各阶段状态。

能力状态由 `未开始 → 进行中 → conditionally-accepted / 已完成` 流转，直接在 topic 里更新，不需要另开切片文档。

## 怎么开始一个新能力

1. 确认对应 `topics/*.md` 已有该能力的合同信息（`In scope / Out of scope / Completion criteria`）。
2. 直接创建 `docs/tasks/task-YYYYMMDD-HHMM-*.md`，在 Metadata 中填 `Related requirement: docs/requirements/topics/*.md (Fx)`。
3. 交付完成后，更新 topic 里该能力的状态与关联 task 路径。

## 编写约定

- 全文用中文；路径、文件名、metadata 可保留英文。
- topic 只写长期约束与能力合同，不写当前回合进展。
- 能力合同的验收标准用 `[TC-*]` 或 `[AC-*]` 编号，供 task doc 直接引用。

## 与任务文档的关系

- `docs/tasks/*.md` 承接详细执行计划、验证过程、review 结论与 acceptance 记录。
- `docs/acceptance-tests/**` 承接 full-mode acceptance specs 与 runs。
- task doc 在 Metadata 中用 `Related requirement: docs/requirements/topics/*.md (Fx)` 指向 topic。
