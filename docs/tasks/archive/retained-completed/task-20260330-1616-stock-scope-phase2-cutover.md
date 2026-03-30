# 库存范围口径 Phase 2 schema/data cutover brief

## Metadata

- Scope: 基于已完成的 `stockScope` Phase 1 运行时语义收敛，规划 `Phase 2` 如何把当前仍冻结在 `workshopId` 维度的 Prisma / DB / data / runtime query surfaces 切到 canonical `stockScope` 存储口径；本轮只沉淀 cutover brief、策略取舍、确认项、回滚与验证要求，不默认放行实施。
- Related requirement: `docs/requirements/archive/retained-completed/req-20260330-1616-stock-scope-phase2-cutover.md`
- Status: `completed`
- Review status: `validated-no-independent-review`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Last updated: `2026-03-30`
- Related checklist: `None`
- Related files:
  - `docs/requirements/archive/retained-completed/req-20260330-1616-stock-scope-phase2-cutover.md`
  - `docs/requirements/archive/retained-completed/req-20260330-1419-stock-scope-alignment.md`
  - `docs/tasks/archive/retained-completed/task-20260330-1419-stock-scope-alignment.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/rd-subwarehouse.md`
  - `prisma/schema.prisma`
  - `docs/tasks/TASK_CENTER.md`

## Requirement Alignment

- Requirement doc: `docs/requirements/archive/retained-completed/req-20260330-1616-stock-scope-phase2-cutover.md`
- User intent summary:
  - 以 Phase 1 已完成的 canonical `stockScope` runtime contract 为前提，继续规划 `Phase 2` schema / data cutover。
  - 重点是把当前 Prisma / DB 仍冻结在 `workshopId` 维度的真实存储轴切到 `stockScope`，而不是再做一轮运行时命名收敛。
  - 这轮要先沉淀规划目标、策略选项、风险面、验证与回滚要求，以及必须由用户确认的关键决策，不默认立即实施。
- Acceptance criteria carried into this task:
  - 形成一个 active planning task，明确 `Phase 2` 的目标、非目标、切分原因与影响面。
  - 明确 schema / data / runtime surfaces、cutover 分段、可选策略与 trade-off。
  - 明确来源层成本追踪、库存日志逆操作、单据关系、e2e / test 迁移、回滚与迁移窗口要求。
  - 明确是否需要 parent-owned workspace，以及是否建议继续保持 `plan-only`。
- Open questions requiring user confirmation:
  - `None`

## Requirement Sync

- Req-facing phase progress: 首波 `schema expand + runtime shift` 代码与 migration 脚本已实现，并通过 `swagger:metadata`、`typecheck`、`test` 与 `migration:typecheck`；目标库 `saifute-wsm` 已通过安全 diff/apply 路径完成 schema expand。
- Req-facing current state: `inventory-core` / `reporting` / `customer` / `inbound` / `workshop-material` / `project` 已开始写入或读取 `stockScopeId`；`migration:stock-scope-phase2:dry-run` / `execute` / `validate` 也已在当前目标库上跑通。由于当前目标库首波相关表均为 `0` 行，本轮主要验证 schema 与脚本路径正确性。
- Req-facing blockers: None
- Req-facing next step: 归档；若要继续验证非空历史数据场景，可另开新 scope 在带数据目标库上 rehearse。
- Requirement doc sync owner: `parent`

## Goal And Acceptance Criteria

- Goal: 产出一个可持续续写的 `Phase 2` cutover brief，指导后续如何把库存真实维度从当前的 `workshopId` 存储轴安全切到 `stockScope`，同时保持 `inventory-core` 单写入口、来源层成本追踪、逆操作链、单据关系与 RD 受限小仓语义不失真。
- Acceptance criteria:
  - 本 task 明确区分“本轮只是规划沉淀”与“后续才可能进入实施”。
  - 本 task 明确 `Phase 2` 为什么必须独立于 `Phase 1`。
  - 本 task 明确 schema / data / runtime surfaces、分段路线、策略选项、trade-off、验证、rollback 与迁移窗口要求。
  - 本 task 明确必须由用户确认的决策项，以及未确认前不得直接交给 coder 的边界。
  - 本 task 明确不把本需求扩张成通用多仓 / 库位 / 批次平台改造。

