# `saifute-wms-server` -> `saifute-wms-server-nestjs` 数据迁移计划

## 1. 文档目标

本计划用于指导 `saifute-wms-server` 旧库迁移到 `saifute-wms-server-nestjs` 新库，结论只基于已经核实的真实信息源，不依赖表名想象或模块命名猜测。

本次分析的证据来源：

- 旧项目配置：`E:/Projects/saifute-wms-server/ruoyi-admin/src/main/resources/application-druid.yml`
- 旧项目建库 SQL：`E:/Projects/saifute-wms-server/ruoyi-admin/src/main/resources/saifute_202600201_1629001.sql`
- 旧项目代码与 Mapper：`E:/Projects/saifute-wms-server/business/...`
- 新项目目标 schema：`prisma/schema.prisma`
- 新项目设计文档：`docs/00-architecture-overview.md`
- 新项目优化表设计：`docs/20-wms-business-flow-and-optimized-schema.md`
- 旧库实时 MySQL：`saifute`
- 新库实时 MySQL：`saifute-wsm`

分析时间：`2026-03-15`

## 2. 当前数据库现状

已确认：

- 旧库 `saifute` 当前共有 `58` 张表。
- 新库 `saifute-wsm` 当前共有 `25` 张表。
- 新库当前 25 张表均为空表，适合按“首批全量导入”设计，不是增量合并场景。
- 旧库同时包含业务表、RuoYi 平台表、Quartz 表、代码生成器表。
- 新库当前只落了主数据、库存核心、业务单据、工作流投影、日志和调度表，没有落 `sys_user`、`sys_role`、`sys_menu`、`sys_dept`、`sys_config`、`sys_dict_*` 等平台表。

新库当前已存在的核心表：

- 主数据：`material_category`、`material`、`customer`、`supplier`、`personnel`、`workshop`
- 库存核心：`inventory_balance`、`inventory_log`、`inventory_source_usage`、`factory_number_reservation`
- 工作流：`workflow_audit_document`
- 入库家族：`stock_in_order`、`stock_in_order_line`
- 客户收发家族：`customer_stock_order`、`customer_stock_order_line`
- 车间物料家族：`workshop_material_order`、`workshop_material_order_line`
- 项目：`project`、`project_material_line`
- 关系表：`document_relation`、`document_line_relation`
- 日志与调度：`sys_job`、`sys_job_log`、`sys_logininfor`、`sys_oper_log`

## 3. 表级映射结论

### 3.1 当前可规划迁移的业务范围

| 业务域 | 旧库来源表 | 实际行数 | 新库目标表 | 当前行数 | 迁移结论 |
| --- | --- | ---: | --- | ---: | --- |
| 物料分类 | `sys_dict_data`(`dict_type='saifute_material_category'`) | 8 | `material_category` | 0 | 需要从旧字典构造新分类表，不能直接从旧业务表复制 |
| 物料 | `saifute_material` | 458 | `material` | 0 | 可迁，但要做字段重命名、分类映射、编码去重 |
| 客户 | `saifute_customer` | 184 | `customer` | 0 | 可迁，但要做字段裁剪、编码去重 |
| 供应商 | `saifute_supplier` | 93 | `supplier` | 0 | 可迁，字段比旧库更收敛 |
| 人员 | `saifute_personnel` | 51 | `personnel` | 0 | 可迁，字段比旧库更收敛 |
| 车间 | `saifute_workshop` | 12 | `workshop` | 0 | 可迁，但旧库没有 `workshopCode`，需要生成 |
| 库存现值 | `saifute_inventory` | 226 | `inventory_balance` | 0 | 不建议直接拷贝，建议重建 |
| 库存流水 | `saifute_inventory_log` | 766 | `inventory_log` | 0 | 不建议直接拷贝，建议重建 |
| 来源追踪 | `saifute_inventory_used` | 226 | `inventory_source_usage` | 0 | 需要转换模型后迁移 |
| 编号区间 | `saifute_interval` | 161 | `factory_number_reservation` 等 | 0 | 旧表语义混合，需按 `order_type` 分流，不能整表直灌 |
| 库存预警 | `saifute_inventory_warning` | 31 | `vw_inventory_warning` | - | 旧库是物理表，新设计是视图，不做表对表迁移 |
| 审核投影 | `saifute_audit_document` | 2 | `workflow_audit_document` | 0 | 可迁，但首批只对最终有效且需要审核的历史单据落表 |
| 验收单 + 生产入库单 | `saifute_inbound_order` + `saifute_into_order` | 138 + 72 | `stock_in_order` | 0 | 两套旧表收敛为一套新表，`orderType` 需由来源表决定 |
| 入库明细 | `saifute_inbound_detail` + `saifute_into_detail` | 258 + 131 | `stock_in_order_line` | 0 | 两套旧表收敛为一套新表 |
| 出库单 + 销售退货单 | `saifute_outbound_order` + `saifute_sales_return_order` | 112 + 10 | `customer_stock_order` | 0 | 两套旧表收敛为一套新表，且必须补 `workshopId` |
| 客户收发明细 | `saifute_outbound_detail` + `saifute_sales_return_detail` | 141 + 14 | `customer_stock_order_line` | 0 | 可迁，但上下游关系不能直接从头表得到 |
| 领料单 + 退料单 + 报废单 | `saifute_pick_order` + `saifute_return_order` + `saifute_scrap_order` | 75 + 3 + 0 | `workshop_material_order` | 0 | 三套旧表收敛为一套新表 |
| 车间物料明细 | `saifute_pick_detail` + `saifute_return_detail` + `saifute_scrap_detail` | 197 + 4 + 0 | `workshop_material_order_line` | 0 | 三套旧表收敛为一套新表 |
| 项目 | `saifute_composite_product` | 5 | `project` | 0 | 可迁，但旧库没有项目编码，需稳定生成 `projectCode` |
| 项目物料明细 | `saifute_product_material` | 138 | `project_material_line` | 0 | 可迁，但字段会明显收敛 |
| 调度 | `sys_job` + `sys_job_log` | 3 + 0 | `sys_job` + `sys_job_log` | 0 + 0 | 后移，需单独补齐枚举值和时间字段映射规则 |
| 日志 | `sys_logininfor` + `sys_oper_log` | 202 + 827 | `sys_logininfor` + `sys_oper_log` | 0 + 0 | 后移，需单独补齐动作类型、时间字段和状态映射规则 |

