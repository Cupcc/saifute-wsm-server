# Java -> NestJS 全量迁移与库存重算参考

## 1. 文档定位

本文档用于说明旧 Java 库 `saifute` 到 `.env.dev` 中 `DATABASE_URL` 指向的 NestJS 目标库的完整迁移链路，包括：

- 清理 / 重建目标库前的备份、门禁和边界确认
- 主数据、业务单据、关系、审核投影、月报快照的全量导入顺序
- 基于已导入单据重算 `inventory_balance`、`inventory_log`、`inventory_source_usage`
- replay 过程中发现的来源链、负库存、错误单据、0 成本、字段语义等修复口径
- `migrated / replayed / archived / excluded / warning` 的 cutover 术语

这是一份迁移参考和执行口径文档，不是逐条命令日志。运行时证据以以下报告为准：

- `scripts/migration/reports/full-import-replay-dry-run-report.md`
- `scripts/migration/reports/full-import-reset-execution-plan.md`
- `scripts/migration/reports/legacy-full-backup-report.md`
- `scripts/migration/reports/*-execute-report.json`
- `scripts/migration/reports/*-validate-report.json`
- `docs/tasks/task-20260509-full-legacy-import-reset-and-replay.md`
- `docs/tasks/archive/retained-completed/task-20260501-construct-correct-price-layer-replay.md`

目标模型真源仍以以下文档为准：

- `docs/architecture/00-architecture-overview.md`
- `docs/architecture/20-wms-database-tables-and-schema.md`
- `docs/architecture/modules/inventory-core.md`
- `docs/requirements/domain/inventory-core-module.md`

## 2. 当前基线

最新执行基线来自 `2026-05-10` 的全量导入与 replay。

| 项 | 当前口径 |
| --- | --- |
| 源库 | `.env.dev` 的 `LEGACY_DATABASE_URL`，旧库 `saifute` |
| 目标库 | `.env.dev` 的 `DATABASE_URL`；库名以当前 env 实际值为准，本轮为 `saifute-wms` |
| 目标 schema | 当前运行时最终 snake_case schema，不再使用 camelCase 迁移中间态 |
| staging | `migration_staging` 已通过 `bootstrap-staging --reset` 初始化，当前 20 张 staging 表 |
| 主链路状态 | 主数据、业务单据、关系修复、月报快照、库存 replay 均已执行 |
| replay gate | `inventory-replay:dry-run` 为 `blockers=[]`，`execute` 已完成，`validate` 无 blocker |
| 剩余事项 | `390` 个最终负库存盘点 warning，需要仓库后续盘点调整 |
| 快照边界 | 旧库在本次快照后继续新增了入库数据，再次全量重跑前必须重新冻结源库或使用本次备份快照 |

旧库源库全量 SQL 备份已完成：

- 备份文件：`scripts/migration/backups/legacy-saifute-full-20260510-111122.sql`
- 文件大小：`5,849,774` bytes
- SHA-256：`1b07a1887991c62d6203d0320877c94bb4c55302a45b6cf200446e804728078b`
- 备份包含 `58` 个 `CREATE TABLE` 和 `46` 组 `INSERT INTO`

注意：源库备份不等于目标库备份。任何生产或正式目标库清理前，仍必须确认目标库自身的可恢复备份或快照。

## 3. 全链路顺序

完整迁移必须按单 writer 顺序执行。目标库清理、schema 重建、staging、业务导入和 replay 都写同一个 `DATABASE_URL`，不能并行写。

| 阶段 | 目标 | 关键门禁 |
| --- | --- | --- |
| 1. 冻结源库和备份 | 固定旧库事实边界 | 记录备份路径、大小、hash；确认后续 validate 是否读快照还是实时旧库 |
| 2. 目标库备份和清理 | 从一致基线开始 | 明确允许覆盖 `DATABASE_URL`；目标库有备份或快照 |
| 3. 重建目标 schema | 使用当前运行时 snake_case schema | `prisma/schema.prisma` 通过 validate；不再生成 camelCase 中间 schema |
| 4. seed 库存范围 | 确保 `MAIN` / `RD_SUB` 可用 | `migration:stock-scope-phase2:execute` 后可 validate |
| 5. 初始化 staging | 建立 `migration_staging` map / archive / pending / excluded 容器 | `migration:bootstrap-staging --reset` 必须在业务导入前完成 |
| 6. 主数据导入 | 建立所有业务外键和 map | `master-data` dry-run 无 blocker，execute 后 validate |
| 7. 业务单据导入 | 导入入库、销售、车间、RD 等正式业务事实 | 每个 slice 必须 execute 后 validate |
| 8. 关系和投影补齐 | 补审核投影、可证明上下游关系、月报快照 | 只写可证明关系，不伪造来源链 |
| 9. 库存 replay | 按已导入单据重算库存余额、流水、来源分配 | dry-run 必须 `blockers=[]`，然后 execute，再 validate |
| 10. 签收和盘点 | 业务确认 warning / excluded / archived | replay warning 不阻塞迁移，但必须成为运营后续事项 |

