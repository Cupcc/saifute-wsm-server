# Draft

## 规划主轴

当前已冻结的 baseline：

- 主策略：`Option A`
- 首波范围：`inventory-core + reporting + inbound/customer/workshop-material/project`
- 数据迁移：`inventory_balance` 重建，`inventory_log` / `inventory_source_usage` / `factory_number_reservation` 受控回填校验
- 迁移窗口：短维护窗
- rollback：整库快照 + 应用版本回退

## 待细化清单

### 1. workshop -> stockScope 映射矩阵

- `MAIN` / `RD_SUB` 的 canonical 记录如何进入持久化真源
- 现有 `workshopId` 在各表中分别代表：
  - 真实库存范围
  - 归属 / 核算 workshop
  - 两者混用
- 哪些历史记录需要人工例外判定

### 2. Schema expand 设计

- `StockScope` 主档 / 参考表
- 需要补 `stockScopeId` 的库存核心表
- 需要补或保留 `workshopId` 的业务表
- 索引 / 外键 / unique-key 的切换顺序

### 3. Backfill / replay 设计

- `inventory_balance` 的重建来源与核验口径
- `inventory_log` 的回填规则、保序要求、`reversalOfLogId` 校验
- `inventory_source_usage` 与日志/单据行关系校验
- `factory_number_reservation` 的回填与去重核验

### 4. Validation / rehearsal gate

- schema gate
- data reconciliation gate
- reverse / void smoke gate
- reporting / export gate
- e2e / stub / fixture 迁移 gate

### 5. Rollback gate

- 允许回滚的阶段边界
- 快照恢复演练要求
- 应用版本回退要求
- forward-fix 与 rollback 的分界条件

## 当前建议

- 下一轮优先补 `workshop -> stockScope` 映射矩阵和 schema expand 草案
- 在没有 rehearsal gate 前，不进入执行 slice
