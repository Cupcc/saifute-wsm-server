# Rehearsal Plan

## 目标

在真正开启 execution slice 前，把 `Option A` 的切换路径演练成可执行 runbook，确保 cutover 失败时能明确回滚，而不是现场临时决策。

## Rehearsal 分段

### 1. Schema expand rehearsal

- 校验 `StockScope` 主档和 canonical seed
- 校验 `stockScopeId` 新列、外键、索引、唯一键
- 校验 Prisma client 生成与 query contract 变更面

### 2. Data rehearsal

- 产出 `workshop -> stockScope` 映射矩阵
- 重建 `inventory_balance`
- 回填 `inventory_log`
- 校验 `inventory_source_usage`
- 校验 `factory_number_reservation`

### 3. Reconciliation gates

- counts / nulls / duplicate
- `inventory_balance` 总量与分 scope 对账
- `inventory_log.reversalOfLogId` 完整性
- `inventory_source_usage` 与 source log / consumer line 关系完整性
- 单据关系 `document_relation` / `document_line_relation` 完整性

### 4. Runtime smoke gates

- `inventory-core` 列表与日志查询
- `reporting` 首页 / 汇总 / 导出
- `inbound` create / update / void
- `customer` create / update / void
- `workshop-material` create / return / void
- `project` create / update / void

### 5. Test gates

- focused unit/integration tests
- e2e stub / fixture 更新
- `pnpm swagger:metadata`
- `pnpm typecheck`
- `pnpm test`

### 6. Rollback rehearsal

- 维护窗前快照可用性
- 应用版本回退步骤
- 数据恢复耗时是否落在可接受窗口内
- 明确哪些阶段还能 rollback，哪些阶段只能 forward-fix

## 当前建议

- 下一轮先把 `workshop -> stockScope` 映射矩阵与 `inventory_*` 四张核心表的演练 SQL/核验口径补出来
- 在 rollback rehearsal 没落成前，不开启 execution slice