推荐命令顺序如下。任何一步出现 blocker，都停止后续步骤。

```bash
bun --env-file .env.dev prisma validate --schema prisma/schema.prisma
bun --env-file .env.dev prisma db push --force-reset --schema prisma/schema.prisma

bun run migration:stock-scope-phase2:execute
bun --env-file .env.dev scripts/migration/bootstrap-staging.ts --reset

bun run migration:master-data:dry-run
bun run migration:master-data:execute
bun run migration:master-data:validate

bun run migration:stock-in:execute
bun run migration:stock-in:validate
bun run migration:sales:execute
bun run migration:sales:validate
bun run migration:sales-reservation:execute
bun run migration:sales-reservation:validate
bun run migration:sales-return:execute
bun run migration:sales-return:validate
bun run migration:sales-return-finalize:execute
bun run migration:sales-return-finalize:validate
bun run migration:workshop-pick:execute
bun run migration:workshop-pick:validate
bun run migration:workshop-return:execute
bun run migration:workshop-return:validate
bun run migration:workshop-return-finalize:execute
bun run migration:workshop-return-finalize:validate
bun run migration:return-post-admission:execute
bun run migration:return-post-admission:validate
bun run migration:scrap:execute
bun run migration:scrap:validate
bun run migration:rd-project:execute
bun run migration:rd-project:validate

bun run migration:monthly-reporting-material-category-snapshot:dry-run
bun run migration:monthly-reporting-material-category-snapshot:execute
bun run migration:monthly-reporting-material-category-snapshot:dry-run

bun run migration:stock-scope-phase2:validate

bun run migration:inventory-replay:dry-run
bun run migration:inventory-replay:return-source-links:dry-run
bun run migration:inventory-replay:return-source-links:execute
bun run migration:inventory-replay:dry-run
bun run migration:inventory-replay:execute
bun run migration:inventory-replay:validate
```

说明：

- `return-source-links:execute` 只在 dry-run 选出可证明来源链时执行；执行后必须重新跑 replay dry-run。
- `inventory-replay:execute` 会事务化删除并重建 `inventory_balance`、`inventory_log`、`inventory_source_usage`，不能在 blocker 未清零时执行。
- 如果 validate 脚本重新读取实时旧库，而旧库已经在快照后继续写入，新出现的差异必须按快照边界解释，不能直接推翻本次导入结果。

## 4. 清库和重建口径

### 4.1 为什么必须先清理目标库

`2026-05-09` 清库前只读盘点显示，目标库并不是干净库：

| 项 | 数值 |
| --- | ---: |
| 表数量 | 56 |
| 总行数 | 18,788 |
| 非空表 | 36 |
| `migration_staging` | 不存在 |
| schema 命名 | 已是 snake_case 最终运行时 schema |

这意味着不能直接把旧库导入到现有目标库：

- 业务正式表已有数据，直接 execute 会混入旧批次、测试数据或运行期数据。
- 缺少 `migration_staging`，依赖 `map_*` 的业务 slice 无法建立外键映射。
- 当前脚本没有“从现有正式表反推 staging map”的自动流程。

因此正式全量迁移只有两条路：

1. 清理 / 重建目标库，从旧库快照全量重跑。
2. 另开增量修复方案，先构造现有正式表到 staging map 的恢复流程。

本轮走的是第一条主线。

### 4.2 清理边界

正式清理前必须满足：

- 明确目标是 `.env.dev` 的 `DATABASE_URL`。
- 明确允许覆盖 `.env.dev` 的 `DATABASE_URL` 当前指向的目标库。
- 有目标库可恢复备份或快照。
- 源库快照和目标库备份路径写入报告。
- `master-data` dry-run 无 blocker。

