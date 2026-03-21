# 数据迁移：Java 源库 → NestJS 目标库（全量业务域迁移与切换收口）

## Metadata

- ID: `req-20260321-1100-java-to-nestjs-data-migration`
- Status: `needs-confirmation`
- Lifecycle disposition: `active`
- Owner: `user`
- Related tasks:
  - `docs/tasks/task-20260321-1140-architecture-migration-reference.md`
- Related requirement:
  - `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`（已完成切片的交互真源）

## 用户需求

- 本文档用于承接“Java 源库 `saifute` → NestJS 目标库 `saifute-wsm`”的整体验证、迁移与 cutover 收口，不再只讨论“剩余域”。
- 迁移目标不是把旧库 `58` 张表逐表照搬到新库 `25` 张表，而是按业务域保留仍有经营、库存、追溯价值的业务事实，并在新库找到正确落点。
- 需要明确每个业务域在上线后的处理方式：正式迁入、业务排除并签收、仅保留旧库归档查询，或明确不迁。

### 关键业务口径

- `project` 域：旧 Java 中原 `article`/项目域，对应“项目/工程/组合产品”业务。它记录一个项目主单，以及该项目实际使用或采购的物料明细。该域不是单纯静态 BOM，而是带库存副作用的事务域：项目新增、修改、作废都会影响物料消耗与库存追溯。
- 旧库主表：`saifute_composite_product`。主要描述项目名称、客户、分类、业务日期、业务员、总金额、备注等项目头信息。
- 旧库明细表：`saifute_product_material`。一行代表某个项目下的一种物料明细，包含物料、数量、单价、供应商、验收日期、出厂编号等信息。
- `material_id`：`saifute_product_material` 中指向 `saifute_material.material_id` 的业务主键。它的作用不是“展示名称”，而是唯一确定“到底是哪一个标准物料”，从而把项目明细挂到目标库 `material.id`，并继续关联库存扣减、库存日志、来源追踪、单据关系等语义。
- `material_name` / `specification`：更像名称与规格快照，可用于展示或辅助识别，但不能稳定替代 `material_id` 做正式迁移。
- `product_id`：说明该明细属于哪个项目主单。
- `quantity` / `unit_price` / `tax_included_price`：说明项目中该物料的数量与金额口径。
- `supplier_id` / `acceptance_date` / `interval`：分别表示供应商、验收日期、出厂编号/批次类信息，用于后续追溯。

### 当前全量迁移基线

| 类别 | 业务域 | 当前结论 |
| --- | --- | --- |
| 已完成并有验证证据 | 主数据、入库、基础出库、预留、车间领料、销售退货、车间退料、退货 post-admission | 已有对应 batch、validate 或 cutoverReady 证据，可作为全量迁移已完成部分 |
| 待修复/待决策 | `project` | 旧库 `5` 个项目、`138` 条项目物料明细全部因 `material_id` 缺失被排除，当前未正式迁入 |
| 待确认是否需要迁 | `scrap`（报废） | 源表存在但当前行数为 `0`，仓库暂无迁移脚本，需确认是否纳入范围 |
| 原则上不做表对表迁移 | 平台账号/权限/菜单/日志/调度/代码生成器/旧库存现值流水 | 新库无一一对应落点，或已采用新设计/重放机制处理 |

### `project` 域当前结论

- 来源表：`saifute_composite_product` `5` 行、`saifute_product_material` `138` 行。
- 验证/执行结果：`batch2b-project` 当前 `0` 行迁入，`5` 个项目全部进入 `excluded_documents`。
- 直接原因：项目明细绝大多数 `material_id` 为 `NULL`。例如旧数据里保留了“乳胶管 / 内5*外8 / 50米”这类文本，但没有可稳定落到新库 `material.id` 的主键。
- 业务影响：如果没有 `material_id`，NestJS 侧无法安全写入 `project_material_line.materialId`，也无法继续保证项目物料消耗、库存日志、来源追溯的正确性；因此当前只能整体排除，而不能“凭名称猜物料”强行迁移。
- 结论：`project` 不是不重要，而是当前旧数据主键不完整，导致无法按业务事实安全迁移。

## 当前进展

- 阶段进度: 已完成多数核心业务域迁移，并已补齐一份面向全量范围的 architecture 迁移总览文档；本轮 docs-only rereview 无剩余重要问题。
- 当前状态: `docs/architecture/30-java-to-nestjs-data-migration-reference.md` 已与最新 validate 证据对齐，可作为“旧表作用 -> 新表落点 -> 新表职责”的统一参考；`project`、`scrap`、平台表与全局 cutover 仍按当前状态保留为未决或待签收项。
- 阻塞项: 无新的文档事实性 blocker；业务侧仍有既有未决项，包括 `project` 域 `5` 个项目 / `138` 条明细缺失可用 `material_id`、`excluded_documents` 签收、关系恢复、`inventory_source_usage` 与最终 cutover gate 收口。
- 下一步: 如用户确认当前文档口径无误，再按 `project`、`scrap`、平台表与 cutover 范围继续拆分下一轮 task。

## 待确认

**Q1. `project` 域在上线后要不要保留到 NestJS 新库？**

当前 `project` 域承载的是“项目历史 + 项目物料消耗事实”，不是普通备注数据。请确认业务期望：

- 选项 A：需要保留。则应把 `5` 个历史项目正式迁入 NestJS，前提是补齐 `material_id` 或建立可审计的物料映射规则后重跑 `batch2b-project`。
- 选项 B：不需要保留到新库。则这 `5` 个项目保留在旧库/归档介质查询，新库不落项目历史，但需对 `excluded_documents` 做业务签收，作为 cutover 依据。
- 选项 C：只要项目头，不要物料明细。该选项会丢失库存与物料追溯语义，默认不建议，若确实需要需单独确认接受的数据损失范围。

**Q2. `scrap`（报废）域是否属于本次全量迁移范围？**

当前源表存在，但 dump 中行数为 `0`，且仓库暂无对应迁移切片。

- 选项 A：不纳入本次范围。
- 选项 B：暂不做，等未来出现真实历史数据再补。
- 选项 C：即使当前为 `0` 也要先补齐迁移能力。

**Q3. 平台账号 / 权限 / 菜单 / 日志 / 调度如何处理？**

这些表更多是旧系统平台运行数据，不一定等于业务事实。

- 选项 A：NestJS 新系统重建账号权限，不迁旧平台历史。
- 选项 B：仅保留旧库归档查询，不进入新库业务表。
- 选项 C：其中部分表仍需迁移，请明确表范围与保留目的。

**Q4. 全局 cutover gate 何时推进？**

除域范围外，仍有全局收口项待处理：`excluded_documents` 签收、关系恢复、`inventory_source_usage` 补全、最终库存 / 唯一键 / 快照字段核验。

- 选项 A：先确认 `project` / `scrap` / 平台表范围，再统一推进 cutover 收口。
- 选项 B：范围确认与 cutover 收口并行推进。
- 选项 C：先只处理 `project`，其余收口项后置。
