# Master Data Phase 1 Completion

> Superseded during planning by `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`. Keep only as a temporary cleanup candidate until explicit cleanup confirmation.

## Metadata

- Scope:
  - 完成 `master-data` 当前最小完整交付切片：收口 `Phase 1` 的 `F1`~`F8`，补齐 `MaterialCategory / Material / Customer / Supplier / Personnel / Workshop / StockScope` 的写路径、active-only 查询与统一主数据查询能力；明确排除 `F9` 物料库存预警与 `F10` 批量导入。
- Related requirement: `docs/requirements/topics/master-data-management.md (Phase 1: F1-F8)`
- Status: `superseded-during-planning`
- Review status: `not-reviewed`
- Delivery mode: `autonomous`
- Acceptance mode: `full`
- Acceptance status: `not-assessed`
- Complete test report required: `yes`
- Lifecycle disposition: `cleanup-candidate`
- Planner: `assistant`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Acceptance QA: `acceptance-qa`
- Last updated: `2026-04-02`
- Related checklist: `None`
- Related acceptance spec: `None`
- Related acceptance run: `None`
- Related files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/playbooks/orchestration/playbook.md`
  - `docs/playbooks/orchestration/agent-browser-reference.md`
  - `prisma/schema.prisma`
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/**`
  - `web/src/utils/permissionCompat.js`
  - `test/**`

## Requirement Alignment

- Topic capability:
  - `docs/requirements/topics/master-data-management.md`
  - 本 task 采用 topic 内现成路线图作为切片边界：执行 `Phase 1` 的 `F1`~`F8`，不把 `Phase 2` 的 `F9` 和 `Phase 3` 的 `F10` 静默拉入本轮。
  - 该草案在与更细粒度的 `F4` task 对比后被降级：当前仓库的 active handoff 以 `F4` 单能力闭环为准，本文件不再作为执行简报。
- User intent summary:
  - 用户要求 AI 自主完成该需求、持续推进直到测试通过并最终 commit。
  - 当前 topic 是新引入且已 `confirmed` 的完整主数据主题，但文档内已明确拆成 `Phase 1 / 2 / 3`；最小安全且最贴近用户“完成需求”的交付切片，是先闭环 `Phase 1` 的核心主数据 CRUD 与统一查询能力。
  - 当前仓库已经有 `material` 的部分写路径与多业务模块对 `MasterDataService` 的读取依赖，因此本轮不应跳去做 `F9/F10`，而应优先收口现有半成品的主数据运行面。
- Acceptance criteria carried into this task:
  - `[AC-1]` `MaterialCategory` 支持新增、修改、逻辑停用与树形查询；停用前校验启用中的子分类与启用中的物料引用。
  - `[AC-2]` `Material` 支持完整的新增、修改、逻辑停用、列表与详情；停用前校验库存余额与生效单据引用；自动补建路径保持受控与可审计。
  - `[AC-3]` `Customer` 支持树形 CRUD；`Supplier`、`Personnel`、`Workshop`、`StockScope` 支持平面 CRUD，并满足各自唯一性与停用前校验。
  - `[AC-4]` `master-data` 对外提供稳定的 active-only 下拉/快照查询能力，保持现有业务模块按 `id / code / name` 查主数据的调用面可继续使用，不要求大范围跨模块重构。
  - `[AC-5]` 现有前端基础资料页与兼容层不再依赖 `unsupportedBaseAction` 作为 in-scope 能力的完成态；权限目录与兼容映射同步覆盖新增的 `master:*` 操作。
  - `[AC-6]` 交付附带完整测试报告，覆盖 schema、服务/仓储、接口、跨模块回归与浏览器验收证据。
- Requirement evidence expectations:
  - schema 证据：`prisma/schema.prisma`、`pnpm prisma:validate`、`pnpm prisma:generate`、必要的 `db push`
  - 行为证据：主数据 service/repository/controller 测试，覆盖唯一性、树形查询、停用拦截、active-only 过滤、自动补建审计字段
  - 回归证据：依赖 `MasterDataService` 的业务模块仍能完成现有主数据查找与引用校验
  - UI 证据：基础资料页与典型下拉场景的浏览器验收或等价完整报告
- Open questions requiring user confirmation:
  - None.

## Progress Sync

- Phase progress:
  - 已将 `master-data` topic 解释为单一可交付切片：`Phase 1` (`F1`~`F8`) 闭环；`F9/F10` 明确排除。
- Current state:
  - 当前代码仅具备 `material` 的列表/详情/新增/修改与 `workshop / stockScope` 的 canonical bootstrap；`customer / supplier / personnel / workshop` 仍以列表和只读查询为主，`material category` 与 `stock scope` 缺少完整控制器写路径，前端基础资料 API 仍大量回退到 `unsupportedBaseAction`。
