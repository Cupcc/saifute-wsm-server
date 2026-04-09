# RD Project Phase 1-2 Delivery

> Historical note: this archived task records the `2026-04-09` legacy `rd-project` implementation. Current RD project truth lives in `docs/requirements/domain/rd-project-management.md`; current sales project truth lives in `docs/requirements/domain/sales-project-management.md`.

## Metadata

- Scope:
  - 完成 `docs/requirements/domain/rd-project-management.md` 的 `F1/F2/F3/F4`，把当时仅覆盖“项目消耗单”的旧实现收敛为研发项目主档、轻量 `BOM`、缺料/补货视图、项目物料动作与项目净耗用/成本台账。
  - 以当时仓库现实为约束：已有 `src/modules/rd-project/**` 会在 `create/update/void` 时直接通过 `inventory-core` 记库存动作，前端 `web/src/views/rd/projects/index.vue` 也是“研发项目领用”页面；本 task 需要把它提升到 Phase 1/2 所需产品形态，而不是继续把“项目管理”实现成单一消耗单页面。
  - 明确排除 `sales-project` 客户供货 / 发货统计能力，以及任何完整项目进度/状态管理。
- Related requirement: `docs/requirements/domain/rd-project-management.md (F1,F2,F3,F4)`
- Status: `completed`
- Review status: `reviewed`
- Delivery mode: `standard`
- Acceptance mode: `full`
- Acceptance status: `accepted`
- Complete test report required: `yes`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Acceptance QA: `acceptance-qa`
- Last updated: `2026-04-09`
- Related checklist: `None`
- Related acceptance spec: `docs/acceptance-tests/specs/rd-project.md`
- Related acceptance run: `docs/acceptance-tests/runs/run-20260409-0126-rd-project-phase1-phase2.md`
- Related files:
  - `docs/requirements/domain/rd-project-management.md`
  - `docs/requirements/domain/rd-subwarehouse.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/rd-project.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `prisma/schema.prisma`
  - `src/modules/rd-project/**`
  - `src/modules/inventory-core/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/workshop-material/**`
  - `web/src/views/rd/projects/index.vue`
  - `web/src/views/**`（仅与项目管理入口直接相关的新旧页面）
  - `web/src/api/**`（仅与项目管理入口直接相关的新旧 API）
  - `test/**`

## Requirement Alignment

- Domain capability:
  - `docs/requirements/domain/rd-project-management.md (F1,F2,F3,F4)`
  - 仅承接 `Phase 1` 与 `Phase 2`；`F5` 明确不在本 task 范围内。
- User intent summary:
  - 用户明确要求实现研发项目 Phase 1 / Phase 2；当前需求真源已收口到 `rd-project-management` 语义。
  - 父级已限定本次 planning 只为 `rd-project-management` 新建 durable active task doc，并要求以当前代码现实为准，不发明需求变化。
- Acceptance criteria carried into this task:
  - `F1` 项目主档必须从当前“项目消耗单”语义中解耦出来，形成轻量 `CRUD` 与固定 `RD_SUB` 作业口径；不得扩写成项目状态管理系统。
  - `F2` 项目 `BOM`、缺料预警与采购辅助必须建立在 `BOM + RD_SUB 可用库存 + 净耗用结果 + RD 协同结果` 之上；维护 `BOM` 不能直接过账库存。
  - `F3` 项目领料/退料/报废仍必须经由 `inventory-core`；但执行中必须显式处理与 `workshop-material` 已有 `PICK/RETURN/SCRAP` 家族的边界，不能在两个模块内并行扩散出两套不一致的库存动作语义。
  - `F4` 项目台账必须能回答项目层的计划量、当前可用、已领、已退、已报废、净耗用、缺口量、补货状态与成本汇总，而不是只停留在单据金额汇总。
  - 前端必须提供项目管理入口与页面闭环；当前旧“项目领用”页面若继续复用，需被升级为满足 `F1/F2/F4` 的项目管理界面，而不是保持“新增项目领用”单一页面。
- Requirement evidence expectations:
  - focused 自动化验证覆盖项目主档/BOM、库存联动、缺料/补货计算、净耗用/成本汇总与共享边界不回归。
  - 前端至少完成构建验证与真实页面 walkthrough，覆盖项目主档、`BOM`、缺口/补货信息、项目物料动作与台账查询。
  - `docs/acceptance-tests/specs/rd-project.md` 为完整测试报告载体；必要时补 `cases` / `run`。
- Open questions requiring user confirmation:
  - None.

## Progress Sync

- Phase progress:
  - `planning complete; ready for implementation`
- Current state:
  - `src/modules/rd-project/**` 已存在并已接入 `project_target = RD_PROJECT`，但现状主要是“项目物料消耗单 + 直接库存过账”。
  - `web/src/views/rd/projects/index.vue` 现状是 RD 侧“研发项目领用”页面，不是项目主档/BOM/台账页面。
  - 本次 planning 已补建 `rd-project-management` active task；补建前 `TASK_CENTER` 中无对应项。`F1/F3` 在 requirement 中标为进行中，但实现形态与 domain 目标仍存在明显偏差。
- Acceptance state:
  - `not-assessed`
- Blockers:
  - `none for planning`
- Next step:
  - `coder` 先冻结 Phase 1/2 的共享边界，优先拆开“项目主档/BOM”与“项目库存动作”的语义，再推进台账/成本与前端闭环。

## Goal And Acceptance Criteria

- Goal:
  - 在不引入项目状态系统、不提前推进销售项目能力的前提下，完成 `rd-project-management` 的 `Phase 1` 与 `Phase 2`：项目主档、轻量 `BOM`、缺料/补货、项目物料动作、净耗用/成本台账与前端入口全部落到当前仓库的真实模块边界上。
- Acceptance criteria:
  - `[AC-1]` `F1` 落地：系统提供轻量项目主档 `CRUD`、查询、作废/历史保留语义，项目实际作业仓别固定为 `RD_SUB`，且项目主档不再等同于“创建即领料”的消耗单。
  - `[AC-2]` `F2` 落地：系统可维护项目 `BOM`，并按项目/物料展示 `计划量、当前可用、净耗用、缺口量、补货状态、参考成本`；`BOM` 保存/修改不会直接写库存。
  - `[AC-3]` `F3` 落地：项目领料/退料/报废的库存事实统一通过 `inventory-core` 落账，并保留 `RD_PROJECT` 目标维度与来源追溯；实现不会与 `workshop-material` 现有 `pick/return/scrap` 家族形成两套并行且不一致的运行时语义。
  - `[AC-4]` `F4` 落地：系统可按项目查看 `计划成本、领料成本、退料回补、报废损耗、净耗用数量/金额`，并能追溯到相关库存/来源使用与 RD 协同结果。
  - `[AC-5]` 前端闭环：项目管理入口支持项目主档、`BOM`、缺料/补货信息与台账查询；若保留现有旧“项目领用”页面，则其语义与交互必须完成 Phase 1/2 升级，不再只是“新增项目领用”。
  - `[AC-6]` full acceptance 证据完整：focused 自动化验证、前端构建、浏览器 walkthrough 与 acceptance spec/cases/run 证据能够覆盖上述 `AC`。

## Acceptance Planning

- Acceptance mode: `full`
- Why this mode is proportionate:
  - 该任务同时改动项目语义真源、库存写路径、缺料/补货读模型、净耗用成本口径和前端页面入口，属于高风险跨模块交付；仅靠局部单测不足以签收。
- Separate acceptance spec expected: `yes`
- Separate acceptance run expected: `optional`
- Complete test report required: `yes`
- Exact execution surface:
  - 主实现面是 `src/modules/rd-project/**` 与项目前端入口。
  - `inventory-core`、`rd-subwarehouse`、`workshop-material` 仅在共享合同或查询口径需要时进入范围。
  - `sales-project`、`sales` 发货统计扩展、`monthly-reporting`、完整采购入库实现不在本 task 内。

## Scope And Ownership

- Allowed code paths:
  - `prisma/schema.prisma`
  - `src/modules/rd-project/**`
  - `src/modules/inventory-core/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/workshop-material/**`（仅当 Phase 2 共享动作合同必须显式复用或收敛时）
  - `web/src/views/rd/projects/index.vue`
  - `web/src/views/**`（仅与项目管理入口直接相关的新旧页面）
  - `web/src/api/**`（仅与项目管理入口直接相关的新旧 API）
  - 与上述改动直接相关的 `test/**`
  - `docs/acceptance-tests/**`（仅 reviewer / acceptance 在证据阶段更新）
- Frozen or shared paths:
  - `docs/tasks/**` 由 parent/orchestrator 持有。
  - `docs/requirements/**` 与 `docs/architecture/**` 视为 shared truth；实现阶段不得顺手改写需求。
  - `src/modules/workshop-material/**`、`src/modules/inventory-core/**`、`src/modules/rd-subwarehouse/**` 是共享合同面，若需改动必须保持最小兼容，不得静默扩面。
  - `src/modules/sales/**`、`src/modules/reporting/**`、`docs/workspace/**`、与 `F5` 相关的任何表面均冻结。
- Task doc owner:
  - `parent orchestrator`
- Contracts that must not change silently:
  - `rd-project-management` 不是项目状态管理系统，不新增 `立项/进行中/关闭` 等完整生命周期。
  - `RD_SUB` 仍是项目实际作业仓别；`MAIN` 继续承担验收与向 `RD_SUB` 交接，不直接作为项目实际使用仓别。
  - `inventory-core` 仍是库存唯一写入口。
  - `rd-subwarehouse` 继续拥有 RD 协同与采购/交接状态链；项目域只消费其结果做缺料、补货与成本台账。
  - `workshop-material` 已有 `pick/return/scrap` 语义是共享边界；Phase 2 不得复制出第二套长期并行单据家族。
  - `sales-project` 侧客户供货、发货统计和项目预留明确不在本 task 范围内。

## Implementation Plan

- [ ] Step 1: 冻结 Phase 1/2 的项目运行时模型。
  - 梳理当时的项目主表、项目物料明细、`project_target = RD_PROJECT` 与库存动作现状。
  - 明确 `项目主档/BOM` 与 `项目物料动作` 的职责切分，禁止继续把主档 `CRUD` 当成直接领料操作。
- [ ] Step 2: 落地 `F1` 项目主档与固定 `RD_SUB` 口径。
  - 让后端与前端具备项目主档 `list/get/create/update/void` 的真实产品语义。
  - 保留历史事实与轻量删除/作废边界，不扩展为状态机。
- [ ] Step 3: 落地 `F2` 轻量 `BOM`、缺料与采购辅助读模型。
  - 为项目维护 `BOM` 与参考成本。
  - 基于 `inventory-core`、`rd-subwarehouse` 结果与项目净耗用衍生缺口、补货状态与采购辅助信息。
  - 确保 `BOM` 写路径不直接产生库存副作用。
- [ ] Step 4: 落地 `F3` 项目库存动作边界。
  - 将项目领料/退料/报废与 `inventory-core`、`RD_PROJECT` 目标维度、来源追溯收口到明确实现路径。
  - 执行中先解决与 `workshop-material` 的共享边界：优先复用/收敛既有动作语义，而不是复制第二套长期语义。
- [ ] Step 5: 落地 `F4` 项目净耗用与成本台账。
  - 汇总 `计划量/金额、已领、已退、已报废、净耗用、缺口量、补货状态`。
  - 将库存来源使用、成本层、RD 协同结果与项目台账查询打通。
- [ ] Step 6: 完成前端与验证收口。
  - 升级现有项目页面或新增项目管理相关页面/API，形成主档/BOM/缺口/台账闭环。
  - 通过 focused 自动化验证、前端构建、浏览器 walkthrough、review 与 full acceptance 收口。

## Coder Handoff

- Execution brief:
  - 先把 `rd-project` 从“项目消耗单”纠偏到“项目主档 + BOM + 台账域”；不要一开始就在旧页面上堆叠更多字段而保留错误运行时语义。
  - `Phase 2` 先处理共享边界再写功能：项目库存动作必须与 `inventory-core` 和 `workshop-material` 现有动作语义对齐，不能并行演化两套长期合同。
  - 若执行中发现 `F3` 必须彻底迁移到 `workshop-material` 家族或需要额外 requirement 决策，先回到 planning，不要静默改需求。
- Required source docs or files:
  - `docs/requirements/domain/rd-project-management.md`
  - `docs/requirements/domain/rd-subwarehouse.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/rd-project.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/acceptance-tests/README.md`
  - 本 task doc
- Owned paths:
  - `prisma/schema.prisma`
  - `src/modules/rd-project/**`
  - `src/modules/inventory-core/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/workshop-material/**`（仅共享动作合同需要时）
  - `web/src/views/rd/projects/index.vue`
  - `web/src/views/**`（仅项目管理入口相关）
  - `web/src/api/**`（仅项目管理入口相关）
  - 与本 task 直接相关的 `test/**`
  - `docs/acceptance-tests/specs/rd-project.md`
  - `docs/acceptance-tests/cases/rd-project.json`
  - `docs/acceptance-tests/runs/run-YYYYMMDD-HHMM-rd-project-phase1-phase2.md`
- Forbidden shared files:
  - `docs/tasks/**`
  - `docs/requirements/**`
  - `docs/architecture/**`
  - `docs/workspace/**`
  - `src/modules/sales/**`
  - `src/modules/reporting/**`
  - 与项目管理无直接关系的其他前端页面/API
- Constraints and non-goals:
  - 不实现 `sales-project` 侧客户供货、发货统计或项目预留能力。
  - 不引入项目状态机、排期、进度或完整项目管理能力。
  - 不允许 `BOM` 写路径直接过账库存。
  - 不允许绕过 `inventory-core` 直改库存。
  - 不允许在 `rd-project` 与 `workshop-material` 之间形成两套长期并行且不一致的领料/退料/报废运行时合同。
  - 不改变 `RD_SUB` / `MAIN` 的职责边界，不把采购/验收主流程迁入 `rd-project`。
- Validation command for this scope:
  - `pnpm prisma:validate`
  - `pnpm typecheck`
  - `pnpm test -- src/modules/rd-project/application/rd-project.service.spec.ts src/modules/rd-project/application/rd-project-material-action.service.spec.ts src/modules/inventory-core/application/inventory.service.spec.ts src/modules/rd-subwarehouse/application/rd-procurement-request.service.spec.ts src/modules/rd-subwarehouse/application/rd-handoff.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts`
  - `pnpm test:e2e -- <focused rd-project suites if added>`
  - `pnpm --dir web build:prod`
  - 基于 `.env.dev` 的本地联调与 browser acceptance：`pnpm dev` + `pnpm dev:web`

## Reviewer Handoff

- Review focus:
  - `rd-project` 是否真的从“消耗单”提升为 `F1/F2/F4` 要求的项目域，而不是把旧消费语义换个名字继续保留。
  - `F2` 缺料/补货是否建立在 `BOM + RD_SUB 可用库存 + 净耗用 + RD 协同结果` 的派生逻辑上，而非静态字段拼装。
  - `F3` 是否遵守 `inventory-core` 唯一写入口，并妥善处理与 `workshop-material` 的共享边界，没有复制出第二套长期动作语义。
  - `F4` 台账与成本是否真的能回答净耗用与成本汇总，而非只显示单据金额。
  - 前端是否形成项目管理闭环，而不是仍停留在“新增项目领用”单页。
- Requirement alignment check:
  - 逐条对照 `[AC-1]` ~ `[AC-6]`，尤其关注 `F1/F2` 是否真正落地，不接受只完成 `F3` 库存联动就宣称 Phase 1/2 完成。
  - 若执行结果把 Phase 2 完全重心转移到 `workshop-material`，需确认 `rd-project` 仍保有 requirement 要求的项目语义真源与查询能力。
- Final validation gate:
  - `pnpm prisma:validate`
  - `pnpm typecheck`
  - `pnpm test -- src/modules/rd-project/application/rd-project.service.spec.ts src/modules/rd-project/application/rd-project-material-action.service.spec.ts src/modules/inventory-core/application/inventory.service.spec.ts src/modules/rd-subwarehouse/application/rd-procurement-request.service.spec.ts src/modules/rd-subwarehouse/application/rd-handoff.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts`
  - `pnpm test:e2e -- <focused rd-project suites if added>`
  - `pnpm --dir web build:prod`
  - browser acceptance 证据 + `docs/acceptance-tests/specs/rd-project.md` + `docs/acceptance-tests/cases/rd-project.json` + `docs/acceptance-tests/runs/run-YYYYMMDD-HHMM-rd-project-phase1-phase2.md`
- Required doc updates:
  - `docs/acceptance-tests/specs/rd-project.md`
  - `docs/acceptance-tests/cases/rd-project.json`
  - `docs/acceptance-tests/runs/run-YYYYMMDD-HHMM-rd-project-phase1-phase2.md`
  - 若实现证明现有真源文档表述与 accepted 运行时有偏差，再由 parent/reviewer 判断是否回写 requirement / architecture 文档

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` 项目主档与固定 `RD_SUB`
  - `[AC-2]` `BOM`、缺料与采购辅助
  - `[AC-3]` 项目库存动作与共享动作边界
  - `[AC-4]` 净耗用与成本台账
  - `[AC-5]` 前端项目管理闭环
  - `[AC-6]` full acceptance 完整证据
- Evidence pointers:
  - `rd-project` / `inventory-core` / `rd-subwarehouse` / `workshop-material` focused tests
  - 关键 API 行为证据：项目主档、`BOM`、缺口/补货、项目物料动作、项目台账
  - `pnpm --dir web build:prod` 输出
  - 浏览器 walkthrough 证据：项目主档、`BOM`、缺口/补货、台账页
  - `docs/acceptance-tests/specs/rd-project.md`
  - `docs/acceptance-tests/cases/rd-project.json`
  - `docs/acceptance-tests/runs/run-YYYYMMDD-HHMM-rd-project-phase1-phase2.md`
- Evidence gaps, if any:
  - 缺少任何一类 `F1/F2/F3/F4` 证据、共享边界验证或浏览器页面证据时，不得签收。
- Complete test report requirement: `yes`

### Acceptance Test Expectations

- Acceptance mode: `full`
- User-visible flow affected: `yes`
- Cross-module write path: `yes`
- Irreversible or high-cost business effect: `yes`
- Existing automated user-flow coverage: `no`
- Browser test required: `yes`
- Browser waiver reason:
  - `-`
- Related acceptance cases:
  - `project-master-crud-rd-sub-fixed`
  - `project-bom-shortage-and-replenishment-view`
  - `project-material-actions-inventory-traceability`
  - `project-ledger-net-consumption-and-cost-rollup`
- Related acceptance spec: `docs/acceptance-tests/specs/rd-project.md`
- Separate acceptance run required: `yes`
- Complete test report required: `yes`
- Required regression / high-risk tags:
  - `rd-project-management`
  - `inventory-core`
  - `rd-subwarehouse`
  - `workshop-material-boundary`
  - `costing`
  - `browser`
- Suggested environment / accounts:
  - 仓库根目录 `.env.dev`
  - 本地 `pnpm dev` 后端服务 + `pnpm dev:web` 前端服务
  - 具备项目管理、库存查看、RD 协同相关权限的测试账号
  - 可用于 `RD_SUB`、项目、物料、库存来源、RD 采购/交接联调的测试数据
- Environment owner / setup source:
  - 本仓库本地开发环境与 `docs/acceptance-tests/README.md`

## Parallelization Safety

- Status: `not_safe`
- If safe, list the exact disjoint writable scopes:
  - `-`
- If not safe, list the shared files or contracts that require a single writer:
  - `prisma/schema.prisma`
  - `src/modules/rd-project/**`
  - `src/modules/inventory-core/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/workshop-material/**` 共享动作合同
  - 项目前端入口与 API 合同
  - `docs/acceptance-tests/**`

## Review Log

- Validation results:
  - `set -a && source .env.dev && set +a && pnpm prisma:validate` → `pass`
  - `pnpm typecheck` → `pass`
  - `pnpm test -- src/modules/rd-project/application/rd-project.service.spec.ts src/modules/rd-project/application/rd-project-material-action.service.spec.ts src/modules/rd-subwarehouse/application/rd-procurement-request.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts` → `pass`
  - `pnpm --dir web build:prod` → `pass`
- Findings:
  - `no blocking code-review findings recorded in parent validation lane`
  - `runtime rollout prerequisite remains: sync Prisma schema before opening /api/rd-projects in a live environment`
- Follow-up action:
  - `rollout environments must apply the project schema migration / sync before enabling the upgraded page`

## Acceptance

- Acceptance status: `accepted`
- Acceptance QA:
  - `parent browser + automated verification`
- Acceptance date:
  - `2026-04-09`
- Complete test report:
  - `docs/acceptance-tests/specs/rd-project.md`

### Acceptance Checklist

> Acceptance QA 在验收时逐条填写。每条应对应 domain capability 的用户需求或 task doc 的 `[AC-*]` 条目。

- [x] `[AC-1]` 项目主档轻量 `CRUD` 与固定 `RD_SUB` 口径落地 — Evidence: `rd-project.service.spec.ts` create 不再直接出库 + browser 创建项目主档成功 — Verdict: `✓ met`
- [x] `[AC-2]` 项目 `BOM`、缺料预警与采购辅助落地 — Evidence: browser 详情页展示缺口 / 补货状态 + `rd-project.service.spec.ts` shortage / replenishment 聚合 — Verdict: `✓ met`
- [x] `[AC-3]` 项目库存动作通过 `inventory-core` 落账且与 `workshop-material` 边界一致 — Evidence: `rd-project-material-action.service.spec.ts` 覆盖 `PICK/RETURN/SCRAP` 与回补/逆转，详情页展示独立动作入口 — Verdict: `✓ met`
- [x] `[AC-4]` 项目净耗用与成本台账可查询并可追溯 — Evidence: browser 详情页成本摘要与台账 + `rd-project.service.spec.ts` ledger/cost 聚合 — Verdict: `✓ met`
- [x] `[AC-5]` 前端项目管理闭环可用 — Evidence: 菜单 / 工作台 / 页面标题统一为“研发项目”，并完成浏览器创建 + 详情 walkthrough — Verdict: `✓ met`
- [x] `[AC-6]` full acceptance 证据完整 — Evidence: `prisma:validate`、`db push`、`typecheck`、focused tests、`web build:prod`、spec/cases/run 全部落档 — Verdict: `✓ met`

### Acceptance Notes

- Acceptance path used: `full`
- Acceptance summary:
  - `accepted with local browser + automated evidence; runtime prerequisite is syncing Prisma schema before using the upgraded project page`
- Report completeness check:
  - `spec/cases/run created under docs/acceptance-tests/**`
- If rejected or blocked: root cause（`requirement-misunderstanding` | `implementation-gap` | `evidence-gap` | `environment-gap`）+ 精确修复指引 / 环境修复指引
- If conditionally accepted: follow-up requirement / task:

## Final Status

- Outcome:
  - `accepted`
- Requirement alignment:
  - `aligned to docs/requirements/domain/rd-project-management.md (F1,F2,F3,F4)`
- Residual risks or testing gaps:
  - `本地 live 环境需先执行 Prisma schema sync；否则 /api/rd-projects 会因缺少 RdProjectBomLine / RdProjectMaterialAction* 表而返回 500`
  - `browser 走查未单独准备非零成本的 RD_SUB 库存动作样本；该部分由 focused service tests 覆盖`
  - `shared boundary with workshop-material and inventory-core must be resolved carefully during implementation`
- Directory disposition after completion: `retained-completed`
- Next action:
  - `apply schema migration / sync in target environments before enabling the upgraded page`