### 3.2 当前没有目标落点的旧库表

以下旧库表在 `saifute-wsm` 中还没有对应物理表，现阶段不能执行正式迁移：

- 权限与组织：`sys_user`、`sys_role`、`sys_role_dept`、`sys_role_menu`、`sys_user_post`、`sys_user_role`
- 菜单与系统配置：`sys_menu`、`sys_dept`、`sys_config`、`sys_dict_type`、`sys_dict_data`、`sys_post`、`sys_notice`
- 代码生成器：`gen_table`、`gen_table_column`
- Quartz：`qrtz_*`

已确认的旧库平台数据规模：

- `sys_user`：7
- `sys_role`：4
- `sys_menu`：211
- `sys_dept`：10
- `sys_config`：12
- `sys_dict_type`：21
- `sys_dict_data`：78

结论：

- 平台表迁移必须等新库先落对应持久化表结构。
- 本文只把这部分列为“后续批次阻塞项”，不把它们混进当前业务表迁移脚本。

### 3.3 新库新增而旧库没有直接同名表的对象

以下对象是新设计新增的结构，不是旧表改名：

- `material_category`
- `document_relation`
- `document_line_relation`
- `factory_number_reservation`
- `vw_inventory_warning`（设计文档中是视图，不是表）

这些表必须从旧表组合、推导或重建，不能做 `INSERT ... SELECT * ...`。

## 4. 已确认的关键差异与风险

### 4.1 `orderType` 不能从旧数据值直接拿

旧库真实数据中：

- `saifute_inbound_order.inbound_type` 全部为 `NULL`
- `saifute_into_order.into_type` 全部为 `NULL`
- `saifute_sales_return_order.source_id/source_type` 全部为 `NULL`
- `saifute_return_order.source_id/source_type` 全部为 `NULL`

结论：

- 新库 `stock_in_order.orderType` 不能读取旧字段值，只能按来源表固定映射：
  - `saifute_inbound_order` -> `ACCEPTANCE`
  - `saifute_into_order` -> `PRODUCTION_RECEIPT`
- 新库 `customer_stock_order.orderType` 也应按来源表固定映射：
  - `saifute_outbound_order` -> `OUTBOUND`
  - `saifute_sales_return_order` -> `SALES_RETURN`
- 新库 `workshop_material_order.orderType` 同理：
  - `saifute_pick_order` -> `PICK`
  - `saifute_return_order` -> `RETURN`
  - `saifute_scrap_order` -> `SCRAP`

### 4.2 车间维度在旧库中不完整，新库却是核心维度

已确认：

- `saifute_inventory` 没有 `workshop_id`
- `saifute_outbound_order` 没有 `workshop_id`
- `saifute_sales_return_order` 没有 `workshop_id`
- `saifute_composite_product` 没有 `workshop_id`
- `saifute_inbound_order` 虽然有 `workshop_id`，但 `138` 条里有 `23` 条为 `NULL`
- `saifute_pick_order` 虽然有 `workshop_id`，但 `75` 条里有 `10` 条为 `NULL`

而新库要求：

- `inventory_balance` 唯一维度为 `materialId + workshopId`
- `customer_stock_order`、`project`、`factory_number_reservation` 都要求 `workshopId`

结论：

- `docs/20-wms-business-flow-and-optimized-schema.md` 已经冻结了方向：历史上没有明确车间的记录，迁移阶段统一归档到默认车间。
- 首批方案中，默认车间固定为 `WS-LEGACY-DEFAULT / 历史默认车间`，避免迁移脚本再分叉。
- 库存不能按旧 `saifute_inventory` 直接入新 `inventory_balance`，否则会把单维库存强行塞进多维模型。

### 4.3 唯一编码质量不满足新库约束

已确认旧库无空编码，但存在重复编码：

- `saifute_material.material_code` 有 `21` 组重复值
- `saifute_customer.customer_code` 有 `1` 组重复值
- 典型重复样例：
  - `material_code='013'` 出现 3 次
  - `material_code='016'` 出现 2 次
  - `material_code='cp013'` 出现 2 次
  - `customer_code='2'` 出现 2 次

而新库要求：

- `material.materialCode` 唯一
- `customer.customerCode` 唯一
- `supplier.supplierCode` 唯一
- `personnel.personnelCode` 唯一
- `workshop.workshopCode` 唯一

结论：

- 主数据迁移前必须先做编码清洗。
- 旧 `saifute_workshop` 没有 `workshop_code` 字段，新库 `workshop.workshopCode` 需要在迁移阶段生成。
- 旧 `saifute_composite_product` 没有项目编码字段，新库 `project.projectCode` 也需要在迁移阶段生成。

### 4.4 审核状态映射规则已知

已确认：

- 旧库 `saifute_audit_document` 实时数据只有 `2` 条，且两条 `audit_status` 都是 `'2'`
- 旧 Java 实体 `SaifuteAuditDocument` 的注释明确写的是：
  - `0` 未审核
  - `1` 审核通过
  - `2` 审核不通过
- 多个旧 Mapper 在 `LEFT JOIN saifute_audit_document` 时，对缺失审核行统一按 `audit_status='0'` 处理

