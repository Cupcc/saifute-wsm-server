# SQL Reconciliation Outline

> 这里记录对账 SQL 的检查维度与预期，不直接当生产脚本使用。

## 1. Mapping Coverage

目标：

- 首波纳入表里，所有参与库存轴切换的记录都能映射到 `stockScopeId`

建议检查：

- `stockScopeId is null` 的记录数
- 无法从 `workshopId` 推导 canonical scope 的记录数
- 被列入例外清单的记录数

## 2. inventory_balance

目标：

- 新轴下 `materialId + stockScopeId` 唯一，且重建余额与预期一致

建议检查：

- 重建后重复键数量
- 总量对账
- `MAIN` / `RD_SUB` 分 scope 对账
- 负库存异常数量

## 3. inventory_log

目标：

- 日志链在新轴上仍完整，逆操作与幂等语义不被破坏

建议检查：

- `stockScopeId is null`
- `idempotencyKey` 重复
- `reversalOfLogId` 指向不存在原日志
- 同一原日志被多次逆操作
- 日志所属 `balanceId` 与新轴不一致

## 4. inventory_source_usage

目标：

- 来源分配链与新日志轴保持一致

建议检查：

- `sourceLogId` 指向不存在日志
- `sourceLogId` 所属 `stockScopeId` 与 consumer 业务语义不一致
- `releasedQty > allocatedQty`
- 无法关联 consumer line 的 usage

## 5. factory_number_reservation

目标：

- 编号区间在新轴下仍唯一、可追溯

建议检查：

- `stockScopeId is null`
- 同单据行区间重复
- 与业务单据行无法关联的 reservation

## 6. 首波单据主表

目标：

- `stock_in_order` / `customer_stock_order` / `workshop_material_order` / `project` 的新轴与业务归属轴不混淆

建议检查：

- 新增 `stockScopeId` 的空值
- `workshopId` 与 `stockScopeId` 组合违背规则的记录
- `workshop-material` 是否仍全部固定落在 `MAIN`
- `project` 是否存在无法判定真实库存轴的记录

## 7. 关系链

目标：

- cutover 后单据关系仍完整

建议检查：

- `document_relation` 上下游是否仍可找到对应单据
- `document_line_relation` 是否仍可找到对应行
- `sourceDocument*` / `businessDocument*` 是否仍能闭环

## 8. 待 execution slice 补齐

- 每一类检查对应的实际 SQL
- 报告输出格式
- 通过/失败阈值
- 失败后是 rollback 还是 forward-fix 的判定条件