本轮 `2026-05-10` apply 中，已清理目标库残留迁移域数据，并保留运行期基础对象：

| 清理对象 | 行数 |
| --- | ---: |
| `document_line_relation` | 9 |
| `document_relation` | 8 |
| `material_category` | 1 |
| `workshop` | 1 |

同时保留：

- `stock_scope`
- `sys_*` 系统表

如果在生产环境做正式重建，推荐先做完整目标库备份，再使用 `prisma db push --force-reset` 或经审批的 DDL 脚本重建当前 snake_case schema。不要把旧的 camelCase 迁移中间 schema 带回主链路。

## 5. 全量导入结果

### 5.1 主数据

主数据导入建立后续业务单据所需的外键和 `migration_staging.map_*`。

| 实体 | 旧库源数量 | 计划 / 写入数量 | blocker | 说明 |
| --- | ---: | ---: | ---: | --- |
| 物料分类 | 14 | 14 | 0 | 从旧字典拆出业务分类 |
| 车间 | 21 | 21 | 0 | 车间是归属 / 核算维度，不再作为库存范围兜底 |
| 供应商 | 259 | 259 | 0 | 归一化迁入 |
| 人员 | 76 | 76 | 0 | 目标表最终行数可包含系统初始化或非本批迁移行 |
| 客户 | 388 | 388 | 0 | 归一化迁入 |
| 物料 | 1092 | 1092 | 0 | 另有 RD 项目迁移自动补建物料 |

已确认的主数据修复：

- 4 条 inactive 物料缺单位，没有修改旧库，而是在迁移侧用可追溯 override 补齐。
- override 行包括 `cp013`、`zjq045`、`z h`、`zjq60`，均保留 warning 证据。

### 5.2 业务单据和关系

| 迁移 slice | 旧表 | 目标表 | 执行结果 |
| --- | --- | --- | --- |
| `stock-in` | `saifute_inbound_*`、`saifute_into_*` | `stock_in_order`、`stock_in_order_line` | 当前目标保留 `1150` 单、`2072` 行；错误冲红单已确定性排除 |
| `sales` | `saifute_outbound_*` | `sales_stock_order`、`sales_stock_order_line` | 迁入 `497` 单、`638` 行 |
| `sales-reservation` | `saifute_interval` | `factory_number_reservation`、`archived_intervals` | 生成 `426` 条 live reservation，归档 `378` 条非 live 区间 |
| `sales-return` | `saifute_sales_return_*` | `sales_stock_order`、`sales_stock_order_line` | 准入 `37` 单、`46` 行，排除 `7` 个旧头 |
| `workshop-pick` | `saifute_pick_*` | `workshop_material_order`、`workshop_material_order_line` | 迁入 `555` 单、`1816` 行，排除 `15` 单、`42` 行 |
| `workshop-return` | `saifute_return_*` | `workshop_material_order`、`workshop_material_order_line` | 准入 `23` 单、`32` 行；未证明来源先进入 pending，再由 finalize 归档 |
| `workshop-return-finalize` | pending return relations | `archived_relations` | 归档 `30` 条未证明关系，删除对应 pending |
| `return-post-admission` | 已准入退货 / 退料和旧来源线索 | `approval_document`、`document_relation`、`document_line_relation`、临时库存事实 | 插入审核投影、可证明关系和过渡库存事实，为 replay 提供输入 |
| `scrap` | `saifute_scrap_*` | `workshop_material_order`、`workshop_material_order_line` | 源数据为 0，迁移能力和 validate 口径已补齐 |
| `rd-project` | `saifute_composite_product`、`saifute_product_material` | `rd_project`、`rd_project_material_line` | 迁入 `20` 项目、`645` 行，排除 `3` 项目、`83` 行，自动补建 `437` 条物料 |
| `monthly-reporting-material-category-snapshot` | 已迁入入库 / 销售行 | 行表分类快照字段 | 回填 `stock_in_order_line=2072`、`sales_stock_order_line=684`，复跑 dry-run 缺口为 0 |

当前目标库关键行数如下。它是 `2026-05-10` apply 后的目标库状态，不等同于每个 slice 的源库行数。

