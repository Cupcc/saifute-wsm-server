# 库存范围与归属口径代码对齐（先运行时语义收敛）

## Metadata

- Scope: 在不直接发起 `prisma/schema.prisma` 全量重构的前提下，先把运行时“真实库存范围 = MAIN / RD_SUB、`workshop` 仅归属 / 核算”的语义收敛到统一后端合约，并为后续 schema / data cutover 建立单一兼容边界。
- Related requirement: `docs/requirements/archive/retained-completed/req-20260330-1419-stock-scope-alignment.md`
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Last updated: `2026-03-30`
- Related checklist: `None`
- Related files: `docs/requirements/archive/retained-completed/req-20260330-1419-stock-scope-alignment.md`, `docs/architecture/00-architecture-overview.md`, `docs/architecture/20-wms-business-flow-and-optimized-schema.md`, `docs/architecture/modules/inventory-core.md`, `docs/architecture/modules/rd-subwarehouse.md`, `prisma/schema.prisma`, `src/modules/session/domain/user-session.ts`, `src/modules/session/application/session.service.ts`, `src/modules/session/infrastructure/session.repository.ts`, `src/modules/rbac/application/workshop-scope.service.ts`, `src/modules/rbac/domain/rbac.types.ts`, `src/modules/rbac/application/rbac.service.ts`, `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`, `src/modules/inventory-core/**`, `src/modules/reporting/**`, `src/modules/rd-subwarehouse/**`, `src/modules/inbound/**`, `src/modules/workshop-material/**`, `src/modules/project/**`, `src/swagger-metadata.ts`

## Requirement Alignment

- Requirement doc: `docs/requirements/archive/retained-completed/req-20260330-1419-stock-scope-alignment.md`
- User intent summary:
  - 真实库存范围只包含 `MAIN` 与 `RD_SUB`。
  - `workshop` 只承担主仓领退料归属与成本核算，不建立车间库存余额。
  - 同一物料不同入库批次继续按来源层追踪成本，不能退回到“物料静态单价”口径。
  - 基于已改写的项目级 / 架构级真源继续收敛代码实现，而不是停在 docs。
- Acceptance criteria carried into this task:
  - 本轮最小安全落地先完成运行时语义收敛层，统一后端 `stockScope` canonical contract，并保持旧 `workshopScope` 兼容面可控。
  - 运行时不再把任意 `workshopId` 当作库存池；真实库存范围仅允许 `MAIN` / `RD_SUB`。
  - `inventory-core` 继续是唯一库存写入口；`workflow`、`reporting`、`session`、`rbac` 边界不被打穿。
  - 本 task 不在没有再规划的前提下直接切 `prisma/schema.prisma` 的 schema / relation / unique-key。
- Open questions requiring user confirmation:
  - `None`

## Requirement Sync

- Req-facing phase progress: Phase 1 运行时 `stockScope` 语义收敛已完成，post-commit 收口已复核通过。
- Req-facing current state: scoped runtime surfaces 已以 canonical `stockScope` 作为真实库存范围真源；`inventory-core` 仍是唯一库存写入口；最终闸门已通过。
- Req-facing blockers: `None`
- Req-facing next step: 归档；若后续继续推进库存维度真切换，另开 `Phase 2` schema / data cutover 切片。
- Requirement doc sync owner: `parent`

## Goal And Acceptance Criteria

- Goal: 先把后端运行时的库存范围语义从 `workshop` 收敛到 `stockScope` canonical contract，使 `MAIN` / `RD_SUB` 成为唯一真实库存池表达，同时维持现有 API / 会话 / RD 功能兼容，并把高风险 schema cutover 显式后置。
- Acceptance criteria:
  - [x] 后端存在明确的 `stockScope` canonical runtime contract（枚举 / 值对象 / 解析器 / 上下文服务皆可），并被 `session`、`rbac`、`inventory-core`、`reporting`、`rd-subwarehouse` 等运行时入口复用。
  - [x] 新旧兼容边界清晰：外部仍可能读到 `workshopScope` 或 `workshopId` 的地方必须由单一 compatibility layer 翻译，而不是继续在各模块散落“车间即库存池”假设。
  - [x] `inventory-core` 运行时只接受 `MAIN` / `RD_SUB` 作为真实库存范围；`workshop-material` / `project` 等模块里的 `workshopId` 仅保留归属 / 核算语义，不再主导库存池选择。
  - [x] 现有来源层成本追踪不被破坏；本轮不得把成本语义回退成“按物料静态单价出库 / 领料 / 退料”。
  - [x] `prisma/schema.prisma`、生成 Prisma client、DB unique key / relation 仍保持冻结；如果实现中证明必须改 schema，coder 需先停下并回写 task，而不是半切换。
  - [x] `pnpm swagger:metadata`、`pnpm typecheck` 与本 task 指定 focused tests 通过；最后跑 `pnpm test` 作为总闸。

