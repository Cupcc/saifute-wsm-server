# 数据迁移：Java → NestJS

关联需求: `docs/requirements/archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md`
关联任务: `docs/tasks/archive/retained-completed/task-20260323-1530-migration-project-material-resolution-readiness.md`
阶段: 已归档
创建: 2026-03-21
最后更新: 2026-03-25

## 当前状况

Java 旧库（58 张表）向 NestJS 新库（25 张表）的全量业务域迁移已经完成。所有业务域数据搬家已完成，库存重放已执行并通过验证；本 workspace 现转为归档说明入口。

- **所有域数据搬家**: 已完成（含 scrap 迁移能力补齐，源数据 0 行）
- **库存重放**: 已执行 —— 733 条 `inventory_log`、428 行 `inventory_balance` 全部通过验证
- **迁移工作流**: 已归档，保留为结果、决策与切换说明的溯源入口

## 待决策项

→ 详见 [decisions.md](decisions.md#pending)

当前无待决策项。

## 背景与上下文

### 迁移不是照搬

迁移目标不是把旧表逐表复制，而是按业务域保留仍有经营、库存、追溯价值的业务事实，在新库中找到正确落点。库存现值、流水、来源追踪等派生数据通过重放生成，不做直拷。

### Project 域的特殊性

`project` 域不是静态 BOM，而是带库存副作用的事务域。项目物料明细的 `material_id` 决定了库存扣减、日志追溯、来源关联等下游语义，映射错误会导致 BOM 成本失真和库存数据污染。因此采用严格的 deterministic 映射策略，宁可 pending 也不允许 fuzzy matching。

### 当前数据分布

- 旧库 `saifute_composite_product`: 5 行（5 个项目）
- 旧库 `saifute_product_material`: 138 行（项目物料明细）
- 已按现有主数据直接映射: 4 行（含原始 legacy `material_id` 与严格 `名称+规格+单位` 命中）
- 通过自动补建物料后准入: 134 行（归并为 `126` 条 `AUTO_CREATED` 物料）
- Pending: 0 行
- 结构性排除: 0 行

## 关键里程碑

| 时间 | 事件 |
|------|------|
| 03-17 | 基础出库、预留、车间领料迁移完成 |
| 03-19 | 销售退货、车间退料 formal admission 完成 |
| 03-19 | 退货族 shared post-admission 迁移完成 |
| 03-21 | 全量迁移需求确认，project/scrap 纳入范围 |
| 03-23 | project 域三态 admission 实现完成 |
| 03-24 | project 域复审通过，人工确认模板导出 |
| 03-25 | project 域加入自动补建物料规则并完成真实数据重跑 |
| 03-25 | DEC-007 决策选项 A；scrap 迁移能力补齐（dry-run / execute / validate 全通过） |
| 03-25 | 全局库存重放执行完成：733 logs、428 balances、验证 0 blockers |
| 03-25 | 迁移工作流归档 |

## 各域迁移进度

| 域 | 状态 | 说明 |
|----|------|------|
| 主数据 (master-data) | ✅ 完成 | 有验证证据 |
| 入库 (inbound) | ✅ 完成 | 有验证证据 |
| 基础出库 (customer-base) | ✅ 完成 | 有验证证据 |
| 预留 (reservations) | ✅ 完成 | 有验证证据 |
| 车间领料 (workshop-pick) | ✅ 完成 | 有验证证据 |
| 销售退货 (sales-return) | ✅ 完成 | 有验证证据 |
| 车间退料 (workshop-return) | ✅ 完成 | 有验证证据 |
| 退货后处理 (return post-admission) | ✅ 完成 | 有验证证据 |
| 项目/研发 (project) | ✅ 数据迁移完成 | 5 项目 / 138 行已准入 live |
| 报废 (scrap) | ✅ 迁移能力完成 | 源数据 0 行，dry-run / execute / validate 全通过 |
| 库存重放 | ✅ 已执行 | 733 logs、428 balances、验证 0 blockers；230 负余额为缺少期初库存导致 |
| 切换操作说明 | 独立运维步骤 | 如需停旧启新，可按 `inventory-replay-explainer.md` 中的 3 步说明执行；它不再作为“迁移是否完成”的 blocker |

## 本文件夹资产索引

| 文件 | 用途 |
|------|------|
| [decisions.md](decisions.md) | 决策日志（待决 + 已决） |
| [inventory-replay-explainer.md](inventory-replay-explainer.md) | 库存重放是什么、为什么需要，以及如需停旧启新时如何操作 |
| [project-pending-material-explainer.md](project-pending-material-explainer.md) | `project` 域自动补建物料规则、编码规则与当前结果说明 |
| [project-pending-material-template.csv](project-pending-material-template.csv) | 残余 pending 行的人工处理模板；当前真实数据导出结果为空 |
| [project-pending-material-template.json](project-pending-material-template.json) | 模板的 JSON 格式（含指引和统计）；当前真实数据导出结果为空 |

### 迁移脚本索引

| 脚本目录 | 用途 |
|----------|------|
| `scripts/migration/scrap/` | 报废域迁移（dry-run / execute / validate），batch `batch3g-workshop-scrap` |
| `scripts/migration/inventory-replay/` | 全局库存重放（dry-run / execute / validate），batch `batch4-inventory-replay` |
