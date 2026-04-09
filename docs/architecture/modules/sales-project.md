# 销售项目模块设计

## 模块目标与职责

目标业务语义上的 `sales-project` 模块应承接“销售项目”主题，而不是 `RD` 内部研发项目。它负责销售项目主档、项目维度库存 / 可供货视图、项目维度发货统计，以及可选项目分配 / 预留能力。

## 当前实现与目标范围

**当前实现**：

- 当前运行时已经把历史 `RD` 内部项目实现收口到 `src/modules/rd-project`，对外接口为 `/rd-projects`，逻辑模型为 `RdProject*`。
- 当前 RD 运行时的物理表已经独立为 `rd_project*`，库存动作类型为 `RD_PROJECT_OUT`，目标类型为 `RD_PROJECT`。
- 因此，当前系统里已经不存在“用 `project` 名称承接 RD 运行时”的代码合同；销售项目仍未独立实现。

**目标范围**（见 `docs/requirements/domain/sales-project-management.md`）：

- 销售项目主档轻量 `CRUD`
- 项目维度库存 / 可供货视图
- 项目关联销售出库与一键生成草稿
- 项目维度发货 / 退货 / 净发货统计
- 可选项目分配 / 预留

目标范围下，销售项目本身不直接过账库存；真实库存减少统一通过 `sales` 出库 / 退货单承接，项目页上的快捷动作也应沉淀为 `sales` 草稿或独立项目分配 / 预留记录。

## 原 Java 来源与映射范围

- `business/src/main/java/com/saifute/article`
- `business/src/main/resources/mapper/article`

> 注意：旧 `article -> project` 的迁移映射主要承接的是历史内部研发项目实现，不应继续反向定义新的销售项目领域边界。

## 领域对象与核心用例

目标核心对象：

- `SalesProject`
- `SalesProjectMaterialView`
- `SalesProjectShipmentLedger`
- `SalesProjectReservation`（可选）

目标核心用例：

- 创建销售项目主档
- 查看项目相关物料的库存 / 可供货 / 已发货情况
- 从项目页按上下文生成销售出库草稿
- 统计项目维度的出库、退货和净发货结果
- 可选地把部分库存分配 / 预留给某项目，再转销售出库

## Controller 接口草案

- `GET /sales-projects`
- `POST /sales-projects`
- `PATCH /sales-projects/:id`
- `POST /sales-projects/:id/void`
- `GET /sales-projects/:id/materials`
- `POST /sales-projects/:id/sales-outbound-draft`
- `POST /sales-projects/:id/reservations`（可选）

## Application 层编排

- `CreateSalesProjectUseCase`
- `UpdateSalesProjectUseCase`
- `VoidSalesProjectUseCase`
- `GetSalesProjectMaterialViewUseCase`
- `CreateSalesProjectSalesOutboundDraftUseCase`
- `CreateSalesProjectReservationUseCase`（可选）

编排要点：

- 销售项目不直接写库存；真实库存动作必须落到 `sales` 或其他真实单据家族。
- 项目页的一键出库本质上是生成 `sales` 出库草稿，而不是直接扣减库存。
- 项目分配 / 预留若启用，必须形成独立记录，不得直接减少 `quantityOnHand`。
- 项目相关统计优先复用 `sales` 出库 / 退货行上的 `salesProjectId` 与项目快照事实，不维护平行发货账。

## Domain 规则与约束

- `sales-project` 专指对外销售的大型项目，不包含 `RD` 内部主题。
- 不引入 `立项 / 暂停 / 关闭` 这类项目管理状态机。
- 项目不是新的物理仓库或库存池。
- 与 `sales` 的跨模块合同必须显式使用 `salesProjectId`、`salesProjectCodeSnapshot`、`salesProjectNameSnapshot` 之类的销售项目命名，不能再复用裸 `projectId`。
- 入库页若提供“分配到项目”的快捷操作，后台必须生成独立项目分配 / 预留记录，而不是直接视为销售出库。
- 当前 `rd-project` 运行时与销售项目严格分域，不能继续复用同一套对象、接口或报表口径。

## Infrastructure 设计

- 销售项目主表、读模型和查询可继续用 Prisma + raw SQL 组合实现。
- 项目统计查询应优先复用 `sales`、`inventory-core`、`master-data` 的稳定读模型。
- 若后续启用项目分配 / 预留，应新增独立表或稳定读写模型，不建议把预留语义写进 `inventory_balance` 主键或直接并入 `sales_stock_order_line`。

## 与其他模块的依赖关系

- 依赖 `sales`：真实销售出库 / 退货、项目维度发货统计
- 依赖 `inventory-core`：库存余额、来源成本、共享查询
- 依赖 `inbound`：真实入库结果与可供货判断
- 依赖 `master-data`：客户、物料、人员等基础数据
- 导出和审计接入 `audit-log`

## 事务边界与一致性要求

- 项目主档写入与引用校验在项目事务内完成。
- 项目分配 / 预留若落地，主记录与状态变更需独立事务提交，并与后续转销售出库的关系可追溯。
- 真实库存和来源分配的一致性继续由 `sales` / `inventory-core` 保证，而不是由项目模块自行维护。

## 权限点、数据权限、审计要求

- 销售项目查询、创建、修改、作废、导出需要独立权限点。
- 项目出库草稿生成、项目分配 / 预留创建 / 释放建议使用独立权限点。
- 查询通常受客户、项目、物料等数据权限影响。
- 项目主档修改、项目分配 / 预留创建 / 释放、项目出库草稿生成都应记录审计。

## 当前缺口 / 迁移注意

- 当前代码实现与目标业务语义仍不一致，不能把现有 `src/modules/rd-project` 视为销售项目已落地。
- 若后续实施销售项目，应新增独立的销售项目模块，而不是回退去借用 `rd-project`。
- 文档必须持续区分“`sales-project` 真源”和“`rd-project` 运行时”。

## 待补测试清单

- 销售项目主档 CRUD 测试
- 项目维度库存 / 可供货查询测试
- 项目上下文生成销售出库草稿测试
- 项目分配 / 预留创建、释放、转出库测试（若启用）

## 暂不实现范围

- 完整项目生命周期管理
- 甘特图 / 任务协同
- 把销售项目直接做成库存写模型