## Current True Gaps

- Phase 1 已把运行时真实库存范围收敛到 canonical `stockScope` contract，但 `prisma/schema.prisma` 仍未引入真正的 `StockScope` 持久化轴。
- `InventoryBalance`、`InventoryLog`、`FactoryNumberReservation` 以及多张单据表当前仍以 `workshopId` 作为库存相关存储维度；这与架构真源中“库存范围与归属分离”的冻结口径不一致。
- `workshop` 在 DB 里仍同时承载“库存落在哪”和“归属/核算算到谁头上”的混合语义；Phase 1 只在 runtime 做了兼容收敛，没有切 persistence。
- 报表 SQL、Prisma relation、历史数据回填、e2e stub/fixture、逆操作日志链、来源层成本追踪仍未完成针对 `stockScope` 轴的 cutover 规划。
- 如果没有单独的 `Phase 2`，后续实现容易在 schema、data、runtime 之间发生半切换，造成“runtime 说的是 `stockScope`，DB 记的仍是 `workshop`”的长期漂移。

## Planning Goals And Non-Goals

- Planning goals:
  - 明确 Phase 2 的目标 end-state：真实库存持久化维度切到 `stockScope`，`workshop` 回到归属 / 核算维度。
  - 明确受影响的 schema、数据回填 / 重放、runtime query / repository、报表、测试与回滚面。
  - 在不破坏 `inventory-core` 单写入口的前提下，给出可选 cutover 策略与最小安全推荐路径。
  - 为后续实施提供“先确认再开工”的 decision checklist，而不是把方案写成默认立即编码。
- Non-goals:
  - 不扩张为通用多仓 / 仓库-库位-批次平台重构。
  - 不重写或推翻 Phase 1 已落地的 canonical `stockScope` runtime contract。
  - 不改变 `workflow`、`session`、`rbac` 的基础所有权边界，只处理它们受存储维度切换影响的兼容面。
  - 不把来源层成本追踪降级成“按物料静态单价”。
  - 不在本 task 中默认批准 schema migration、数据执行脚本或应用代码修改。

## Why Phase 2 Must Stay Separate From Phase 1

- `Phase 1` 的核心风险在 runtime contract 收敛；`Phase 2` 的核心风险在 Prisma schema、DB 真实数据、raw SQL、历史单据、测试基线与 rollback，爆炸半径不同。
- `Phase 1` 能在冻结 `prisma/schema.prisma` 的前提下落地；`Phase 2` 则必然牵涉 migration、索引、外键、生成 Prisma client、历史数据回填与验证。
- `Phase 2` 必须显式处理来源层成本追踪、库存日志逆操作、现有单据关系、e2e / test migration，这些都不是 `Phase 1` runtime compatibility layer 能替代的。
- `Phase 2` 需要用户先确认 cutover 策略、纳入范围、迁移窗口和 rollback 基线；如果和 `Phase 1` 混在同一 slice，会把“运行时收敛已完成”的确定性重新拉回不必要的高风险同轮交付。
- 当前仓库已经有可用的 Phase 1 兼容边界，因此 `Phase 2` 没有必要为了“少开一个任务”而牺牲可回滚性与可审阅性。

## Impacted Surfaces