- Acceptance state:
  - 本草案不再进入 acceptance；active acceptance 以 `task-20260402-1758-master-data-f4-supplier-crud.md` 为准。
- Blockers:
  - 与外部新增的 `F4` active task 冲突；对比后已决定不以本草案作为当前执行简报。
- Next step:
  - None. Wait for explicit cleanup confirmation if this superseded draft should be archived or deleted.

## Goal And Acceptance Criteria

- Goal:
  - 在不扩写 topic 路线图的前提下，完成 `master-data` 的 `Phase 1` 运行态交付：让主数据实体的 CRUD、active-only 查询、统一下拉/快照读取和最小前端兼容层全部达到可验收状态。
- Acceptance criteria:
  - `[AC-1]` `MaterialCategory` 完成树形 CRUD 与停用前校验。
  - `[AC-2]` `Material` 完成停用、受控自动补建与停用前库存/单据引用校验。
  - `[AC-3]` `Customer / Supplier / Personnel / Workshop / StockScope` 的 CRUD 与停用后 active-only 下拉行为全部可用。
  - `[AC-4]` `master-data` 对业务模块输出稳定的查询/快照能力，不要求重写消费模块内部仓储。
  - `[AC-5]` 前端基础资料 API 适配层与权限兼容层不再把本轮 in-scope 动作视为“未提供”。
  - `[AC-6]` 完整测试报告可逐条支撑 `Phase 1` 完成结论。

## Scope And Ownership

- Allowed code paths:
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `src/modules/master-data/**`
  - `src/modules/rbac/**`（仅限主数据新增动作所需的最小权限目录/菜单兼容改动）
  - `web/src/api/base/**`
  - `web/src/utils/permissionCompat.js`
  - `test/**`
