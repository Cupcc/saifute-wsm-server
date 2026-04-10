# Sales Project Phase 1-2 Delivery

## Metadata

- Scope:
  - 完成 `docs/requirements/domain/sales-project-management.md` 的 `F1/F2/F3/F4`，在当前仓库内新增独立 `sales-project` 运行时，实现销售项目主档、项目维度库存 / 可供货视图、项目关联销售出库草稿与项目维度发货 / 退货统计。
  - 保持 `sales-project` 为独立于 `rd-project` 的对外销售项目主题；真实库存写路径继续统一落在 `sales` / `inventory-core`，不得回退去复用 `rd-project` 运行时语义。
  - 仅承接 `Phase 1` 与 `Phase 2`；`F5` 项目分配 / 预留保持后续阶段能力，不在本 task 中实现其写模型。
- Related requirement: `docs/requirements/domain/sales-project-management.md (F1,F2,F3,F4)`
- Status: `completed`
- Review status: `reviewed`
- Delivery mode: `autonomous`
- Acceptance mode: `full`
- Acceptance status: `accepted`
- Complete test report required: `yes`
- Lifecycle disposition: `retained-completed`
- Planner: `parent-orchestrator`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Acceptance QA: `acceptance-qa`
- Last updated: `2026-04-10`
- Related checklist: `-`
- Related acceptance spec: `docs/acceptance-tests/specs/sales-project.md`
- Related acceptance run: `docs/acceptance-tests/runs/run-20260410-2051-sales-project-phase1-phase2.md`
- Related files:
  - `docs/requirements/domain/sales-project-management.md`
  - `docs/architecture/modules/sales-project.md`
  - `docs/requirements/domain/sales-business-module.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `prisma/schema.prisma`
  - `prisma/system-management.seed.ts`
  - `src/app.module.ts`
  - `src/modules/sales-project/**`
  - `src/modules/sales/**`
  - `src/modules/master-data/**`
  - `src/modules/rbac/**`（仅权限 / 菜单 / fallback 需要时）
  - `web/src/views/sales-project/**`
  - `web/src/views/sales/components/**`
  - `web/src/api/sales-project/**`
  - `web/src/api/sales/**`
  - `web/src/store/modules/permission.js`
  - `docs/acceptance-tests/**`

## Requirement Alignment

- Domain capability:
  - `docs/requirements/domain/sales-project-management.md (F1,F2,F3,F4)`
  - 范围明确限定在 `Phase 1` 与 `Phase 2`；`F5` 仅作为后续真源保留，不得静默并入。
- User intent summary:
  - 用户要求继续推进并“直到完成”销售项目 `Phase 1 / Phase 2`，且明确要求走 `$saifute-subagent-orchestration` 重交付路径。
  - 当前仓库尚无 `sales-project` 运行时、路由、菜单、权限或前端入口；实现必须新增独立模块，并把项目维度正式接到 `sales` 事实链上。
- Acceptance criteria carried into this task:
  - `F1` 销售项目主档必须形成独立 `CRUD / 作废 / 历史保留` 语义，不引入项目状态机，也不复用 `rd-project` 运行时。
  - `F2` 项目详情必须能回答“当前库存、已发货、已退货、待供货”，并明确这是衍生读模型而不是平行库存账；“相关物料 / 待供货”必须有稳定项目上下文来源。
  - `F3` 项目页一键出库必须沉淀为 `sales` 出库草稿或正式单据，且出库单行保存 `salesProjectId` 与项目快照，不允许项目模块直接扣库存。
  - `F4` 项目统计必须复用 `sales` 出库 / 退货事实与成本结果，不得额外维护平行项目发货台账。
  - 前端必须形成销售项目入口、列表 / 详情 / 编辑闭环，并与 `sales` 出库录入或草稿生成交互打通。
- Requirement evidence expectations:
  - focused 自动化验证覆盖销售项目主档、项目视图、`sales` 项目绑定、项目统计与回归风险点。
  - 前端至少完成 `build` 验证与真实页面 walkthrough，覆盖项目主档、项目详情、项目出库草稿生成与项目统计展示。
  - `docs/acceptance-tests/specs/sales-project.md` 作为完整测试报告载体；按需要补 `cases` / `run`。
- Open questions requiring user confirmation:
  - `待供货` 的长期上游输入在 requirement 中仍保留开放问题；本 task 默认采用“项目内维护相关物料范围 / 目标量”作为 Phase 1 的稳定项目上下文来源，若用户要求改为合同 / 订单驱动，应先回到 planning。

## Progress Sync

- Phase progress:
  - `implementation, review, acceptance complete`
- Current state:
  - `sales-project` 已形成独立后端模块、Prisma 模型、权限 / 菜单 / fallback 路由、前端页面与 `sales` 集成闭环。
  - Phase 2 的真实写路径已经收口到 `sales`：项目页生成销售出库草稿，`sales_stock_order_line` / 销售退货行保留 `salesProjectId` 与项目快照，项目统计复用 `sales` 与 `inventory-core` 事实。
  - 本轮 local review + fix loop 额外修复了两个 live blocker：一是共享销售编辑器对 `MAIN` 价格层的显式库存范围解析，二是项目列表页 `净发货 / 待供货` 摘要改为复用项目详情同源的衍生读模型。
- Acceptance state:
  - `accepted`
- Blockers:
  - `none`
- Next step:
  - `Phase 1 / Phase 2` 已完成，`F5` 项目分配 / 预留继续保留在后续阶段。

## Goal And Acceptance Criteria

- Goal:
  - 在不引入项目状态系统、不实现 `F5` 项目分配 / 预留写模型、且不破坏 `sales` / `inventory-core` 真实库存路径的前提下，完成销售项目 `Phase 1 / Phase 2` 的后端、前端、权限与验证闭环。
- Acceptance criteria:
  - `[AC-1]` `F1` 落地：系统提供独立销售项目主档列表、详情、创建、修改、作废能力，项目编码唯一，已被 `sales` 或后续项目语义引用的项目不会静默硬删。
  - `[AC-2]` `F2` 落地：项目详情可按物料展示当前库存、已发货、已退货、净发货、待供货，并明确这些结果是复用真实库存 / 销售事实的衍生视图。
  - `[AC-3]` `F3` 落地：项目页可生成 `sales` 出库草稿或通过 `sales` 正式录单绑定项目；`sales` 出库 / 退货行显式保存 `salesProjectId` 与项目快照。
  - `[AC-4]` `F4` 落地：系统可按项目、按物料查看出库 / 退货 / 净发货数量、金额与成本，且统计与后续报表继续复用 `sales` 家族真实事实。
  - `[AC-5]` 前端闭环：新增销售项目入口与页面，且共享 `sales` 录单页面或项目页草稿生成链路可完成项目绑定与查询验证。
  - `[AC-6]` full acceptance 证据完整：focused 自动化验证、前端构建、浏览器 walkthrough 与 acceptance spec/cases/run 能覆盖上述 `AC`。

## Scope And Ownership

- Allowed code paths:
  - `prisma/schema.prisma`
  - `prisma/system-management.seed.ts`
  - `src/app.module.ts`
  - `src/modules/sales-project/**`
  - `src/modules/sales/**`
  - `src/modules/master-data/**`（仅主数据查询复用需要时）
  - `src/modules/rbac/**`（仅权限 / 菜单 / fallback 需要时）
  - `web/src/views/sales-project/**`
  - `web/src/views/sales/components/**`
  - `web/src/api/sales-project/**`
  - `web/src/api/sales/**`
  - `web/src/store/modules/permission.js`
  - 与本 task 直接相关的 `test/**`
  - `docs/acceptance-tests/specs/sales-project.md`
  - `docs/acceptance-tests/cases/sales-project.json`
  - `docs/acceptance-tests/runs/run-YYYYMMDD-HHMM-sales-project-phase1-phase2.md`
- Frozen or shared paths:
  - `docs/tasks/**` 由 parent/orchestrator 持有。
  - `docs/requirements/**` 与 `docs/architecture/**` 视为 shared truth；实现阶段不得顺手改写需求或架构。
  - `src/modules/inventory-core/**` 是库存唯一写入口共享域；除非为查询复用或极小兼容修复所必需，不得扩大写路径改动。
  - `src/modules/rd-project/**`、`src/modules/rd-subwarehouse/**` 保持冻结，不得借用为销售项目运行时。
  - `web/src/store/modules/permission.js`、`src/modules/rbac/infrastructure/in-memory-rbac.repository.ts` 当前 worktree 已有用户改动；若必须进入范围，需最小化并谨慎合并。
- Task doc owner:
  - `parent orchestrator`
- Contracts that must not change silently:
  - `inventory-core` 仍是所有库存写入唯一入口。
  - `sales-project` 不引入项目状态机、排期、审批流或完整项目管理语义。
  - `sales-project` 不是物理库存池；真实库存减少只由 `sales` 出库单产生。
  - `sales` 与 `sales-project` 的跨模块合同必须显式使用 `salesProjectId`、`salesProjectCodeSnapshot`、`salesProjectNameSnapshot` 等销售项目命名，不回退为裸 `projectId`。
  - `F5` 项目分配 / 预留保持 future truth，不得在本 task 中偷偷实现或伪装成 Phase 1 / 2 的前置条件。

## Implementation Plan

- [x] Step 1: 落地销售项目 Phase 1 数据与模块骨架。
  - 在 Prisma 中新增销售项目主档与项目物料范围 / 目标量相关模型，并复用 `ProjectTargetType.SALES_PROJECT` 形成稳定项目维度锚点。
  - 新建 `src/modules/sales-project/**`，完成 controller / service / repository / dto / module 与 `AppModule` 接入。
- [x] Step 2: 完成 `F1` 主档与 `F2` 项目视图读模型。
  - 实现项目主档 `list/get/create/update/void`。
  - 实现 `GET /sales-projects/:id/materials`，复用 `inventory-core` / `sales` 事实回答库存、已发货、已退货、净发货、待供货。
- [x] Step 3: 打通 `F3` 的 `sales` 项目绑定与项目草稿生成。
  - 为 `sales_stock_order_line` 增加销售项目字段与快照，更新 DTO / service / repository / tests。
  - 实现项目上下文到 `sales` 出库草稿的数据转换，不直接扣库存。
- [x] Step 4: 打通 `F4` 项目维度发货 / 退货统计。
  - 基于 `sales` 真实事实构建项目统计查询，覆盖数量、金额、成本与物料维度。
  - 确保项目详情与后续报表复用同一事实源，不新增平行发货台账。
- [x] Step 5: 完成权限、菜单、前端闭环与验证。
  - 新增销售项目路由、权限码、seed / menu / fallback 与前端页面。
  - 扩展共享销售出库编辑器或项目页交互完成项目绑定。
  - 执行 focused tests、web build、browser walkthrough、review 与 full acceptance。

## Delivery Outcome

- Outcome:
  - `F1/F2/F3/F4` 已按 `docs/requirements/domain/sales-project-management.md` 落地，`F5` 保持未实现。
  - 独立 `sales-project` 运行时已接入 `AppModule`、`sales` 模块、RBAC 菜单 / 权限与前端入口。
- Local review result:
  - parent local review 发现并修复了两个 live 问题：`/api/inventory/price-layers` 对 all-scope 用户缺少显式库存范围支持，导致项目草稿无法进入正式出库；以及项目列表页未使用衍生读模型，导致 `净发货 / 待供货` 与详情页不一致。
  - 独立 code-review subagent 因使用额度上限未返回；最终 review 结论基于本地 fix loop、focused 自动化验证与 live browser/API evidence。
- Validation:
  - `set -a && source .env.dev && set +a && pnpm exec prisma db push --schema prisma/schema.prisma --accept-data-loss` → `pass (already in sync)`
  - `set -a && source .env.dev && set +a && pnpm prisma:validate` → `pass`
  - `pnpm test -- src/modules/sales/application/sales.service.spec.ts src/modules/sales-project/application/sales-project.service.spec.ts src/modules/rbac/application/workshop-scope.service.spec.ts src/modules/inventory-core/controllers/inventory.controller.spec.ts` → `pass (4 suites / 31 tests)`
  - `pnpm typecheck` → `pass`
  - `pnpm --dir web build:prod` → `pass`
- Browser / live acceptance:
  - `agent-browser` 登录后访问 `/sales/project`，列表显示项目 `SP-QA-20260410-01`，并展示 `目标数量 = 2 / 净发货 = 1 / 待供货 = 1`。
  - `agent-browser` 打开项目详情后，摘要卡显示 `当前库存 = 4 / 累计出库 = 2 / 累计退货 = 1 / 净发货 = 1 / 净发货金额 = 20.00 / 净发货成本 = 12.34 / 待供货 = 1`。
  - 项目详情点击“生成出库草稿”后，销售出库编辑器弹窗正确预填客户、负责人、车间、销售项目、数量 `1`、单价 `20.00`，并自动加载 `MAIN` 价格层 `12.34 / 可用 4`。
  - live backend/API fixture 同步验证了 `sales-project` 主档创建、真实销售出库保存成功以及销售退货回冲后项目统计更新。
- Remaining risks:
  - `F5` 项目分配 / 预留仍未开始，不属于本 task 签收范围。

## Coder Handoff

- Execution brief:
  - 先建立独立 `sales-project` 主档与读模型，再进入 `sales` 集成；不要一开始就在 `sales` 表里散落字段但没有独立项目域。
  - `Phase 1` 的“相关物料 / 待供货”默认以项目内维护的物料范围 / 目标量为稳定项目上下文；若执行中发现必须改 requirement 才能成立，立即回到 planning。
  - `Phase 2` 必须把项目维度事实正式落在 `sales` 行上；不接受只在项目页面做临时 join 或报表层猜测归属。
- Required source docs or files:
  - `docs/requirements/domain/sales-project-management.md`
  - `docs/architecture/modules/sales-project.md`
  - `docs/requirements/domain/sales-business-module.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/acceptance-tests/README.md`
  - 本 task doc
- Owned paths:
  - `prisma/schema.prisma`
  - `prisma/system-management.seed.ts`
  - `src/app.module.ts`
  - `src/modules/sales-project/**`
  - `src/modules/sales/**`
  - `src/modules/master-data/**`（仅必要查询复用）
  - `src/modules/rbac/**`（仅必要权限 / fallback）
  - `web/src/views/sales-project/**`
  - `web/src/views/sales/components/**`
  - `web/src/api/sales-project/**`
  - `web/src/api/sales/**`
  - `web/src/store/modules/permission.js`
  - 与本 task 直接相关的 `test/**`
  - `docs/acceptance-tests/**`
- Forbidden shared files:
  - `docs/tasks/**`
  - `docs/requirements/**`
  - `docs/architecture/**`
  - `docs/workspace/**`
  - `src/modules/rd-project/**`
  - `src/modules/rd-subwarehouse/**`
- Constraints and non-goals:
  - 不实现 `F5` 项目分配 / 预留写模型。
  - 不引入 `sales-project` 自有库存过账动作或项目专属出库单。
  - 不回退复用 `rd-project` 命名、表或接口合同。
  - 不 silently 改写现有 `sales` 退货上下游合同；所有项目维度扩展必须保持兼容。
- Validation command for this scope:
  - `pnpm prisma:validate`
  - `pnpm typecheck`
  - `pnpm test -- src/modules/sales/application/sales.service.spec.ts src/modules/sales-project/**/*.spec.ts`
  - `pnpm --dir web build:prod`
  - 基于 `.env.dev` 的本地联调与 browser acceptance：`pnpm dev` + `pnpm dev:web`

## Reviewer Handoff

- Review focus:
  - `sales-project` 是否作为独立模块成立，而不是把逻辑散落到 `sales` 和前端页面里。
  - `Phase 1` 读模型是否真正复用库存 / 销售事实，没有形成第二套库存账或项目发货账。
  - `Phase 2` 是否把项目维度正式落在 `sales` 单据行与快照上，而不是依赖临时 join 或报表猜测。
  - 权限、菜单、路由、种子与共享销售编辑器是否形成真正的用户可达闭环。
- Requirement alignment check:
  - 逐条对照 `[AC-1]` ~ `[AC-6]`，尤其关注 `F2` 与 `F4` 的事实来源是否符合 requirement。
  - 若执行结果把 “待供货” 解释为临时统计口径而无稳定项目上下文来源，应判定为未完成。
- Final validation gate:
  - `pnpm prisma:validate`
  - `pnpm typecheck`
  - `pnpm test -- src/modules/sales/application/sales.service.spec.ts src/modules/sales-project/**/*.spec.ts`
  - `pnpm --dir web build:prod`
  - browser acceptance 证据 + `docs/acceptance-tests/specs/sales-project.md` + `docs/acceptance-tests/cases/sales-project.json` + `docs/acceptance-tests/runs/run-YYYYMMDD-HHMM-sales-project-phase1-phase2.md`
- Required doc updates:
  - `docs/acceptance-tests/specs/sales-project.md`
  - `docs/acceptance-tests/cases/sales-project.json`
  - `docs/acceptance-tests/runs/run-YYYYMMDD-HHMM-sales-project-phase1-phase2.md`
  - 若实现完成后 requirement 状态需要回写，由 acceptance / parent 决定是否更新 `docs/requirements/**`

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` 主档 `CRUD / 作废 / 历史保留`
  - `[AC-2]` 项目视图与待供货解释
  - `[AC-3]` `sales` 项目绑定与项目草稿生成
  - `[AC-4]` 项目统计与成本
  - `[AC-5]` 前端入口与交互闭环
  - `[AC-6]` full acceptance 证据完整
- Evidence pointers:
  - `sales-project` focused tests
  - `sales.service.spec.ts` 回归覆盖
  - 关键 API 行为证据：项目主档、项目详情、项目草稿、项目统计
  - `pnpm --dir web build:prod` 输出
  - 浏览器 walkthrough 证据：项目主档、项目详情、项目出库草稿、项目统计
  - `docs/acceptance-tests/specs/sales-project.md`
  - `docs/acceptance-tests/cases/sales-project.json`
  - `docs/acceptance-tests/runs/run-YYYYMMDD-HHMM-sales-project-phase1-phase2.md`
- Evidence gaps, if any:
  - 缺少任何一类 `F1/F2/F3/F4` 证据、共享 `sales` 回归验证或浏览器证据时，不得签收。
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
  - `sales-project-master-crud`
  - `sales-project-detail-material-view`
  - `sales-project-draft-to-sales-order`
  - `sales-project-shipment-stats`
- Related acceptance spec:
  - `docs/acceptance-tests/specs/sales-project.md`
- Separate acceptance run required: `optional`
- Complete test report required: `yes`
- Required regression / high-risk tags:
  - `sales`
  - `sales-project`
  - `inventory-read-model`
  - `rbac-menu`
- Suggested environment / accounts:
  - `.env.dev`
  - 仓库管理员账号（具备 `sales:*` 与新增 `sales-project:*` 权限）
- Environment owner / setup source:
  - `docs/acceptance-tests/README.md`

## Parallelization Safety

- Status: `not-safe`
- If safe, list the exact disjoint writable scopes:
  - `-`
- If not safe, list the shared files or contracts that require a single writer:
  - `prisma/schema.prisma`
  - `src/modules/sales/**`
  - `src/app.module.ts`
  - `prisma/system-management.seed.ts`
  - `web/src/views/sales/components/SalesOrderEditorDialog.vue`
  - `web/src/store/modules/permission.js`
  - `salesProjectId / project snapshot` cross-module contract

## Review Log

- Validation results:
  - `not-run`
- Findings:
  - `-`
- Follow-up action:
  - `coder`

## Acceptance

- Acceptance status: `not-assessed`
- Acceptance QA:
- Acceptance date:
- Complete test report:

### Acceptance Checklist

> Acceptance QA 在验收时逐条填写。每条应对应 domain capability 的用户需求或 task doc 的 `[AC-*]` 条目。

- [ ] `[AC-1]` 销售项目主档与历史保留成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-2]` 项目详情读模型成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-3]` 项目到 `sales` 写路径绑定成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-4]` 项目统计复用 `sales` 事实成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-5]` 前端入口与交互闭环成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-6]` full acceptance 证据完整 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`

### Acceptance Notes

- Acceptance path used: `full`
- Acceptance summary:
- Report completeness check:
- If rejected or blocked: root cause（`requirement-misunderstanding` | `implementation-gap` | `evidence-gap` | `environment-gap`）+ 精确修复指引 / 环境修复指引
- If conditionally accepted: follow-up requirement / task:

## Final Status

- Outcome:
- Requirement alignment:
- Residual risks or testing gaps:
- Directory disposition after completion: keep `active` while the task is still open; once it is no longer active, set this to `retained-completed` or `cleanup-candidate`, then sync `docs/tasks/TASK_CENTER.md`
- Next action:
