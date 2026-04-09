# 入库错价后部分已出库的调价方案

**version**: v1.0 | **domain**: 入库 / 库存核心 / 销售出库 | **status**: 探索中

## 简介

这篇文档用于解决这样一类问题：某次入库的成本单价录错了，但这批库存已经被部分出库或领用，系统不能再通过直接修改原入库单价的方式纠正数据。文档的目标是给出一套“历史不改、未来可继续流转、成本差异可审计”的调价方案，避免同时破坏既有出库成本快照、FIFO 来源链路和后续库存可解释性。

## 问题定义

当前项目已经把 FIFO 成本来源收口到：

- `stock_in_order_line` 记录业务入库行
- `inventory_log` 的 `IN` 流水记录真实可分配来源和不可变成本快照
- `inventory_source_usage` 记录消费行对来源流水的占用

因此，“入库单价写错，但该来源已经部分出库”不是简单的修改 `stock_in_order_line.unitPrice` 问题，而是：

1. 原入库来源流水的成本快照写错了
2. 其中一部分已经被下游消费行引用
3. 剩余未消费部分还会继续参与 FIFO

如果直接改原入库行或原 `inventory_log.unitCost`，会同时破坏：

- 已发生消费的历史成本证据
- `inventory_source_usage -> sourceLogId` 的审计链
- 后续 FIFO 的可解释性

结论：

- 已有下游占用时，禁止直接修改原入库单价和原来源流水成本
- 必须通过“调价单 + 补偿型库存流水”处理

## 与当前项目的映射

结合现有实现，建议统一使用下面的术语：

- 原始业务入库行：`stock_in_order_line`
- 原始来源流水：`inventory_log` 中的 `ACCEPTANCE_IN` / `PRODUCTION_RECEIPT_IN`
- 已出库数量：原始来源流水已被 `inventory_source_usage` 净占用的数量
- 剩余数量：原始来源流水 `changeQty - sum(allocatedQty - releasedQty)`

也就是说，项目里真正参与 FIFO 的“来源”不是 `stock_in_order_line`，而是 `inventory_log.id`。

## 推荐设计

### 1. 新增专用调价单据，不复用原入库单修改

建议新增一个专用业务单据，例如：

- 表头：`stock_in_price_correction_order`
- 明细：`stock_in_price_correction_order_line`

不建议直接塞进 `stock_in_order`，原因是这个动作不是普通入库：

- 总库存数量不变
- 需要同时产生一笔内部 OUT 和一笔内部 IN
- 需要保留“原来源流水”和“新来源流水”的映射
- 需要单独沉淀“已出部分成本差异”

### 2. 新增两种库存操作类型

建议在 `InventoryOperationType` 增加：

- `PRICE_CORRECTION_OUT`
- `PRICE_CORRECTION_IN`

用途：

- `PRICE_CORRECTION_OUT`：把原来源流水中尚未消费的剩余数量转出
- `PRICE_CORRECTION_IN`：按正确单价重新转入，形成新的 FIFO 来源流水

同时将 `PRICE_CORRECTION_IN` 纳入 `FIFO_SOURCE_OPERATION_TYPES`，让它能成为后续出库的真实来源。

### 3. 不改历史，只新增补偿记录

对“部分已出库”的场景，调价单审核通过后应做两件事：

1. 处理剩余数量
2. 记录已出部分差异

这里的关键不是“把原入库单剩余改成 0”这句话本身，而是：

- 原来源流水不再对后续出库开放可用量
- 同数量改由新建的调价转入流水承担后续来源角色

在项目数据结构里，这表现为：

- 原 `sourceLogId` 被补一笔内部占用，剩余可用量归零
- 新生成一个 `PRICE_CORRECTION_IN` 的 `inventory_log.id`
- 后续出库的 `inventory_source_usage.sourceLogId` 指向新的调价转入流水

## 单据模型草案

### 表头建议

`stock_in_price_correction_order`

- `id`
- `documentNo`
- `bizDate`
- `stockScopeId`
- `workshopId`
- `lifecycleStatus`
- `auditStatusSnapshot`
- `inventoryEffectStatus`
- `totalLineCount`
- `totalHistoricalDiffAmount`
- `remark`
- `createdBy`
- `createdAt`
- `updatedBy`
- `updatedAt`

### 明细建议

`stock_in_price_correction_order_line`

- `id`
- `orderId`
- `lineNo`
- `materialId`
- `sourceStockInOrderId`
- `sourceStockInOrderLineId`
- `sourceInventoryLogId`
- `sourceDocumentNoSnapshot`
- `sourceBizDateSnapshot`
- `wrongUnitCost`
- `correctUnitCost`
- `sourceInQty`
- `consumedQtyAtCorrection`
- `remainingQtyAtCorrection`
- `historicalDiffAmount`
- `generatedOutLogId`
- `generatedInLogId`
- `remark`
- `createdBy`
- `createdAt`
- `updatedBy`
- `updatedAt`

说明：

- `wrongUnitCost` 记录原来源流水上的错误成本
- `correctUnitCost` 记录本次确认后的正确成本
- `historicalDiffAmount = (correctUnitCost - wrongUnitCost) * consumedQtyAtCorrection`
- `remainingQtyAtCorrection` 不允许手输，应在审核时重新计算
- `generatedOutLogId` 和 `generatedInLogId` 用于把调价单与库存流水闭环

## 审核过账规则

### 1. 前置校验

调价单提交或审核时必须校验：

- `sourceInventoryLogId` 必须存在，且是合法 FIFO 来源类型
- 原来源流水未被逆操作
- 物料、库存范围、车间与原来源一致
- `correctUnitCost > 0`
- 不允许对同一原来源流水存在多张未作废、未完成的调价单

