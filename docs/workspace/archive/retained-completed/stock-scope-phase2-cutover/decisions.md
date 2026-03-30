# Decision Log

## 2026-03-30

### D1. Phase 2 主策略

- Status: `confirmed`
- Decision: 采用 `Option A = schema expand + backfill/reconcile + 维护窗 one-shot flip`
- Why:
  - Phase 1 已完成运行时 contract 收敛，Phase 2 主要风险在 schema/data，而不是继续维护长期兼容逻辑
  - 相比 `dual-write`，更容易守住 `inventory-core` 单写入口、来源层成本链与 rollback 边界

### D2. 首波 cutover 范围

- Status: `confirmed`
- Decision: 首波先覆盖 `inventory-core + reporting + inbound/customer/workshop-material/project`
- Excluded for now:
  - `rd-subwarehouse` 持久化表
- Why:
  - 先压低首波爆炸半径
  - 若 rehearsal 证明 `rd-subwarehouse` 必须同波纳入，再补证据后调整

### D3. 数据迁移口径

- Status: `confirmed`
- Decision: 采用混合策略
- Breakdown:
  - `inventory_balance`: 优先 `replay/rebuild`
  - `inventory_log`: 优先受控 `backfill + relation verification`
  - `inventory_source_usage`: 优先受控 `backfill + relation verification`
  - `factory_number_reservation`: 优先受控 `backfill + relation verification`
- Why:
  - 余额是派生结果，更适合重建
  - 日志/来源/编号区间承载历史追溯与幂等/逆操作链，不宜轻率重写

### D4. 迁移窗口

- Status: `confirmed`
- Decision: 接受短维护窗，允许临时停写 / 只读

### D5. 回滚基线

- Status: `confirmed`
- Decision: 以“整库快照恢复 + 应用版本回退”为主
- Note:
  - 细粒度脚本可作为补充，不作为首要回滚依赖

### D6. Workspace

- Status: `confirmed`
- Decision: 立即开启 `docs/workspace/stock-scope-phase2-cutover/`
- Purpose:
  - 沉淀映射矩阵、runbook、rehearsal、validation gate 与 rollback gate
