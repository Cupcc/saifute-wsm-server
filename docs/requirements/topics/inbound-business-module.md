# 入库业务模块主题需求

## Metadata

- ID: `topic-inbound-business-module`
- Status: `needs-confirmation`
- Scope: `topic-level`
- Owner: `user`

## 主题定义

- `inbound` 是长期业务主题，解决“验收单、生产入库单如何在统一入库家族下完成准入、过账、修改、作废与查询”的问题。
- 当前范围覆盖 `/inbound/orders` 验收单与 `/inbound/into-orders` 生产入库单，以及它们与 `inventory-core`、审核记录和真实库存范围的约束。
- 本文档保留长期约束、长期业务口径、能力清单和阶段路线图；后续任何入库新增 scope 都应另开 `req-*.md`。

## 长期约束

- `C1` 家族模型统一：验收单与生产入库单共用 `stock_in_order` / `stock_in_order_line`，差异只通过 `orderType`、权限前缀和应用服务入口区分。状态：`生效中`
- `C2` 主仓准入优先：第一阶段验收单与生产入库单默认写入主仓 `MAIN`；RD 采购到货在验收时也先入主仓，再由后续协同过账转入 RD 小仓。状态：`生效中`
- `C3` 库存真源：入库写库存统一调用 `inventory-core.increaseStock()`，任何页面或单据都不能旁路改库存。状态：`生效中`
- `C4` 变更补偿一致：修改必须按明细差量补偿库存并重置审核，作废必须调用 `reverseStock()` 冲回已入库结果。状态：`生效中`
- `C5` 真实库存轴访问：查询、详情、修改、作废等访问控制必须沿真实库存范围 `stockScope` 判断，不能退回旧 `workshopId` 轴。状态：`生效中`
- `C6` 来源层成本语义：同一物料不同入库批次允许存在不同成本层，后续出库、领料、退料必须按来源分配传递成本。状态：`生效中`

## 长期业务口径

### 单据与入口口径

- `/inbound/orders` 对应验收单，`/inbound/into-orders` 对应生产入库单。
- 两类单据共用同一套入库主从表，不再拆成两套独立表结构。

### 库存与作废口径

- 创建单据后写入库存，修改时按明细差量补偿库存，作废时冲回已入库结果。
- 当前真实库存范围下，验收单与生产入库单的默认落点是主仓；涉及 RD 采购到货的验收也先入主仓。

### 访问与扩展口径

- 查询、详情、修改、作废等能力都必须沿真实库存轴收敛，不能只按旧车间归属判断。
- 若未来继续扩展入库上游联动、列表体验或额外业务约束，应在不破坏统一家族模型与库存真源的前提下另开切片推进。

## 能力清单


| 编号   | 能力          | 验收口径                                     | 阶段      | 状态    | 关联需求                                                                                   |
| ---- | ----------- | ---------------------------------------- | ------- | ----- | -------------------------------------------------------------------------------------- |
| `F1` | 统一入库家族模型    | 验收单与生产入库单共用同一套主从表、服务骨架和库存写入路径            | Phase 1 | `已完成` | `-`                                                                                    |
| `F2` | 主仓准入与库存范围约束 | 验收单与生产入库单默认归主仓，RD 到货验收也先入主仓              | Phase 1 | `已完成` | `docs/requirements/archive/retained-completed/req-20260330-2229-inbound-domain-fix.md` |
| `F3` | 真实库存轴访问控制   | 查询、详情、修改、作废按 `stockScope` 判断，且关键路径具备测试覆盖 | Phase 1 | `已完成` | `docs/requirements/archive/retained-completed/req-20260330-2229-inbound-domain-fix.md` |
| `F4` | 后续入库扩展切片承接  | 后续若继续扩展上游联动、校验补强或体验优化，仍以本 topic 约束作为长期真源 | Phase 2 | `未开始` | `-`                                                                                    |


## 阶段路线图


| 阶段      | 目标                                  | 当前状态  |
| ------- | ----------------------------------- | ----- |
| Phase 1 | 收口当前入库家族的统一模型、主仓准入和真实库存轴访问约束        | `已完成` |
| Phase 2 | 基于既有 invariant 继续扩展入库上游联动、校验补强或体验优化 | `待规划` |


## 待确认（可选）

- 是否继续把 topic 范围严格限定在当前 `inbound` 模块内的“验收单 + 生产入库单”，而不吸收客户退货、车间退料等其它回流单据。
- 后续若继续推进 `inbound`，优先级更偏“上游业务联动补强”还是“列表 / 详情 / 编辑流体验完善”。

## 文档关系（可选）

- 项目级长期背景：`docs/requirements/PROJECT_REQUIREMENTS.md`
- 已归档阶段基线：
  - `docs/requirements/archive/retained-completed/req-20260330-2220-inbound-domain-review.md`
  - `docs/requirements/archive/retained-completed/req-20260330-2229-inbound-domain-fix.md`
- 已归档执行与验证：
  - `docs/tasks/archive/retained-completed/task-20260330-2220-inbound-domain-review.md`
  - `docs/tasks/archive/retained-completed/task-20260330-2229-inbound-domain-fix.md`
- 后续继续推进时，应从本 topic 新开 `docs/requirements/req-*.md` 切片。