## Current True Gaps

- `src/**` 当前没有任何 `stockScope` 运行时实现；`stockScope` 仍只停留在文档真源。
- `session` / `rbac` / `reporting` / `rd-subwarehouse` / 部分业务入口仍大量使用 `workshopScope` / `WorkshopScopeService`。
- `prisma/schema.prisma` 中 `InventoryBalance` 仍以 `materialId + workshopId` 作为唯一维度，相关库存 / 单据模型和索引也仍围绕 `workshopId`。
- `inventory-core`、`reporting` 与多处 controller / DTO 仍把 `workshopId` 同时当成“真实库存范围”“数据过滤维度”“业务归属维度”，语义混叠尚未拆开。
- RD 已有真实功能切片，但其访问控制和查询约束仍主要挂在 `workshopScope` 兼容命名上，说明运行时口径还没有真正收敛。
- 成本层相关真源已在架构文档冻结为“按来源层追踪”，但库存池身份仍是 workshop-shaped storage contract；若现在直接大改 schema，容易把库存池切换、成本层、逆操作、报表过滤一起打爆。

## Recommended Delivery Path

- Recommended path: `Phase 1 = 运行时语义收敛层` 先行，`Phase 2 = schema / data cutover` 后置。
- Why Phase 1 first:
  - 当前仓库根本没有运行时 `stockScope` canonical contract；如果先改 schema，只会把原有歧义从 `workshopId` 原样搬到 `stockScopeId`。
  - `InventoryBalance` 唯一键、Prisma relation、reporting SQL、session snapshot、RBAC scope、RD 查询 / 命令都共同依赖这条语义链，属于高爆炸半径 shared contract。
  - 当前 RD / 主仓流程已经真实可用；一步到位改 schema 很容易在同一轮同时破坏库存写入、逆操作、范围权限与只读报表。
  - 来源层成本跟踪依赖库存身份与日志 / 分配链保持稳定；在运行时 contract 未收敛前切 persistence axis，回归风险高且难以定位。
- Phase split:
  - Phase 1 / 本轮编码范围：新增 canonical `stockScope` 运行时合约与 resolver，统一 session / RBAC / inventory / reporting / business modules 的调用口径；旧 `workshopScope` 仅保留为 compatibility alias；不改 DB schema。
  - Phase 2 / 后续单独放行：把 Prisma / DB 从 `workshopId` 库存维度切到 `stockScopeId`，补 migration / backfill / 索引 / SQL 与更广回归验证；必要时再评估来源层成本历史数据补正。
- Stop trigger:
  - 如果 Phase 1 里发现某个关键路径无法在不改 schema 的前提下安全落地，立刻停在 task 内回写“必须改 schema 的证据、影响面、最小 cutover 方案”，不要边做边半切换。

## Scope And Ownership

- Allowed code paths:
  - `src/modules/session/{domain,application,infrastructure}/**`
  - `src/modules/rbac/{application,domain,infrastructure}/**`
  - `src/modules/inventory-core/**`
  - `src/modules/reporting/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/inbound/{application,controllers,dto}/**`
  - `src/modules/workshop-material/**`
  - `src/modules/project/**`
  - `src/swagger-metadata.ts`
  - 对应 `*.spec.ts`
- Frozen or shared paths:
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `docs/requirements/**`, `docs/architecture/**`, active `docs/tasks/*.md`
  - `src/modules/workflow/**`
  - `web/**`，除非 Phase 1 明确证明后端兼容层无法维持现有前端 contract
  - `src/shared/**`，除非现有模块边界无法承载该 resolver，且 `parent` 明确重新放开
