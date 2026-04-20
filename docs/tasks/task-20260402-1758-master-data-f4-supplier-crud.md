# 基础数据 F4 供应商 CRUD

## Metadata

- Scope: 完成 confirmed topic `docs/requirements/topics/master-data-management.md` 中最小且可闭环的一条显式能力 `F4`。补齐供应商新增、修改、逻辑停用、默认 `ACTIVE` 列表/搜索、受控自动补建，以及供应商管理页/API/权限兼容的最小收口；不把 `F1/F2/F3/F5/F6/F7/F8/F9/F10` 静默并入本 task。
- Related requirement: `docs/requirements/topics/master-data-management.md` (F4)
- Status: `accepted`
- Review status: `reviewed-clean`
- Delivery mode: `autonomous`
- Acceptance mode: `full`
- Acceptance status: `accepted`
- Complete test report required: `yes`
- Lifecycle disposition: `active`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Acceptance QA: `acceptance-qa`
- Last updated: `2026-04-03`
- Related checklist: `None`
- Related acceptance spec: `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`（由 `acceptance-qa` 创建或更新）
- Related acceptance run: `None`
- Related files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/acceptance-tests/README.md`
  - `prisma/schema.prisma`
  - `scripts/migration/master-data/transformer.ts`
  - `test/migration/master-data.spec.ts`
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/master-data/dto/query-master-data.dto.ts`
  - `src/modules/master-data/dto/create-material.dto.ts`
  - `src/modules/master-data/dto/update-material.dto.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
  - `test/prisma-e2e-stub.ts`

## Requirement Alignment

- Topic capability:
  - `docs/requirements/topics/master-data-management.md` (F4)
- User intent summary:
  - 用户要求在 confirmed 的 `master-data` topic 上继续推进，遇到问题自行解决，不在中间里程碑停下，并最终达到“所有测试通过、完成交付、可以 commit”的标准。
  - 该 topic 同时包含 Phase 1 多条未完成能力，以及明确属于未来阶段的 `F9` / `F10`。本 task 不能把整份 topic 静默当成一次单任务交付。
  - 结合 requirement 文档“供应商结构最简单，优先作为 CRUD 模板参照实现”以及当前代码现状，`F4` 是最小且最适合作为立即交付切片的能力：仓库已经有 supplier 的读路径、供应商管理页、旧 API 包装层与多个真实下拉消费者，但缺少写路径和兼容收口。
  - 当前运行时真源已经冻结 `supplier` 主表的正式字段为 `supplierCode`、`supplierName`、`status` 和自动补建 provenance；`scripts/migration/master-data/transformer.ts` 也把 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 归档为 source-only payload。本 task 默认不扩写 schema，而是让供应商页面最小适配当前运行时合同。
- Acceptance criteria carried into this task:
  - `[AC-1]` 新增供应商时，`supplierCode` 全局唯一；重复编码返回明确冲突错误。
  - `[AC-2]` 修改供应商时，保持当前运行时正式字段合同，至少支持 `supplierCode`、`supplierName` 的新增与修改；如修改编码，仍需满足唯一性校验。
  - `[AC-3]` 停用供应商采用逻辑停用（沿用当前 `MasterDataStatus.DISABLED` 语义），不做物理删除；停用后默认列表 / 搜索与新单据供应商下拉中不再出现该供应商。
  - `[AC-4]` `getSupplierById()` 继续保持按 `id` 的 status-agnostic 详情读取语义，以兼容 `inbound`、`project` 等现有快照读取与详情回读。
  - `[AC-5]` 受控自动补建供应商时，`creationMode = AUTO_CREATED` 且 `sourceDocumentType`、`sourceDocumentId` 必填；若当前无真实调用方，本轮至少通过服务 / 仓储 / e2e 测试覆盖合同。
  - `[AC-6]` 当前供应商管理页与兼容层恢复可用：`web/src/api/base/supplier.js` 不再抛 `unsupportedBaseAction(...)`，权限 alias 补齐，页面不再依赖未进入正式运行时合同的 legacy 字段持久化，且 `pnpm --dir web build:prod` 通过。
  - `[AC-7]` `full` 模式验收覆盖供应商管理页和至少一个真实供应商下拉消费面，并由 `acceptance-qa` 在 `spec` 中维护最近一次验证结果。
- Requirement evidence expectations:
  - 后端证据：repository / service / controller / e2e 覆盖新增、修改、停用、重复编码拦截、默认 `ACTIVE` 搜索与 `AUTO_CREATED` 来源约束。
  - 兼容层证据：供应商管理页的 add / edit / remove 权限别名与 API wrapper 均接通，不再停留在 unsupported stub。
  - 消费面证据：至少一个真实供应商下拉消费面证明停用后不再返回已停用供应商。
  - 验收证据：`acceptance-qa` 在 `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md` 维护 `Latest Verification`，并覆盖本 task 的 `[AC-*]`。
- Open questions requiring user confirmation:
  - None.

## Progress Sync

- Phase progress:
  - `master-data` topic 仍有多条 Phase 1 能力未完成；本 task 仅切取 `F4` 供应商 CRUD，并已通过自动化验证与 `agent-browser` full acceptance，形成该 topic 第一条完整闭环交付链。
- Current state:
  - `src/modules/master-data/**` 已补齐 supplier create / update / deactivate 写路径、默认 `ACTIVE` 列表/搜索、status-agnostic detail 与 provenance 约束。
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts` 与 `web/src/utils/permissionCompat.js` 已补齐 `master:supplier:create/update/deactivate` 与旧前端 `base:supplier:add/edit/remove` 的兼容链路。
  - `web/src/api/base/supplier.js` 与 `web/src/views/base/supplier/index.vue` 已收口到当前 runtime 合同（`supplierCode` / `supplierName` / `status`），不再依赖 legacy source-only 字段。
  - shared consumer 已拆分为两条清晰合同：默认 operational dropdown 保持 active-only；历史 / 报表路径通过 `includeDisabled` + `listSupplierByKeywordIncludingDisabled()` 显式查询停用供应商。
  - `test/prisma-e2e-stub.ts` 与 `test/master-data-supplier.e2e-spec.ts` 已形成 focused supplier CRUD browser/API 证据闭环。
- Acceptance state:
  - `已验收`
- Blockers:
  - None.
- Next step:
  - parent 执行最终提交与后续归档收口。

## Goal And Acceptance Criteria

- Goal:
  - 在不扩大 topic 范围、也不无依据地重写 `supplier` 运行时合同的前提下，完成 `master-data` `F4` 供应商 CRUD 的最小闭环交付：让 NestJS 后端具备供应商新增、修改、逻辑停用、默认有效搜索和受控自动补建能力，同时让当前供应商管理页与供应商下拉消费面恢复真实可用。
- Acceptance criteria:
  - `[AC-1]` `POST /api/master-data/suppliers` 可创建供应商，且重复 `supplierCode` 返回明确冲突错误。
  - `[AC-2]` `PATCH /api/master-data/suppliers/:id` 可更新供应商当前运行时支持的字段；若更新 `supplierCode`，仍通过唯一性校验。
  - `[AC-3]` 提供清晰语义的逻辑停用接口（推荐 `PATCH /api/master-data/suppliers/:id/deactivate`），将 `status` 置为 `DISABLED`；默认列表 / 关键字搜索与新单据供应商下拉不再返回该记录。
  - `[AC-4]` `GET /api/master-data/suppliers/:id` 与 `getSupplierById()` 继续允许读取 disabled 记录，不回归已有快照详情和只读消费者。
  - `[AC-5]` 受控自动补建供应商能力存在且有自动化测试；未提供 `sourceDocumentType` 与 `sourceDocumentId` 时不得写入 `AUTO_CREATED` 供应商。
  - `[AC-6]` 现有供应商管理页/API wrapper/权限兼容恢复可用，并通过 `pnpm --dir web build:prod`；页面不再要求持久化 legacy source-only 字段。
  - `[AC-7]` `acceptance-qa` 使用 `pnpm dev` + `pnpm --dir web dev` 的真实执行面完成 supplier 管理页与至少一个供应商下拉消费者的验收，并把结果写入 `spec`。

## Scope And Ownership

- Allowed code paths:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - 新增的 supplier-focused DTO / spec 文件
  - `test/master-data-supplier.e2e-spec.ts` 或对等 focused supplier e2e 文件
- Frozen or shared paths:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `docs/acceptance-tests/**`
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `scripts/migration/master-data/**`
  - `test/migration/master-data.spec.ts`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
- Task doc owner:
  - `planner`
- Contracts that must not change silently:
  - `master-data` 仍是供应商主档真源；业务单据继续通过快照或 `getSupplierById()` 消费，不改成跨模块直接 JOIN 主数据底表。
  - 停用只能是逻辑停用；不能物理删除，也不能改写历史 `supplierCodeSnapshot` / `supplierNameSnapshot`。
  - 当前 runtime 的主数据状态枚举仍是 `ACTIVE | DISABLED`；topic 文案里的“INACTIVE / 停用”在本 task 中只表达业务语义，不应无证据触发 schema 枚举重命名。
  - 当前正式 `supplier` runtime 合同以 `prisma/schema.prisma` 与 `docs/architecture/20-wms-database-tables-and-schema.md` 为准：`supplierCode`、`supplierName`、`status` 以及自动补建 provenance 字段。`supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 目前仍属于 legacy source-only 信息，不应在本 task 中无依据地重新纳入正式 schema。
  - 默认列表 / 搜索只返回 `ACTIVE` 供应商，是为满足“停用后新单据不可选”的 requirement；若执行中证明供应商管理页确实需要查看 disabled 项，必须使用显式 opt-in 查询参数，而不是削弱默认行为。
  - `getSupplierById()` 必须继续保留 status-agnostic 详情读取；不要为了 active-only 列表而顺手改成按状态过滤。
  - 后端权限命名空间保持 `master:supplier:*`；前端旧 `base:supplier:*` 仅通过 alias 兼容，不恢复旧后端权限真源。
  - 本 task 不得 silently 并入其他主数据实体 CRUD、`F8` 统一主数据查询服务、或 schema widening。

## Implementation Plan

- [ ] Step 1: 补齐 supplier DTO 与后端写路径，但保持当前运行时合同。
  - 新增 supplier create / update / deactivate DTO，参考现有 material DTO 写法。
  - 在 controller / service / repository 中补齐新增、修改、逻辑停用。
  - 唯一性校验放在 service 层先行拦截，并对底层唯一约束异常保持明确报错。
  - `getSupplierById()` 保持不按 `status` 过滤。
- [ ] Step 2: 收口默认 active-only 查询语义。
  - `listSuppliers()` 与关键字搜索默认只返回 `ACTIVE` 供应商，以满足所有新单据供应商下拉消费者。
  - 如执行中证明供应商管理页必须查看 disabled，允许增加显式 opt-in 查询参数，但默认行为不变。
- [ ] Step 3: 补齐受控自动补建供应商能力。
  - 为 supplier 提供最小内部 ensure / auto-create 入口。
  - `AUTO_CREATED` 必须同时带 `sourceDocumentType` 与 `sourceDocumentId`；当前没有真实写调用方时，以 focused tests 证明合同成立即可。
- [ ] Step 4: 收口权限与前端兼容层。
  - 在 `rbac` in-memory permission / menu seed 中加入 `master:supplier:create`、`master:supplier:update`、`master:supplier:deactivate`。
  - 在 `web/src/utils/permissionCompat.js` 中补齐 `master:supplier:* -> base:supplier:*` 的 `add / edit / remove` alias。
  - 将 `web/src/api/base/supplier.js` 的新增、修改、作废改成真实请求，不再回退到 `unsupportedBaseAction(...)`。
  - 更新 `web/src/api/base/compat.js` 的 `mapSupplier()`，让 `supplierShortName` 继续可用但以当前运行时合同降级映射，避免反向推动 schema widening。
- [ ] Step 5: 对供应商管理页做最小必要适配，而不是扩写 schema 追旧 UI。
  - `web/src/views/base/supplier/index.vue` 只保留当前正式合同能支撑的管理字段与动作。
  - 去掉对 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 的持久化依赖；不要为了少改页面去扩大 `supplier` schema。
  - 停用交互可退化为简单确认或后端无 reason 的 logical deactivate；本 task 不要求供应商停用原因持久化。
- [ ] Step 6: 增加 focused tests 与 `full` 模式验收证据。
  - repository / service / controller 级覆盖：重复编码、新增、修改、停用、默认 active-only 搜索、status-agnostic detail、`AUTO_CREATED` 来源约束。
  - e2e 级覆盖：supplier create / update / deactivate / active-only list 至少贯通一条。
  - 供应商下拉消费回归：至少一处真实页面或等价执行面证明停用后不再出现在新单据供应商下拉。
  - `acceptance-qa` 创建或更新 `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`，将 `[AC-1]` ~ `[AC-7]` 收口进 `Latest Verification`。

## Coder Handoff

- Execution brief:
  - 只交付 `F4`。这是 `master-data` topic 的单一能力切片，不是“顺手把所有基础资料 CRUD 一并收尾”。
  - 当前最小安全路线是：补齐供应商写路径 + 受控自动补建 + 权限 alias + 供应商管理页最小适配；不把本轮扩大成 `F8` 统一查询服务或跨多个业务模块的 refactor。
  - 关键判断已固定：当前架构和迁移脚本都把 `supplier` 运行时字段收口为 code / name / status + provenance，本轮默认不扩 schema 追旧 UI；优先让供应商页面适配运行时合同。
- Required source docs or files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/acceptance-tests/README.md`
  - `prisma/schema.prisma`
  - `scripts/migration/master-data/transformer.ts`
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/master-data/dto/query-master-data.dto.ts`
  - `src/modules/master-data/dto/create-material.dto.ts`
  - `src/modules/master-data/dto/update-material.dto.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
  - `test/prisma-e2e-stub.ts`
  - 本 task doc
- Owned paths:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - 新增的 supplier-focused DTO / spec 文件
  - `test/master-data-supplier.e2e-spec.ts` 或对等 focused supplier e2e 文件
- Forbidden shared files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `docs/acceptance-tests/**`
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `scripts/migration/master-data/**`
  - `test/migration/master-data.spec.ts`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
- Constraints and non-goals:
  - 不做其他主数据实体 CRUD。
  - 不做 `F8` 的跨实体统一查询服务。
  - 不做物理删除。
  - 不因为 requirement 的“INACTIVE”措辞去重命名现有 `MasterDataStatus` 持久化枚举。
  - 不无依据地把 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 加回正式 `supplier` schema。
  - 不修改 `scripts/migration/master-data/**` 或 `prisma/schema.prisma`，除非执行中出现可证明的硬 blocker；若出现，先把 blocker 证据写回 task doc 再由 parent 判断是否允许扩 scope。
  - 不创建新前端页面；优先用现有页面 + API 兼容层收口。
- Validation command for this scope:
  - Iteration / types:
    - `pnpm typecheck`
  - Focused backend tests:
    - `pnpm test -- src/modules/master-data/infrastructure/master-data.repository.spec.ts src/modules/master-data/application/master-data.service.spec.ts src/modules/master-data/controllers/master-data.controller.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - Focused e2e:
    - `pnpm test:e2e -- test/master-data-supplier.e2e-spec.ts`
  - Frontend compatibility:
    - `pnpm --dir web build:prod`
  - Final repo gate before commit:
    - `pnpm lint`
    - `pnpm verify`
    - `pnpm test:e2e`
    - `pnpm --dir web build:prod`
  - Full acceptance execution surface:
    - backend: `pnpm dev`
    - frontend: `pnpm --dir web dev`
    - browser surfaces: `web/src/views/base/supplier/index.vue` + one supplier dropdown consumer such as `web/src/views/entry/order/index.vue`
- If parallel work is approved, add one subsection per writer with the same fields:
  - Not approved for this task.

## Reviewer Handoff

- Review focus:
  - 是否严格只交付 `F4`，没有 silent 扩到其他主数据实体或 `F8`。
  - 是否真的完成供应商写路径，而不是只把前端 unsupported 包装层改成表面可调用。
  - 是否同时保持逻辑停用 + 默认 `ACTIVE` 搜索 + `getSupplierById()` 不过滤三者成立。
  - 是否正确处理了 topic “INACTIVE / 停用”与当前 schema `DISABLED` 枚举之间的语义映射，而没有引入新的状态漂移。
  - 是否把后端 `master:supplier:*` 与前端 `base:supplier:*` alias 链路补齐，没有引入权限漂移。
  - 是否遵守了当前 runtime 合同，没有无依据地把 archived source-only supplier 字段写回正式 schema。
  - 是否让供应商管理页与至少一个供应商下拉消费面恢复可用，且测试面与风险面匹配。
- Requirement alignment check:
  - `[AC-1]` 创建唯一性
  - `[AC-2]` 修改与回读
  - `[AC-3]` 逻辑停用与 active-only 消费面
  - `[AC-4]` 详情读取与历史快照兼容
  - `[AC-5]` 自动补建 provenance 约束
  - `[AC-6]` 供应商页/API/权限兼容恢复
  - `[AC-7]` `full` 模式执行面证据完整
- Final validation gate:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm verify`
  - `pnpm test:e2e`
  - `pnpm --dir web build:prod`
  - `pnpm dev`
  - `pnpm --dir web dev`
- Required doc updates:
  - reviewer 只更新本 task doc 的 `Review status`、`Review Log`、`Acceptance` 与 `Final Status`。
  - `docs/acceptance-tests/**` 由 `acceptance-qa` 维护。

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` 到 `[AC-7]`
- Evidence pointers:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/master-data-supplier.e2e-spec.ts`
  - `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`
- Evidence gaps, if any:
  - 当前仅完成 planning，尚无运行态与验收证据。
- Complete test report requirement: `yes`

### Acceptance Test Expectations

- Acceptance mode: `full`
- Browser test required: `yes`
- Related acceptance spec:
  - `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`
- Separate acceptance run required: `optional`
- Complete test report required: `yes`
- Required regression / high-risk tags:
  - `master-data-f4`
  - `supplier-crud`
  - `legacy-permission-compat`
  - `supplier-dropdown-active-only`
  - `no-schema-widening`
- Suggested environment / accounts:
  - backend: `.env.dev` + `pnpm dev`
  - frontend: `pnpm --dir web dev`
  - account: `admin`
  - representative browser surfaces:
    - `web/src/views/base/supplier/index.vue`
    - one supplier dropdown consumer in `web/src/views/entry/order/index.vue`
- Environment owner / setup source:
  - `docs/acceptance-tests/README.md`
- Environment-gap proof requirements:
  - 若验收在 `pnpm dev` / `pnpm --dir web dev` 面失败，必须先在实际失败执行面复现。
  - 记录原始命令、env 文件、关键依赖状态和原始报错。
  - 至少给出一个对照执行面，证明问题只发生在特定 surface。
  - 在不能排除仓库内实现或配置问题前，不得提前标记为 `environment-gap`。

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - `N/A`
- If not safe, list the shared files or contracts that require a single writer:
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/master-data-supplier.e2e-spec.ts`
  - supplier route shape、默认 `ACTIVE` 搜索、status-agnostic detail、权限 alias、前端 wrapper 和 e2e stub 是一条共享契约链；拆成多个 writer 容易出现行为漂移。

## Review Log

- Validation results:
  - planning-only；本轮未执行运行态命令。
- Findings:
  - 当前活跃 task 必须继续收敛为 `F4` 单能力切片，不应回退到更大的 `Phase 1` 草案。
  - 供应商页当前依赖的多项 legacy 字段并未进入正式 `supplier` schema / runtime 合同，本轮应以前端最小适配收口，而不是扩大 schema。
  - 由于供应商下拉消费者已经可接受 `supplierShortName -> supplierName` 的兼容映射，本轮不需要触碰 `prisma/schema.prisma` 或 `scripts/migration/master-data/**` 才能形成最小闭环。
- Follow-up action:
  - 交给 `coder` 按本 task 实现，再进入 `code-reviewer` 与 `acceptance-qa`。

## Acceptance

- Acceptance status: `not-assessed`
- Acceptance QA:
  - `acceptance-qa`
- Acceptance date:
  - `-`
- Complete test report:
  - `Pending: docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`

### Acceptance Checklist

> Acceptance QA 在验收时逐条填写。每条应对应本 task 的 `[AC-*]`。

- [ ] `[AC-1]` 新增供应商唯一性成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-2]` 修改供应商后列表 / 详情 / 页面回读一致 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-3]` 逻辑停用后默认搜索与新单据下拉不再出现该供应商 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-4]` `getSupplierById()` 与历史快照语义保持不变 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-5]` 自动补建来源字段约束成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-6]` 供应商页/API/权限兼容恢复且前端构建通过 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-7]` `full` 模式浏览器验收覆盖 supplier 管理页和一个真实 dropdown consumer — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`

### Acceptance Notes

- Acceptance path used: `full`
- Acceptance summary:
  - Pending implementation.
- Report completeness check:
  - Pending implementation.
- If rejected or blocked: root cause（`requirement-misunderstanding` | `implementation-gap` | `evidence-gap` | `environment-gap`）+ 精确修复指引 / 环境修复指引
- If conditionally accepted: follow-up requirement / task:
  - None.

## Final Status

- Outcome:
  - active task 已重写为 `master-data` `F4` 供应商 CRUD 的单一执行真源，ready for `coder`。
- Requirement alignment:
  - 该 task 明确选择 confirmed topic 中最小且与当前代码成熟度最匹配的 `F4`，不将更大 `Phase 1` 或后续 roadmap silently 并入。
- Residual risks or testing gaps:
  - 当前仓库尚无 supplier create / update / deactivate 的 focused 自动化回归。
  - 当前供应商页仍基于旧字段形状，需由 coder 收口到当前 runtime 合同。
  - 当前权限 alias 只覆盖 supplier list，新增 / 修改 / 作废动作尚未真正接通。
- Directory disposition after completion: keep `active` while the task is still open; once it is no longer active, set this to `retained-completed` or `cleanup-candidate`, then sync `docs/tasks/TASK_CENTER.md`
- Next action:
  - `coder` 按本 task doc 执行实现，然后进入 `code-reviewer` 与 `acceptance-qa`。
# 基础数据 F4 供应商 CRUD

## Metadata

- Scope: 完成 `docs/requirements/topics/master-data-management.md` 中最小且可闭环的一条显式能力 `F4`。补齐供应商新增、修改、逻辑停用、默认有效列表/搜索、受控自动补建，以及现有供应商管理页/API/权限兼容的最小收口；不把 `F1/F2/F3/F5/F6/F7/F8/F9/F10` 静默并入本 task。
- Related requirement: `docs/requirements/topics/master-data-management.md` (F4)
- Status: `planned`
- Review status: `reviewed-with-findings`
- Delivery mode: `autonomous`
- Acceptance mode: `full`
- Acceptance status: `not-assessed`
- Complete test report required: `yes`
- Lifecycle disposition: `active`
- Planner: `assistant`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Acceptance QA: `acceptance-qa`
- Last updated: `2026-04-02`
- Related checklist: `None`
- Related acceptance spec: `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`（由 `acceptance-qa` 创建或更新）
- Related acceptance run: `None`
- Related files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/acceptance-tests/README.md`
  - `prisma/schema.prisma`
  - `scripts/migration/master-data/transformer.ts`
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/master-data/dto/query-master-data.dto.ts`
  - `src/modules/master-data/dto/create-material.dto.ts`
  - `src/modules/master-data/dto/update-material.dto.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts`

## Requirement Alignment

- Topic capability:
  - `docs/requirements/topics/master-data-management.md` (F4)
- User intent summary:
  - 用户要求在该 confirmed requirement 上继续推进，并最终达到“直到通过所有测试、完成交付”的标准。
  - 该 topic 同时包含 `Phase 1 / Phase 2 / Phase 3` 路线图，不能把整份 topic 视作一个单次安全交付切片。
  - 本 task 明确只切取 `F4`，原因有三点：第一，requirement 已明确写明“供应商结构最简单，优先作为 CRUD 模板参照实现”；第二，当前 `master-data` 代码已具备供应商 list/detail 读路径，最接近形成完整闭环；第三，现有仓库已经有供应商管理页、兼容 API 与多个供应商下拉消费者，最适合作为“后端写路径 + 兼容层 + 消费回归”的第一条可验收链路。
  - 本 task 不把 topic 中其他 Phase 1 能力、`F9` 预警、`F10` 批量导入 silently 并入，也不把 `supplier` 扩成新的历史字段迁移任务。
- Acceptance criteria carried into this task:
  - `[AC-1]` 新增供应商时，`supplierCode` 全局唯一；重复编码返回明确冲突错误。
  - `[AC-2]` 修改供应商时，保持当前运行时正式字段合同，至少支持 `supplierCode`、`supplierName` 的新增与修改；若修改编码，仍需通过唯一性校验。
  - `[AC-3]` 停用供应商采用逻辑停用（沿用当前 `MasterDataStatus.DISABLED`），不做物理删除；默认列表/搜索与新单据供应商下拉不再返回已停用供应商。
  - `[AC-4]` `getSupplierById()` 继续保持按 `id` 的 status-agnostic 详情读取语义，以兼容 `inbound`、`project`、`rd-subwarehouse` 现有快照读取与详情回读。
  - `[AC-5]` 受控自动补建供应商时，`creationMode = AUTO_CREATED` 且 `sourceDocumentType`、`sourceDocumentId` 必填；当前无真实写调用方时，至少通过服务/仓储/e2e 测试覆盖合同。
  - `[AC-6]` 现有供应商管理页与兼容层恢复可用：`web/src/api/base/supplier.js` 不再抛 `unsupportedBaseAction(...)`，权限 alias 补齐，页面不再依赖未进入正式运行时合同的 legacy 字段持久化，并通过 `pnpm --dir web build:prod`。
- Requirement evidence expectations:
  - 后端证据：repository / service / controller / e2e 覆盖新增、修改、停用、重复编码拦截、默认 `ACTIVE` 搜索与 `AUTO_CREATED` 来源约束。
  - 消费面证据：至少一个真实供应商下拉消费面证明停用后不再出现已停用供应商。
  - 兼容层证据：供应商管理页 add/edit/remove 权限和 API wrapper 均已接通。
  - full-mode 验收证据：`acceptance-qa` 在 `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md` 维护 `Latest Verification`。
- Open questions requiring user confirmation:
  - None.

## Progress Sync

- Phase progress:
  - `master-data` topic 仍有多条未完成能力；本 task 明确只选择 `F4` 作为当前最小安全交付切片，不把更大 Phase 1 草案重新激活。
- Current state:
  - `src/modules/master-data/**` 当前只有 `material` 写路径；`supplier` 仅有 `GET /suppliers` 与 `GET /suppliers/:id` 只读路径，没有 create / update / deactivate DTO、controller、service、repository 写路径。
  - 当前 `listSuppliers()` 未强制默认 `ACTIVE` 过滤，`QueryMasterDataDto` 也没有状态筛选字段。
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts` 目前只覆盖 `master:supplier:list`，没有 create / update / deactivate 权限面。
  - `web/src/api/base/supplier.js` 的新增、修改、作废仍全部回退到 `unsupportedBaseAction(...)`。
  - `web/src/views/base/supplier/index.vue` 当前仍依赖 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 等 legacy 页面字段；这些字段并未进入当前正式 `supplier` schema/runtime 合同。
  - `web/src/views/entry/order/index.vue`、`web/src/views/entry/detail/index.vue`、`web/src/views/rd/procurement-requests/index.vue`、`web/src/views/article/product/index.vue`、`web/src/views/report/supplierStatement/index.vue` 都通过 `listSupplierByKeyword()` 或 `listSupplier()` 消费供应商下拉。
  - `test/prisma-e2e-stub.ts` 当前 `supplier` 仍是通用空桩，无法直接承接 supplier CRUD e2e。
- Acceptance state:
  - `待验收`
- Blockers:
  - None.
- Next step:
  - `coder` 先完成 supplier 写路径、权限兼容、供应商页最小适配与 focused tests，再由 `code-reviewer` 和 `acceptance-qa` 收口 correctness 与 full-mode evidence。

## Goal And Acceptance Criteria

- Goal:
  - 在不扩大 topic 范围、也不重写 `supplier` 运行时合同的前提下，完成 `F4` 供应商 CRUD 的最小闭环交付：让 NestJS 后端具备供应商新增、修改、逻辑停用、默认有效查询与受控自动补建能力，同时让现有供应商管理页与供应商下拉消费面恢复真实可用。
- Acceptance criteria:
  - `[AC-1]` `POST /api/master-data/suppliers` 可创建供应商，且重复 `supplierCode` 返回明确冲突错误。
  - `[AC-2]` `PATCH /api/master-data/suppliers/:id` 可更新供应商当前正式运行时字段；当前 task 不要求重新引入 `supplierShortName`、`contactPerson`、`contactPhone`、`address` 等 legacy source-only 字段。
  - `[AC-3]` 提供清晰语义的逻辑停用接口（推荐 `PATCH /api/master-data/suppliers/:id/deactivate`），将 `status` 置为 `DISABLED`；默认列表/关键字搜索与新单据供应商下拉不再返回已停用供应商。
  - `[AC-4]` `GET /api/master-data/suppliers/:id` 与 `getSupplierById()` 继续允许读取 disabled 记录，不回归已有快照详情和只读消费者。
  - `[AC-5]` 受控自动补建供应商能力存在且有自动化测试；未提供 `sourceDocumentType` 与 `sourceDocumentId` 时不得写入 `AUTO_CREATED` 供应商。
  - `[AC-6]` 现有供应商管理页/API wrapper/权限兼容恢复可用，并通过 `pnpm --dir web build:prod`；同时至少一处真实供应商下拉消费面证明已停用供应商不会再出现在新单据选择中。

## Scope And Ownership

- Allowed code paths:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts` 或新增 `test/master-data-supplier.e2e-spec.ts`
  - 新增的 supplier-focused DTO / spec 文件
- Frozen or shared paths:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/acceptance-tests/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `docs/tasks/task-20260402-1802-master-data-phase1-completion.md`
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `scripts/migration/master-data/**`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
- Task doc owner:
  - `assistant`
- Contracts that must not change silently:
  - `master-data` 仍是供应商主数据真源；业务单据继续通过快照或 `getSupplierById()` 消费，不改成跨模块直接读 `supplier` 底表。
  - 停用只能是逻辑停用；不能物理删除，也不能改写历史 `supplierCodeSnapshot` / `supplierNameSnapshot`。
  - 当前正式 `supplier` runtime 合同以 `docs/architecture/20-wms-database-tables-and-schema.md` 与 `prisma/schema.prisma` 为准：`supplierCode`、`supplierName`、`status`，以及自动补建 provenance 字段。
  - `scripts/migration/master-data/transformer.ts` 已把 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 归档为 source-only payload；本 task 不得无证据地把这些字段重新纳入正式 schema。
  - 当前持久化状态枚举仍是 `ACTIVE | DISABLED`；topic 文案里的“INACTIVE/停用”只表达业务语义，不触发 schema 枚举重命名。
  - 默认列表/搜索要服务于现有供应商下拉消费者，因此默认返回 `ACTIVE`。如果执行中证明供应商管理页确实必须查看 disabled 项，必须用显式 opt-in 查询参数，而不是削弱默认行为。
  - `getSupplierById()` 必须继续保留 status-agnostic 详情读取；不要为了 active-only 列表而顺手改成按状态过滤。
  - 本 task 不得 silently 并入其他主数据实体 CRUD、`F8` 统一主数据查询服务、或 schema widening。

## Implementation Plan

- [ ] Step 1: 补齐 supplier DTO 与写路径，但保持当前 runtime 合同。
  - 新增 supplier create / update / deactivate DTO，参考现有 material DTO 写法。
  - 在 controller / service / repository 中补齐新增、修改、逻辑停用。
  - 唯一性校验放在 service 层先做，并对底层唯一约束异常保持明确报错。
  - `getSupplierById()` 保持不按状态过滤。
- [ ] Step 2: 收口默认 active-only 查询语义。
  - `listSuppliers()` 与关键字搜索默认只返回 `ACTIVE` 供应商，以满足所有新单据供应商下拉消费者。
  - 当前 `QueryMasterDataDto` 没有状态字段；若执行中证明供应商管理页必须查看 disabled，才允许增加显式 opt-in 参数，并保持默认行为不变。
- [ ] Step 3: 补齐受控自动补建供应商能力。
  - 为 supplier 提供最小内部 ensure / auto-create 入口。
  - `AUTO_CREATED` 必须同时带 `sourceDocumentType` 与 `sourceDocumentId`；当前没有真实写调用方时，以 focused tests 证明合同成立即可。
- [ ] Step 4: 收口权限与前端兼容层。
  - 在 `rbac` in-memory permission/menu seed 中加入 `master:supplier:create`、`master:supplier:update`、`master:supplier:deactivate`。
  - 在 `web/src/utils/permissionCompat.js` 中补齐 `master:supplier:* -> base:supplier:*` 的 `add/edit/remove` alias。
  - 将 `web/src/api/base/supplier.js` 的新增、修改、作废改成真实请求，不再回退到 `unsupportedBaseAction(...)`。
  - 更新 `web/src/api/base/compat.js` 的 `mapSupplier()` 与相关 mapper 行为，让页面与当前正式字段合同对齐。
- [ ] Step 5: 对供应商管理页做最小必要适配，而不是扩写 schema 追旧页面字段。
  - `web/src/views/base/supplier/index.vue` 只保留当前正式合同能支撑的管理字段与动作。
  - 去掉对 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 的持久化依赖；不要为了少改页面去扩大 `supplier` schema。
  - 停用交互可退化为简单确认或后端无 reason 的 logical deactivate；本 task 不要求供应商停用原因持久化。
- [ ] Step 6: 增加 focused tests 与 full-mode acceptance evidence。
  - repository / service / controller 级覆盖：重复编码、新增、修改、停用、默认 active-only 搜索、status-agnostic detail、`AUTO_CREATED` 来源约束。
  - e2e 级覆盖：供应商 create / update / deactivate / active-only list 至少贯通一条。
  - 供应商下拉消费回归：至少一处真实页面或等价执行面证明停用后不再出现在新单据供应商下拉。
  - `acceptance-qa` 创建或更新 `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`，将 `[AC-1]` ~ `[AC-6]` 收口进 `Latest Verification`。

## Coder Handoff

- Execution brief:
  - 只交付 `F4`。不要把该 task 重新扩大为整个 `master-data Phase 1`。
  - 以当前 `supplier` runtime 合同为边界：优先改后端写路径、权限兼容、API wrapper 和供应商页最小适配；不通过 schema widening 去追旧 Java/旧页面字段。
  - 已存在的 material 写路径和 DTO 是本轮的直接实现模板。
- Required source docs or files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/acceptance-tests/README.md`
  - `prisma/schema.prisma`
  - `scripts/migration/master-data/transformer.ts`
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/master-data/dto/query-master-data.dto.ts`
  - `src/modules/master-data/dto/create-material.dto.ts`
  - `src/modules/master-data/dto/update-material.dto.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts`
  - 本 task doc
- Owned paths:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts` 或新增 `test/master-data-supplier.e2e-spec.ts`
  - 新增的 supplier-focused DTO / spec 文件
- Forbidden shared files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/acceptance-tests/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `scripts/migration/master-data/**`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
- Constraints and non-goals:
  - 不做其他主数据实体 CRUD。
  - 不实现 `F8` 的统一主数据查询服务。
  - 不改动 `prisma/schema.prisma`，除非执行中出现可证明的硬 blocker；若出现，先回写 blocker 再决定是否扩大 scope。
  - 不把 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 加回正式 schema。
  - 不重命名 `MasterDataStatus` 枚举。
  - 不改写历史单据快照字段，也不把 disabled 供应商从 `getSupplierById()` 的详情读取中排除。
  - 不触碰 `inbound`、`project`、`rd-subwarehouse` 的业务逻辑实现；这些模块仅作为回归验证面。
- Validation command for this scope:
  - Iteration / types:
    - `pnpm typecheck`
  - Focused backend tests:
    - `pnpm test -- src/modules/master-data/infrastructure/master-data.repository.spec.ts src/modules/master-data/application/master-data.service.spec.ts src/modules/master-data/controllers/master-data.controller.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - Focused e2e:
    - `pnpm test:e2e -- test/master-data-supplier.e2e-spec.ts`
  - Frontend compatibility:
    - `pnpm --dir web build:prod`
  - Final repo gate before commit:
    - `pnpm lint`
    - `pnpm verify`
    - `pnpm test:e2e`
    - `pnpm --dir web build:prod`
- If parallel work is approved, add one subsection per writer with the same fields:
  - Not approved for this task.

## Reviewer Handoff

- Review focus:
  - 是否严格只交付 `F4`，没有把 task 漂移为 `Phase 1` 大收口。
  - 是否补齐了真实供应商写路径，而不只是把前端 unsupported 包装层换成表面请求。
  - 是否同时保持了三件事：默认 active-only 列表/搜索、status-agnostic `getSupplierById()`、逻辑停用。
  - 是否遵守了“保持当前 supplier runtime 合同、不扩大 schema”的边界。
  - 是否把 `master:supplier:*` 和 `base:supplier:*` 的兼容链路补齐，没有产生权限漂移。
  - 是否让供应商页与至少一个供应商下拉消费面恢复可用，且测试面与风险面匹配。
- Requirement alignment check:
  - `[AC-1]` 创建唯一性
  - `[AC-2]` 修改与回读
  - `[AC-3]` 逻辑停用与 active-only 消费面
  - `[AC-4]` 详情读取与历史快照兼容
  - `[AC-5]` 自动补建 provenance 约束
  - `[AC-6]` 供应商页/API/权限兼容恢复
- Final validation gate:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm verify`
  - `pnpm test:e2e`
  - `pnpm --dir web build:prod`
- Required doc updates:
  - reviewer 只更新本 task doc 的 `Review status`、`Review Log` 与 acceptance-ready 结论。
  - `docs/acceptance-tests/**` 由 `acceptance-qa` 维护。
  - `docs/tasks/TASK_CENTER.md` 仅在 task path 或 lifecycle 改变时由 parent 统一维护。

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` 创建唯一性
  - `[AC-2]` 修改与回读
  - `[AC-3]` 逻辑停用与 active-only 消费面
  - `[AC-4]` 详情读取兼容
  - `[AC-5]` 自动补建 provenance
  - `[AC-6]` 供应商页/API/权限兼容恢复
- Evidence pointers:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts` 或 `test/master-data-supplier.e2e-spec.ts`
  - `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`
- Evidence gaps, if any:
  - 当前仅完成 planning，尚无运行态和验收证据。
- Complete test report requirement: `yes`

### Acceptance Test Expectations

- Acceptance mode: `full`
- Browser test required: `yes`
- Related acceptance spec:
  - `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`
- Separate acceptance run required: `optional`
- Complete test report required: `yes`
- Required regression / high-risk tags:
  - `master-data-f4`
  - `supplier-crud`
  - `legacy-permission-compat`
  - `supplier-dropdown-active-only`
  - `no-schema-widening`
- Suggested environment / accounts:
  - backend: `.env.dev` + `pnpm dev`
  - frontend: `pnpm --dir web dev`
  - account: `admin`
  - representative browser surfaces:
    - `web/src/views/base/supplier/index.vue`
    - one supplier dropdown consumer in `web/src/views/entry/order/index.vue` or `web/src/views/rd/procurement-requests/index.vue`
- Environment owner / setup source:
  - `docs/acceptance-tests/README.md`
- Environment-gap proof requirements:
  - 若验收在 `pnpm dev` / `pnpm --dir web dev` 面失败，必须先在实际失败执行面复现。
  - 记录原始命令、env 文件、关键依赖状态和原始报错。
  - 至少给出一个对照执行面，证明问题只发生在特定 surface。
  - 在不能排除仓库内实现或配置问题前，不得提前标记为 `environment-gap`。

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - N/A
- If not safe, list the shared files or contracts that require a single writer:
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts` 或 `test/master-data-supplier.e2e-spec.ts`
  - 供应商 route shape、默认 active-only 语义、status-agnostic detail、权限 alias、前端 wrapper 和 e2e/stub 是一条共享契约链；拆成多个 writer 容易出现行为漂移。

## Review Log

- Validation results:
  - planning-only；本轮未执行运行态命令。
- Findings:
  - 当前活跃 task 应继续收敛为 `F4` 单能力切片，不应回退到更大的 `Phase 1` 草案。
  - 供应商页当前依赖的多项 legacy 字段并未进入正式 `supplier` schema/runtime 合同，本轮应以前端最小适配收口，而不是扩大 schema。
- Follow-up action:
  - 交给 `coder` 按本 task 实现，再进入 `code-reviewer` 与 `acceptance-qa`。

## Acceptance

- Acceptance status: `not-assessed`
- Acceptance QA:
  - `acceptance-qa`
- Acceptance date:
  - `-`
- Complete test report:
  - `Pending: docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`

### Acceptance Checklist

> Acceptance QA 在验收时逐条填写。每条应对应本 task 的 `[AC-*]`。

- [ ] `[AC-1]` 新增供应商唯一性成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-2]` 修改供应商后列表 / 详情 / 页面回读一致 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-3]` 逻辑停用后默认搜索与新单据下拉不再出现该供应商 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-4]` `getSupplierById()` 与历史快照语义保持不变 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-5]` 自动补建来源字段约束成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-6]` 供应商页/API/权限兼容恢复且前端构建通过 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`

### Acceptance Notes

- Acceptance path used: `full`
- Acceptance summary:
  - Pending implementation.
- Report completeness check:
  - Pending implementation.
- If rejected or blocked: root cause（`requirement-misunderstanding` | `implementation-gap` | `evidence-gap` | `environment-gap`）+ 精确修复指引 / 环境修复指引
- If conditionally accepted: follow-up requirement / task:
  - None.

## Final Status

- Outcome:
  - 已更新 active task，聚焦 `master-data` `F4` 供应商 CRUD，并清理为单一可执行 handoff。
- Requirement alignment:
  - 该 task 明确选择 confirmed topic 中最小且与当前代码成熟度最匹配的 `F4`，不将更大 `Phase 1` 或后续 roadmap silently 并入。
- Residual risks or testing gaps:
  - 当前仓库尚无 supplier create / update / deactivate 的 focused 自动化回归。
  - 当前供应商页和兼容层仍基于旧字段假设，需由 coder 收口。
  - 当前 supplier e2e stub 能力不足，必须补齐才可能形成真实 CRUD e2e 证据。
- Directory disposition after completion: keep `active` while the task is still open; once it is no longer active, set this to `retained-completed` or `cleanup-candidate`, then sync `docs/tasks/TASK_CENTER.md`
- Next action:
  - `coder` 按本 task doc 执行实现，然后进入 `code-reviewer` 与 `acceptance-qa`。
# 基础数据 F4 供应商 CRUD

## Metadata

- Scope: 完成 `docs/requirements/topics/master-data-management.md` 中最小且可闭环的一条显式能力 `F4`。补齐供应商新增、修改、逻辑停用、默认有效列表/搜索、受控自动补建，以及现有供应商管理页/API/权限兼容的最小收口；不把 `F1/F2/F3/F5/F6/F7/F8/F9/F10` 静默并入本 task。
- Related requirement: `docs/requirements/topics/master-data-management.md` (F4)
- Status: `delivered`
- Review status: `reviewed-clean`
- Delivery mode: `autonomous`
- Acceptance mode: `full`
- Acceptance status: `conditionally-accepted`
- Complete test report required: `yes`
- Lifecycle disposition: `active`
- Planner: `assistant`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Acceptance QA: `acceptance-qa`
- Last updated: `2026-04-02`
- Related checklist: `None`
- Related acceptance spec: `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`（由 `acceptance-qa` 创建或更新）
- Related acceptance run: `None`
- Related files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/acceptance-tests/README.md`
  - `prisma/schema.prisma`
  - `scripts/migration/master-data/transformer.ts`
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/master-data/dto/query-master-data.dto.ts`
  - `src/modules/master-data/dto/create-material.dto.ts`
  - `src/modules/master-data/dto/update-material.dto.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts`

## Requirement Alignment

- Topic capability:
  - `docs/requirements/topics/master-data-management.md` (F4)
- User intent summary:
  - 用户要求在该 confirmed requirement 上继续推进，并最终达到“直到通过所有测试、完成交付”的标准。
  - 该 topic 同时包含 `Phase 1 / Phase 2 / Phase 3` 路线图，不能把整份 topic 视作一个单次安全交付切片。
  - 本 task 明确只切取 `F4`，原因有三点：第一，requirement 已明确写明“供应商结构最简单，优先作为 CRUD 模板参照实现”；第二，当前 `master-data` 代码已具备供应商 list/detail 读路径，最接近形成完整闭环；第三，现有仓库已经有供应商管理页、兼容 API 与多个供应商下拉消费者，最适合作为“后端写路径 + 兼容层 + 消费回归”的第一条可验收链路。
  - 本 task 不把 topic 中其他 Phase 1 能力、`F9` 预警、`F10` 批量导入 silently 并入，也不把 `supplier` 扩成新的历史字段迁移任务。
- Acceptance criteria carried into this task:
  - `[AC-1]` 新增供应商时，`supplierCode` 全局唯一；重复编码返回明确冲突错误。
  - `[AC-2]` 修改供应商时，保持当前运行时正式字段合同，至少支持 `supplierCode`、`supplierName` 的新增与修改；若修改编码，仍需通过唯一性校验。
  - `[AC-3]` 停用供应商采用逻辑停用（沿用当前 `MasterDataStatus.DISABLED`），不做物理删除；默认列表/搜索与新单据供应商下拉不再返回已停用供应商。
  - `[AC-4]` `getSupplierById()` 继续保持按 `id` 的 status-agnostic 详情读取语义，以兼容 `inbound`、`project`、`rd-subwarehouse` 现有快照读取与详情回读。
  - `[AC-5]` 受控自动补建供应商时，`creationMode = AUTO_CREATED` 且 `sourceDocumentType`、`sourceDocumentId` 必填；当前无真实写调用方时，至少通过服务/仓储/e2e 测试覆盖合同。
  - `[AC-6]` 现有供应商管理页与兼容层恢复可用：`web/src/api/base/supplier.js` 不再抛 `unsupportedBaseAction(...)`，权限 alias 补齐，页面不再依赖未进入正式运行时合同的 legacy 字段持久化，并通过 `pnpm --dir web build:prod`。
- Requirement evidence expectations:
  - 后端证据：repository / service / controller / e2e 覆盖新增、修改、停用、重复编码拦截、默认 `ACTIVE` 搜索与 `AUTO_CREATED` 来源约束。
  - 消费面证据：至少一个真实供应商下拉消费面证明停用后不再出现已停用供应商。
  - 兼容层证据：供应商管理页 add/edit/remove 权限和 API wrapper 均已接通。
  - full-mode 验收证据：`acceptance-qa` 在 `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md` 维护 `Latest Verification`。
- Open questions requiring user confirmation:
  - None.

## Progress Sync

- Phase progress:
  - `master-data` topic 仍有多条未完成能力；本 task 明确只选择 `F4` 作为当前最小安全交付切片，不把更大 Phase 1 草案重新激活。
- Current state:
  - `src/modules/master-data/**` 当前只有 `material` 写路径；`supplier` 仅有 `GET /suppliers` 与 `GET /suppliers/:id` 只读路径，没有 create / update / deactivate DTO、controller、service、repository 写路径。
  - 当前 `listSuppliers()` 未强制默认 `ACTIVE` 过滤，`QueryMasterDataDto` 也没有状态筛选字段。
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts` 目前只覆盖 `master:supplier:list`，没有 create / update / deactivate 权限面。
  - `web/src/api/base/supplier.js` 的新增、修改、作废仍全部回退到 `unsupportedBaseAction(...)`。
  - `web/src/views/base/supplier/index.vue` 当前仍依赖 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 等 legacy 页面字段；这些字段并未进入当前正式 `supplier` schema/runtime 合同。
  - `web/src/views/entry/order/index.vue`、`web/src/views/entry/detail/index.vue`、`web/src/views/rd/procurement-requests/index.vue`、`web/src/views/article/product/index.vue`、`web/src/views/report/supplierStatement/index.vue` 都通过 `listSupplierByKeyword()` 或 `listSupplier()` 消费供应商下拉。
  - `test/prisma-e2e-stub.ts` 当前 `supplier` 仍是通用空桩，无法直接承接 supplier CRUD e2e。
- Acceptance state:
  - `待验收`
- Blockers:
  - None.
- Next step:
  - `coder` 先完成 supplier 写路径、权限兼容、供应商页最小适配与 focused tests，再由 `code-reviewer` 和 `acceptance-qa` 收口 correctness 与 full-mode evidence。

## Goal And Acceptance Criteria

- Goal:
  - 在不扩大 topic 范围、也不重写 `supplier` 运行时合同的前提下，完成 `F4` 供应商 CRUD 的最小闭环交付：让 NestJS 后端具备供应商新增、修改、逻辑停用、默认有效查询与受控自动补建能力，同时让现有供应商管理页与供应商下拉消费面恢复真实可用。
- Acceptance criteria:
  - `[AC-1]` `POST /api/master-data/suppliers` 可创建供应商，且重复 `supplierCode` 返回明确冲突错误。
  - `[AC-2]` `PATCH /api/master-data/suppliers/:id` 可更新供应商当前正式运行时字段；当前 task 不要求重新引入 `supplierShortName`、`contactPerson`、`contactPhone`、`address` 等 legacy source-only 字段。
  - `[AC-3]` 提供清晰语义的逻辑停用接口（推荐 `PATCH /api/master-data/suppliers/:id/deactivate`），将 `status` 置为 `DISABLED`；默认列表/关键字搜索与新单据供应商下拉不再返回已停用供应商。
  - `[AC-4]` `GET /api/master-data/suppliers/:id` 与 `getSupplierById()` 继续允许读取 disabled 记录，不回归已有快照详情和只读消费者。
  - `[AC-5]` 受控自动补建供应商能力存在且有自动化测试；未提供 `sourceDocumentType` 与 `sourceDocumentId` 时不得写入 `AUTO_CREATED` 供应商。
  - `[AC-6]` 现有供应商管理页/API wrapper/权限兼容恢复可用，并通过 `pnpm --dir web build:prod`；同时至少一处真实供应商下拉消费面证明已停用供应商不会再出现在新单据选择中。

## Scope And Ownership

- Allowed code paths:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts` 或新增 `test/master-data-supplier.e2e-spec.ts`
  - 新增的 supplier-focused DTO / spec 文件
- Frozen or shared paths:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/acceptance-tests/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `docs/tasks/task-20260402-1802-master-data-phase1-completion.md`
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `scripts/migration/master-data/**`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
- Task doc owner:
  - `assistant`
- Contracts that must not change silently:
  - `master-data` 仍是供应商主数据真源；业务单据继续通过快照或 `getSupplierById()` 消费，不改成跨模块直接读 `supplier` 底表。
  - 停用只能是逻辑停用；不能物理删除，也不能改写历史 `supplierCodeSnapshot` / `supplierNameSnapshot`。
  - 当前正式 `supplier` runtime 合同以 `docs/architecture/20-wms-database-tables-and-schema.md` 与 `prisma/schema.prisma` 为准：`supplierCode`、`supplierName`、`status`，以及自动补建 provenance 字段。
  - `scripts/migration/master-data/transformer.ts` 已把 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 归档为 source-only payload；本 task 不得无证据地把这些字段重新纳入正式 schema。
  - 当前持久化状态枚举仍是 `ACTIVE | DISABLED`；topic 文案里的“INACTIVE/停用”只表达业务语义，不触发 schema 枚举重命名。
  - 默认列表/搜索要服务于现有供应商下拉消费者，因此默认返回 `ACTIVE`。如果执行中证明供应商管理页确实必须查看 disabled 项，必须用显式 opt-in 查询参数，而不是削弱默认行为。
  - `getSupplierById()` 必须继续保留 status-agnostic 详情读取；不要为了 active-only 列表而顺手改成按状态过滤。
  - 本 task 不得 silently 并入其他主数据实体 CRUD、`F8` 统一主数据查询服务、或 schema widening。

## Implementation Plan

- [ ] Step 1: 补齐 supplier DTO 与写路径，但保持当前 runtime 合同。
  - 新增 supplier create / update / deactivate DTO，参考现有 material DTO 写法。
  - 在 controller / service / repository 中补齐新增、修改、逻辑停用。
  - 唯一性校验放在 service 层先做，并对底层唯一约束异常保持明确报错。
  - `getSupplierById()` 保持不按状态过滤。
- [ ] Step 2: 收口默认 active-only 查询语义。
  - `listSuppliers()` 与关键字搜索默认只返回 `ACTIVE` 供应商，以满足所有新单据供应商下拉消费者。
  - 当前 `QueryMasterDataDto` 没有状态字段；若执行中证明供应商管理页必须查看 disabled，才允许增加显式 opt-in 参数，并保持默认行为不变。
- [ ] Step 3: 补齐受控自动补建供应商能力。
  - 为 supplier 提供最小内部 ensure / auto-create 入口。
  - `AUTO_CREATED` 必须同时带 `sourceDocumentType` 与 `sourceDocumentId`；当前没有真实写调用方时，以 focused tests 证明合同成立即可。
- [ ] Step 4: 收口权限与前端兼容层。
  - 在 `rbac` in-memory permission/menu seed 中加入 `master:supplier:create`、`master:supplier:update`、`master:supplier:deactivate`。
  - 在 `web/src/utils/permissionCompat.js` 中补齐 `master:supplier:* -> base:supplier:*` 的 `add/edit/remove` alias。
  - 将 `web/src/api/base/supplier.js` 的新增、修改、作废改成真实请求，不再回退到 `unsupportedBaseAction(...)`。
  - 更新 `web/src/api/base/compat.js` 的 `mapSupplier()` 与相关 mapper 行为，让页面与当前正式字段合同对齐。
- [ ] Step 5: 对供应商管理页做最小必要适配，而不是扩写 schema 追旧页面字段。
  - `web/src/views/base/supplier/index.vue` 只保留当前正式合同能支撑的管理字段与动作。
  - 去掉对 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 的持久化依赖；不要为了少改页面去扩大 `supplier` schema。
  - 停用交互可退化为简单确认或后端无 reason 的 logical deactivate；本 task 不要求供应商停用原因持久化。
- [ ] Step 6: 增加 focused tests 与 full-mode acceptance evidence。
  - repository / service / controller 级覆盖：重复编码、新增、修改、停用、默认 active-only 搜索、status-agnostic detail、`AUTO_CREATED` 来源约束。
  - e2e 级覆盖：供应商 create / update / deactivate / active-only list 至少贯通一条。
  - 供应商下拉消费回归：至少一处真实页面或等价执行面证明停用后不再出现在新单据供应商下拉。
  - `acceptance-qa` 创建或更新 `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`，将 `[AC-1]` ~ `[AC-6]` 收口进 `Latest Verification`。

## Coder Handoff

- Execution brief:
  - 只交付 `F4`。不要把该 task 重新扩大为整个 `master-data Phase 1`。
  - 以当前 `supplier` runtime 合同为边界：优先改后端写路径、权限兼容、API wrapper 和供应商页最小适配；不通过 schema widening 去追旧 Java/旧页面字段。
  - 已存在的 material 写路径和 DTO 是本轮的直接实现模板。
- Required source docs or files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/acceptance-tests/README.md`
  - `prisma/schema.prisma`
  - `scripts/migration/master-data/transformer.ts`
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/master-data/dto/query-master-data.dto.ts`
  - `src/modules/master-data/dto/create-material.dto.ts`
  - `src/modules/master-data/dto/update-material.dto.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts`
  - 本 task doc
- Owned paths:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts` 或新增 `test/master-data-supplier.e2e-spec.ts`
  - 新增的 supplier-focused DTO / spec 文件
- Forbidden shared files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/acceptance-tests/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `scripts/migration/master-data/**`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/report/supplierStatement/index.vue`
- Constraints and non-goals:
  - 不做其他主数据实体 CRUD。
  - 不实现 `F8` 的统一主数据查询服务。
  - 不改动 `prisma/schema.prisma`，除非执行中出现可证明的硬 blocker；若出现，先回写 blocker 再决定是否扩大 scope。
  - 不把 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 加回正式 schema。
  - 不重命名 `MasterDataStatus` 枚举。
  - 不改写历史单据快照字段，也不把 disabled 供应商从 `getSupplierById()` 的详情读取中排除。
  - 不触碰 `inbound`、`project`、`rd-subwarehouse` 的业务逻辑实现；这些模块仅作为回归验证面。
- Validation command for this scope:
  - Iteration / types:
    - `pnpm typecheck`
  - Focused backend tests:
    - `pnpm test -- src/modules/master-data/infrastructure/master-data.repository.spec.ts src/modules/master-data/application/master-data.service.spec.ts src/modules/master-data/controllers/master-data.controller.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - Focused e2e:
    - `pnpm test:e2e -- test/master-data-supplier.e2e-spec.ts`
  - Frontend compatibility:
    - `pnpm --dir web build:prod`
  - Final repo gate before commit:
    - `pnpm lint`
    - `pnpm verify`
    - `pnpm test:e2e`
    - `pnpm --dir web build:prod`
- If parallel work is approved, add one subsection per writer with the same fields:
  - Not approved for this task.

## Reviewer Handoff

- Review focus:
  - 是否严格只交付 `F4`，没有把 task 漂移为 `Phase 1` 大收口。
  - 是否补齐了真实供应商写路径，而不只是把前端 unsupported 包装层换成表面请求。
  - 是否同时保持了三件事：默认 active-only 列表/搜索、status-agnostic `getSupplierById()`、逻辑停用。
  - 是否遵守了“保持当前 supplier runtime 合同、不扩大 schema”的边界。
  - 是否把 `master:supplier:*` 和 `base:supplier:*` 的兼容链路补齐，没有产生权限漂移。
  - 是否让供应商页与至少一个供应商下拉消费面恢复可用，且测试面与风险面匹配。
- Requirement alignment check:
  - `[AC-1]` 创建唯一性
  - `[AC-2]` 修改与回读
  - `[AC-3]` 逻辑停用与 active-only 消费面
  - `[AC-4]` 详情读取与历史快照兼容
  - `[AC-5]` 自动补建 provenance 约束
  - `[AC-6]` 供应商页/API/权限兼容恢复
- Final validation gate:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm verify`
  - `pnpm test:e2e`
  - `pnpm --dir web build:prod`
- Required doc updates:
  - reviewer 只更新本 task doc 的 `Review status`、`Review Log` 与 acceptance-ready 结论。
  - `docs/acceptance-tests/**` 由 `acceptance-qa` 维护。
  - `docs/tasks/TASK_CENTER.md` 仅在 task path 或 lifecycle 改变时由 parent 统一维护。

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` 创建唯一性
  - `[AC-2]` 修改与回读
  - `[AC-3]` 逻辑停用与 active-only 消费面
  - `[AC-4]` 详情读取兼容
  - `[AC-5]` 自动补建 provenance
  - `[AC-6]` 供应商页/API/权限兼容恢复
- Evidence pointers:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts` 或 `test/master-data-supplier.e2e-spec.ts`
  - `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`
- Evidence gaps, if any:
  - 当前仅完成 planning，尚无运行态和验收证据。
- Complete test report requirement: `yes`

### Acceptance Test Expectations

- Acceptance mode: `full`
- Browser test required: `yes`
- Related acceptance spec:
  - `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`
- Separate acceptance run required: `optional`
- Complete test report required: `yes`
- Required regression / high-risk tags:
  - `master-data-f4`
  - `supplier-crud`
  - `legacy-permission-compat`
  - `supplier-dropdown-active-only`
  - `no-schema-widening`
- Suggested environment / accounts:
  - backend: `.env.dev` + `pnpm dev`
  - frontend: `pnpm --dir web dev`
  - account: `admin`
  - representative browser surfaces:
    - `web/src/views/base/supplier/index.vue`
    - one supplier dropdown consumer in `web/src/views/entry/order/index.vue` or `web/src/views/rd/procurement-requests/index.vue`
- Environment owner / setup source:
  - `docs/acceptance-tests/README.md`
- Environment-gap proof requirements:
  - 若验收在 `pnpm dev` / `pnpm --dir web dev` 面失败，必须先在实际失败执行面复现。
  - 记录原始命令、env 文件、关键依赖状态和原始报错。
  - 至少给出一个对照执行面，证明问题只发生在特定 surface。
  - 在不能排除仓库内实现或配置问题前，不得提前标记为 `environment-gap`。

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - N/A
- If not safe, list the shared files or contracts that require a single writer:
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - `test/app.e2e-spec.ts` 或 `test/master-data-supplier.e2e-spec.ts`
  - 供应商 route shape、默认 active-only 语义、status-agnostic detail、权限 alias、前端 wrapper 和 e2e/stub 是一条共享契约链；拆成多个 writer 容易出现行为漂移。

## Review Log

- Validation results:
  - planning-only；本轮未执行运行态命令。
- Findings:
  - 当前活跃 task 应继续收敛为 `F4` 单能力切片，不应回退到更大的 `Phase 1` 草案。
  - 供应商页当前依赖的多项 legacy 字段并未进入正式 `supplier` schema/runtime 合同，本轮应以前端最小适配收口，而不是扩大 schema。
- Follow-up action:
  - 交给 `coder` 按本 task 实现，再进入 `code-reviewer` 与 `acceptance-qa`。

## Acceptance

- Acceptance status: `not-assessed`
- Acceptance QA:
  - `acceptance-qa`
- Acceptance date:
  - `-`
- Complete test report:
  - `Pending: docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`

### Acceptance Checklist

> Acceptance QA 在验收时逐条填写。每条应对应本 task 的 `[AC-*]`。

- [ ] `[AC-1]` 新增供应商唯一性成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-2]` 修改供应商后列表 / 详情 / 页面回读一致 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-3]` 逻辑停用后默认搜索与新单据下拉不再出现该供应商 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-4]` `getSupplierById()` 与历史快照语义保持不变 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-5]` 自动补建来源字段约束成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-6]` 供应商页/API/权限兼容恢复且前端构建通过 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`

### Acceptance Notes

- Acceptance path used: `full`
- Acceptance summary:
  - Pending implementation.
- Report completeness check:
  - Pending implementation.
- If rejected or blocked: root cause（`requirement-misunderstanding` | `implementation-gap` | `evidence-gap` | `environment-gap`）+ 精确修复指引 / 环境修复指引
- If conditionally accepted: follow-up requirement / task:
  - None.

## Final Status

- Outcome:
  - 已更新 active task，聚焦 `master-data` `F4` 供应商 CRUD，并清理为单一可执行 handoff。
- Requirement alignment:
  - 该 task 明确选择 confirmed topic 中最小且与当前代码成熟度最匹配的 `F4`，不将更大 `Phase 1` 或后续 roadmap silently 并入。
- Residual risks or testing gaps:
  - 当前仓库尚无 supplier create / update / deactivate 的 focused 自动化回归。
  - 当前供应商页和兼容层仍基于旧字段假设，需由 coder 收口。
  - 当前 supplier e2e stub 能力不足，必须补齐才可能形成真实 CRUD e2e 证据。
- Directory disposition after completion: keep `active` while the task is still open; once it is no longer active, set this to `retained-completed` or `cleanup-candidate`, then sync `docs/tasks/TASK_CENTER.md`
- Next action:
  - `coder` 按本 task doc 执行实现，然后进入 `code-reviewer` 与 `acceptance-qa`。
# 基础数据 F4 供应商 CRUD

## Metadata

- Scope: 完成 confirmed topic 中最小可闭环且与当前代码成熟度最匹配的单能力切片 `F4` 供应商 CRUD，并同步收口该切片必需的 schema、迁移、权限兼容、前端 API 包装与测试；不静默扩到其他主数据实体或未来阶段能力。
- Related requirement: `docs/requirements/topics/master-data-management.md` (F4)
- Status: `planned`
- Review status: `not-reviewed`
- Delivery mode: `autonomous`
- Acceptance mode: `light`
- Acceptance status: `not-assessed`
- Complete test report required: `yes`
- Lifecycle disposition: `active`
- Planner: `planner`
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
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/architecture/modules/master-data.md`
  - `prisma/schema.prisma`
  - `src/modules/master-data/**`
  - `scripts/migration/master-data/types.ts`
  - `scripts/migration/master-data/transformer.ts`
  - `scripts/migration/master-data/writer.ts`
  - `scripts/migration/master-data/validate.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `test/migration/master-data.spec.ts`
  - `test/app.e2e-spec.ts`
  - `test/prisma-e2e-stub.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`

## Requirement Alignment

- Topic capability:
  - `docs/requirements/topics/master-data-management.md` (F4)
- User intent summary:
  - 用户要求在 confirmed 的 `master-data` topic 上继续“自主完成、遇到问题自行解决、直到通过所有测试并最终 commit”。
  - 该 topic 同时包含多个未完成 Phase 1 能力，以及明确属于未来阶段的 `F9` / `F10`；本 task 必须选一个最小安全切片，而不是把整条路线图静默并入。
  - 结合 requirement 文档“供应商结构最简单，优先作为 CRUD 模板参照实现”与当前代码现状，`F4` 是最小且最适合作为立即交付切片的能力。
- Acceptance criteria carried into this task:
  - `[AC-1]` 新增供应商时，`supplierCode` 全局唯一。
  - `[AC-2]` 支持供应商修改，并返回现有供应商页真实使用的字段集。
  - `[AC-3]` 停用供应商后，默认列表 / 搜索与新单据供应商下拉不再出现该供应商。
  - `[AC-4]` 受控自动补建供应商仍需 `creationMode` 与完整来源字段约束。
- Requirement evidence expectations:
  - service / repository / e2e 证据覆盖新增、修改、停用、默认 `ACTIVE` 搜索、按 `id` 详情读取。
  - 既有 `getSupplierById()` 消费路径继续稳定，不因 active-only 列表策略而回归。
  - 如果本轮为 supplier 扩字段，迁移链路与前端兼容层必须给出直接证据，不能让 schema、迁移、运行态出现三套口径。
- Open questions requiring user confirmation:
  - None.

## Progress Sync

- Phase progress:
  - `master-data` topic 仍有 `F1/F2/F3/F5/F6/F7/F8` 等 Phase 1 能力未完成；`F9/F10` 仍属于未来阶段。本 task 明确只交付 `F4`，不把路线图静默扩为“完成整个 topic”。
- Current state:
  - `src/modules/master-data/**` 目前只有供应商列表与详情读路径，没有 create / update / deactivate DTO、controller、service、repository 写路径；`listSuppliers()` 也未默认强制 `ACTIVE` 过滤。
  - `prisma/schema.prisma` 的 `Supplier` 仅包含 `supplierCode`、`supplierName`、`status` 与来源元数据；但现有供应商页、多个远程下拉和迁移快照已实际依赖 `supplierShortName`、`contactPerson`、`contactPhone`、`address` 与停用原因语义。
  - `scripts/migration/master-data/transformer.ts` 当前把这些 supplier 扩展字段视为 archived source-only payload，`writer.ts` / `validate.ts` 也未覆盖这些列；如果本轮扩 supplier 主表而不联动迁移链路，会造成迁移数据与运行态字段漂移。
  - `web/src/api/base/supplier.js` 的新增 / 修改 / 删除 / 作废仍是 `unsupportedBaseAction(...)`；`web/src/utils/permissionCompat.js` 只映射了 `master:supplier:list -> base:supplier:list`。
  - `test/prisma-e2e-stub.ts` 的 `supplier` 仍是通用空桩，`test/app.e2e-spec.ts` 目前没有 supplier CRUD 证据。
- Acceptance state:
  - `待验证`；light 模式下证据默认写回 task 文档，无需预建 acceptance spec。只有在自动化证据不足以证明 consumer surface 时，才升级到 browser smoke 或 full acceptance。
- Blockers:
  - None.
- Next step:
  - `coder` 按本 task 实现 `F4`，在同一轮跑完 schema / unit / migration / e2e / web build 证据，再交 `code-reviewer`。

## Goal And Acceptance Criteria

- Goal:
  - 以最小但完整的交付切片完成 `master-data` `F4` 供应商 CRUD，使 NestJS 后端、迁移链路和现有前端兼容层在“供应商可维护、停用后新单据不可选、历史详情仍可回读”这一单能力上形成闭环，而不顺手扩展其他主数据实体。
- Acceptance criteria:
  - `[AC-1]` `POST /api/master-data/suppliers` 可创建供应商，`supplierCode` 全局唯一，重复编码返回明确冲突错误。
  - `[AC-2]` `PATCH /api/master-data/suppliers/:id` 可更新供应商，并稳定返回当前供应商页实际使用的字段：`supplierCode`、`supplierName`、`supplierShortName`、`contactPerson`、`contactPhone`、`address`。
  - `[AC-3]` 停用供应商使用逻辑停用并持久化停用原因；停用后默认供应商列表 / 关键字搜索与新单据供应商下拉不再返回该记录。
  - `[AC-4]` `GET /api/master-data/suppliers/:id` / `getSupplierById()` 继续保持 status-agnostic 详情读取；既有 `inbound`、`project`、`rd-subwarehouse` 消费路径不因 active-only 列表策略回归。
  - `[AC-5]` 受控自动补建供应商仍受 `creationMode`、`sourceDocumentType`、`sourceDocumentId` 约束；缺少来源信息时不得写入 `AUTO_CREATED` 记录。
  - `[AC-6]` 若本轮为供应商补齐页面 / 迁移所需字段，`scripts/migration/master-data/**`、`test/migration/master-data.spec.ts`、`test/app.e2e-spec.ts` 与 `pnpm --dir web build:prod` 必须同步通过，不能留下 schema / migration / compat 三套口径。

## Scope And Ownership

- Allowed code paths:
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `src/modules/master-data/**`
  - `scripts/migration/master-data/types.ts`
  - `scripts/migration/master-data/transformer.ts`
  - `scripts/migration/master-data/writer.ts`
  - `scripts/migration/master-data/validate.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `test/migration/master-data.spec.ts`
  - `test/app.e2e-spec.ts`
  - `test/prisma-e2e-stub.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`（仅当 API / compat 层无法兼容现有页面时，允许最小补丁）
- Frozen or shared paths:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `docs/acceptance-tests/**`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/**`
  - `web/src/views/article/**`
  - `web/src/views/report/**`
  - `web/src/views/rd/**`
- Task doc owner:
  - `planner`
- Contracts that must not change silently:
  - `master-data` 仍是供应商主档真源；其他业务模块继续通过 `MasterDataService` / 快照消费，不直接 JOIN 主数据底表。
  - 供应商停用只能是逻辑停用，不能物理删除，不能影响历史单据上的 `supplierCodeSnapshot` / `supplierNameSnapshot`。
  - 默认列表 / 搜索 active-only 仅适用于新建与查询入口；`getSupplierById()` 不得被收窄成 active-only。
  - requirement 文案中的“停用 / INACTIVE”是业务语义；若当前 runtime 的 `MasterDataStatus` / 持久化枚举仍用 `DISABLED`，不能无证据触发全仓库状态重命名。
  - 若扩 supplier 字段，迁移链路必须从“归档 source-only”切回“写入主表并验证”，不能只改运行态 schema。
  - 本 task 不扩成 `F8` 统一主数据查询服务，不补做 `F1/F2/F3/F5/F6/F7/F9/F10`。

## Implementation Plan

- [ ] Step 1: 固定供应商持久化合同。
  - 对齐 requirement `F4` 与现有消费面，明确 supplier 主表 / DTO / compat 所需最小字段集与停用原因字段命名。
  - 如果扩 `Supplier` schema，保持 `supplierCode` 唯一性、逻辑停用语义和来源元数据合同不变。
- [ ] Step 2: 完成 `master-data` 供应商写路径。
  - 新增 create / update / deactivate DTO 与 controller routes。
  - 在 service / repository 中补齐唯一性校验、逻辑停用、默认 `ACTIVE` 搜索，以及 status-agnostic detail 读取。
  - 自动补建供应商若当前无真实调用方，可只暴露内部 service 能力并用测试锁定合同。
- [ ] Step 3: 收口前端兼容与权限链路。
  - 在 RBAC 默认权限 / 别名中补齐 `master:supplier:create`、`master:supplier:update`、`master:supplier:deactivate` 到旧 `base:supplier:add/edit/remove` 的兼容映射。
  - 将 `web/src/api/base/supplier.js` 从 unsupported wrapper 改成真实请求。
  - 更新 `mapSupplier()` 以返回真实 `supplierShortName` / `contactPerson` / `contactPhone` / `address`；优先不改页面，仅在兼容层无法承接时对 `web/src/views/base/supplier/index.vue` 做最小补丁。
- [ ] Step 4: 联动迁移与测试桩。
  - 若 supplier 主表字段扩展，更新 `scripts/migration/master-data/types.ts`、`transformer.ts`、`writer.ts`、`validate.ts`，让迁移结果与运行态一致。
  - 将 `test/prisma-e2e-stub.ts` 的 supplier model 从空桩升级为能支撑 CRUD / active-only 断言的 memory model。
- [ ] Step 5: 补齐 focused tests 与最终门禁。
  - 扩 `src/modules/master-data/**` 单测 / 仓储测，覆盖 create / update / deactivate / duplicate / active-only / detail / auto-create。
  - 扩 `test/migration/master-data.spec.ts`，确保 supplier 迁移不再把新增字段仅归档掉。
  - 在 `test/app.e2e-spec.ts` 增加 supplier CRUD + 权限 / 列表行为覆盖。
  - 通过 `pnpm --dir web build:prod` 验证前端兼容层和供应商页编译链。

## Coder Handoff

- Execution brief:
  - 只交付 `F4` 供应商 CRUD，但必须把这个切片真正做完：schema、主模块写路径、兼容层、迁移链路、测试证据一起收口。
  - 不以“其他实体也类似”为理由顺手复制扩 scope；也不要把问题推给未来的 `F8`。
  - 若执行中发现必须修改 `inbound` / `project` / `rd-subwarehouse` 业务代码才能维持 supplier detail / dropdown 合同，先把证明写回 task doc 再决定是否申请 parent 扩 scope；默认这些消费方应通过现有 `getSupplierById()` / API compat 保持不变。
- Required source docs or files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/architecture/modules/master-data.md`
  - `prisma/schema.prisma`
  - `src/modules/master-data/**`
  - `scripts/migration/master-data/types.ts`
  - `scripts/migration/master-data/transformer.ts`
  - `scripts/migration/master-data/writer.ts`
  - `scripts/migration/master-data/validate.ts`
  - `test/migration/master-data.spec.ts`
  - `test/app.e2e-spec.ts`
  - `test/prisma-e2e-stub.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - 本 task doc
- Owned paths:
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `src/modules/master-data/**`
  - `scripts/migration/master-data/types.ts`
  - `scripts/migration/master-data/transformer.ts`
  - `scripts/migration/master-data/writer.ts`
  - `scripts/migration/master-data/validate.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `test/migration/master-data.spec.ts`
  - `test/app.e2e-spec.ts`
  - `test/prisma-e2e-stub.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`（仅当兼容层无法承接时）
- Forbidden shared files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `docs/acceptance-tests/**`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/**`
  - `web/src/views/article/**`
  - `web/src/views/report/**`
  - `web/src/views/rd/**`
- Constraints and non-goals:
  - 不做其他主数据实体 CRUD。
  - 不做 `F8` 泛化主数据查询服务。
  - 不做物理删除。
  - 不重命名全仓库状态枚举，除非编译 / runtime 一致性证明必须如此。
  - 不重构 consumer 模块，只维持既有合同。
  - 不由 coder 修改 `docs/acceptance-tests/**`。
- Validation command for this scope:
  - Iteration:
    - `pnpm prisma:validate`
    - `pnpm prisma:generate`
    - `pnpm typecheck`
    - `pnpm test -- src/modules/master-data/infrastructure/master-data.repository.spec.ts src/modules/master-data/application/master-data.service.spec.ts test/migration/master-data.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
    - `pnpm test:e2e -- test/app.e2e-spec.ts`
    - `pnpm --dir web build:prod`
  - If migration scripts changed and local `.env.dev` DB is available:
    - `pnpm migration:master-data:dry-run`
    - `pnpm migration:master-data:validate`
  - Final gate before commit:
    - `pnpm lint`
    - `pnpm verify`
    - `pnpm test:e2e`
    - `pnpm --dir web build:prod`
- If parallel work is approved, add one subsection per writer with the same fields:
  - `None`; see `## Parallelization Safety`。

## Reviewer Handoff

- Review focus:
  - 是否严格锁在 `F4`，没有 silently 扩到其他主数据实体或泛化基础设施。
  - 是否同时收口了 supplier schema / migration / service / compat / tests，而不是只修前端 wrapper。
  - 是否保持 logical deactivate + active-only list/search + status-agnostic detail 三个合同同时成立。
  - 是否对 `AUTO_CREATED` 的来源字段约束给出直接测试证据。
  - 是否用最小变更保持既有 consumer surfaces 不变，没有跨模块泄漏或直接读主数据表。
- Requirement alignment check:
  - `[AC-1]` 唯一创建
  - `[AC-2]` 更新与字段回读
  - `[AC-3]` 停用与 active-only 搜索
  - `[AC-4]` 历史详情 / 下游消费兼容
  - `[AC-5]` 自动补建来源约束
  - `[AC-6]` schema / migration / compat / tests 一致
- Final validation gate:
  - `pnpm prisma:validate`
  - `pnpm prisma:generate`
  - `pnpm typecheck`
  - `pnpm test -- src/modules/master-data/infrastructure/master-data.repository.spec.ts src/modules/master-data/application/master-data.service.spec.ts test/migration/master-data.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `pnpm test:e2e`
  - `pnpm --dir web build:prod`
  - `pnpm lint`
  - `pnpm verify`
- Required doc updates:
  - reviewer 仅更新本 task doc 的 `Review status`、`Review Log`、`Acceptance` 与 `Final Status`。
  - `docs/acceptance-tests/**` 只有在 reviewer 认定 light 证据不足时，才交 `acceptance-qa` 单独升级。

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` 到 `[AC-6]`
- Evidence pointers:
  - `prisma/schema.prisma`
  - `src/modules/master-data/**`
  - `scripts/migration/master-data/**`
  - `test/migration/master-data.spec.ts`
  - `test/app.e2e-spec.ts`
  - `test/prisma-e2e-stub.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - 如有最小页面补丁，再加 `web/src/views/base/supplier/index.vue`
- Evidence gaps, if any:
  - 当前仅完成 planning，尚无运行证据；主要风险是 supplier 字段扩展后迁移链路与 e2e stub 未同步。
- Complete test report requirement: `yes`

### Acceptance Test Expectations

- Acceptance mode: `light`
- Browser test required: `no`
- Related acceptance spec: `None`
- Separate acceptance run required: `no`
- Complete test report required: `yes`
- Required regression / high-risk tags:
  - `master-data-f4`
  - `supplier-crud`
  - `migration-alignment`
  - `legacy-permission-compat`
  - `supplier-active-only-search`
- Suggested environment / accounts:
  - unit / e2e: local test runner
  - build: `pnpm --dir web build:prod`
  - optional live migration validation: `.env.dev` + local MySQL / Redis
  - optional manual smoke only if evidence gap remains: `admin`
- Environment owner / setup source:
  - `docs/acceptance-tests/README.md`
- Escalation rule:
  - 只有当 unit / e2e / build 无法直接证明 consumer dropdown / compat 行为时，才升级到 browser smoke 或 full acceptance；不能先天假定需要 full。

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - `None`
- If not safe, list the shared files or contracts that require a single writer:
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `src/modules/master-data/**`
  - `scripts/migration/master-data/types.ts`
  - `scripts/migration/master-data/transformer.ts`
  - `scripts/migration/master-data/writer.ts`
  - `scripts/migration/master-data/validate.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `test/migration/master-data.spec.ts`
  - `test/app.e2e-spec.ts`
  - `test/prisma-e2e-stub.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - supplier 字段形状、active-only 查询、detail 兼容、RBAC alias、迁移 upsert 和 e2e stub 共享同一合同链，拆成多个 writer 极易出现 schema / compat / test 漂移。

## Review Log

- Validation results:
  - planning-only；尚未执行 runtime 命令。
- Findings:
  - `F4` 仍是 confirmed topic 中最小且与当前代码成熟度最匹配的安全交付切片。
  - 现有 active task 需要补入 migration 与 e2e stub 维度，否则 coder 很容易只做 API / 页面表层修补。
- Follow-up action:
  - 交 `coder` 实施并收集完整测试结果，再进 review / acceptance。

## Acceptance

- Acceptance status: `not-assessed`
- Acceptance QA:
  - `acceptance-qa`
- Acceptance date:
  - `-`
- Complete test report:
  - `Pending in task doc`

### Acceptance Checklist

> Acceptance QA 在验收时逐条填写。每条应对应 topic capability 的用户需求或 task doc 的 `[AC-*]` 条目。

- [ ] `[AC-1]` 新增供应商唯一性成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-2]` 修改供应商后列表 / 详情 / 页面字段一致 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-3]` 逻辑停用后默认搜索与新单据下拉不再出现该供应商 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-4]` 既有 `getSupplierById()` 消费路径与历史详情回读不回归 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-5]` 自动补建来源字段约束成立 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`
- [ ] `[AC-6]` schema / migration / compat / tests 一致通过 — Evidence: ... — Verdict: `✓ met` | `✗ not met` | `△ partially met`

### Acceptance Notes

- Acceptance path used: `light`
- Acceptance summary:
  - Pending implementation.
- Report completeness check:
  - Pending implementation.
- If rejected or blocked: root cause（`requirement-misunderstanding` | `implementation-gap` | `evidence-gap` | `environment-gap`）+ 精确修复指引 / 环境修复指引
- If conditionally accepted: follow-up requirement / task:

## Final Status

- Outcome:
  - active task 已更新为 `master-data` `F4` 供应商 CRUD 的执行真源，纳入 schema、迁移、兼容层与测试闭环，ready for `coder`。
- Requirement alignment:
  - 该切片直接对应 `docs/requirements/topics/master-data-management.md (F4)`，并显式排除了 topic 里其余 Phase 1 / 2 / 3 能力，避免把路线图误当单次任务范围。
- Residual risks or testing gaps:
  - supplier 主表字段与迁移 / 前端兼容层 currently 不一致，是实现阶段首要风险。
  - e2e stub 当前对 supplier 仍为空壳，若不先升级会导致 e2e 证据虚弱。
  - 默认角色权限与 legacy alias 未补齐 create / update / remove，会导致页面按钮或接口鉴权表面通过、运行失效。
- Directory disposition after completion: keep `active` while the task is still open; once it is no longer active, set this to `retained-completed` or `cleanup-candidate`, then sync `docs/tasks/TASK_CENTER.md`
- Next action:
  - `coder` 按本 task 实现并跑完测试，再由 `code-reviewer` 审核；如证据仍不足，再由 `acceptance-qa` 决定是否升级执行面。
# 基础数据 F4 供应商 CRUD

## Metadata

- Scope: 完成 confirmed topic 中最小且可闭环的一条显式能力：`F4` 供应商 CRUD。按当前运行时合同补齐供应商新增、修改、逻辑停用、默认 `ACTIVE` 列表/搜索、受控自动补建，以及供应商管理页/API 的最小兼容收口；不把 `F1/F2/F3/F5/F6/F7/F8/F9/F10` 静默并入本 task。
- Related requirement: `docs/requirements/topics/master-data-management.md` (F4)
- Status: `planned`
- Review status: `reviewed-clean`
- Delivery mode: `autonomous`
- Acceptance mode: `full`
- Acceptance status: `not-assessed`
- Complete test report required: `yes`
- Lifecycle disposition: `active`
- Planner: `assistant`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Acceptance QA: `acceptance-qa`
- Last updated: `2026-04-02`
- Related acceptance spec: `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`（由 `acceptance-qa` 创建或更新）
- Related files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `prisma/schema.prisma`
  - `scripts/migration/master-data/transformer.ts`
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`

## Requirement Alignment

- Topic capability:
  - `docs/requirements/topics/master-data-management.md` (F4)
- User intent summary:
  - 用户要求在该 confirmed requirement 上继续“自主完成，直到通过所有测试并最终 commit”。
  - 该 topic 同时包含 `Phase 1 / Phase 2 / Phase 3` 能力与 roadmap 项；本 task 只切取显式 unfinished capability `F4`，不做 silent multi-capability bundling。
  - 选择 `F4` 的原因是：requirement 已明确说明“供应商结构最简单（无树形、无层级），优先作为 CRUD 模板参照实现”；当前仓库已具备供应商列表 / 详情读路径、业务模块快照消费者，以及现成的供应商页面与 API 包装层，最适合形成一条完整但最小的安全交付链。
  - 关键约束来自当前 runtime 真源：`docs/architecture/20-wms-database-tables-and-schema.md` 已冻结 `supplier` 主表关键字段为 `supplierCode`、`supplierName`、`status`；`scripts/migration/master-data/transformer.ts` 也把 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 视为 source-only archived payload，而非运行时正式字段。本 task 不应无新 requirement 地把这些 legacy 字段重新写回正式 schema。
- Acceptance criteria carried into this task:
  - `[AC-1]` 新增供应商时，`supplierCode` 全局唯一；重复编码返回明确冲突错误。
  - `[AC-2]` 修改供应商时可更新当前运行时支持的字段（至少 `supplierCode`、`supplierName`），若修改编码仍需满足唯一性；`getSupplierById()` 与既有快照消费者继续可用。
  - `[AC-3]` 停用供应商采用逻辑停用（沿用当前 `MasterDataStatus.DISABLED` 语义），不做物理删除；停用后默认列表 / 搜索与新单据供应商下拉中不再出现该供应商。
  - `[AC-4]` 受控自动补建供应商时，`creationMode = AUTO_CREATED` 且 `sourceDocumentType`、`sourceDocumentId` 必填；若当前无真实调用方，本轮至少通过服务 / 仓储 / e2e 测试覆盖该能力。
  - `[AC-5]` 当前兼容层不再以 `unsupportedBaseAction(...)` 拒绝新增 / 修改 / 停用：`web/src/api/base/supplier.js`、`web/src/api/base/compat.js`、`web/src/utils/permissionCompat.js` 能对接新的 NestJS 供应商接口与权限。
  - `[AC-6]` 当前供应商管理页与运行时合同对齐：页面不再依赖未进入正式 schema 的 legacy 字段持久化，供应商主档管理可在现有页面中完成新增 / 修改 / 停用；`pnpm --dir web build:prod` 通过。

## Progress Sync

- Phase progress:
  - `master-data` topic 仍有多条 Phase 1 能力未完成；本 task 明确只切取 `F4` 作为第一条安全闭环交付链。`F9` / `F10` 保持 topic 路线图后续项，`F1` / `F2` / `F3` / `F5` / `F6` / `F7` / `F8` 作为后续 backlog，不在本轮 silent 扩 scope。
- Current state:
  - backend 已补齐 supplier create / update / deactivate DTO、controller、service、repository 写路径；默认列表 / 搜索为 `ACTIVE` only，detail `getSupplierById()` 保持 status-agnostic。
  - 权限与兼容层已补齐 `master:supplier:create|update|deactivate` seed 与 `base:supplier:add|edit|remove` alias；supplier management page 已收口到 code / name / status 的当前 runtime 合同。
  - focused unit / e2e / web build 证据已存在，且 follow-up delta 已通过 `includeDisabled` opt-in 路径把历史 / 报表 consumer 与默认 active-only dropdown 行为拆开，未见 silent schema widening。
- Acceptance state:
  - `待验收`；review 侧未见新的实现级 blocking / important 问题，当前可进入 `acceptance-qa` 的 `full` 模式收口。
- Blockers:
  - None.
- Next step:
  - `acceptance-qa` 继续 `full` 模式收口，并把最新验证结果写入 acceptance spec / report。

## Goal And Acceptance Criteria

- Goal:
  - 以最小但完整的切片完成 `master-data` `F4`：让供应商主数据在 NestJS 中具备新增、修改、逻辑停用、默认有效搜索和受控自动补建能力，同时让当前供应商管理页与供应商下拉搜索恢复真实可用，并保持与当前运行时字段合同一致，而不强行拉入其他主数据实体、`F8` 统一查询服务重构，或无依据地扩写 `supplier` schema。
- Acceptance criteria:
  - `[AC-1]` `POST /api/master-data/suppliers` 可创建供应商，重复 `supplierCode` 返回明确冲突错误。
  - `[AC-2]` `PATCH /api/master-data/suppliers/:id` 可更新供应商当前运行时支持的字段；若更新了编码，仍通过唯一性校验。
  - `[AC-3]` `PATCH /api/master-data/suppliers/:id/deactivate`（或等价清晰语义接口）将 `status` 置为 `DISABLED`；默认列表 / 搜索不再返回已停用供应商。
  - `[AC-4]` `getSupplierById()` 与既有历史单据快照读取语义保持不变；本 task 不得改写历史 `supplierCodeSnapshot` / `supplierNameSnapshot` 的显示口径。
  - `[AC-5]` 受控自动补建供应商能力存在且有自动化测试；未提供 `sourceDocumentType` + `sourceDocumentId` 时不得写入 `AUTO_CREATED` 记录。
  - `[AC-6]` 现有供应商管理页与兼容层恢复可用：`web/src/api/base/supplier.js` 不再抛 unsupported 错误，权限别名补齐 `add/edit/remove`，页面不再要求持久化 legacy source-only 字段，且 `pnpm --dir web build:prod` 通过。

## Scope And Ownership

- Allowed code paths:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - 新增的 `src/modules/master-data/controllers/master-data.controller.spec.ts`
  - 新增的 `test/master-data-supplier.e2e-spec.ts`
- Frozen or shared paths:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `docs/acceptance-tests/**`
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `scripts/migration/master-data/**`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/api/entry/compat.js`
- Contracts that must not change silently:
  - `master-data` 仍是供应商主数据真源；业务单据继续通过快照或 `getSupplierById()` 消费，不改成跨模块直接 JOIN。
  - 停用只能是逻辑停用；不能物理删除，也不能回写或重算历史 `supplierCodeSnapshot` / `supplierNameSnapshot`。
  - 当前 runtime 的主数据状态枚举仍是 `ACTIVE | DISABLED`；topic 文案中的“INACTIVE/停用”在本 task 里只表达业务语义，不应无证据地触发 schema 枚举重命名。
  - 供应商运行时正式字段合同保持与 `docs/architecture/20-wms-database-tables-and-schema.md` 对齐：`supplierCode`、`supplierName`、`status` + 自动补建来源元数据。`supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 目前仍属于 legacy source-only 信息，不应在本 task 中无依据地重新纳入正式 schema。
  - 后端权限命名空间保持 `master:supplier:*`；前端旧 `base:supplier:*` 仅通过 alias 兼容，不恢复旧后端权限真源。
  - 默认列表 / 搜索只返回 `ACTIVE` 供应商，是本切片为满足下拉剔除而做的有意决定；不要顺手扩成 generic inactive-management 模型或 `F8` 的统一下拉服务。
  - 本 task 不得静默并入其他主数据实体或未来阶段能力。

## Implementation Plan

- [ ] Step 1: 完成 `master-data` 供应商写路径，但保持当前运行时字段合同。
  - 新增 supplier create / update / deactivate DTO。
  - 在 repository / service / controller 中补齐新增、修改、逻辑停用和默认有效列表 / 搜索。
  - 唯一性校验放在 service 层先行拦截，并对 DB 唯一约束异常保持清晰错误信息。
  - `getSupplierById()` 保持不按 `status` 过滤，以兼容历史快照与详情读取。
- [ ] Step 2: 补齐受控自动补建能力，但不强拉其他业务模块接入。
  - 为供应商提供最小内部 `ensure / auto-create` 入口。
  - `AUTO_CREATED` 必须同时带 `sourceDocumentType` 与 `sourceDocumentId`；没有真实调用方时，以服务 / 仓储 / e2e 测试完成合同覆盖即可。
- [ ] Step 3: 收口权限与兼容层。
  - 在 `rbac` seed / 权限定义中加入 `master:supplier:create`、`master:supplier:update`、`master:supplier:deactivate`。
  - 在 `web/src/utils/permissionCompat.js` 中补齐 `master:supplier:* -> base:supplier:*` 的 `add / edit / remove` alias。
  - 不把后端权限字符串改回 `base:*`。
- [ ] Step 4: 让供应商管理页对齐当前运行时合同，而不是扩写 schema 追旧 UI。
  - 将 `web/src/api/base/supplier.js` 的新增 / 修改 / 停用改为真实请求。
  - 更新 `web/src/api/base/compat.js` 的 `mapSupplier()`，让返回值与当前运行时 supplier 合同一致。
  - 对 `web/src/views/base/supplier/index.vue` 做最小但明确的页面适配：移除或停用对 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 持久化的依赖；保留供应商主档管理所需的 code / name / status 行为。
- [ ] Step 5: 增加 focused 自动化验证与 full-mode acceptance 证据。
  - repository / service / controller 级覆盖：重复编码、新增、修改、停用、默认 `ACTIVE` 搜索、`AUTO_CREATED` 来源校验。
  - 新增一条 supplier-focused e2e，验证接口与权限链路至少贯通 create / update / deactivate / active-only list。
  - `acceptance-qa` 创建 / 更新 `spec`，把 `[AC-1]` ~ `[AC-6]` 的证据写进 `Latest Verification`。

## Coder Handoff

- Execution brief:
  - 只交付 `F4`。这是 `master-data` topic 的单一能力切片，不是“顺手把所有基础资料 CRUD 一并收尾”。
  - 当前最小安全路线是：补齐供应商写路径 + 受控自动补建 + 权限 alias + 供应商页面最小适配；不把本轮扩大成 `F8` 统一查询服务或跨多个业务模块的 refactor。
  - 关键判断已经固定：当前架构与迁移脚本都把 `supplier` 运行时字段收口为 code / name / status + provenance，本轮默认不扩 schema 追旧 UI；优先让供应商页面适配运行时合同。
- Required source docs or files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `prisma/schema.prisma`
  - `scripts/migration/master-data/transformer.ts`
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - 本 task doc
- Owned paths:
  - `src/modules/master-data/**`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - 新增的 `src/modules/master-data/controllers/master-data.controller.spec.ts`
  - 新增的 `test/master-data-supplier.e2e-spec.ts`
- Forbidden shared files:
  - `docs/requirements/topics/master-data-management.md`
  - `docs/architecture/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
  - `docs/acceptance-tests/**`
  - `prisma/schema.prisma`
  - `src/generated/prisma/**`
  - `scripts/migration/master-data/**`
  - `src/modules/inbound/**`
  - `src/modules/project/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/inventory-core/**`
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/views/article/product/index.vue`
  - `web/src/views/rd/procurement-requests/index.vue`
  - `web/src/api/entry/compat.js`
- Constraints and non-goals:
  - 不做其他主数据实体的 CRUD。
  - 不实现 `F8` 的跨实体统一查询服务，不新增通用 dropdown API 基础设施，除非当前 `F4` 明确无法成立。
  - 不改写单据历史快照，不让停用供应商影响历史单据展示。
  - 不把后端权限重新命名为 `base:*`。
  - 不因为 requirement 的“INACTIVE”措辞去重命名现有 `MasterDataStatus` 持久化枚举。
  - 不无依据地把 `supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 加回正式 `supplier` schema；只有在执行中出现可证明的硬 blocker 时，才允许最小化 widening，并必须先在 task doc 中写明依据。
  - 不创建新前端页面；优先用现有页面 + API 兼容层收口。
- Validation command for this scope:
  - Iteration / types:
    - `pnpm typecheck`
  - Focused tests:
    - `pnpm test -- src/modules/master-data/infrastructure/master-data.repository.spec.ts src/modules/master-data/application/master-data.service.spec.ts src/modules/master-data/controllers/master-data.controller.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
    - `pnpm test:e2e -- test/master-data-supplier.e2e-spec.ts`
    - `pnpm --dir web build:prod`
  - Optional schema guard only if execution proves `prisma/schema.prisma` must change:
    - `pnpm prisma:validate`
    - `pnpm prisma:generate`
  - Final repo gate before commit:
    - `pnpm lint`
    - `pnpm verify`
    - `pnpm test:e2e`
    - `pnpm --dir web build:prod`

## Reviewer Handoff

- Review focus:
  - 是否严格只交付 `F4`，没有 silent 扩到其他主数据实体或 `F8`。
  - 是否真的完成供应商写路径，而不是只把前端 unsupported 包装层改成表面可调用。
  - 是否保持逻辑停用 + 默认 `ACTIVE` 搜索 + `getSupplierById()` 不过滤三者同时成立。
  - 是否正确处理了 topic “INACTIVE/停用”与当前 schema `DISABLED` 枚举之间的语义映射，而没有引入新的状态漂移。
  - 是否把后端 `master:supplier:*` 与前端 `base:supplier:*` alias 链路补齐，没有引入权限漂移。
  - 是否遵守了当前 runtime 合同，没有无依据地把 archived source-only supplier 字段写回正式 schema。
  - 是否对 `AUTO_CREATED` 的来源字段约束做了直接证据覆盖。
- Final validation gate:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm verify`
  - `pnpm test:e2e`
  - `pnpm --dir web build:prod`
  - 若执行中改动了 `prisma/schema.prisma`，再补跑：
    - `pnpm prisma:validate`
    - `pnpm prisma:generate`

## Review Log

- Validation results:
  - 已复核 follow-up delta：`src/modules/master-data/dto/query-master-data.dto.ts` 新增 `includeDisabled?: boolean`；`src/modules/master-data/application/master-data.service.ts` 仅在 `includeDisabled=true` 时取消 supplier `ACTIVE` 过滤，默认行为保持不变。
  - 已复核 shared consumer 变更：`web/src/api/base/supplier.js` 新增 `listSupplierByKeywordIncludingDisabled()`，并确认 `web/src/api/entry/compat.js`、`web/src/views/report/supplierStatement/index.vue`、`web/src/views/entry/order/index.vue` 的历史 / 报表路径已切到显式 disabled-capable lookup，而用户主动搜索供应商的 operational dropdown 仍保持 active-only。
  - 已确认本轮未改动 `prisma/schema.prisma`，supplier runtime 字段仍保持 `supplierCode`、`supplierName`、`status` + provenance 元数据，没有发生 silent schema widening。
  - Parent follow-up validation 已提供并通过：`pnpm typecheck`、`pnpm test -- src/modules/master-data/application/master-data.service.spec.ts`、`pnpm test:e2e -- test/master-data-supplier.e2e-spec.ts`（含 `includeDisabled=true` 覆盖）、`pnpm --dir web build:prod`。
  - Reviewer spot-check 已重跑并通过：`pnpm test -- src/modules/master-data/application/master-data.service.spec.ts`、`pnpm test:e2e -- test/master-data-supplier.e2e-spec.ts`。
- Findings:
  - No findings. 上一轮关于 shared supplier lookup 的 `[important]` 问题已解决。
- Follow-up action:
  - `acceptance-qa` 可继续执行 `full` 模式 spec 收口，并将最新证据写入 `Latest Verification`。

## Acceptance

- Acceptance status: `accepted`
- Acceptance QA: `acceptance-qa`
- Acceptance date: `2026-04-03`
- Complete test report: `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`
- Acceptance checklist:
  - [x] `[AC-1]` 新增供应商唯一性成立 — Evidence: `service.spec` ConflictException; e2e 409 — Verdict: `✓ met`
  - [x] `[AC-2]` 修改供应商后列表 / 详情 / 页面回读一致 — Evidence: `service.spec` 更新用例 + NotFoundException; e2e updateResponse 200 — Verdict: `✓ met`
  - [x] `[AC-3]` 逻辑停用后默认搜索与新单据下拉不再出现该供应商 — Evidence: e2e active-only total=0; `service.spec` ACTIVE→DISABLED; `entry/compat.js` opt-in 路径; browser PATCH 200 + list clear + `/entry/order` network items=[] total=0 — Verdict: `✓ met`
  - [x] `[AC-4]` `getSupplierById()` 与历史快照语义保持不变 — Evidence: e2e detailResponse status=DISABLED 仍返回 200 — Verdict: `✓ met`
  - [x] `[AC-5]` 自动补建来源字段约束成立 — Evidence: `service.spec` provenance 完整创建成功; 缺 `sourceDocumentId` 抛 BadRequestException — Verdict: `✓ met`
  - [x] `[AC-6]` 供应商页/API/权限兼容恢复且前端构建通过 — Evidence: `supplier.js` 真实请求; `permissionCompat.js` add/edit/remove alias; `pnpm --dir web build:prod` 通过; browser POST 201 + 页面渲染正常 — Verdict: `✓ met`
- [x] 浏览器面（full 模式完整性）— 供应商管理页 + 入库单下拉消费者 browser smoke — Evidence: `agent-browser` on `http://localhost:90`; POST 201 新增; PATCH 200 停用; `/entry/order` dropdown items=[] total=0 — Verdict: `✓ met`

### Acceptance Notes

- Acceptance path used: `full`
- Acceptance summary: `[AC-1]` ~ `[AC-6]` 均通过综合自动化证据满足（unit / e2e / build / verify）；浏览器面（`[AC-CASE-7]`）已于 2026-04-03 通过 `agent-browser` 在 `http://localhost:90` 完成验收，包含供应商管理页新增 / 停用操作和入库单供应商下拉 active-only 实证（server-side items=[] total=0）。整体判定为 `accepted`。
- Report completeness check: 完整测试报告已写入 `docs/acceptance-tests/specs/master-data-f4-supplier-crud.md`（`Latest Verification` 更新为 2026-04-03，总体结果 `通过（passed）`）。

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - N/A
- If not safe, list the shared files or contracts that require a single writer:
  - `src/modules/master-data/application/master-data.service.ts`
  - `src/modules/master-data/infrastructure/master-data.repository.ts`
  - `src/modules/master-data/controllers/master-data.controller.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `web/src/api/base/supplier.js`
  - `web/src/api/base/compat.js`
  - `web/src/utils/permissionCompat.js`
  - `web/src/views/base/supplier/index.vue`
  - `test/prisma-e2e-stub.ts`
  - supplier route shape、默认 `ACTIVE` 搜索、权限 alias、页面字段合同与 e2e 夹具是一条共享契约链；拆成多个 writer 容易出现 route shape、权限和 UI/data mapping 漂移。

## Final Status

- Outcome:
  - follow-up re-review 已完成；此前 shared disabled-supplier lookup regression 已修复，当前 task 达到 `reviewed-clean`。
- Requirement alignment:
  - backend、RBAC seed、supplier page 与 focused tests 已基本对齐 `F4` 的新增 / 修改 / 逻辑停用 / default `ACTIVE` list / status-agnostic detail / provenance 约束，且未把 legacy supplier 字段重新写回正式 schema。
  - follow-up delta 已把“新单据默认只看 `ACTIVE`”与“历史 / 报表可显式查到 disabled supplier”拆成两条清晰合同，现与 requirement 中“停用后新单据不可选、历史语义保持可追溯”的预期一致。
- Residual risks or testing gaps:
  - 当前无新的实现级 blocking / important 风险；剩余工作主要是 `acceptance-qa` 将最新 evidence 写入 acceptance spec，并按 `full` 模式决定是否还需要额外浏览器 / workflow smoke。
- Next action:
  - `acceptance-qa` 继续 `full` 模式收口；若 acceptance 通过，再由 parent 完成最终提交流程。
