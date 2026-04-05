# 需求文档说明

`docs/requirements/` 是本项目面向用户的需求真源，负责定义"系统要做什么、不做什么"。执行计划与验收记录不在此目录，统一写在 `docs/tasks/*.md`。

## 目录布局与职责

```text
docs/requirements/
├── README.md                 ← 本文件；使用指南
├── PROJECT_REQUIREMENTS.md   ← 项目级业务总纲
├── REQUIREMENT_CENTER.md     ← 条目级需求全景看板
└── domain/
    ├── _template.md          ← domain 文档模板
    └── *.md                  ← 各领域需求真源
```

## 文档说明

### `PROJECT_REQUIREMENTS.md`

项目级业务总纲，记录长期稳定、跨主题持续生效的内容。

- **写什么**：项目背景与业务现状、建设目标、全局业务规则（单据与审核、仓储与库存模型、来源与成本、组织与权限）、领域地图、管理输出范围。
- **不写什么**：单个主题的完整流程、状态机、字段设计、任务执行细节。

### `REQUIREMENT_CENTER.md`

条目级需求全景看板，提供所有需求条目的统一追踪视图。

- **写什么**：每条需求的 REQ 编号、摘要、来源、归属领域、功能项编号、当前状态、关联任务；顶部统计汇总。
- **不写什么**：需求正文、详细验收标准、执行进展。
- **设计目的**：打开一个文件就能回答"什么完成了、什么没完成、什么在进行中"。

### `domain/*.md`

某个长期业务领域的 PRD。

- **写什么**：该领域的业务边界、角色、场景、流程、单据与数据、状态与规则、查询与报表、权限与数据隔离、功能项清单与验收标准。
- **不写什么**：单次交付进展、执行日志、实现细节、技术方案。
- **怎么写**：参照 `domain/_template.md`，按业务事实组织，不按技术模块反推需求。

## 需求收集与分发流程

需求从对话进入体系，经 AI 分析后归档到文档中：

```
对话 / Draft（讨论、头脑风暴、澄清需求）
      ↓ 需求明确后 AI 归档
REQUIREMENT_CENTER.md（新增条目行）+ domain/*.md（写入详细规格）
      ↓ 拆任务执行
docs/tasks/task-*.md
      ↓ 完成回写
REQUIREMENT_CENTER.md（更新状态）+ domain/*.md（更新功能项状态）
```

### AI 分发决策树

```
收到一条需求
  │
  ├─ 是长期业务规则 / 约束？
  │   ├─ 跨多个 domain → 写入 PROJECT_REQUIREMENTS.md
  │   └─ 属于某个 domain → 写入对应 domain/*.md 的对应章节
  │
  ├─ 是某个 domain 的新功能需求？
  │   ├─ 该 domain 文档已存在 → 追加到功能项清单 + REQUIREMENT_CENTER 新增行
  │   └─ 该 domain 文档不存在 → 先创建骨架，再写入
  │
  ├─ 是一次性任务（bug fix / 紧急调整）？
  │   └─ 不进入 domain，直接建议开 task-*.md
  │
  ├─ 已被现有需求覆盖？
  │   └─ 告知用户已有覆盖，标注位置
  │
  └─ 信息不足，无法判断？
      └─ 在对话中向用户追问，明确后再归档
```

### 归档操作清单

AI 将需求归档时，需同步完成：

1. `REQUIREMENT_CENTER.md` — 在对应领域分组追加条目行，分配下一个 REQ 编号
2. `domain/*.md` — 在功能项清单追加 F 编号行，补充验收标准
3. `REQUIREMENT_CENTER.md` — 更新顶部统计数字

### 状态回写

task 验收通过后，需同步完成：

1. `domain/*.md` — 更新功能项状态与关联任务链接
2. `REQUIREMENT_CENTER.md` — 更新对应条目状态列与关联任务列，刷新统计数字

## 功能项状态流转

```
🔍 待确认 → 📋 未开始 → 🔧 进行中 → ✅ 已完成
                                    → ⚠️ conditionally-accepted
```

- `🔍 待确认`：信息不足或需要用户确认归属
- `📋 未开始`：已明确，等待排期
- `🔧 进行中`：已开 task，正在执行
- `✅ 已完成`：task 验收通过
- `⚠️ conditionally-accepted`：有条件通过，标注阻塞项

## 跨文档协作流程

1. 确认对应 `domain/*.md` 已有明确的业务边界、功能项和验收标准。
2. 新开任务时，从功能项清单中挑选本次要交付的 `1～3` 项，创建 `docs/tasks/task-YYYYMMDD-HHMM-*.md`。
3. 在 task Metadata 中填写 `Related requirement: docs/requirements/domain/*.md (Fx)`，确保 task 能回链到对应功能项。
4. 交付完成后，回写 domain 功能项状态、任务链接，以及 `REQUIREMENT_CENTER.md` 对应条目状态。