结论：

- 对已经存在审核行的旧数据，可按以下规则映射：
  - `0` -> `PENDING`
  - `1` -> `APPROVED`
  - `2` -> `REJECTED`
- 对 `inbound`、`outbound`、`workshop-material` 这类需要审核的单据家族：
  - 若旧库缺失审核行且单据最终有效，迁移时补建 `workflow_audit_document`，并回到 `PENDING`
  - 若单据最终作废，迁移时只在业务表 `auditStatusSnapshot` 收口到 `NOT_REQUIRED`，不保留 `workflow_audit_document` 行
- `project` 第一阶段不接 `workflow`，只在业务表 `auditStatusSnapshot` 写 `NOT_REQUIRED`，不写 `workflow_audit_document`

### 4.5 上下游关系不能完全从旧头表回填

已确认：

- `saifute_sales_return_order` 共 `10` 条，`source_id/source_type` 全部为空
- `saifute_return_order` 共 `3` 条，`source_id/source_type` 全部为空
- 旧 `saifute_inventory_used` 的真实关联分布如下：
  - `1 -> 3`：170
  - `2 -> 3`：42
  - `2 -> 8`：8
  - `7 -> 3`：5
  - `7 -> 8`：1

结论：

- `saifute_inventory_used` 可以作为重建新 `inventory_source_usage` 的输入证据，但不能直接一对一回填，因为新表依赖 `sourceLogId`
- 旧 `saifute_inventory_used.no_use_qty` 语义是“来源单据剩余可用量”，不是新表 `releasedQty`
- `document_relation`、`document_line_relation` 不能只依赖旧头表 `source_id/source_type`
- 退料单、销售退货单的上下游关系如果业务要求强还原，需要额外回查明细、库存使用记录，甚至保留人工补录清单
- 对已成功补建的关系：
  - 下游单据最终有效 -> `document_relation.isActive = true`
  - 下游单据最终作废 -> `document_relation.isActive = false`
- `migration_staging.pending_relations` 只是待处理队列，不是最终落点；切换前必须清零，剩余无法补齐的记录统一转入 `migration_staging.archived_relations`，并同步进入 `migration_staging.excluded_documents`
- 对销售退货单、退料单：
  - 只有“上游关系可恢复，且行内 `sourceDocumentType/sourceDocumentId/sourceDocumentLineId` 可补齐”的记录，才允许进入正式业务表
  - 无法恢复上游关系的记录，整单及其明细统一转入 `migration_staging.excluded_documents`，不参与首批库存重放
- `migration_staging.excluded_documents` 不是默认可忽略清单；若切换前非空，必须取得业务签收，否则不能 cutover

### 4.6 旧字段存在语义丢失风险

以下旧字段当前在新 schema 中没有直接同名落点：

- `saifute_composite_product.classification`
- `saifute_composite_product.salesman`
- `saifute_composite_product.out_bound_date`
- `saifute_product_material.acceptance_date`
- `saifute_product_material.supplier_id`
- `saifute_product_material.tax_included_price`
- `saifute_product_material.instruction`
- `saifute_change_record.old_value/new_value/change_reason`

已确认：

- `saifute_composite_product` 共 `5` 条，`classification` 5 条非空，`salesman` 5 条非空，`out_bound_date` 2 条非空
- `saifute_product_material` 共 `138` 条，`acceptance_date` 134 条非空，`supplier_id` 137 条非空，`unit` 138 条非空，`tax_included_price` 65 条非空，`instruction` 1 条非空
- `saifute_change_record` 当前 0 条

结论：

- `saifute_product_material.unit` 有明确目标落点，应迁入 `project_material_line.unitCodeSnapshot`
- `saifute_product_material.unit_price` 有明确目标落点，应迁入 `project_material_line.unitPrice`
- `project_material_line.amount` 应按最终采用的单价口径计算生成
- `project.bizDate` 有明确来源，应优先使用旧 `order_date`；仅当历史脏数据缺失 `order_date` 时，再回退到 `out_bound_date` 或 `create_time`
- 项目迁移前需要明确这批头字段和行字段是进入 `remark`、补充字段、单独归档表，还是接受舍弃
- `saifute_change_record` 当前无数据，可先归档 SQL，不急于建目标表

### 4.7 旧库存存在孤儿数据

已确认：

- 旧库 `saifute_inventory` 存在 `1` 条 `material_id IS NULL` 的记录
- 新库 `inventory_balance.materialId` 为必填外键

结论：

- 这类孤儿库存记录不能直接进入新库
- 迁移前必须输出异常数据清单，并由业务决定是补物料、归档，还是舍弃

### 4.8 旧单据类型代码和区间语义必须在计划里写明

旧 SQL 注释已经给出通用单据代码：

- `1`：验收单
- `2`：入库单 / 生产入库单
- `3`：领料单
- `4`：出库单
- `5`：退料单
- `6`：报废单
- `7`：退货单 / 销售退货单
- `8`：旧注释在不同表里写法不完全一致，`saifute_interval` 注释写“复合产品”，`saifute_inventory_used` 注释写“项目”；迁移计划统一按新 `project` 域处理

`saifute_interval` 当前实时分布只有三类：

- `2`：74
- `4`：82
- `7`：5

其中 `order_type=7` 的 `5` 条记录只对应 `3` 条销售退货明细，且 `detail_id=35` 一条明细下存在 `3` 段区间。

结论：