- Schema / Prisma / DB 必改面:
  - `StockScope` 主数据模型 / 表当前缺失，需要补出稳定主档与 canonical `MAIN` / `RD_SUB` 记录。
  - `InventoryBalance.materialId + workshopId` 唯一键需要迁到 `materialId + stockScopeId`。
  - `InventoryLog` 的库存维度字段、外键、索引、`businessDocument*` 关联核验需要迁到 `stockScopeId` 轴。
  - `InventorySourceUsage` 与 `InventoryLog` / `InventoryBalance` 的链路在同一事务内提交；scope 轴切换时必须与日志、余额、分配/释放口径一起验证，避免成本层与数量层脱节。
  - `FactoryNumberReservation` 当前仍挂 `workshopId`，需要确认是否同样迁到 `stockScopeId`。
  - 单据主表与行表：`StockInOrder` / `StockInOrderLine`、`CustomerStockOrder` / `CustomerStockOrderLine`、`WorkshopMaterialOrder` / `WorkshopMaterialOrderLine`、`Project` / `ProjectMaterialLine`、`RdHandoffOrder` / `RdHandoffOrderLine`、`RdProcurementRequest` / `RdProcurementRequestLine`、`RdStocktakeOrder` / `RdStocktakeOrderLine` 等（以 `prisma/schema.prisma` 与 `20-wms-business-flow-and-optimized-schema.md` 为准）在架构真源中多已指向 `stockScopeId` 语义，schema 真源需与运行时 Phase 1 对齐。
- Schema / Prisma / DB 待决策面:
  - `Project` 表头是否继续保留 `workshopId` 纯归集语义，还是补显式 `stockScopeId` 到表头 / 行级边界，以架构表设计为准。
  - `RdHandoffOrder`、`RdStocktakeOrder`、`RdProcurementRequest` 当前仍是 workshop-shaped 持久化，是否在 Phase 2 首波同步切到 `stockScopeId`，需要用户确认。
  - 受影响的 raw SQL / reporting views / repository query 是否在同一波重写，还是允许阶段性 shadow validation。
- Data / Backfill / Replay 面:
  - 为现有 `workshopId` 记录建立 `workshop -> stockScope` 的历史映射矩阵，区分“真实库存范围”与“归属/核算 workshop”。
  - 明确 `inventory_balance` / `inventory_log` / `inventory_source_usage` / `factory_number_reservation` 是原位 backfill 还是基于正式业务事实 replay / rebuild。
  - 核验来源层成本分配、`reversalOfLogId` 逆操作链、`idempotencyKey` 幂等语义在新轴上仍成立。
  - 核验 `document_relation` / `document_line_relation`、行级 `sourceDocument*` 引用不会因 scope 切换失真。
  - 更新 e2e seed、`test/prisma-e2e-stub.ts`、fixture、snapshot、focused tests 与 migration 报告基线。
- Runtime / Query / Compatibility 面:
  - `inventory-core` repository / service / query path、`reporting` raw SQL、`inbound/customer/workshop-material/project/rd-subwarehouse` 的查询过滤需从 workshop-shaped 持久化转向 stock-scope truth。
  - `session` / `rbac` Phase 1 的 compatibility alias 需要确认哪些可继续保留，哪些在 Phase 2 后可收紧。
  - Swagger / DTO / export / dashboard 需要复核是否仍暴露 workshop-shaped 库存语义。

## Candidate Strategy Options And Trade-Offs

### Option A: `schema expand + backfill + maintenance-window one-shot flip`

- Route:
  - 先补 `StockScope` 与新 `stockScopeId` 列 / 外键 / 索引，保留旧 `workshopId` 列。
  - 先完成历史 backfill、对账与 rehearsal，但运行时仍只读旧列或仅做有限 shadow read。
  - 在维护窗口内冻结库存写入，完成最终 delta backfill，统一切换 read/write 真源到 `stockScopeId`，观察通过后再把旧列降为归属字段或进入后续清理。
- Pros:
  - 兼顾安全性与复杂度，避免长时间双写导致库存与成本链路分叉。
  - 更适合当前“runtime 语义已收敛、持久化尚未切换”的状态。
  - rollback 边界清晰，维护窗口内更容易使用整库快照恢复。