- Task doc owner: `planner` 维护 planning truth；`coder` 只按本 brief 编码，不回写 board；`code-reviewer` 只更新 review / final status
- Contracts that must not change silently:
  - `inventory-core` 是库存唯一写入口。
  - `workflow` 仍只承载审核语义，不承担库存范围语义。
  - `session` 继续是 `JWT ticket + Redis session truth`。
  - `rbac` 继续拥有数据范围 / 固定范围约束。
  - 真实库存范围只允许 `MAIN` / `RD_SUB`。
  - `workshop` 只用于归属与成本核算，不再作为真实库存余额维度扩散。
  - 来源层成本分配 / 释放语义必须保留，不得退回物料静态单价。

## Implementation Plan

- [ ] Step 1. 设计并落地 canonical `stockScope` runtime contract：在现有 `session/rbac` 可依赖边界内引入 `MAIN` / `RD_SUB` canonical 值、解析与兼容翻译，不在各业务模块重复造 mapping。
- [ ] Step 2. 收敛会话与范围服务：更新 `src/modules/session/domain/user-session.ts`、`session.service.ts`、`session.repository.ts`、`src/modules/rbac/application/workshop-scope.service.ts`、`rbac.types.ts`、`rbac.service.ts` 等，使运行时先拿 `stockScope` canonical context，再按需要向旧 `workshopScope` 暴露 compatibility alias。
- [ ] Step 3. 收敛库存与报表读写入口：更新 `inventory-core` DTO / controller / service / repository 与 `reporting` DTO / controller / service / repository，禁止把任意 `workshopId` 继续当作库存池；临时 storage mapping 必须集中在单点 compatibility boundary。
- [ ] Step 4. 收敛受影响业务模块调用：检查并修正 `rd-subwarehouse`、`inbound`、`workshop-material`、`project` 对库存范围的传参与过滤；`workshopId` 只保留归属 / 核算语义，真实库存范围改走 canonical `stockScope`。
- [ ] Step 5. 保持兼容并压住外溢：仅在无法避免时更新 `swagger-metadata` 与少量响应字段；优先保持现有 API 可兼容消费，不在本轮扩张到 `web/**` 或 schema。
- [ ] Step 6. 添加 focused tests：覆盖 session 序列化 / 反序列化、固定范围解析、inventory stock-scope guard、reporting filter、RD 侧固定范围查询、主仓车间领退料仍只作用主仓库存。
- [ ] Step 7. 跑本 task 指定验证；若任何关键场景显示“不改 schema 无法安全落地”，停止继续编码并回写 Phase 2 cutover brief，而不是直接动 `prisma/schema.prisma`。

## Coder Handoff

- Execution brief:
  - 本轮只做 `Phase 1` 运行时语义收敛层，目标是让后端“先说同一种语言”。优先收敛 contract、resolver、DTO / service / controller 入口和 compatibility boundary；不要一上来改 Prisma、DB unique key、历史数据或前端页面。
- Required source docs or files:
  - `docs/requirements/archive/retained-completed/req-20260330-1419-stock-scope-alignment.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/rd-subwarehouse.md`
  - `src/modules/session/domain/user-session.ts`
  - `src/modules/session/application/session.service.ts`
  - `src/modules/session/infrastructure/session.repository.ts`
  - `src/modules/rbac/application/workshop-scope.service.ts`
  - `src/modules/rbac/domain/rbac.types.ts`
  - `src/modules/rbac/application/rbac.service.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/reporting/controllers/reporting.controller.ts`
  - `src/modules/reporting/application/reporting.service.ts`
  - `src/modules/reporting/infrastructure/reporting.repository.ts`
  - `src/modules/inventory-core/**`
  - `src/modules/inbound/**`
  - `src/modules/workshop-material/**`
  - `src/modules/project/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/swagger-metadata.ts`
  - `prisma/schema.prisma`（只读，用来确认本轮不改）
- Owned paths:
  - `src/modules/session/{domain,application,infrastructure}/**`
  - `src/modules/rbac/{application,domain,infrastructure}/**`
  - `src/modules/inventory-core/**`
  - `src/modules/reporting/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/inbound/{application,controllers,dto}/**`
  - `src/modules/workshop-material/**`
  - `src/modules/project/**`
  - `src/swagger-metadata.ts`
  - 对应 `*.spec.ts`
- Forbidden shared files:
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `web/**`
  - `docs/requirements/**`
  - `docs/architecture/**`
  - active `docs/tasks/*.md`
  - `src/modules/workflow/**`
  - `src/shared/**` unless `parent` explicitly re-opens ownership
