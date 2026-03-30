# stock-scope-phase2-cutover

## 目标

在已完成 `stockScope` Phase 1 运行时语义收敛的基础上，继续以 `plan-only` 方式沉淀 `Phase 2` 的 schema/data cutover 基线，避免直接进入高风险实施。

## 当前结论

- 已确认采用 `Option A`：`schema expand + backfill/reconcile + 维护窗 one-shot flip`
- 首波范围先限定为：
  - `inventory-core`
  - `reporting`
  - `inbound`
  - `customer`
  - `workshop-material`
  - `project`
- `rd-subwarehouse` 持久化表暂不纳入首波
- 数据迁移采用混合策略：
  - `inventory_balance` 优先 `replay/rebuild`
  - `inventory_log` / `inventory_source_usage` / `factory_number_reservation` 优先受控 `backfill + relation verification`
- 迁移窗口接受短维护窗，允许临时停写/只读
- rollback 以“整库快照恢复 + 应用版本回退”为主

## 当前状态

- requirement: `docs/requirements/archive/retained-completed/req-20260330-1616-stock-scope-phase2-cutover.md`
- task: `docs/tasks/archive/retained-completed/task-20260330-1616-stock-scope-phase2-cutover.md`
- 阶段: `首波实施`
- 健康度: `● 稳定`
- 当前验证:
  - 更安全的 schema apply 已通过 `prisma migrate diff --script | prisma db execute` 跑通
  - `migration:stock-scope-phase2:dry-run / execute / validate` 已在目标库 `saifute-wsm` 上执行通过
  - 当前目标库首波相关表均为 `0` 行

## 下一步

- 在 `decisions.md` 固化已确认 bundle 与调整条件
- 在 `draft.md` 细化：
  - `workshop -> stockScope` 映射矩阵
  - schema expand 边界
  - backfill/replay 分工
  - rehearsal / validation / rollback gate
- 当前已补的 planning 入口：
  - `schema-matrix.md`
  - `rehearsal-plan.md`
  - `mapping-matrix.md`
  - `execution-slice-outline.md`
  - `gate-checklist.md`
  - `runbook-outline.md`
  - `validation-matrix.md`
  - `rollback-checklist.md`
  - `command-gate-draft.md`
  - `sql-reconciliation-outline.md`
- 已完成的实现面：
  - `prisma/schema.prisma` 首波 `stockScopeId` expand
  - `inventory-core` / `reporting` / `customer` / `inbound` / `workshop-material` / `project` 首波 runtime shift
  - `scripts/migration/stock-scope-phase2/{migrate,validate}.ts`
- 下一步取决于是否还要针对非空历史数据目标库单开 rehearsal follow-up
