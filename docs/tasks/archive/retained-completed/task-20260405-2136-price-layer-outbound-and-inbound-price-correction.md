# Price-Layer Outbound And Inbound Price Correction

## Metadata

- Scope:
  - 基于 `docs/workspace/notes/price-layer-outbound-traceability.md` 与 `docs/workspace/notes/inbound-price-correction-after-consumption.md`，落一条跨域 schema + code slice：为 `sales` 补齐价格层出库与来源追溯所需字段 / 查询 / 分配约束，同时为 `inbound` 补齐入库调价单主从表、库存操作类型与过账链路。
  - 本 task 不是纯文档修订；执行面必须包含数据库表结构 / Prisma 合同调整，以及 `inventory-core`、`sales`、`inbound` 代码适配与自动化测试。
- Related requirement:
  - `docs/requirements/domain/sales-business-module.md (F2/F3)`
  - `docs/requirements/domain/inbound-business-module.md (F8)`
- Status: `completed`
- Review status: `reviewed-clean`
- Delivery mode: `autonomous`
- Acceptance mode: `light`
- Acceptance status: `accepted`
- Complete test report required: `yes`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Acceptance QA: `waived-by-user`
- Last updated: `2026-04-05`
- Related checklist: `None`
- Related acceptance spec: `-`
- Related acceptance run: `-`
- Related files:
  - `docs/workspace/notes/price-layer-outbound-traceability.md`
  - `docs/workspace/notes/inbound-price-correction-after-consumption.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/architecture/modules/sales.md`
  - `docs/architecture/modules/inbound.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/requirements/domain/sales-business-module.md`
  - `docs/requirements/domain/inbound-business-module.md`
  - `prisma/schema.prisma`
  - `src/modules/inventory-core/**`
  - `src/modules/sales/**`
  - `src/modules/inbound/**`
  - `test/**`

## Requirement Alignment

- Domain capability:
  - `docs/requirements/domain/sales-business-module.md (F2/F3)`
  - `docs/requirements/domain/inbound-business-module.md (F8)`
- User intent summary:
  - 用户明确要求“根据数据库架构变更和 `docs/workspace/notes` 笔记，写一个 task”，并且要求该 task 覆盖数据库表变更与代码层适配。
  - 用户已给出验收边界：以“代码通过测试能跑通”为主，不进行 QA browser smoke 测试。
- Acceptance criteria carried into this task:
  - `[AC-1]` `prisma/schema.prisma` 明确补齐价格层出库与入库调价单所需字段 / 表 / 枚举：至少包括 `sales_stock_order_line.selectedUnitCost`、`InventoryOperationType.PRICE_CORRECTION_OUT/IN`、`stock_in_price_correction_order`、`stock_in_price_correction_order_line`，且不破坏既有来源分配与逆操作合同。
  - `[AC-2]` `inventory-core` 提供价格层可用库存查询与按价格层约束的来源分配能力；`PRICE_CORRECTION_IN` 必须被纳入真实 FIFO 来源，`PRICE_CORRECTION_OUT` 必须支持强制消耗指定原来源。
  - `[AC-3]` `sales` 出库写路径改为“物料 + 价格层 + 数量”口径：校验同单据 `同物料 + 同价格层` 不重复、校验所选价格层库存充足、并把选定价格层与结算成本快照稳定落库。
  - `[AC-4]` `inbound` 入库调价单写路径能够在不改历史消费链的前提下，把剩余数量从旧来源切换到新 `PRICE_CORRECTION_IN` 来源，并在明细上记录已消费数量与历史差异金额。
  - `[AC-5]` 执行验收以自动化为主：`prisma validate/generate`、typecheck、focused unit/integration tests 必须通过；不进行 QA browser smoke 测试。
- Requirement evidence expectations:
  - Prisma schema / generated client 与相关 service/repository 改动可证明合同已落地。
  - `inventory-core`、`sales`、`inbound` focused tests 覆盖价格层校验、价格层 FIFO、调价切换来源、追溯链保持不回写历史等关键场景。
  - 本 task 文档需冻结验证命令与结果摘要，作为轻量验收依据。