| 表 | 行数 |
| --- | ---: |
| `material_category` | 14 |
| `workshop` | 18 |
| `supplier` | 259 |
| `personnel` | 152 |
| `customer` | 388 |
| `material` | 1529 |
| `stock_in_order` | 1150 |
| `stock_in_order_line` | 2072 |
| `sales_stock_order` | 534 |
| `sales_stock_order_line` | 684 |
| `factory_number_reservation` | 426 |
| `workshop_material_order` | 578 |
| `workshop_material_order_line` | 1848 |
| `rd_project` | 20 |
| `rd_project_material_line` | 645 |
| `approval_document` | 2166 |
| `document_relation` | 21 |
| `document_line_relation` | 23 |
| `inventory_balance` | 1232 |
| `inventory_log` | 5081 |
| `inventory_source_usage` | 3060 |

## 6. 库存 replay 口径

### 6.1 replay 的含义

这里的 `replay` 不是新业务功能名，而是按历史单据重新过账：

- 入库、生产入库、销售退货、退料等形成库存来源，写入带成本价的 `inventory_log`。
- 出库、领料、报废、RD 项目出库等消耗库存来源，写入 `inventory_source_usage`。
- 剩余未消耗来源按 `material + stockScope + unitCost` 聚合后，就是库存页面看到的价格层。
- `inventory_balance` 是 replay 结果，不是旧 `saifute_inventory` 的直接复制。

价格层真源只有一套：

- 来源层成本来自 `inventory_log.unit_cost`。
- 可用价格层来自 `inventory_source_usage` 对来源的占用 / 释放计算。
- 不新建独立“价格库存余额表”。
- 销售出库 `unitPrice` 是销售价，不是库存成本价；库存价格层使用 `selectedUnitCost` / `costUnitPrice`。
- 车间领料、退料、报废的 `unitPrice / amount` 按内部成本口径处理。

### 6.2 replay 输入和输出

replay 输入来自已经导入目标库的业务单据，而不是旧库库存三张表。

| 旧表 | 目标处理 |
| --- | --- |
| `saifute_inventory` | 不直拷，按导入单据重算 `inventory_balance` |
| `saifute_inventory_log` | 不直拷，按统一业务类型、库存方向、幂等键重建 `inventory_log` |
| `saifute_inventory_used` | 不直拷，按来源流水和消费行重建 `inventory_source_usage` |

`inventory-replay:execute` 会删除旧的库存派生事实并重建：

| 动作 | 数量 |
| --- | ---: |
| 删除旧 `inventory_balance` | 861 |
| 删除旧 `inventory_log` | 4770 |
| 删除旧 `inventory_source_usage` | 14 |
| 写入新 `inventory_balance` | 1232 |
| 写入新 `inventory_log` | 5081 |
| 写入新 `inventory_source_usage` | 3060 |

### 6.3 最新 replay 结果

| 检查 | 结果 |
| --- | ---: |
| `totalEvents` | 5081 |
| `plannedLogs` | 5081 |
| `plannedSourceUsages` | 3060 |
| `plannedBalances` | 1232 |
| `plannedPriceLayers` | 467 |
| dry-run blockers | 0 |
| replay warnings | 2005 |
| validate expected / actual logs | 5081 / 5081 |
| validate expected / actual source usages | 3060 / 3060 |
| validate expected / actual balances | 1232 / 1232 |
| validate balance mismatches | 0 |
| validate plan blockers | 0 |
| accepted stocktake warnings | 390 |

事件分布：

| operation | 数量 |
| --- | ---: |
| `ACCEPTANCE_IN` | 1295 |
| `PRODUCTION_RECEIPT_IN` | 673 |
| `OUTBOUND_OUT` | 615 |
| `SALES_RETURN_IN` | 43 |
| `PICK_OUT` | 1775 |
| `RETURN_IN` | 31 |
| `REVERSAL_OUT` | 6 |
| `RD_PROJECT_OUT` | 643 |

## 7. replay 修复和例外规则

这些规则来自最近的 replay 修复会话，已经体现在迁移脚本、报告和 task 文档中。