- `order_type=4` 的区间最接近新 `factory_number_reservation` 语义，且新表天然支持同一单据行落多段区间
- `order_type=7` 的区间不能默认写入 `customer_stock_order_line.startNumber/endNumber`，因为新表只有一组区间字段，无法无损承接“单明细多段区间”
- `order_type=2` 来自生产入库侧，当前新 schema 没有与之完全对等的区间承接表
- 首批迁移采取单一规则：
  - `order_type=4` 的记录全部进入 `factory_number_reservation`
  - 只有“单明细单区间”的 `order_type=4` 记录才同步回填 `customer_stock_order_line.startNumber/endNumber`
  - “单明细多区间”的 `order_type=4` 记录保留 line 字段为空，但不排除整单
  - `order_type IN (2, 7)` 一律进入 `migration_staging.archived_intervals`
- 因此 `saifute_interval` 必须分流迁移，不能把总量 `161` 直接当成 `factory_number_reservation` 的验收目标

### 4.9 历史单据号在旧库中并不唯一

已确认旧库存在单号重复：

- `saifute_inbound_order` 有 2 组重复：`YS20260103011`、`YS20260117004`
- `saifute_into_order` 有 1 组重复：`RK20260302001`
- `saifute_pick_order` 有 3 组重复：`LL20260106001`、`LL20260113001`、`LL20260115001`

其中：

- `YS20260103011`、`YS20260117004` 是“作废后沿用原单号重开”的样式：各有一条 `del_flag='2'` 和一条 `del_flag='0'`
- `RK20260302001` 两条都为 `del_flag='2'`
- `LL20260106001`、`LL20260113001`、`LL20260115001` 的重复记录当前都还是 `del_flag='0'`

结论：

- 新库 `stock_in_order.documentNo`、`customer_stock_order.documentNo`、`workshop_material_order.documentNo` 都有唯一约束，不能直接照搬这批历史单号
- 迁移前必须先定义历史冲突单号的处理规则：只保留一条、历史重编号、还是迁入归档表
- 由于旧库里已经存在“重复且仍有效”的领料单号，不能假设“只保留最终有效单据”就能自动解决全部冲突

### 4.10 主数据停用语义和非核心字段不能静默丢失

已确认旧主数据存在停用记录：

- `saifute_material` 有 `44` 条 `del_flag='2'`
- `saifute_customer` 有 `2` 条 `del_flag='2'`
- `saifute_supplier` 有 `3` 条 `del_flag='2'`
- `saifute_personnel` 有 `5` 条 `del_flag='2'`
- `saifute_workshop` 有 `4` 条 `del_flag='2'`

并且这些停用记录的 `void_description` 都有值。

同时，旧主数据中至少还有以下真实业务字段在新 schema 没有直接承接列：

- `saifute_personnel.type`：51 条非空
- `saifute_customer.contact_person`：50 条非空
- `saifute_supplier.contact_person`：8 条非空
- `saifute_workshop.contact_person`：12 条非空
- `saifute_workshop.charge_by`：7 条非空

结合旧表结构，以下字段也应视为同类“无直接承接位”风险字段：

- `saifute_customer.contact_phone`
- `saifute_customer.address`
- `saifute_customer.customer_short_name`
- `saifute_customer.customer_type`
- `saifute_supplier.contact_phone`
- `saifute_supplier.address`
- `saifute_supplier.supplier_short_name`
- `saifute_personnel.contact_phone`
- `saifute_personnel.name_pinyin`
- 各主数据表的 `void_description`

结论：

- 主数据迁移时应明确执行：
  - `del_flag='0'` -> `status=ACTIVE`
  - `del_flag='2'` -> `status=DISABLED`
- `void_description` 以及上述无直接承接位的主数据字段，必须进入归档结构、扩目标 schema，或由业务明确签收允许舍弃
- 不能因为主数据在新模型里被“收敛”了，就把旧联系人、类型、作废原因等字段静默丢弃

### 4.11 迁移脚本需要统一使用目标常量

为避免不同脚本写出不一致的类型值，迁移计划统一约定以下目标常量：

`workflow_audit_document.documentType`、`inventory_log.businessDocumentType`、`inventory_source_usage.consumerDocumentType`、`document_relation.upstreamDocumentType/downstreamDocumentType`、`document_line_relation.upstreamDocumentType/downstreamDocumentType`、`factory_number_reservation.businessDocumentType` 统一使用当前 NestJS 聚合级字符串：

- 入库家族（验收单、生产入库单） -> `StockInOrder`
- 客户收发家族（出库单、销售退货单） -> `CustomerStockOrder`
- 车间物料家族（领料单、退料单、报废单） -> `WorkshopMaterialOrder`
- 项目 -> `Project`

来源差异继续通过 `orderType` 与 `operationType` 区分，不再把 `documentType` / `businessDocumentType` 再次拆裂。

`inventory_log.businessModule` 统一使用当前实现中的模块字符串：

- 入库家族 -> `inbound`
- 客户收发家族 -> `outbound`
- 车间物料家族 -> `workshop-material`
- 项目 -> `project`

`workflow_audit_document.documentFamily`、`document_relation.upstreamFamily/downstreamFamily`、`document_line_relation.upstreamFamily/downstreamFamily` 统一使用：

- `StockInOrder` -> `STOCK_IN`
- `CustomerStockOrder` -> `CUSTOMER_STOCK`
- `WorkshopMaterialOrder` -> `WORKSHOP_MATERIAL`
- `Project` -> `PROJECT`

`inventory_log.operationType` 统一使用：

- `saifute_inbound_order` -> `ACCEPTANCE_IN`
- `saifute_into_order` -> `PRODUCTION_RECEIPT_IN`
- `saifute_outbound_order` -> `OUTBOUND_OUT`
- `saifute_sales_return_order` -> `SALES_RETURN_IN`
- `saifute_pick_order` -> `PICK_OUT`
- `saifute_return_order` -> `RETURN_IN`
- `saifute_scrap_order` -> `SCRAP_OUT`
- `saifute_composite_product` -> `PROJECT_CONSUMPTION_OUT`
- 为作废补建的逆向流水统一使用 `REVERSAL_IN` / `REVERSAL_OUT`