- Open questions requiring user confirmation:
  - None. 本 task 采用明确假设：`sales_stock_order_line.unitPrice` 保持业务金额口径，不被静默改造成库存成本价；价格层选择单独落 `selectedUnitCost`。

## Progress Sync

- Phase progress:
  - `sales` `Phase 2`（`F2/F3`）与 `inbound` `Phase 3` `F8` 的跨域 schema/code slice 已完成实现、review 修复与 light acceptance；task lifecycle 已切换为 `retained-completed`。
- Current state:
  - `selectedUnitCost`、价格层可用库存查询、`PRICE_CORRECTION_OUT/IN`、`stock_in_price_correction_order` / `_line`、`sales` 价格层出库校验与 `inbound` 调价单过账均已落地；review 指出的“重复调价时追溯挂错调价单”问题已修复，`sales`/`inbound` focused tests 已补齐对应回归证据。
- Acceptance state:
  - `accepted`；自动化 gate、定向修复回归与 reviewer 复审均已通过。
- Blockers:
  - None.
- Next step:
  - `None`；task 已完成并进入归档同步。

## Goal And Acceptance Criteria

- Goal:
  - 在不引入独立“价格库存余额主表”、不回写历史消费成本事实的前提下，交付一条可以直接实施的跨域执行切片：让 `sales` 支持价格层出库与来源追溯，让 `inbound` 支持对已部分消费来源的安全调价，并保持 `inventory-core` 作为唯一库存写入口。
- Acceptance criteria:
  - `[AC-1]` 数据库与 Prisma 合同补齐价格层出库字段、调价单主从表和新增库存操作类型，生成客户端可被现有模块安全引用。
  - `[AC-2]` `inventory-core` 能按 `material + unitCost` 聚合可用来源，且能在价格层内完成 FIFO；调价剩余切换时能强制锁定原 `sourceLogId` 完成补偿型 OUT/IN。
  - `[AC-3]` `sales` 出库接口 / DTO / service / persistence 按价格层口径工作，拒绝重复 `同物料 + 同价格层`，拒绝超量选择，并把选定价格层和成本快照落库。
  - `[AC-4]` `inbound` 调价单审核过账后，原来源剩余可用量归零、新来源成为后续 FIFO 可用来源、历史消费行继续追原来源、已消费差异额被稳定记录。
  - `[AC-5]` 自动化验证通过且形成可审查证据；browser smoke test 明确豁免。

## Scope And Ownership

- Allowed code paths:
  - `prisma/schema.prisma`
  - `generated/prisma/**`
  - `src/modules/inventory-core/**`
  - `src/modules/sales/**`
  - `src/modules/inbound/**`
  - `test/**`
  - `docs/tasks/**`
  - `docs/requirements/**`（仅同步 task 关联，不改需求语义）
- Frozen or shared paths:
  - `docs/workspace/**` 只作为 provenance，不在执行期重写。
  - `docs/architecture/**` 视为上游设计真源，本 task 不通过修改架构文档来替代实现。
  - `src/modules/workshop-material/**`、`src/modules/rd-project/**`、`src/modules/rd-subwarehouse/**` 仅在被共享合同阻塞时评估最小兼容补丁，默认不扩 scope。
- Task doc owner:
  - `planner`
- Contracts that must not change silently:
  - `inventory-core` 仍是唯一库存写入口，业务模块不得旁路更新 `inventory_balance` / `inventory_log` / `inventory_source_usage`。
  - `sales_stock_order_line.unitPrice` 不得被静默改造成库存成本字段；价格层选择走 `selectedUnitCost`。
  - 不新建独立“价格库存余额主表”；价格层可用量必须基于来源层聚合。
  - 不允许回写历史消费行的 `costUnitPrice / costAmount` 来“修正”过去事实。
  - `inventory_source_usage` 的唯一键、释放语义与逆操作合同必须保持向后兼容。
  - `PRICE_CORRECTION_OUT` 必须强制从原 `sourceInventoryLogId` 分配，不走默认 FIFO。

