# Validation Matrix

## 目标

把 `Phase 2` 从“有方向的规划”推进到“有明确验证闸门的 cutover 方案”，避免 execution slice 里边做边补验收标准。

## 1. Schema Validation

| Gate | 验证内容 | 通过标准 |
| --- | --- | --- |
| `schema-expand` | `StockScope` 主档、`stockScopeId` 新列、外键、索引、唯一键 | Prisma schema、migration、DB clone 结果三者一致 |
| `client-regenerate` | Prisma client 生成 | 无生成错误；受影响 repository/query 可编译 |
| `sql-contract` | raw SQL / reporting query contract | 首波查询面全部有明确的新旧字段映射 |

## 2. Data Validation

| Gate | 验证内容 | 通过标准 |
| --- | --- | --- |
| `mapping-coverage` | `workshop -> stockScope` 映射覆盖率 | 首波涉及记录 100% 有映射或进入例外清单 |
| `balance-rebuild` | `inventory_balance` 重建结果 | 物料+scope 粒度余额与预期一致，无重复键 |
| `log-backfill` | `inventory_log` 回填 | `stockScopeId` 覆盖完整，`idempotencyKey` / `reversalOfLogId` 完整 |
| `source-usage-chain` | `inventory_source_usage` 关系链 | 每条 usage 都能关联到有效 source log 与 consumer line |
| `reservation-consistency` | `factory_number_reservation` 回填 | 唯一约束与区间一致性成立 |

## 3. Runtime Validation

| Gate | 验证内容 | 通过标准 |
| --- | --- | --- |
| `inventory-core-smoke` | 余额/日志/编号区间查询与写入口 smoke | 主仓口径正确、无 workshop-shaped 漂移 |
| `reporting-smoke` | 首页、库存汇总、导出 | 查询结果与 cutover 后 schema 对齐 |
| `document-smoke` | `inbound/customer/workshop-material/project` create/update/void/reverse | 首波单据家族行为不回归 |

## 4. Test Validation

| Gate | 验证内容 | 通过标准 |
| --- | --- | --- |
| `focused-tests` | 受影响模块 focused tests | 全绿 |
| `e2e-stub` | `test/prisma-e2e-stub.ts`、fixture、batch e2e | 与新 schema/canonical seed 对齐 |
| `global-gate` | `pnpm swagger:metadata && pnpm typecheck && pnpm test` | 全绿 |

## 5. Rollback Validation

| Gate | 验证内容 | 通过标准 |
| --- | --- | --- |
| `snapshot-recover` | 快照恢复演练 | 恢复耗时落入可接受窗口 |
| `app-rollback` | 应用版本回退演练 | 能回到 cutover 前版本并通过最小 smoke |
| `rollback-threshold` | rollback / forward-fix 分界 | 有清晰书面条件，维护窗内可执行 |

## 当前建议

- 下一轮优先把每个 gate 对应到具体命令、SQL 报告或 smoke 清单
- execution slice 开始前，至少要把 `schema-expand`、`mapping-coverage`、`balance-rebuild`、`snapshot-recover` 这四类 gate 写到可执行级别