`document_relation.relationType` 与 `document_line_relation.relationType` 统一使用：

- 销售退货引用出库 -> `SALES_RETURN_FROM_OUTBOUND`
- 退料引用领料 -> `WORKSHOP_RETURN_FROM_PICK`
- 作废逆操作引用原单 / 原流水 -> `REVERSAL_REFERENCE`
- 来源追踪或可追溯引用 -> `TRACEABILITY_REFERENCE`

## 5. 迁移策略

### 5.1 总体策略

本次迁移分三类处理：

1. 字段归一化迁移型
   - 主数据

2. 结构重建型
   - `inventory_balance`
   - `inventory_log`
   - `inventory_source_usage`
   - `factory_number_reservation`
   - `workflow_audit_document`
   - `document_relation`
   - `document_line_relation`

3. 暂缓型
   - `sys_user` / `sys_role` / `sys_menu` / `sys_dept` / `sys_config` / `sys_dict_*`
   - `sys_post` / `sys_notice`
   - `sys_job` / `sys_job_log`
   - `sys_logininfor` / `sys_oper_log`
   - `gen_*`
   - `qrtz_*`

### 5.2 不在目标业务表中保留旧 ID 的前提下，必须引入映射表

因为新 schema 没有为每张业务表保留 `legacyId` 字段，迁移过程建议引入独立暂存 schema，例如 `migration_staging`，至少包含：

- `map_material`
- `map_customer`
- `map_supplier`
- `map_personnel`
- `map_workshop`
- `map_stock_in_order`
- `map_stock_in_order_line`
- `map_customer_stock_order`
- `map_customer_stock_order_line`
- `map_workshop_material_order`
- `map_workshop_material_order_line`
- `map_project`
- `map_project_material_line`

每张映射表至少记录：

- `legacy_table`
- `legacy_id`
- `target_table`
- `target_id`
- `migrated_at`
- `migration_batch`

### 5.3 首批快速落地路线（推荐）

这条路线的目标不是“一次性迁完所有历史语义”，而是：

- 用最小改动接住当前 `schema` 和当前 NestJS 运行时
- 尽快形成一条可 cutover 的正式业务链路
- 把不确定、会和现有实现冲突的数据显式隔离到 staging，而不是硬塞进正式表

快速落地原则：

- `数据适配现有实现，不反向改代码`
- `先闭环，后完整`
- `确定性优先`
- `模糊数据不硬塞`
- `库存只重放，不直拷`
- `excluded_documents` 非空必须签收，不能默认上线

首批正式纳入范围：

- `material_category`
- `material`、`customer`、`supplier`、`personnel`、`workshop`
- `stock_in_order` / `stock_in_order_line`
- `customer_stock_order` / `customer_stock_order_line`
- `workshop_material_order` / `workshop_material_order_line`
- `project` / `project_material_line`
- 可恢复的 `document_relation` / `document_line_relation`
- `order_type=4` 的 `factory_number_reservation`
- 基于正式业务表重放得到的 `inventory_balance` / `inventory_log` / `inventory_source_usage`
- 仅对最终有效且需要审核的历史单据补 `workflow_audit_document`

首批明确排除或后移：

- `sys_user`、`sys_role`、`sys_menu`、`sys_dept`、`sys_config`、`sys_dict_*`
- `sys_job`、`sys_job_log`、`sys_logininfor`、`sys_oper_log`
- `gen_*`、`qrtz_*`
- 旧 `saifute_inventory`、`saifute_inventory_log` 的直接复制
- `saifute_interval.order_type IN (2, 7)` 的首批正式落库
- 上游关系无法恢复的销售退货单、退料单
- 无直接落点的主数据/项目遗留字段

与当前实现保持一致的冻结规则：

- `documentType` / `businessDocumentType` / `consumerDocumentType` 统一使用当前聚合级字符串：
  - `StockInOrder`
  - `CustomerStockOrder`
  - `WorkshopMaterialOrder`
  - `Project`
- `businessModule` 统一使用当前模块字符串：
  - `inbound`
  - `outbound`
  - `workshop-material`
  - `project`
- `project` 第一阶段不补 `workflow_audit_document`
- 作废后保留在正式业务表的库存型单据，业务表状态统一收口到：
  - `lifecycleStatus=VOIDED`
  - `inventoryEffectStatus=REVERSED`
  - `auditStatusSnapshot=NOT_REQUIRED`
- 销售退货单、退料单只有在“关系表可恢复 + 行内来源字段可补齐”时才允许进入正式业务表
- `factory_number_reservation` 首批只使用当前运行时真实消费的状态：
  - `RESERVED`
  - `RELEASED`
- `customer_stock_order_line.startNumber/endNumber` 只在“单明细单区间”时回填；多段区间以 `factory_number_reservation` 为准

首批执行顺序：

1. 冻结默认车间、冲突单号、金额口径、排除清单和 staging 结构。
2. 清洗主数据编码并导入主数据。
3. 导入正式业务表允许纳入的四类单据家族。
4. 恢复可确定的关系和 `order_type=4` 编号区间。
5. 基于正式业务表重放库存，生成 `inventory_balance`、`inventory_log`、`inventory_source_usage`。
6. 仅为最终有效且需要审核的历史单据补 `workflow_audit_document`。
7. 完成对账、签收和 cutover。

首批 cutover 门槛：

- `migration_staging.pending_relations = 0`
- `migration_staging.excluded_documents` 若非空，已有业务签收
- 主数据唯一键冲突已清零
- 正式业务表唯一单号冲突已清零
- 库存对账通过“首批实际纳入重放范围”的口径
- `order_type IN (2, 7)` 区间和遗留字段已进入 staging 归档结构
- 审核投影、关系表、库存表与当前运行时常量一致