## Implementation Plan

- [x] Step 1: 调整 Prisma schema，新增 `PRICE_CORRECTION_OUT/IN`、`sales_stock_order_line.selectedUnitCost`、调价单主从表及必要索引 / 关系，并重新生成 Prisma client。
- [x] Step 2: 在 `inventory-core` 增加价格层可用库存查询、按价格层筛选的 FIFO 来源分配能力，以及支持调价补偿型 OUT/IN 的共享方法或参数扩展。
- [x] Step 3: 改造 `sales` 出库 DTO / service / repository / traceability 读路径，使出库录入与落账遵循“物料 + 价格层 + 数量”，并锁定重复与超量校验。
- [x] Step 4: 新增 `inbound` 入库调价单主从服务、审核过账与追溯反查能力，确保剩余数量切换来源、已消费部分仅记录差异不动历史。
- [x] Step 5: 补齐 focused tests、Prisma 门禁和 typecheck，形成“自动化通过，无 browser smoke”验收证据。

## Coder Handoff

- Execution brief:
  - 先冻结持久化合同，再改共享库存核心，最后接入 `sales` 与 `inbound`；不要直接在业务模块里复制价格层聚合或调价逻辑。
  - `sales` 侧的核心设计决策已经锁定：`unitPrice` 继续保留业务金额语义，价格层选择落 `selectedUnitCost`，结算成本快照仍落 `costUnitPrice/costAmount`。
  - `inbound` 调价能力必须以“历史不改、未来切换来源”为原则实现：剩余量通过 `PRICE_CORRECTION_OUT + PRICE_CORRECTION_IN` 转移，已消费量只记差异额。
  - 追溯读路径至少要能稳定表达“消费行 -> sourceLogId -> 调价单（如有）-> 原入库行”。
