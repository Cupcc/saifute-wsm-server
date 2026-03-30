# Schema Matrix

## 核心原则

- 真实库存持久化轴从 `workshopId` 迁向 `stockScopeId`
- `workshopId` 仅在确有归属 / 核算语义的表中保留
- 不在 `Phase 2` 首波里把需求扩成通用多仓平台

## 首波纳入范围

| 区域 | 当前 Prisma 状态 | Phase 2 目标 | 推荐处理 |
| --- | --- | --- | --- |
| `inventory_balance` | `materialId + workshopId` 唯一 | `materialId + stockScopeId` 唯一 | `schema expand` 后按日志/事实重建余额 |
| `inventory_log` | 记录 `workshopId` | 记录 `stockScopeId`，保留逆操作链 | 受控回填，严查 `reversalOfLogId` / `idempotencyKey` |
| `inventory_source_usage` | 通过 `sourceLogId` 间接挂在旧轴 | 与新日志轴保持一致 | 以日志回填结果为前提做 relation verification |
| `factory_number_reservation` | 挂 `workshopId` | 与真实库存轴对齐 | 受控回填并校验唯一约束 |
| `stock_in_order` | 表头只有 `workshopId` | 表头补 `stockScopeId`，`workshopId` 保留归属 | 首波纳入 |
| `customer_stock_order` | 表头只有 `workshopId` | 表头补 `stockScopeId` | 首波纳入 |
| `workshop_material_order` | 表头只有 `workshopId` | 表头补 `stockScopeId`，`workshopId` 保留归属/核算 | 首波纳入 |
| `project` | 表头只有 `workshopId` | 至少在物料消耗语义上补 `stockScopeId` | 首波纳入，但需决定表头/行级落点 |

## 暂不纳入首波

| 区域 | 当前状态 | 暂缓原因 |
| --- | --- | --- |
| `rd_handoff_order` / `rd_handoff_order_line` | 仍是 workshop-shaped | 先压低首波爆炸半径，待 rehearsal 证明是否必须同波纳入 |
| `rd_procurement_request` / `rd_procurement_request_line` | 仍是 workshop-shaped | 与 RD 状态链、主仓验收联动耦合较深 |
| `rd_stocktake_order` / `rd_stocktake_order_line` | 仍是 workshop-shaped | 牵涉盘点/调整与库存日志关系，建议二波评估 |

## 关键待定点

- `StockScope` 主档表/模型的最终结构与 canonical seed 方式
- `project` 是表头补 `stockScopeId` 还是只在行级补
- `inventory_log` 是否保留对旧 `workshopId` 的兼容列用于过渡核对
- raw SQL / 报表查询是同波重写，还是先 shadow 验证后切换