## 6. 推荐迁移批次

### 批次 0：迁移前冻结与基线采集

执行项：

- 备份旧库 `saifute`
- 备份新库 `saifute-wsm`
- 导出旧新两库 `information_schema` 快照
- 清空并重建 `migration_staging`
- 输出旧库关键表行数基线
- 明确停机窗口或只读窗口

批次 0 固定输出的迁移配置：

- 默认车间统一创建或复用为：
  - `workshopCode = WS-LEGACY-DEFAULT`
  - `workshopName = 历史默认车间`
- 所有缺失车间维度的历史记录统一归到该默认车间
- 历史冲突单号统一按确定性重编号处理：
  - 在同一目标家族内，按 `CASE WHEN del_flag='0' THEN 0 ELSE 1 END, legacy_id` 排序
  - 排名第 `1` 的记录保留原单号
  - 其余记录改写为 `<原单号>-LEGACY-<legacy_id>`
- 销售退货、退料中 `source_id/source_type` 为空且无法可靠反推的记录，先进入 `migration_staging.pending_relations`；切换前若仍未补齐，则转入 `migration_staging.archived_relations` 与 `migration_staging.excluded_documents`
- 销售退货单、退料单只有在上游关系可恢复时，才允许进入正式业务表
- 主数据遗留字段、项目遗留字段统一进入 `migration_staging.archived_field_payload`
- 无法进入首批业务表的历史编号区间统一进入 `migration_staging.archived_intervals`
- 项目行金额默认使用旧 `unit_price` 口径：
  - `unitPrice = unit_price`
  - `amount = quantity * unit_price`
  - `tax_included_price` 归档，不静默覆盖 `unitPrice`

### 批次 1：主数据与分类

迁移顺序：

1. `sys_dict_data(dict_type='saifute_material_category')` -> `material_category`
2. `saifute_workshop` -> `workshop`
3. `saifute_supplier` -> `supplier`
4. `saifute_personnel` -> `personnel`
5. `saifute_customer` -> `customer`
6. `saifute_material` -> `material`

执行规则：

- `material_category.categoryCode` 可直接使用旧 `dict_value`
- `material.category` 先按旧字典值映射到新 `categoryId`
- 先处理重复编码，再导入 `material` 与 `customer`
- `workshop.workshopCode` 需要生成稳定编码，禁止每次迁移随机生成；建议格式：`WS-LEGACY-<workshop_id>`
- 缺少原始编码的目标字段必须统一使用“固定前缀 + 旧主键”的确定性生成规则
- 主数据状态按旧停用语义落库：
  - `del_flag='0'` -> `status=ACTIVE`
  - `del_flag='2'` -> `status=DISABLED`
- 主数据 `void_description` 和无直接承接位的联系人/类型字段，必须同步进入归档结构或扩表清单

### 批次 2：单据主表与明细表

按新模型家族收敛导入：

- `saifute_inbound_order` + `saifute_into_order` -> `stock_in_order`
- `saifute_inbound_detail` + `saifute_into_detail` -> `stock_in_order_line`
- `saifute_outbound_order` + “关系可恢复的” `saifute_sales_return_order` -> `customer_stock_order`
- `saifute_outbound_detail` + “关系可恢复的” `saifute_sales_return_detail` -> `customer_stock_order_line`
- `saifute_pick_order` + “关系可恢复的” `saifute_return_order` + `saifute_scrap_order` -> `workshop_material_order`
- `saifute_pick_detail` + `saifute_return_detail` + `saifute_scrap_detail` -> `workshop_material_order_line`
- `saifute_composite_product` -> `project`
- `saifute_product_material` -> `project_material_line`

执行规则：

- `project.projectCode` 旧库没有来源列，需稳定生成；建议格式：`PRJ-LEGACY-<product_id>`
- 先在 staging 侧统一产出 `legacyBizDate`：
  - `saifute_inbound_order` -> `inbound_date`
  - `saifute_into_order` -> `into_date`
  - `saifute_outbound_order` -> `outbound_date`
  - `saifute_sales_return_order` -> `return_date`
  - `saifute_pick_order` -> `pick_date`
  - `saifute_return_order` -> `return_date`
  - `saifute_scrap_order` -> `scrap_date`
  - `saifute_composite_product` -> `order_date`
- `project.bizDate` 统一取旧 `order_date`；仅当历史异常缺失时，才回退到 `out_bound_date`，最后回退到 `create_time`
- `orderType` 一律按来源表确定，不读旧 `*_type` 空字段
- `del_flag` 只能为 `lifecycleStatus` 提供作废/有效线索，不能单独推导 `auditStatusSnapshot` 与 `inventoryEffectStatus`
- 对库存型历史单据，建议按最终库存结果落新状态：
  - `del_flag='0'` -> `lifecycleStatus=EFFECTIVE` 且 `inventoryEffectStatus=POSTED`
  - `del_flag='2'` -> `lifecycleStatus=VOIDED` 且 `inventoryEffectStatus=REVERSED`
  - `auditStatusSnapshot` 单独按审核表或缺失审核行补建规则处理
- 对 `documentNo` 冲突的历史单据，必须先执行既定单号策略，再写入目标表；若采用重编号，必须在 `remark` 或迁移映射表中保留原单号
- 对销售退货单、退料单，只有在上游关系和行内来源字段都能恢复时，才允许进入正式业务表；否则整单进入 `migration_staging.excluded_documents`
- `*_line.lineNo` 必须按稳定规则生成，建议统一使用：
  - 先按父单分组
  - 再按旧明细主键升序排序
  - 用 `ROW_NUMBER()` 从 `1` 开始生成 `lineNo`
- 单据表头与明细都要同步生成映射表记录
- 旧表的 `remark`、`void_description`、操作者字段优先保留到新表对应字段

### 批次 3：关系表与编号区间