- Constraints and non-goals:
  - do not expand into generic multi-warehouse / warehouse-bin / batch platform
  - do not make `workshopId` a new disguised `stockScope` alias in more places
  - do not remove legacy `workshopScope` fields unless the same change also provides a safe compatibility path
  - do not change Prisma schema, DB migration, generated client, or historical data in this phase
  - do not relax source-layer cost tracking into static material pricing
  - do not bypass `inventory-core` from business modules
- Validation command for this scope:
  - Iteration:
    - `pnpm swagger:metadata`
    - `pnpm typecheck`
    - `pnpm test -- --runTestsByPath src/modules/session/infrastructure/session.repository.spec.ts src/modules/rbac/application/workshop-scope.service.spec.ts src/modules/rbac/application/rbac.service.spec.ts src/modules/inventory-core/application/inventory.service.spec.ts src/modules/reporting/application/reporting.service.spec.ts src/modules/rd-subwarehouse/application/rd-handoff.service.spec.ts src/modules/inbound/application/inbound.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts src/modules/project/application/project.service.spec.ts`
  - Final gate:
    - `pnpm swagger:metadata && pnpm typecheck`
    - `pnpm test`
- If parallel work is approved, add one subsection per writer with the same fields:
  - `not approved in this task`

## Reviewer Handoff

- Review focus:
  - canonical `stockScope` 是否成为运行时真源，而不是“换个名字继续传 `workshopId`”
  - `workshopScope` 兼容层是否被收敛到单一边界，而不是散落更多历史债
  - `inventory-core` 是否仍是唯一库存写入口，且真实库存范围是否被限制为 `MAIN` / `RD_SUB`
  - `workshop-material` / `project` / `rd-subwarehouse` 是否只把 `workshopId` 用于归属 / 核算而非库存池
  - 来源层成本分配 / 释放链是否保持；是否出现回退到物料静态单价的回归
  - coder 是否遵守“未获再规划不改 schema / web / shared”边界
- Requirement alignment check:
  - 本轮是否明确走了“运行时语义收敛层优先”而不是偷偷开始一次性全量 schema 重构
  - 是否保住“真实库存 = 主仓 + RD 小仓；车间不建库存余额”的 requirement 核心
- Final validation gate:
  - `pnpm swagger:metadata && pnpm typecheck`
  - `pnpm test`
- Required doc updates:
  - 仅 `code-reviewer` 回写本 task 的 `Review status` / `Review Log` / `Final Status`
  - requirement 四行同步由 `parent` 根据本 task 的 sync lines 回写

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - `N/A`
- If not safe, list the shared files or contracts that require a single writer:
  - `session` snapshot / serialization contract 与 `rbac` 固定范围服务共享同一组 canonical scope 字段。
  - `inventory-core` DTO / service / repository、`reporting` DTO / service / repository、`rd-subwarehouse` / `inbound` / `workshop-material` / `project` 的调用口径都要同时依赖同一个 compatibility mapping。
  - `src/swagger-metadata.ts` 与多处 controller / DTO 共同暴露对外 contract。
  - 即使本轮不改 `prisma/schema.prisma`，schema 仍是所有临时 mapping 的冻结底座；多人并行很容易出现“有人按旧 workshop 语义继续写、有人按新 stockScope 语义半切换”的 contract drift。

## Review Log

