# Gate Checklist

## A. 决策冻结 Gate

- [x] 主策略已冻结为 `Option A`
- [x] 首波范围已冻结为 `inventory-core + reporting + inbound/customer/workshop-material/project`
- [x] 数据迁移采用混合策略
- [x] 迁移窗口接受短维护窗
- [x] rollback 以整库快照 + 版本回退为主
- [x] workspace 已开启

## B. Schema Gate

- [ ] `StockScope` 主档模型 / migration 设计完成
- [ ] 首波表的 `stockScopeId` 新列、外键、索引、唯一键设计完成
- [ ] 旧 `workshopId` 的保留/降级语义逐表写清
- [ ] Prisma client 生成影响面盘点完成
- [ ] raw SQL / reporting query contract 变更面盘点完成

## C. Data Gate

- [ ] `workshop -> stockScope` 映射矩阵完成
- [ ] `inventory_balance` 重建策略与核验 SQL 完成
- [ ] `inventory_log` 回填策略、保序要求、逆操作链核验完成
- [ ] `inventory_source_usage` relation verification 方案完成
- [ ] `factory_number_reservation` 回填与唯一性核验方案完成
- [ ] 例外记录与人工判定规则完成

## D. Runtime Gate

- [ ] `inventory-core` 写路径切换点明确
- [ ] `reporting` 查询与导出切换点明确
- [ ] `inbound/customer/workshop-material/project` 的读写切换点明确
- [ ] `session/rbac` 兼容 alias 在 cutover 后的保留/收紧策略明确

## E. Validation Gate

- [ ] focused tests 清单完成
- [ ] e2e / stub / fixture 迁移清单完成
- [ ] `pnpm swagger:metadata` / `pnpm typecheck` / `pnpm test` 闸门写入 runbook
- [ ] 数据 reconciliation 报告模板完成
- [ ] reverse / void / export smoke 清单完成

## F. Rollback Gate

- [ ] 快照生成与恢复演练完成
- [ ] 应用版本回退步骤完成
- [ ] rollback / forward-fix 分界条件完成
- [ ] 维护窗内失败后的回退时序明确

## G. Execution Slice Gate

- [ ] 上述 A~F 全部达到可执行状态
- [ ] 新 execution slice 的 owned paths、frozen paths、validation gate 已单独建档
- [ ] 用户明确放行进入实施