- Cons:
  - 需要明确的停写 / 维护窗口。
  - backfill、对账、delta 收口和切换脚本必须提前 rehearsal 到位。
  - 若首波范围过大，窗口长度与验证时间会变长。

### Option B: `schema expand + dual-write + shadow-read + delayed flip`

- Route:
  - 新旧列并存，运行时在一段时间内同时写 `workshopId` 与 `stockScopeId`，再逐步把读流量切到新轴。
- Pros:
  - 可缩短最终维护窗口。
  - 有更多线上 shadow validation 机会。
- Cons:
  - 对 `inventory-core`、来源层成本、逆操作链、关系恢复、测试基线的复杂度最高。
  - 一旦新旧双写出现漂移，rollback 不是“切回旧列”这么简单，还要做 divergence reconciliation。
  - 会把 Phase 1 刚建立的 canonical 边界重新拉回长期兼容债。

### Option C: `destructive one-shot migration / rebuild`

- Route:
  - 直接在一个窗口里重写 schema、一次性迁移或重放数据、同步切换应用。
- Pros:
  - 终态最干净，没有长期兼容列和阶段性债务。
  - 不需要维护长期双轨逻辑。
- Cons:
  - 对 rehearsal、备份恢复、停机容忍度要求最高。
  - 一旦 `inventory_log`、`inventory_source_usage`、逆操作链或单据关系出现错误，回滚只能依赖整库恢复。
  - 对当前仓库来说过于激进，不适合作为默认策略。

## Recommended Planning Direction

- 当前推荐方向: 以 `Option A` 为默认起点评估，即“`schema expand + backfill/reconcile + 维护窗 one-shot flip`”，必要时只在报表或核对脚本层引入短期 `shadow read`，不推荐长期 `dual-write` 作为默认方案。
- 推荐理由:
  - Phase 1 已经把 runtime contract 统一成 `stockScope`，Phase 2 的主要风险在 storage/data，而不是继续做长期兼容逻辑。
  - `inventory_source_usage`、`inventory_log.reversalOfLogId`、`idempotencyKey`、单据关系与 e2e/test 基线都不适合长期双写。
  - `inventory-core` 是唯一库存写入口，短维护窗下的一次性切换更容易保持事务边界和回滚边界。
- 只有在用户明确拒绝维护窗口、且接受更高的实现复杂度与更长的兼容债时，才考虑 `Option B`。

## Decision Freeze

- Confirmed bundle（2026-03-30）:
  - 主策略: `Option A = schema expand + backfill/reconcile + 维护窗 one-shot flip`
  - 首波范围: 先覆盖 `inventory-core + reporting + inbound/customer/workshop-material/project`，暂不把 `rd-subwarehouse` 持久化表纳入首波 cutover
  - 数据迁移口径: `hybrid`，即 `inventory_balance` 优先 `replay/rebuild`，`inventory_log` / `inventory_source_usage` / `factory_number_reservation` 优先受控 `backfill + relation verification`
  - 迁移窗口: 短维护窗，允许临时停写 / 只读
  - rollback baseline: 以“整库快照恢复 + 应用版本回退”为主
  - workspace: 立即开启 `docs/workspace/stock-scope-phase2-cutover/`
- Guardrails after confirmation:
  - 当前确认只冻结 planning baseline，不等于已批准直接改 Prisma / migration / 运行时代码
  - 若后续 rehearsal 发现 `rd-subwarehouse` 必须首波纳入，需在 workspace / task 中补证据后再调整执行范围

## Cutover Route Segments

- Segment 0. 决策冻结与 rehearsal 设计:
  - 冻结首波纳入表 / 模块 / runtime surfaces。
  - 冻结 backfill vs replay 的判定规则，尤其是 `inventory_balance` / `inventory_log` / `inventory_source_usage` / `factory_number_reservation`。
  - 输出 workshop-to-stock-scope 历史映射矩阵、例外清单与人工判定规则。