- Validation results:
  - Re-read the scoped truth from `docs/tasks/task-20260330-1419-stock-scope-alignment.md`, `docs/architecture/00-architecture-overview.md`, `docs/architecture/20-wms-business-flow-and-optimized-schema.md`, `docs/architecture/modules/inventory-core.md`, `docs/architecture/modules/rd-subwarehouse.md`, `docs/architecture/modules/project.md`, `docs/architecture/modules/workshop-material.md`, and the NestJS review guidance skill.
  - Re-reviewed the current Phase 1 runtime surfaces directly, with special focus on `src/modules/session/domain/user-session.ts`, `src/modules/rbac/application/workshop-scope.service.ts`, `src/modules/rbac/application/rbac.service.ts`, `src/modules/inventory-core/application/stock-scope-compatibility.service.ts`, `src/modules/inventory-core/application/inventory.service.ts`, `src/modules/inventory-core/controllers/inventory.controller.ts`, `src/modules/reporting/**`, `src/modules/inbound/application/inbound.service.ts`, `src/modules/workshop-material/application/workshop-material.service.ts`, `src/modules/project/application/project.service.ts`, and `src/modules/rd-subwarehouse/application/{rd-handoff.service.ts,rd-stocktake-order.service.ts}`.
  - Re-reviewed the post-commit follow-up diff in `src/modules/inventory-core/application/inventory.service.spec.ts`, `src/modules/project/application/project.service.spec.ts`, `src/modules/rd-subwarehouse/application/rd-handoff.service.spec.ts`, `src/modules/workshop-material/application/workshop-material.service.spec.ts`, `test/prisma-e2e-stub.ts`, and regenerated `src/swagger-metadata.ts`.
  - Confirmed that, within this task's owned scope, the inventory-affecting business writers now call `inventory-core` with canonical `stockScope` rather than散落传入 `workshopId` 作为真实库存池：`inbound` 固定 `MAIN`、`rd-handoff` 固定 `MAIN -> RD_SUB`、`rd-stocktake` 固定 `RD_SUB`、`workshop-material` 由业务语义收敛到 `MAIN/RD_SUB`、`project` 通过兼容解析收敛到 `MAIN/RD_SUB`；`workshopId` 主要保留在会话 / RBAC / 查询入口兼容层与业务归属语义中。
  - Confirmed the post-commit spec fixes are aligned with the new contract: scoped specs now assert `stockScope` instead of旧 `workshopId` 库存池语义, and `inventory.service.spec.ts` injects `StockScopeCompatibilityService` so unit tests match the production DI boundary introduced by Phase 1.
  - Confirmed `PrismaE2eStub` seeding minimal `MAIN` / `RD` workshop records is a reasonable test-infrastructure repair for DB-less e2e bootstrap under the new canonical resolver path, because runtime now legitimately resolves `stockScope` through workshop master data; this does not mask a business bug in the scoped Phase 1 logic.
  - Parent reported `pnpm swagger:metadata` passed, `pnpm typecheck` passed, focused tests passed for `src/modules/session/infrastructure/session.repository.spec.ts`, `src/modules/rbac/application/rbac.service.spec.ts`, `src/modules/reporting/application/reporting.service.spec.ts`, `src/modules/inventory-core/application/inventory.service.spec.ts`, `src/modules/inbound/application/inbound.service.spec.ts`, `src/modules/workshop-material/application/workshop-material.service.spec.ts`, `src/modules/project/application/project.service.spec.ts`, and `src/modules/rd-subwarehouse/application/rd-handoff.service.spec.ts`.
  - Parent reported `test/batch-d-slice.e2e-spec.ts` passed, and the final gate `pnpm swagger:metadata && pnpm typecheck && pnpm test` passed.
- Findings:
  - none; this closing review found no open `[blocking]` or `[important]` issue in the scoped Phase 1 implementation or the post-commit contract-alignment fixes.
- Follow-up action:
  - none for this scoped review; parent can proceed with current remaining scoped changes.

## Final Status

- Outcome: `completed - Phase 1 delivered, validated, reviewed-no-findings`
- Requirement alignment: 当前交付满足本 task 定义的 `Phase 1` 口径：运行时已收敛出 canonical `stockScope` contract，并在 `session/rbac/inventory-core/reporting/inbound/workshop-material/project/rd-subwarehouse` 的 scoped surfaces 上作为真实库存范围真源；`inventory-core` 仍是唯一库存写入口；`workshop` 保持归属 / 核算语义；本轮没有偷偷扩张到 Prisma schema / generated client cutover。
- Residual risks or testing gaps:
  - `InventoryBalance` 及相关 Prisma 模型仍然以 `workshopId` 作为冻结存储维度；本次 sign-off 只证明 Phase 1 的 runtime compatibility boundary 可用，不替代后续真正的 schema / data cutover。
  - 仓库中仍有本 task scope 外的旧写路径继续沿用 `workshopId` 兼容口径（例如未纳入本 task owned paths 的模块）；这不构成本 task 的 blocking finding，但若后续想把 canonical `stockScope` 扩到更广业务面，建议另开独立 bounded slice。
- Directory disposition after completion: archived to `docs/tasks/archive/retained-completed/` together with the linked requirement after parent-owned center sync.
- Next action: 本切片已完成并归档；若后续继续推进库存维度真切换，再单独开 `Phase 2` schema / data cutover task。
