# Mapping Matrix

## 1. Canonical stock scope

| stockScope | 语义 | 运行时现状 | Phase 2 持久化目标 |
| --- | --- | --- | --- |
| `MAIN` | 主仓真实库存范围 | 已是 Phase 1 runtime truth | 成为库存核心与首波单据的正式持久化真源 |
| `RD_SUB` | 研发小仓真实库存范围 | 已是 Phase 1 runtime truth | 先保留在 runtime / 规划层，首波暂不切其持久化表 |

## 2. workshop 语义拆分

| 当前 carrier | 现状问题 | Phase 2 目标 |
| --- | --- | --- |
| `inventory_*` 的 `workshopId` | 同时承载“真实库存在哪”和“业务归属/核算到谁” | 真实库存改挂 `stockScopeId`，`workshopId` 不再进入库存唯一维度 |
| `workshop_material_order.workshopId` | 既像归属车间，又被旧 schema 影射为库存范围 | 保留为归属/核算车间；真实库存轴固定为 `MAIN` |
| `project.workshopId` | 项目归集语义与库存消耗轴混用 | 保留项目归集语义；库存消耗轴走 `stockScopeId` |
| `stock_in_order.workshopId` | 当前既带业务归属，也默认落主仓库存 | 补 `stockScopeId`，`workshopId` 仅保留归属/快照用途 |
| `customer_stock_order.workshopId` | 当前主仓库存轴与业务表字段混用 | 补 `stockScopeId`，避免继续把 `workshopId` 当库存池 |

## 3. 首波表级映射建议

| 表 | 当前库存轴 | 首波推荐目标 | 迁移口径 |
| --- | --- | --- | --- |
| `inventory_balance` | `workshopId` | `stockScopeId` | `replay/rebuild` |
| `inventory_log` | `workshopId` | `stockScopeId` | `backfill + reversal/idempotency verification` |
| `inventory_source_usage` | 间接依赖旧 `sourceLogId` 轴 | 跟随新日志轴 | `backfill + relation verification` |
| `factory_number_reservation` | `workshopId` | `stockScopeId` | `backfill + uniqueness verification` |
| `stock_in_order` | `workshopId` | 新增 `stockScopeId` | `backfill` |
| `customer_stock_order` | `workshopId` | 新增 `stockScopeId` | `backfill` |
| `workshop_material_order` | `workshopId` | 新增 `stockScopeId`，保留 `workshopId` | `backfill` |
| `project` | `workshopId` | 新增 `stockScopeId` 或下沉到行级 | 待执行 slice 定型 |

## 4. 暂缓二波

| 表 | 暂缓原因 | 触发纳入条件 |
| --- | --- | --- |
| `rd_handoff_order` | 涉及主仓/RD 双端语义与交接真源 | rehearsal 证明首波若不纳入会破坏切换一致性 |
| `rd_procurement_request` | 与 RD 状态链和验收联动耦合深 | 需要额外确认采购/验收/状态链的 persistence 设计 |
| `rd_stocktake_order` | 与库存日志和 RD 调整链直接耦合 | 需要单独验证 RD 调整/作废链路 |

## 5. 当前已知未知项

- `project` 更适合表头补 `stockScopeId` 还是行级补 `stockScopeId`
- `inventory_log` 是否保留旧 `workshopId` 兼容列用于短期核对
- `factory_number_reservation` 是否在首波彻底切换，还是先保留双字段过渡
- 首波 cutover 后 `rd-subwarehouse` 的 runtime compatibility 是否需要额外桥接层