- Segment 1. Schema expand:
  - 引入 `StockScope` 主档与 canonical records。
  - 在目标表补 `stockScopeId`、外键、索引与必要兼容列；暂不删除 `workshopId`。
  - 调整 Prisma schema、migration、生成 client、raw SQL / view / repository schema contract。
- Segment 2. Backfill / replay / reconcile:
  - 回填单据、库存现值、库存日志、来源分配、编号区间的 `stockScopeId`。
  - 对需要 replay 的对象明确“重建来源事实 -> 库存日志 -> 来源分配”的链路，避免机械复制旧库存轴。
  - 产出 counts、nulls、unique、relation、cost、reverse-chain 核验报告。
- Segment 3. Shadow validation:
  - 在正式 flip 前做对账脚本、focused tests、e2e/stub 更新与小流量只读核验。
  - 若采用 `Option A`，这里只建议做只读比对，不建议正式业务路径长期双写。
- Segment 4. Maintenance-window cutover:
  - 冻结库存写入，执行最终 delta backfill / replay。
  - 切换 read/write truth 到 `stockScopeId`。
  - 跑 cutover gate：schema、counts、inventory reconciliation、reverse/void smoke、reporting、e2e/test。
- Segment 5. Rollback checkpoint:
  - 在窗口内未通过 gate 时，按预设快照恢复与应用版本回退。
  - 不接受现场临时手改数据替代明确 rollback。
- Segment 6. Post-cutover cleanup:
  - 在稳定运行后，再单开清理 slice，删除已无业务意义的 workshop-shaped 库存兼容列 / query / alias。
  - 该清理不应与首波切换同轮绑定。

## User Decisions To Confirm

- [x] 首波 cutover 采用 `Option A`。
- [x] 首波范围先只含 `inventory-core + reporting + inbound/customer/workshop-material/project`，暂不纳入 `rd-subwarehouse` 持久化表。
- [x] `inventory_balance` / `inventory_log` / `inventory_source_usage` / `factory_number_reservation` 采用混合策略：余额优先 `replay/rebuild`，日志/来源/编号区间优先受控 `backfill + verification`。
- [x] 允许维护窗口内的库存停写 / 只读模式，目标是短维护窗。
- [x] rollback 以“整库快照恢复 + 应用版本回退”为主。
- [x] 需要 parent 立刻开 `docs/workspace/stock-scope-phase2-cutover/` 做更细的策略对比、映射和 rehearsal runbook。

## Risks And Contract-Sensitive Areas

### Cutover 风险面清单（与用户约束对齐的一等公民）

以下五项必须在任何 Phase 2 执行方案中单独设验证与回滚子计划，不得仅作为泛化「数据风险」带过。

1. **来源层成本追踪**：`InventorySourceUsage` 与 `InventoryLog`、业务单据行的对应关系；分配/释放金额与数量在 scope 切换后是否仍可审计、可对账。
2. **库存日志逆操作**：`reversalOfLogId` 唯一性、作废/撤销链、`idempotencyKey` 幂等；cutover 后不得出现重复 reverse、孤儿 reversal 或日志与余额不同步。
3. **现有单据关系**：`DocumentRelation` / `DocumentLineRelation` 及行级 `sourceDocument*`、`businessDocument*` 跨主仓/RD/车间领退的追溯链在存储轴切换后仍完整。
4. **e2e / test 迁移**：`test/prisma-e2e-stub.ts`、fixture、focused specs、batch/e2e 切片与可能的 snapshot；避免「测试绿、生产假」或大量无意义假失败。
5. **回滚策略**：与所选 Option 绑定；维护窗 one-shot 以整库快照 + 版本回退为主；dual-write 必须另附 divergence 对账与回滚/前进修复分界。

- 来源层成本追踪:
  - `inventory_source_usage` 依赖 `inventory_log` 作为成本层事实；如果日志 ID、scope 轴或 replay 顺序变化，分配与释放金额容易失真。