| 问题 | 处理口径 |
| --- | --- |
| 缺少来源成本 | 用户确认未知价或赠品可按 `0.00` 形成来源，写 warning 和 note，不作为 blocker |
| 销售价和成本价混用 | 销售 `unitPrice` 不再作为库存成本；成本只信任 `selectedUnitCost`、`costUnitPrice` 或可释放来源 |
| 退货 / 退料无来源链 | 优先回指原出库 / 原领料；可证明候选才写 `source_document_*` 或行级关系 |
| 多来源退料 | 只有可覆盖且可释放时写 `document_line_relation.linked_qty` |
| 无候选但有正成本的车间退料 | 可作为独立 `RETURN_IN` 来源，保留 `STANDALONE_RETURN_SOURCE` warning |
| 无来源销售退货 | 可作为独立销售退货来源，复用现有备注语义，不新增字段，不伪造上游关系 |
| 历史出库 / 领料先于来源 | 在历史迁移阶段允许作为 `UNFUNDED_HISTORICAL_OUT` warning，不再阻塞 replay |
| 后续同物料同范围同成本来源可冲抵 | 允许用于冲掉已接受历史无来源缺口，超过缺口后才形成可用价格层 |
| 负数入库冲红 | 映射为 `REVERSAL_OUT`，只允许受限匹配同物料、同库存范围、同成本的来源 |
| `RK20260306005` / `wg17` | 仓库确认是错误冲红单，已从目标库删除业务行、审批投影、迁移 map 和旧库存流水，并加入 stock-in 确定性排除 |
| 最终负库存 | 不阻塞迁移 replay，作为 `NEGATIVE_FINAL_BALANCE_ACCEPTED_FOR_STOCKTAKE` warning 交给后续盘点调整 |
| `workshop_id=0` | 视为历史“无车间”，replay 归一为 `NULL`，不虚构车间外键 |

这些例外只适用于历史迁移阶段。正式运行期如果要求完全可信 FIFO 成本追溯，仍应遵守先有来源、再出库、禁止负库存的库存核心约束。

## 8. staging、归档和排除

`migration_staging` 是受控迁移层，不是失败垃圾箱。

| 类型 | 作用 |
| --- | --- |
| `map_*` | 保存旧主键到新主键、旧编码到新编码的稳定映射 |
| `archived_field_payload` | 保存旧表中有参考价值但新表没有字段落点的 payload |
| `pending_relations` | 保存当前证据不足、未来可能恢复的关系 |
| `archived_relations` | 保存确认无法进入 live relation 的关系证据 |
| `archived_intervals` | 保存不进入 `factory_number_reservation` 的旧区间 |
| `excluded_documents` | 保存当前不准入正式业务表的旧单据 |

cutover 解释：

- `migrated`：业务事实已进入目标正式表，必要 map 已落地。
- `replayed`：目标表数据由导入后的业务事实重算，不是旧表直拷。
- `archived`：历史证据已保留，但不进入正式业务模型。
- `excluded`：当前不安全准入，进入受控排除清单。
- `warning`：迁移可以继续，但需要业务签收或运营后续处理。

## 9. 旧表到新模型索引

### 9.1 主数据

| 旧表 | 新表 | 方式 |
| --- | --- | --- |
| `sys_dict_data` 中物料分类字典 | `material_category` | 从平台字典拆出业务分类 |
| `saifute_material` | `material` | 字段归一化；RD 项目可补建自动物料 |
| `saifute_customer` | `customer` | 字段归一化 |
| `saifute_supplier` | `supplier` | 字段归一化 |
| `saifute_personnel` | `personnel` | 字段归一化 |
| `saifute_workshop` | `workshop` | 归属 / 核算维度，不作为库存范围 |
| 无稳定旧表 | `stock_scope` | 受控 seed `MAIN` / `RD_SUB` |

### 9.2 业务单据

| 旧表组 | 新表组 | 说明 |
| --- | --- | --- |
| `saifute_inbound_order` + `saifute_inbound_detail` | `stock_in_order` + `stock_in_order_line` | `orderType=ACCEPTANCE` |
| `saifute_into_order` + `saifute_into_detail` | `stock_in_order` + `stock_in_order_line` | `orderType=PRODUCTION_RECEIPT` |
| `saifute_outbound_order` + `saifute_outbound_detail` | `sales_stock_order` + `sales_stock_order_line` | `orderType=OUTBOUND` |
| `saifute_sales_return_order` + `saifute_sales_return_detail` | `sales_stock_order` + `sales_stock_order_line` | `orderType=SALES_RETURN` |
| `saifute_pick_order` + `saifute_pick_detail` | `workshop_material_order` + `workshop_material_order_line` | `orderType=PICK`，领料即已用 |
| `saifute_return_order` + `saifute_return_detail` | `workshop_material_order` + `workshop_material_order_line` | `orderType=RETURN` |
| `saifute_scrap_order` + `saifute_scrap_detail` | `workshop_material_order` + `workshop_material_order_line` | `orderType=SCRAP`，当前源数据为 0 |
| `saifute_composite_product` + `saifute_product_material` | `rd_project` + `rd_project_material_line` | 研发项目和项目物料消耗，不是静态 BOM 复制 |
| `saifute_interval` | `factory_number_reservation` + `archived_intervals` | `order_type=4` 进入 live reservation，其余归档 |