处理对象：

- `saifute_interval` -> `factory_number_reservation`
- 旧头表与明细表组合 -> `document_relation`、`document_line_relation`

执行规则：

- `saifute_interval.order_type=4` 的记录全部允许迁入 `factory_number_reservation`
- 仅当某条出库明细恰好命中一段区间时，才同步回填 `customer_stock_order_line.startNumber/endNumber`
- 出库明细若命中多段区间，保留 line 上的 `startNumber/endNumber` 为空，但 reservation 逐段落表
- `saifute_interval.order_type IN (2, 7)` 的记录首批一律进入 `migration_staging.archived_intervals`，不直接写入业务表
- `factory_number_reservation` 第一批只迁“状态可判定”的区间：
  - 来源于 `order_type=4` 且源出库单最终有效 -> `status=RESERVED`
  - 来源于 `order_type=4` 且源出库单最终作废，或存在可靠释放证据 -> `status=RELEASED`
  - 第一批不写入 `REVERSED`，以保持与当前运行时状态语义一致
- `factory_number_reservation` 时间字段统一取值：
  - `reservedAt = COALESCE(source_order.create_time, source_order.legacyBizDate)`
  - `releasedAt` 仅对 `RELEASED` 记录赋值，优先取 `update_time`，其次取相关释放单 `create_time`
- `factory_number_reservation` 还需要补 `materialId`、`workshopId`、`businessDocumentType`、`businessDocumentId`、`businessDocumentLineId`
- `document_relation` 和 `document_line_relation` 优先使用可核实的旧字段，必要时再辅以 `inventory_used`
- 对已补建的关系：
  - 下游最终有效 -> `isActive=true`
  - 下游最终作废 -> `isActive=false`
- 对于 `source_id/source_type` 为空且无法可靠反推的记录，生成“人工复核清单”，不要静默造关系
- `migration_staging.pending_relations` 在切换前必须清零；无法清零的记录统一转入 `migration_staging.archived_relations`

### 批次 4：库存核心重建

不建议直接迁移：

- `saifute_inventory`
- `saifute_inventory_log`

建议方案：

1. 先完成主数据迁移，并明确历史单据保留范围、作废单保留策略、冲突单号策略
2. 对所有“纳入目标业务表”的历史库存型单据按稳定顺序重放库存事件
3. 重放每一条库存事件时，先按 `materialId + workshopId` `upsert inventory_balance` 并拿到 `balanceId`
4. 基于该 `balanceId` 写入新 `inventory_log`
5. 对最终作废但仍保留在目标业务表的单据，补建成对的原始流水与逆向流水，并在单据表落 `inventoryEffectStatus=REVERSED`
6. 基于新 `inventory_log` 重建 `inventory_source_usage`
7. `inventory_balance` 在重放过程中增量维护，最终值以最后一次重放结果为准
8. 用旧 `saifute_inventory.current_qty` 做对账，而不是做直接拷贝来源

稳定顺序建议：

- 表头按 `legacyBizDate` -> `create_time` -> 旧表主键升序
- 明细按“表头稳定顺序” -> 旧明细主键升序
- 若同一时刻需要补建逆向流水，先写原始流水，再写逆向流水

- `inventory_source_usage` 重建规则：

- `sourceLogId` 通过“来源单据类型 + 来源单据ID + 来源明细ID + `reversalOfLogId IS NULL`”在新 `inventory_log` 中回查得到
- 若仍存在多个候选，只选最早的原始正向流水，不允许绑定逆向流水
- `consumerDocumentType` 统一使用第 4.11 节的聚合级字符串
- 在真正写入新表前，先按唯一键 `(consumerDocumentType, consumerLineId, sourceLogId)` 聚合旧记录
- `allocatedQty` 取同一唯一键下 `use_qty` 的合计值
- `releasedQty` 不直接取旧 `no_use_qty`，而是在重放退料、销售退货、作废逆向事件时累计计算
- `status` 按重建结果统一落值：
  - `releasedQty = 0` -> `ALLOCATED`
  - `0 < releasedQty < allocatedQty` -> `PARTIALLY_RELEASED`
  - `releasedQty >= allocatedQty` -> `RELEASED`

这样做的原因：

- 旧库存没有 `workshopId`
- 旧流水没有 `direction`
- 旧流水没有 `businessModule`
- 旧流水没有 `businessDocumentNumber`
- 旧流水没有 `idempotencyKey`
- 旧流水没有 `reversalOfLogId`

### 批次 5：工作流；日志与调度后移

处理对象：

- `saifute_audit_document` -> `workflow_audit_document`

执行规则：

- `inbound`、`outbound`、`workshop-material` 的最终有效单据，缺失审核行时补建 `workflow_audit_document` 并回到 `PENDING`
- `project` 第一阶段不补 `workflow_audit_document`，只在业务表保留 `auditStatusSnapshot=NOT_REQUIRED`
- 历史已作废单据若仍保留在目标业务表，只在业务表收口 `auditStatusSnapshot=NOT_REQUIRED`，不保留 `workflow_audit_document`
- `sys_job`、`sys_job_log`、`sys_logininfor`、`sys_oper_log` 不纳入首批业务迁移脚本，待字段级映射文档补齐后再执行

### 批次 6：平台表后续迁移

仅在新库先补齐目标表后才能执行：

- `sys_user`
- `sys_role`
- `sys_menu`
- `sys_dept`
- `sys_config`
- `sys_dict_type`
- `sys_dict_data`
- 以及所有关联关系表

当前阶段只建议：

- 保留旧库原表
- 形成字段映射草案
- 等 `rbac`、`auth`、`session` 的持久化设计定版后再落迁移

## 7. 验证与对账

每个批次完成后至少执行以下核验：

### 7.1 计数核验