- 库存日志逆操作:
  - `reversalOfLogId`、逆向流水唯一性、作废/撤销链与幂等键必须在新轴上保持可证明一致，不能在 cutover 后出现重复 reverse 或 orphan reversal。
- 单据关系:
  - `document_relation` / `document_line_relation`、`sourceDocument*` 与退货/退料/交接/盘点链路不能因 scope 轴切换失去可追溯性。
- 归属/核算语义:
  - `workshop` 在车间领退料、项目归集、RD procurement/handoff 中仍有业务意义；Phase 2 必须切的是“库存维度”，不是把所有 `workshopId` 都删掉。
- 报表与查询:
  - raw SQL、导出、dashboard、只读聚合若仍按 `workshopId` 聚合，会产生“库存真源已切、报表仍旧口径”的双重语义。
- e2e / test migration:
  - Prisma stub、fixture、focused tests、e2e smoke、可能的 snapshot 都会受到 schema 与默认 seed 变化影响；若不一起迁移，会制造大量假失败或假通过。
- rollback:
  - 双写策略下 rollback 最复杂；即便是一窗切换，也必须有演练过的备份恢复与版本回退。

## Migration Window, Validation, And Rollback Expectations

- Migration window requirements:
  - cutover 窗口内必须冻结所有库存写路径：`inbound`、`customer`、`workshop-material`、`project`、`rd-subwarehouse` 及任何调用 `inventory-core` 的写入口。
  - 切换前必须完成可用的 DB 备份与恢复演练，且恢复耗时需要落进业务可接受窗口。
  - 窗口内不得临时引入未 rehearsal 的人工修补 SQL 作为主计划。
- Validation expectations:
  - schema gate: `stockScopeId` 列、外键、唯一键、索引、Prisma client、raw SQL / view 定义全部一致。
  - data gate: counts、nulls、duplicate、mapping coverage、inventory reconciliation、source-usage totals、reverse-chain integrity、relation integrity 全部有报告。
  - runtime gate: `inventory-core`、`reporting`、`rd-subwarehouse`、主要单据家族的 create/query/void/reverse smoke 全部通过。
  - test gate: focused unit/integration/e2e、stub/fixture、必要的 swagger / typecheck / full test gate 全部通过。
- Rollback expectations:
  - `Option A` / `Option C`: 以“窗口前整库快照 + 应用版本回退”为主，不依赖现场手写 SQL 反向修补。
  - `Option B`: 除版本切回外，还必须有 divergence reconciliation 方案；这也是它默认不推荐的主因。
  - 无论哪种策略，rollback 文案必须明确“什么阶段还能回滚、什么阶段只能 forward-fix”。

## Workspace And Plan-Only Recommendation

- Separate workspace:
  - 当前 brief 已足够成为 active task 真源，但如果接下来要继续对比策略、沉淀例外映射表、维护窗口 runbook、rehearsal 结果与 SQL 对账样例，建议 parent 单开一个 `docs/workspace/stock-scope-phase2-cutover/` 工作区。
  - 该 workspace 不是本轮创建 task 的前置条件，但对高风险 cutover 的多轮确认会有帮助。
- Plan-only recommendation:
  - 建议继续保持 `plan-only`，直到用户明确确认上面的决策项。
  - 未确认前，不建议把本 task 直接交给 coder 进入 schema/data/runtime 实施。

## Scope And Ownership

- Allowed code paths:
  - 当前 planner slice 只写 `docs/tasks/task-20260330-1616-stock-scope-phase2-cutover.md` 与 `docs/tasks/TASK_CENTER.md`
  - 后续一旦获批实施，候选执行路径将至少覆盖：`prisma/schema.prisma`、`prisma/migrations/**`、`src/generated/prisma/**`、`src/modules/inventory-core/**`、`src/modules/reporting/**`、`src/modules/inbound/**`、`src/modules/customer/**`、`src/modules/workshop-material/**`、`src/modules/project/**`、`src/modules/rd-subwarehouse/**`、`src/modules/session/**`、`src/modules/rbac/**`、`test/**`