- Required source docs or files:
  - `docs/workspace/notes/price-layer-outbound-traceability.md`
  - `docs/workspace/notes/inbound-price-correction-after-consumption.md`
  - `docs/requirements/domain/sales-business-module.md`
  - `docs/requirements/domain/inbound-business-module.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `src/modules/inventory-core/application/inventory.service.ts`
  - `src/modules/inventory-core/infrastructure/inventory.repository.ts`
  - `src/modules/sales/application/sales.service.ts`
  - `src/modules/inbound/application/inbound.service.ts`
- Owned paths:
  - `prisma/schema.prisma`
  - `generated/prisma/**`
  - `src/modules/inventory-core/**`
  - `src/modules/sales/**`
  - `src/modules/inbound/**`
  - `test/**`
- Forbidden shared files:
  - `docs/workspace/**`
  - `docs/architecture/**`
  - 与本 slice 无关的 domain 模块
- Constraints and non-goals:
  - 不进行 QA browser smoke 测试。
  - 不引入单独价格余额表、财务差异汇总报表或历史大规模回填。
  - 不改变现有 `workshop-material` / `project` / `rd-subwarehouse` 业务语义，除非共享合同升级要求最小兼容补丁。
  - 调价单 V1 不回写历史消费快照，不改原入库单价事实。
- Validation command for this scope:
  - `pnpm prisma:validate`
  - `pnpm prisma:generate`
  - `pnpm typecheck`
  - `pnpm test -- src/modules/inventory-core/application/inventory.service.spec.ts src/modules/sales/application/sales.service.spec.ts src/modules/inbound/application/inbound.service.spec.ts src/modules/inbound/application/stock-in-price-correction.service.spec.ts`

## Reviewer Handoff

- Review focus:
  - `selectedUnitCost` 是否与 `unitPrice`、`costUnitPrice` 明确分工，没有把业务单价和库存成本混用。
  - `inventory-core` 是否真正收口价格层查询 / 分配与调价切换来源逻辑，而不是在 `sales` / `inbound` 内各自拼装近似实现。
  - 调价单是否遵守“历史不改、未来切换”的约束，特别是已消费来源不被静默回写。
  - 价格层出库是否严格限制在所选 `unitCost` 内消费，不能借用其他价格层。
  - 追溯链是否足以支持 `sales` F3 与 `inbound` F8 的调价关系展示。
- Requirement alignment check:
  - 逐条对照 `[AC-1]` ~ `[AC-5]`，确认 schema、共享库存核心、`sales`、`inbound` 与自动化验证五个方面都有对应证据。
- Final validation gate:
  - `pnpm prisma:validate`
  - `pnpm prisma:generate`
  - `pnpm typecheck`
  - `pnpm test -- src/modules/inventory-core/application/inventory.service.spec.ts src/modules/sales/application/sales.service.spec.ts src/modules/inbound/application/inbound.service.spec.ts src/modules/inbound/application/stock-in-price-correction.service.spec.ts`
- Required doc updates:
  - 实施开始后，保持本 task 文档进度与验证结果最新。
  - 若代码落地并进入 review/acceptance，再同步 `docs/requirements/domain/sales-business-module.md`、`docs/requirements/domain/inbound-business-module.md` 与 `docs/requirements/REQUIREMENT_CENTER.md` 的关联任务或状态。

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` schema / Prisma 合同
  - `[AC-2]` inventory-core 价格层查询与调价来源切换
  - `[AC-3]` customer 价格层出库
  - `[AC-4]` inbound 调价单过账
  - `[AC-5]` 自动化验证与 browser 豁免
- Evidence pointers:
  - `prisma/schema.prisma` 与生成客户端 diff
  - `src/modules/inventory-core/**` 相关 service / repository 改动与 tests
  - `src/modules/sales/**` 相关 DTO / service / repository / tests
  - `src/modules/inbound/**` 调价单相关实现与 tests
  - 本 task 文档中的验证命令与结果
- Evidence gaps, if any:
  - 若未补齐调价后追溯链或价格层可用量查询测试，应判定为 evidence gap，不可默认接受。
- Complete test report requirement: `yes`

### Acceptance Test Expectations

- Acceptance mode: `light`
- User-visible flow affected: `yes`
- Cross-module write path: `yes`
- Irreversible or high-cost business effect: `yes`
- Existing automated user-flow coverage: `partial`
- Browser test required: `no`
- Browser waiver reason:
  - 用户已明确要求“不进行 qa browser smoke 测试”；本 slice 以 schema / service / traceability 自动化验证为主。
- Related acceptance cases:
  - `-`
- Related acceptance spec:
  - `-`
- Separate acceptance run required: `optional`
- Complete test report required: `yes`
- Required regression / high-risk tags:
  - `schema`
  - `inventory-core`
  - `sales`
  - `inbound`
  - `price-layer`
  - `price-correction`
  - `traceability`
- Suggested environment / accounts:
  - 仓库根目录 `.env.dev`
  - 可写本地数据库
  - 含多价格来源层和已部分消费来源层的测试数据
- Environment owner / setup source:
  - 本仓库本地开发环境

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - N/A
- If not safe, list the shared files or contracts that require a single writer:
  - `prisma/schema.prisma`
  - `generated/prisma/**`
  - `src/modules/inventory-core/application/inventory.service.ts`
  - `src/modules/inventory-core/infrastructure/inventory.repository.ts`
  - `sales` / `inbound` 共享的 `inventory_log`、`inventory_source_usage`、`InventoryOperationType` 合同

## Review Log

- Validation results:
  - `2026-04-05`: `set -a && source .env.dev && set +a && pnpm prisma:validate` ✅
  - `2026-04-05`: `set -a && source .env.dev && set +a && pnpm prisma:generate` ✅
  - `2026-04-05`: `pnpm typecheck` ✅
  - `2026-04-05`: `pnpm test -- src/modules/inventory-core/application/inventory.service.spec.ts src/modules/sales/application/sales.service.spec.ts src/modules/inbound/application/inbound.service.spec.ts src/modules/inbound/application/stock-in-price-correction.service.spec.ts` ✅ (`4` suites / `64` tests passed)
- Findings:
  - `2026-04-05`: reviewer 首轮指出两条 `important` 问题：重复调价时 `sales` 追溯可能误挂到后一次调价单，以及缺少对应 focused automation evidence。
  - `2026-04-05`: 已修复 `sales` 追溯映射，改为按 `generatedInLogId` 关联“生成当前来源层的调价单”；新增 `sales`/`inbound` focused tests 覆盖重复调价链路与原始入库引用保持。
  - `2026-04-05`: reviewer 复审结论 `No blocking or important findings.`
- Follow-up action:
  - `None.`

## Acceptance

- Acceptance status: `accepted`
- Acceptance QA:
  - `waived-by-user`
- Acceptance date:
  - `2026-04-05`
- Complete test report:
  - `2026-04-05`: `prisma validate` / `prisma generate` / `typecheck` / focused tests 全部通过；定向 traceability 修复回归已纳入 `sales` 与 `inbound` specs；未执行 browser smoke（用户已豁免）。

### Acceptance Checklist

> Acceptance QA / reviewer 在验收时逐条填写。每条应对应本 task 的 `[AC-*]` 条目。

- [x] `[AC-1]` schema / Prisma 合同已补齐且向后兼容 — Evidence: `prisma/schema.prisma`、生成客户端、`pnpm prisma:validate` / `pnpm prisma:generate` 通过 — Verdict: `✓ met`
- [x] `[AC-2]` inventory-core 价格层查询与调价来源切换闭环成立 — Evidence: `src/modules/inventory-core/**` 改动与 `src/modules/inventory-core/application/inventory.service.spec.ts` 通过 — Verdict: `✓ met`
- [x] `[AC-3]` customer 价格层出库校验与落账正确 — Evidence: `src/modules/sales/**` 改动；`sales.service.spec.ts` 覆盖价格层校验、追溯链与重复调价来源映射 — Verdict: `✓ met`
- [x] `[AC-4]` inbound 调价单过账遵守“历史不改、未来切换来源” — Evidence: `src/modules/inbound/**` 调价单实现；`stock-in-price-correction.service.spec.ts` 覆盖剩余量切换、全量已消费差异记录与重复调价仍保持原始入库引用 — Verdict: `✓ met`
- [x] `[AC-5]` 自动化测试通过且 browser smoke 明确豁免 — Evidence: `pnpm typecheck` + `4` suites / `64` tests passed；browser smoke 按用户要求豁免 — Verdict: `✓ met`

### Acceptance Notes

- Acceptance path used: `light`
- Acceptance summary:
  - 采用 `light` 路径完成验收：schema / service / traceability 改动与 focused automated evidence 已覆盖 `[AC-1]` ~ `[AC-5]`；review 首轮提出的 traceability 歧义与 evidence gap 已修复并复审关闭。
- Report completeness check:
  - `complete`
- If rejected or blocked: root cause（`requirement-misunderstanding` | `implementation-gap` | `evidence-gap` | `environment-gap`）+ 精确修复指引 / 环境修复指引
  - `N/A`
- If conditionally accepted: follow-up requirement / task:
  - `N/A`

## Final Status

- Outcome:
  - `accepted`
- Requirement alignment:
  - 本 task 显式覆盖 `sales` `F2/F3` 与 `inbound` `F8` 的共享 schema / traceability slice；执行时不得缩成只改表不改服务，也不得只改服务不补合同。
- Residual risks or testing gaps:
  - 无阻塞缺口；后续如需继续增强，可补一条持久化级跨模块链路测试，把“首次调价 -> 再次调价 -> customer 追溯读取”串成单个场景。
- Directory disposition after completion:
  - `docs/tasks/archive/retained-completed/`
- Next action:
  - `None.`