- 按迁移规则归一化后的“可迁记录数”与新行数一致
- 被判定为重复编码、空关系、孤儿库存、人工复核项的记录必须单独出报表
- 目标库所有唯一编码无重复

### 7.2 业务核验

- `stock_in_order.documentNo` 唯一
- `customer_stock_order.documentNo` 唯一
- `workshop_material_order.documentNo` 唯一
- `project.projectCode` 唯一
- 关键快照字段不为空

### 7.3 库存核验

- 通过 `map_material` 或清洗后的稳定业务键聚合，对比“首批实际纳入库存重放范围的历史单据”所应得到的期望库存与新 `SUM(inventory_balance.quantityOnHand)`
- 原始旧表 `saifute_inventory.current_qty` 只作为参考基线；若存在 `excluded_documents`，必须先扣除这些被排除历史单据的影响，再参与正式对账
- `material_id IS NULL` 的孤儿库存记录必须单独核验，不能并入正常对账
- 对于补了默认车间的记录，单独输出差异清单
- `inventory_source_usage` 的累计分配量与旧 `saifute_inventory_used.use_qty` 做抽样核对

### 7.4 关系核验

- `factory_number_reservation` 数量只与被判定可迁入该表的 `saifute_interval` 子集对齐，不与总量 `161` 机械对齐
- `saifute_interval.order_type IN (2, 7)` 的记录必须全部进入 `migration_staging.archived_intervals`
- `saifute_interval.order_type=4` 中的多区间明细必须逐段落到 `factory_number_reservation`
- 销售退货、退料关系中无法自动还原的记录全部进入人工清单，不允许漏报
- `migration_staging.pending_relations` 在切换前必须为 `0`
- `migration_staging.archived_relations` 必须保存未决关系的原始主键、原始类型、原始明细键和归档原因
- 已作废下游对应的 `document_relation.isActive` / `document_line_relation` 派生有效性必须为 `false`
- 无法恢复上游关系的销售退货单、退料单必须全部进入 `migration_staging.excluded_documents`
- `migration_staging.excluded_documents` 若非空，必须附带业务签收记录；无签收不得 cutover

## 8. 当前最重要的阻塞项

在开始写正式迁移脚本前，必须先完成以下准备动作：

1. 创建默认车间 `WS-LEGACY-DEFAULT / 历史默认车间` 并冻结其使用范围。
2. 产出主数据编码清洗结果，至少解决 `material_code` 的 21 组重复和 `customer_code` 的 1 组重复。
3. 生成历史冲突单号重编号清单，并写入迁移映射表。
4. 创建 `migration_staging.map_*` 映射表，以及 `pending_relations`、`archived_relations`、`archived_field_payload`、`archived_intervals`、`excluded_documents` 五类承接结构。

5. 若 `migration_staging.excluded_documents` 非空，取得业务签收后才能 cutover；无签收则本批迁移不允许上线。

### 8.1 首批落地清单

- [x] 建 `migration_staging` 承接结构，并已落地当前已执行批次所需映射表：`map_material_category`、`map_workshop`、`map_supplier`、`map_personnel`、`map_customer`、`map_material`、`map_stock_in_order`、`map_stock_in_order_line`，以及 5 类承接结构：`pending_relations`、`archived_relations`、`archived_field_payload`、`archived_intervals`、`excluded_documents`
- [x] 固定默认车间：`WS-LEGACY-DEFAULT / 历史默认车间`
- [x] 输出主数据编码清洗结果，处理 `material_code`、`customer_code` 冲突（已通过 `batch1-master-data` 的 dry-run / execute / validate 报告固化）
- [x] 输出历史冲突单号重编号表，并冻结重编号规则（已完成 `stock_in_order` 家族；其余事务家族待续）
- [x] 先导入 `material_category` 与 5 类主数据，再导入事务单据（已完成 `stock_in_order` / `stock_in_order_line`）
- [ ] 销售退货单、退料单先做“上游关系可恢复 + 行内 `sourceDocumentType/sourceDocumentId/sourceDocumentLineId` 可补齐”筛选，不可恢复整单转入 `excluded_documents`
- [ ] 只恢复可确定的 `document_relation` / `document_line_relation`
- [ ] 只把 `order_type=4` 区间写入 `factory_number_reservation`
- [ ] 只在“单明细单区间”时回填 `customer_stock_order_line.startNumber/endNumber`
- [ ] 基于正式业务表重放库存，不直接拷贝 `saifute_inventory` / `saifute_inventory_log`
- [ ] `inventory_source_usage` 写入前按 `(consumerDocumentType, consumerLineId, sourceLogId)` 聚合
- [ ] 只给最终有效且需要审核的历史单据补 `workflow_audit_document`
- [ ] `pending_relations = 0`
- [ ] `excluded_documents` 若非空，取得业务签收
- [ ] 完成库存、关系、唯一键、快照字段和 cutover 门槛核验

此外，`sys_job`、`sys_job_log`、`sys_logininfor`、`sys_oper_log` 当前不纳入首批业务迁移；如果要迁，必须先补单独的字段级映射文档。

## 9. 结论

基于当前真实库表差异，迁移不能按“旧表重命名到新表”的思路执行，而应按以下原则落地：

- 主数据可以迁，但必须先清洗编码并补分类/车间编码。
- 单据可以迁，但要按新家族表收敛，`orderType` 由来源表而不是旧字段决定。
- 库存核心必须重建，不应直接搬旧库存表和旧流水表。
- 审核投影可以迁，但只对最终有效且需要审核的历史单据落 `workflow_audit_document`。
- 平台表当前无目标落点，只能后移。

换句话说，当前最稳妥的路线是：

`主数据清洗 -> 单据家族迁移 -> 关系与编号回填 -> 库存重建 -> 审核与日志迁移 -> 平台表后移`