- Frozen or shared paths:
  - `docs/requirements/**`
  - `docs/workspace/**`（如需创建或同步，由 parent 负责）
  - `docs/architecture/**`
  - 其他 active `docs/tasks/*.md`
  - 任何未被后续执行 slice 明确放开的应用代码路径
- Task doc owner: `planner`
- Contracts that must not change silently:
  - `inventory-core` 仍是唯一库存写入口。
  - `workflow` 仍只拥有审核投影，不接管库存维度语义。
  - `session` 仍是 `JWT ticket + Redis session truth`。
  - `rbac` 仍拥有权限码、路由树与数据范围约束。
  - 真实库存范围只允许 `MAIN` / `RD_SUB`。
  - `workshop` 继续承担归属 / 核算，而不是重新膨胀成库存池。
  - 来源层成本追踪、逆操作链、单据关系不可静默降级。

## Implementation Plan

- [x] Step 1. 由用户确认主策略、首波纳入范围、backfill vs replay 口径、迁移窗口与 rollback 基线。
- [x] Step 2. 基于确认结果补充更细的 schema/data/runtime matrix，包括哪些表必须同波切、哪些可后置 cleanup。
- [x] Step 3. 产出 rehearsal 设计：映射表、对账 SQL、focused tests、e2e/stub 迁移、cutover gate 与 rollback gate。
- [x] Step 4. 进入首波实现：补 `StockScope` / `stockScopeId` schema、首波运行时持久化切换、focused tests 与 `stock-scope-phase2` migration 脚本。
- [x] Step 5. 在获得真实 DB 授权后执行 schema apply、`migration:stock-scope-phase2:dry-run` / `execute` / `validate`。
- [x] Step 6. 根据当前目标库状态完成收口判断：空目标库路径已验证通过，非空历史数据 rehearsal 另开新 scope。

## Coder Handoff

- Execution brief:
  - 用户已授权按默认 bundle 直接进入首波实施；当前已完成代码面与脚本面实现。
  - 真实 DB schema apply / rehearsal / execute 仍需明确授权，因为现有 `pnpm prisma:push` 会重建目标库。
  - 在未获得该授权前，不继续执行任何会修改真实目标库的命令。
- Required source docs or files:
  - `docs/requirements/req-20260330-1616-stock-scope-phase2-cutover.md`
  - `docs/requirements/archive/retained-completed/req-20260330-1419-stock-scope-alignment.md`
  - `docs/tasks/archive/retained-completed/task-20260330-1419-stock-scope-alignment.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/rd-subwarehouse.md`
  - `prisma/schema.prisma`
- Owned paths:
  - `prisma/**`
  - `src/modules/inventory-core/**`
  - `src/modules/reporting/**`
  - `src/modules/inbound/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/project/**`
  - `src/modules/session/**`
  - `src/modules/rbac/**`
  - `test/**`
  - `scripts/migration/stock-scope-phase2/**`
- Forbidden shared files:
  - `docs/requirements/**`
  - `docs/workspace/**`
  - `docs/architecture/**`
  - active `docs/tasks/*.md` unless parent reassigns
- Constraints and non-goals:
  - do not expand into generic multi-warehouse / location / batch architecture
  - do not bypass `inventory-core`
  - do not silently delete business-attribution `workshopId` where it still carries ownership / costing semantics
  - do not degrade source-layer cost tracking, reverse-log invariants, or document relations
  - do not treat this planning brief as default approval for immediate implementation
- Validation command for this scope:
  - completed so far:
    - `pnpm prisma:generate`
    - `pnpm swagger:metadata`
    - `pnpm typecheck`
    - `pnpm migration:typecheck`
    - focused tests covering `inventory-core` / `reporting` / `customer` / `inbound` / `workshop-material` / `project` / `rbac` / `batch-d-slice.e2e`
    - `pnpm test`
  - pending operational gate:
    - schema apply on target DB
    - `pnpm migration:stock-scope-phase2:dry-run`
    - `pnpm migration:stock-scope-phase2:execute`
    - `pnpm migration:stock-scope-phase2:validate`
- If parallel work is approved, add one subsection per writer with the same fields:
  - `not approved in this task`

## Reviewer Handoff

- Review focus:
  - 这份 brief 是否明确保持 `plan-only`，没有把方案偷偷写成默认实施。
  - 是否完整覆盖 schema / data / runtime surfaces、策略选项、trade-off、回滚、验证与迁移窗口。
  - 是否把来源层成本追踪、逆操作链、单据关系、e2e/test migration 作为一等风险面列出。
  - 是否保持“不扩张成通用多仓平台”的范围纪律。
- Requirement alignment check:
  - 与 `docs/requirements/req-20260330-1616-stock-scope-phase2-cutover.md` 对齐。
  - 与已完成 Phase 1 task 和架构真源保持一致，没有把 `workshop` 再写回真实库存池。
- Final validation gate:
  - docs-only review of this task against the linked requirement, Phase 1 archive, architecture docs, and `prisma/schema.prisma`
- Required doc updates:
  - 若继续规划或确认，由 planner / parent 更新本 task
  - requirement 四行同步继续由 `parent` 负责

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - `N/A`
- If not safe, list the shared files or contracts that require a single writer:
  - `prisma/schema.prisma`、migration、generated Prisma client、inventory schema contract 是共享底座。
  - `inventory-core`、`reporting`、单据家族、RD 协同、session/rbac compatibility 都依赖同一组 `stockScope` / `workshop` 语义分界。
  - 数据 backfill / replay、对账、rollback runbook 与 e2e/test migration 需要基于同一套决策冻结，不适合多人并行各写一半。

## Review Log

- Validation results:
  - Re-read the active requirement, the archived Phase 1 requirement/task, the architecture overview, the optimized schema doc, `inventory-core` / `rd-subwarehouse` module docs, `prisma/schema.prisma`, and the retained migration master-plan relocation task.
  - Implemented first-wave schema expand and runtime shift across `prisma/**`, `inventory-core`, `reporting`, `customer`, `inbound`, `workshop-material`, `project`, `master-data`, `session/rbac`, `test/prisma-e2e-stub.ts`, and `scripts/migration/stock-scope-phase2/**`.
  - Passed `pnpm prisma:generate`, `pnpm swagger:metadata`, `pnpm typecheck`, `pnpm migration:typecheck`, focused tests, and final `pnpm test`.
  - Applied schema expand to target DB `saifute-wsm` via `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script | pnpm exec prisma db execute --stdin`.
  - Passed `pnpm migration:stock-scope-phase2:dry-run`, `pnpm migration:stock-scope-phase2:execute`, and `pnpm migration:stock-scope-phase2:validate`.
- Findings:
  - none in code/test validation; current target DB path is green.
- Follow-up action:
  - decide whether non-empty historical data rehearsal still needs a dedicated follow-up scope.

## Final Status

- Outcome: `completed - first-wave code and target DB path validated`
- Requirement alignment: 本 task 已从 planning 进入首波实施，完成了默认 bundle 下的 schema expand、runtime 持久化轴切换与 migration 脚本补齐，并已在当前目标库上跑通 schema apply 与 `dry-run / execute / validate` 路径。
- Residual risks or testing gaps:
  - 当前目标库首波相关表均为 `0` 行，因此尚未验证“非空历史数据回填/冲突收口”路径。
  - 尚未做独立 reviewer sign-off；当前是代码/脚本验证与目标库路径验证已通过。
- Directory disposition after completion: archive to `docs/tasks/archive/retained-completed/`；若后续需要非空历史数据 rehearsal，则另开新 scope
- Next action: `None`