- Frozen or shared paths:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/playbooks/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1802-master-data-phase1-completion.md`
  - `docs/acceptance-tests/**`
  - `src/shared/**`
  - `src/modules/inventory-core/**`
  - `src/modules/workflow/**`
  - `src/modules/inbound/**`
  - `src/modules/customer/**`
  - `src/modules/project/**`
  - `src/modules/workshop-material/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/reporting/**`
  - `src/modules/ai-assistant/**`
  - `web/src/views/**`
- Task doc owner:
  - `assistant`
- Contracts that must not change silently:
  - `inventory-core` 仍是库存写入唯一入口；主数据停用前校验只读库存余额，不得借机改库存语义。
  - `workflow` 与各单据模块仍拥有“生效中单据引用”的业务语义；主数据只能查询其状态用于停用拦截。
  - `Workshop` 继续只表达归属/成本维度；真实库存范围仍由 `StockScope` 独占。
  - 当前运行态持久化枚举是 `MasterDataStatus.ACTIVE | DISABLED`；requirement 中“INACTIVE/停用”表述在本轮按相同业务语义落地，不应无证据地改写数据库状态枚举。
  - 自动补建只允许出现在已具备 `creationMode / sourceDocumentType / sourceDocumentId` 审计字段的实体上，不扩展到 `Workshop`。
  - `rbac` 仍拥有权限字符串与菜单可见性真源；`master-data` 只声明其所需权限点。
  - 前端改动保持最小：优先更新 API 适配层，不重做页面结构。

## Implementation Plan

- [ ] Step 1: 收口 `Phase 1` 的 schema 与实体边界。
  - 复核 `MaterialCategory / Material / Customer / Supplier / Personnel / Workshop / StockScope` 的 Prisma model、索引、关联与审计字段是否足够支撑 `F1`~`F8`。
  - 仅在当前 runtime 与 requirement 对齐所必需时增加字段/索引；不要顺手引入 `F9/F10` 的预警或导入专用结构。
- [ ] Step 2: 完成 repository / service 的缺失读写路径。
  - 为树形实体补齐树构建与停用守卫，为平面实体补齐唯一性、active-only 查询与停用拦截。
  - 将库存余额聚合、生效单据引用检查、子节点检查与自动补建审计字段校验抽成可复用 helper，避免规则散落。
- [ ] Step 3: 完成 controller / DTO / permission surface。
  - 补齐 `material category / material disable / customer / supplier / personnel / workshop / stock scope` 的创建、修改、停用接口与请求 DTO。
  - 为新增动作补全最小 `master:*` 权限点、菜单/兼容映射，保持现有 list 权限行为不回归。
- [ ] Step 4: 收口 `F8` 的统一查询能力。
  - 在 `master-data` 内明确 active-only 下拉、快照 DTO 与受控 ensure/auto-create 能力的出口。
  - 保持现有 `MasterDataService` 被业务模块消费的查找行为稳定，除非编译或契约证明必须调整，否则不向消费模块扩散重构。
- [ ] Step 5: 打通最小前端兼容层。
  - 将 `web/src/api/base/customer.js`、`supplier.js`、`personnel.js`、`workshop.js` 与物料作废动作从 `unsupportedBaseAction` 切到真实后端接口。
  - 仅在必要时做最小 payload/response 兼容修正，默认不改 `web/src/views/**`。
- [ ] Step 6: 补齐自动化与 acceptance 证据。
  - 增加 master-data 的 repository / service / controller focused tests，并补一条代表性 e2e 路径。
  - 执行全量门禁、通过 `code-reviewer`，再由 `acceptance-qa` 形成 full-mode 完整测试报告。

## Coder Handoff

- Execution brief:
  - 本 task 的完成定义不是“再做一个单实体 CRUD”，而是把 `master-data` 的 `Phase 1` 半成品状态收口成一个可完整交付的主数据模块。
  - 最小安全路线是：优先补全当前模块与 API 适配层，尽量不把改动外溢到消费模块和页面实现；只有在编译/测试证明必须时，才做最小兼容修补。
- Required source docs or files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/playbooks/orchestration/playbook.md`
  - `docs/playbooks/orchestration/agent-browser-reference.md`
  - 本 task doc
- Owned paths:
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `src/modules/master-data/**`
  - `src/modules/rbac/**`（仅限主数据权限/菜单兼容改动）
  - `web/src/api/base/**`
  - `web/src/utils/permissionCompat.js`
  - `test/**`
- Forbidden shared files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/playbooks/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1802-master-data-phase1-completion.md`
  - `docs/acceptance-tests/**`
  - `src/shared/**`
  - `src/modules/inventory-core/**`
  - `src/modules/workflow/**`
  - `src/modules/inbound/**`
  - `src/modules/customer/**`
  - `src/modules/project/**`
  - `src/modules/workshop-material/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/reporting/**`
  - `src/modules/ai-assistant/**`
  - `web/src/views/**`
- Constraints and non-goals:
  - 不实现 `F9` 物料库存预警，也不实现 `F10` Excel 批量导入。
  - 不把 `Workshop` 改造成独立库存池，不改变 `StockScope` 的唯一库存边界语义。
  - 不借“topic 写的是 INACTIVE”重命名现有 `DISABLED` 持久化枚举，除非 schema/runtime 一致性强制要求且有完整证据。
  - 不重构消费模块内部 repository，不做 UI 美化或页面重构。
  - 若必须触碰消费模块，只允许做编译/契约层最小兼容修补，并在提交说明与 task doc 中明确原因。
- Validation command for this scope:
  - Iteration / schema:
    - `pnpm prisma:validate`
    - `pnpm prisma:generate`
    - `set -a && source .env.dev && set +a && pnpm prisma db push --schema prisma/schema.prisma`
  - Iteration / focused backend:
    - `pnpm test -- src/modules/master-data/infrastructure/master-data.repository.spec.ts src/modules/master-data/application/master-data.service.spec.ts src/modules/master-data/controllers/master-data.controller.spec.ts`
  - Iteration / consumer regression:
    - `pnpm test -- src/modules/inbound/application/inbound.service.spec.ts src/modules/customer/application/customer.service.spec.ts src/modules/project/application/project.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts src/modules/rd-subwarehouse/application/rd-procurement-request.service.spec.ts src/modules/rbac/application/rbac.service.spec.ts`
  - Iteration / frontend compatibility:
    - `pnpm --dir web build:prod`
  - Final gate:
    - `pnpm lint`
    - `pnpm verify`
    - `pnpm test:e2e`
    - `pnpm --dir web build:prod`

## Reviewer Handoff

- Review focus:
  - 是否真正收口了 `Phase 1` 的 `F1`~`F8`，而不是只补了个别 CRUD 且仍保留 `unsupportedBaseAction` 或缺失权限面。
  - 停用前校验是否准确覆盖：子分类、启用物料、库存余额、生效单据引用、`StockScope` 零余额要求。
  - `MasterDataService` / 新查询服务是否保持消费模块契约稳定，没有无必要地把改动外溢到业务模块。
  - `DISABLED` 与 requirement 中“停用/INACTIVE”语义映射是否被稳定处理，没有引入新的状态漂移。
  - `web/src/api/base/**` 与 `src/modules/rbac/**` 的权限/菜单兼容是否同步，避免“接口存在但页面仍无权/仍报未提供”。
- Requirement alignment check:
  - 对照 `F1`~`F8` 检查是否完成本 task 定义的 `Phase 1` slice。
  - 明确 `F9/F10` 仍是 out-of-scope，不接受把其未实现误记为 blocker。
- Final validation gate:
  - `pnpm prisma:validate`
  - `pnpm prisma:generate`
  - `set -a && source .env.dev && set +a && pnpm prisma db push --schema prisma/schema.prisma`
  - `pnpm lint`
  - `pnpm verify`
  - `pnpm test:e2e`
  - `pnpm --dir web build:prod`
- Required doc updates:
  - reviewer 只更新本 task doc 的 `Review status`、`Review Log`、`Acceptance-ready evidence` 与是否存在 open findings。
  - requirement 进度同步由 parent 负责。

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` `MaterialCategory` 树形 CRUD
  - `[AC-2]` `Material` 停用与自动补建守卫
  - `[AC-3]` 其余主数据实体 CRUD
  - `[AC-4]` active-only 查询/快照能力
  - `[AC-5]` 权限与前端兼容层
  - `[AC-6]` 完整测试报告
- Evidence pointers:
  - `prisma/schema.prisma`
  - `src/modules/master-data/**`
  - `src/modules/rbac/**`
  - `web/src/api/base/**`
  - `web/src/utils/permissionCompat.js`
  - `test/**`
  - `docs/acceptance-tests/specs/master-data-phase1-completion.md`（待创建）
- Evidence gaps, if any:
  - 当前仅完成 planning；代码、review 与 acceptance 证据均待生成。
- Complete test report requirement: `yes`

### Acceptance Test Expectations

- Acceptance mode: `full`
- Browser test required: `yes`
- Related acceptance spec:
  - 创建 `docs/acceptance-tests/specs/master-data-phase1-completion.md`
- Separate acceptance run required: `optional`
- Complete test report required: `yes`
- Required regression / high-risk tags:
  - `master-data-phase1`
  - `material-category-tree`
  - `material-disable-guards`
  - `customer-tree`
  - `stock-scope-zero-balance`
  - `dropdown-active-only`
  - `rbac-permissions`
  - `web-base-pages`
- Suggested environment / accounts:
  - backend: `.env.dev` + MySQL + Redis
  - browser accounts: `admin` 为主；必要时补 `operator / rd-operator` 验证下拉与权限边界
- Environment owner / setup source:
  - `docs/acceptance-tests/README.md`
  - `docs/playbooks/orchestration/agent-browser-reference.md`

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - N/A
- If not safe, list the shared files or contracts that require a single writer:
  - `prisma/schema.prisma`
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/**`
  - `web/src/utils/permissionCompat.js`
  - `Phase 1` 的收口涉及 schema、CRUD、权限、前端 API 适配和 e2e 证据的同一条契约链；拆多 writer 很容易产生接口形状、权限字符串、菜单可见性和测试夹具不一致。

## Review Log

- Validation results:
  - Planning only; no runtime validation has been executed yet.
- Findings:
  - None.
- Follow-up action:
  - `coder` 按本 task doc 执行实现，然后进入 review。

## Acceptance

- Acceptance status: `not-assessed`
- Acceptance QA:
  - `acceptance-qa`
- Acceptance date:
  - `None`
- Complete test report:
  - `None`

### Acceptance Checklist

> Acceptance QA 在验收时逐条填写。每条应对应 topic 的 `Phase 1` 能力或本 task 的 `[AC-*]`。

- [ ] `[AC-1]` `MaterialCategory` 树形 CRUD 与停用校验完成 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-2]` `Material` 停用守卫与自动补建审计完成 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-3]` `Customer / Supplier / Personnel / Workshop / StockScope` CRUD 完成 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-4]` active-only 查询/快照能力稳定输出 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-5]` 前端 API 兼容层与权限映射完成 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-6]` 已形成完整测试报告并支持签收 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`

### Acceptance Notes

- Acceptance path used: `full`
- Acceptance summary:
  - Pending implementation.
- Report completeness check:
  - 当前无完整测试报告；需由 `acceptance-qa` 在 spec 的 `Latest Verification` 中收口。
- If rejected or blocked: root cause（`requirement-misunderstanding` | `implementation-gap` | `evidence-gap` | `environment-gap`）+ 精确修复指引 / 环境修复指引
- If conditionally accepted: follow-up requirement / task:
  - None.

## Final Status

- Outcome:
  - 该文档是一次更大范围的 `Phase 1` 规划草案；在与后出现的 `F4` 单能力 active task 对比后，被降级为 `cleanup-candidate`，不应再作为 `coder` 的执行入口。
- Requirement alignment:
  - 本 task 选择 `master-data` topic 的 `Phase 1` 作为唯一即时交付切片，避免将 `F9/F10` 的后续路线图混入本轮。
- Residual risks or testing gaps:
  - 若未来重新启用该草案，需要先确认是否仍要以 `Phase 1` 整体为单 task 推进；当前 active 路线不是它。
- Directory disposition after completion: keep `active` while the task is still open; once it is no longer active, set this to `retained-completed` or `cleanup-candidate`, then sync `docs/tasks/TASK_CENTER.md`
- Next action:
  - `None`