### 2. 审核时重算事实数量

不要使用制单时缓存值直接过账，审核时必须重新锁定并计算：

- `sourceInQty = sourceLog.changeQty`
- `consumedQtyAtCorrection = sum(allocatedQty - releasedQty)`
- `remainingQtyAtCorrection = sourceInQty - consumedQtyAtCorrection`

这里的 `consumedQtyAtCorrection` 包含：

- 销售出库
- 车间领料
- 项目领用
- RD 交接后被继续消耗的占用

只要它们在 `inventory_source_usage` 里占用了这个 `sourceLogId`，都视为已消费。

### 3. 剩余数量的库存动作

当 `remainingQtyAtCorrection > 0` 时，审核过账执行以下动作：

1. 创建一条 `PRICE_CORRECTION_OUT` 的 `inventory_log`
2. 该 OUT 流水数量等于 `remainingQtyAtCorrection`
3. 针对这条调价 OUT 行，调用现有来源分配逻辑，强制从 `sourceInventoryLogId` 分配同数量
4. 创建一条 `PRICE_CORRECTION_IN` 的 `inventory_log`
5. 该 IN 流水数量同样等于 `remainingQtyAtCorrection`
6. `PRICE_CORRECTION_IN.unitCost = correctUnitCost`
7. `PRICE_CORRECTION_IN.costAmount = remainingQtyAtCorrection * correctUnitCost`

结果：

- `inventory_balance.quantityOnHand` 先减后加，净变化为 0
- 原来源流水的可用数量被内部转移吃完
- 新调价 IN 流水成为后续 FIFO 的可用来源

### 4. 已出部分的处理

已出部分不做库存数量动作，不改已有 `inventory_source_usage`。

只在调价单明细上记录：

- `consumedQtyAtCorrection`
- `historicalDiffAmount`

这部分代表：

- 历史消费时按错价结转
- 本次确认后应补记或冲回的成本差额

V1 不建议回写历史消费行的 `costUnitPrice / costAmount`，避免把既有审计事实静默改写。

## 后续出库追踪规则

调价后，追踪规则必须非常明确：

- 调价前已经发生的消费行，继续追原 `sourceInventoryLogId`
- 调价后新发生的消费行，追新生成的 `generatedInLogId`

也就是：

- 历史不改
- 未来切换来源

具体在项目里表现为：

- 调价前的消费行，其 `inventory_source_usage.sourceLogId = 原来源流水 id`
- 调价后的消费行，其 `inventory_source_usage.sourceLogId = PRICE_CORRECTION_IN 流水 id`

如果需要继续追到最初入库业务行，则通过调价单明细反查：

`consumer line -> inventory_source_usage.sourceLogId -> PRICE_CORRECTION_IN -> stock_in_price_correction_order_line.sourceStockInOrderLineId`

因此，后续出库首先追踪“调价生成的新来源流水”，再通过调价单追到“原入库单行”。

## 为什么不能直接改 `stock_in_order_line`

`stock_in_order_line.unitPrice` 是原始业务录入事实。

一旦对应来源已经被消费，直接改它会产生两个问题：

1. UI 看起来像原来就录对了，丢失差错证据
2. 原来源流水及其下游消费链的成本解释会与当时实际过账结果不一致

建议规则：

- 未被任何来源占用的入库行，仍允许走现有“修改入库单 -> reverseStock + repost”路径
- 只要存在任意下游来源占用，禁止直接修改原入库价格，必须改走调价单

## 对现有查询和报表的影响

### 1. 价格层库存查询

现有“按来源流水聚合价格层库存”的查询需要把 `PRICE_CORRECTION_IN` 视为有效来源，把 `PRICE_CORRECTION_OUT` 视为普通消耗。

这样调价后：

- 错价来源流水不再显示剩余可用量
- 正确价格的来源流水会显示新的可用量

### 2. 出库追溯查询

现有追溯查询如果只展示 `sourceLogId`，还不够。

建议补一个读模型，把以下信息串起来：

- 当前被追踪到的来源流水 id
- 来源流水的操作类型
- 如果是 `PRICE_CORRECTION_IN`，展示对应调价单号
- 调价单关联的原入库单号、原入库行号、错价、正价

### 3. 成本差异报表

V1 可以只新增一张调价差异列表：

- 调价单号
- 物料
- 原入库单号
- 错误单价
- 正确单价
- 已出数量
- 历史差异金额
- 剩余数量
- 调价后新来源流水 id

这张表已经足够支撑月底核对。

## 推荐实现顺序

### V1

- 新增调价单主从表
- 新增 `PRICE_CORRECTION_OUT / IN`
- 调价单审核时生成一出一入两条库存流水
- 后续 FIFO 可从调价转入流水继续消耗
- 调价单明细记录历史差异金额
- 查询面补充调价追溯信息

### V2

- 把历史差异金额进一步拆到具体消费行
- 增加面向财务/月报的差异汇总报表
- 如果后续真的需要，可以引入“成本更正凭证”读模型，但不建议在 V1 直接重写历史消费数据

## 当前结论

对于本项目，最稳妥且与现有 FIFO 设计一致的方案是：

- 不直接改 `stock_in_order_line.unitPrice`
- 不直接改历史 `inventory_log.unitCost`
- 用一张“入库调价单”记录差错更正
- 用一笔 `PRICE_CORRECTION_OUT` + 一笔 `PRICE_CORRECTION_IN` 把剩余数量从旧来源切换到新来源
- 已出部分只记差异，不改历史消费链

这样可以同时满足：

- 后续 FIFO 正确
- 历史追溯不被重写
- 审计链完整
- 与当前 `inventory_log + inventory_source_usage` 设计兼容