### 9.3 派生事实和关系

| 旧表 / 旧线索 | 新表 | 方式 |
| --- | --- | --- |
| `saifute_inventory` | `inventory_balance` | replay 重算 |
| `saifute_inventory_log` | `inventory_log` | replay 重建不可变库存流水 |
| `saifute_inventory_used` | `inventory_source_usage` | replay 重建来源占用 / 释放 |
| `saifute_audit_document` | `approval_document` | 重建当前有效审核投影 |
| 旧头表 `source_id/source_type`、旧明细线索 | `document_relation`、`document_line_relation` | 只恢复可证明关系 |
| `saifute_inventory_warning` | `vw_inventory_warning` | 新系统按视图计算，不迁旧预警结果表 |
| `saifute_change_record` | 无正式业务表 | 归档或旧库留存 |

### 9.4 平台、日志、调度和代码生成器

| 旧表 | 迁移口径 |
| --- | --- |
| `sys_role`、`sys_menu`、`sys_dept`、`sys_post`、`sys_config`、`sys_notice` 等 | 不纳入本次业务数据迁移，NestJS 侧按新系统初始化 |
| `sys_user` | 不做旧平台整表复制；已通过 `migration:system-users:warehouse-managers:execute` 将确认的 4 个仓库管理员账号迁入当前 `DATABASE_URL` 的规范化 RBAC 表；运行态由 Redis `rbac:system-management:state` 快照承接，源表版本变化时自动刷新 |
| `sys_job`、`sys_job_log` | 目标库保留给 NestJS 运行期，不导入旧平台调度历史 |
| `sys_logininfor`、`sys_oper_log` | 目标库保留给 NestJS 运行期，不导入旧平台日志历史 |
| `qrtz_*` | Quartz 内部状态，不迁 |
| `gen_table`、`gen_table_column` | RuoYi 代码生成器元数据，不迁 |

## 10. 线上 cutover 建议

正式线上迁移不要只照搬本地结果，需要重新走一次可签收链路：

1. 冻结旧系统写入，或明确使用哪一个旧库备份快照。
2. 备份目标库，确认可恢复。
3. 在目标库执行清理 / 重建，使用当前 snake_case schema。
4. seed `stock_scope` 并初始化 `migration_staging`。
5. 按主数据、业务单据、关系投影、月报快照、库存 replay 的顺序执行。
6. 每个 execute 后立即 validate，任何 blocker 停止后续步骤。
7. replay 只在 dry-run `blockers=[]` 时 execute。
8. 业务签收 `excluded_documents`、`archived_*`、`warning`。
9. 对最终负库存 warning 安排仓库盘点调整。盘点调增先补负库存坑，超过 `0` 的部分才形成新的可用价格层。
10. 最后切换 NestJS 新系统写入。回退优先回退流量，不删除已归档迁移证据。

## 11. 当前剩余风险

| 风险 | 说明 |
| --- | --- |
| 最终负库存 warning | 当前 `390` 个 validate warning 均为最终负库存盘点调整项，不阻塞迁移，但需要仓库收口 |
| 源库继续写入 | `2026-05-10` replay 后，实时旧库又新增了 4 张入库单 / 6 行；再次验证必须冻结源库或回到备份快照 |
| 目标库备份 | 源库 SQL 备份已记录，但正式清理目标库仍需要目标库自身备份 / 快照 |
| 浏览器验收 | 本轮是数据库迁移和 replay 验证，未执行独立 browser acceptance |
| 平台初始化 | 旧平台账号、角色、菜单、权限、日志、调度不属于本业务迁移主链路，需要单独初始化和验收 |
| warning 解释 | 历史迁移 warning 不代表正式业务允许长期负库存或无来源出库 |
