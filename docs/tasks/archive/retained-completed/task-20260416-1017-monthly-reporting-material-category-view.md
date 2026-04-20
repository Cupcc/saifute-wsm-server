# Monthly Reporting Material Category View

## Metadata

- Scope:
  - 在现有 `monthly-reporting` 基线上，新增“物料分类视角”任务交付，不替换既有“领域视角”月报。
  - 第一版范围冻结为 `inbound + sales` 家族：`验收入库`、`生产入库`、`销售出库`、`销售退货`。
  - 分类汇总采用“叶子分类入账 + 父级分类汇总”，分类归属口径采用“业务发生时快照”。
  - 本 task 已完成 schema/backfill、写侧快照、读模型、前端视角切换、导出、focused tests 与 browser acceptance 交付。
- Related requirement: `docs/requirements/domain/monthly-reporting.md (F9)`
- Status: `accepted`
- Review status: `approved`
- Delivery mode: `standard`
- Acceptance mode: `full`
- Acceptance status: `accepted`
- Complete test report required: `yes`
- Lifecycle disposition: `retained-completed`
- Planner: `saifute-planner`
- Coder: `parent-orchestrator`
- Reviewer: `saifute-code-reviewer`
- Acceptance QA: `saifute-acceptance-qa`
- Last updated: `2026-04-16`
- Related checklist: `-`
- Related acceptance spec: `docs/acceptance-tests/specs/monthly-reporting.md`
- Related acceptance run: `docs/acceptance-tests/runs/run-20260416-1213-monthly-reporting-material-category-view.md`
- Related files:
  - `docs/requirements/domain/monthly-reporting.md`
  - `docs/requirements/domain/inbound-business-module.md`
  - `docs/requirements/domain/sales-business-module.md`
  - `prisma/schema.prisma`
  - `src/modules/inbound/**`
  - `src/modules/sales/**`
  - `src/modules/reporting/**`
  - `web/src/views/reporting/monthly-reporting/**`
  - `web/src/api/reporting.js`

## Requirement Alignment

- Domain capability:
  - `docs/requirements/domain/monthly-reporting.md` 已把“物料分类月报”冻结为 `F9` 能力合同，并保留“领域优先 + 多视角扩展”的 shared truth。
  - `docs/requirements/domain/inbound-business-module.md (F4/F8)` 与 `docs/requirements/domain/sales-business-module.md (F2/F3)` 已冻结金额、成本、来源追溯语义，属于本 slice 的上游真源。
- User intent summary:
  - 用户确认：`monthly-reporting` 目前按领域逐层划分，需要补一套“按物料分类”的报表，用于核算 `验收/入库` 和 `销售出库` 等金额项。
  - 对话中已锁定的默认决策：
    - 入口放在现有 `monthly-reporting` 页面内，以视角切换呈现。
    - 第一版范围只覆盖 `inbound + sales` 家族，不扩到 `workshop-material`、`rd-project`、`rd-subwarehouse`。
    - 分类展示采用“叶子分类 + 父级汇总”。
    - 分类归属采用“发生时快照”，而不是查询时读取当前主数据。
- Acceptance criteria carried into this task:
  - `[AC-1]` 不替换现有领域视角，只在同一月报页面新增分类视角。
  - `[AC-2]` 第一版只覆盖 `验收入库`、`生产入库`、`销售出库`、`销售退货` 四类业务事实。
  - `[AC-3]` 分类月报必须和领域月报在相同筛选条件下可对账，不能形成两套不一致台账。
  - `[AC-4]` 历史分类必须稳定，物料后续改分类不能回改已发生月份报表。
  - `[AC-5]` 分类明细必须基于单据行事实，不能沿用单据头汇总直接重分组。
- Requirement evidence expectations:
  - 在进入编码前或同一编码切片起始阶段，需要把本任务回写到 `docs/requirements/domain/monthly-reporting.md` 与 `docs/acceptance-tests/specs/monthly-reporting.md`，避免 task doc 成为唯一真源。
  - 自动化与 acceptance 证据必须同时证明：
    - 分类视角内部金额正确；
    - 分类视角与现有领域视角对同一来源事实可对账；
    - 现有领域视角无回归。
- Open questions requiring user confirmation:
  - `none`; 入口、范围、层级与分类归属时点已在对话中锁定。

## Progress Sync

- Phase progress:
  - `completed`
- Current state:
  - 已在 `stock_in_order_line` 与 `sales_stock_order_line` 落 `materialCategoryIdSnapshot / materialCategoryCodeSnapshot / materialCategoryNameSnapshot / materialCategoryPathSnapshot`。
  - 已补齐 `inbound` / `sales` 写侧快照，`reporting` 已新增 `MATERIAL_CATEGORY` 视角 summary/detail/export，前端月报页已同页支持视角切换。
  - 已完成 reviewer blocker fix loop：写侧与 migration 的分类路径快照契约已统一，分类 drilldown 已切到 `categoryNodeKey`，migration / backfill 已改为分批执行。
  - 本地 `.env.dev` 已完成 closeout 验证：focused tests、`batch-d` e2e、`typecheck`、`migration:typecheck`、web build、migration dry-run/execute、live API 与 browser walkthrough 均通过。
- Acceptance state:
  - `accepted`
- Blockers:
  - `none`
- Next step:
  - 保留 `F9` 作为 accepted baseline。

## Goal And Acceptance Criteria

- Goal:
  - 在现有月度对账体系内，新增一套可落地的“物料分类视角”执行计划，使系统能按月份、仓别和车间筛选后，按物料分类核算 `验收入库`、`生产入库`、`销售出库`、`销售退货` 的金额，并保持与领域月报可对账。
- Acceptance criteria:
  - `[AC-1]` 页面结构成立：`/reporting/monthly-reporting` 保留现有领域视角，并新增 `领域视角 / 物料分类视角` 切换。
  - `[AC-2]` 分类金额口径成立：分类视角至少输出 `验收入库金额`、`生产入库金额`、`销售出库金额`、`销售退货金额`、`净发生金额`。
  - `[AC-3]` 历史稳定性成立：分类归属使用业务发生时快照，物料主数据后续改分类不会重写历史月份报表。
  - `[AC-4]` 树形汇总成立：每条事实先归入叶子分类，再向祖先分类汇总；`未分类` 需被稳定纳入。
  - `[AC-5]` 明细追溯成立：分类视角下钻到单据行，而不是单据头。
  - `[AC-6]` 口径对账成立：同一查询条件下，分类视角与领域视角对覆盖范围内的总金额可对账。
  - `[AC-7]` 系统一致性成立：`RD_SUB` 范围隔离、异常标识、导出权限和既有领域月报合同不回归。
  - `[AC-8]` 交付闭环成立：schema/backfill、写侧快照、读模型、前端、导出、focused tests、browser acceptance 都被覆盖。

## Scope And Ownership

- Allowed code paths:
  - `docs/requirements/domain/monthly-reporting.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/acceptance-tests/specs/monthly-reporting.md`
  - `prisma/schema.prisma`
  - `src/modules/inbound/**`
  - `src/modules/sales/**`
  - `src/modules/reporting/**`
  - `web/src/views/reporting/monthly-reporting/**`
  - `web/src/api/reporting.js`
  - 相关 `test/**`
  - guarded migration / backfill surfaces for snapshot fill
- Frozen or shared paths:
  - `docs/architecture/**` 只读引用，不在本 slice 改写。
  - `src/modules/master-data/**` 当前仅作为分类主数据来源参考，不在第一版实现范围内扩写业务合同。
  - `src/modules/workshop-material/**`、`src/modules/rd-project/**`、`src/modules/rd-subwarehouse/**` 暂不进入第一版分类视角。
  - `docs/tasks/task-20260411-1105-monthly-reporting-domain-first-redesign.md` 为现有领域月报基线，不被本 task 覆盖或替换。
- Task doc owner:
  - `parent orchestrator`
- Contracts that must not change silently:
  - `reporting` 继续保持只读聚合定位。
  - `inventory-core` 继续是库存唯一写入口；分类月报不得旁路改库存事实。
  - 现有领域视角 API 与页面合同保持有效，不因分类视角进入而被替换。
  - 第一版覆盖范围只限 `inbound + sales` 家族，不在实现中偷偷扩成全月报主题。
  - 历史分类稳定性依赖“快照”，不能退化为报表查询时读取当前 `material.categoryId`。

## Implementation Plan

- [x] Step 1: 补 shared truth。
  - 在 `docs/requirements/domain/monthly-reporting.md` 中补写“物料分类视角” follow-on slice。
  - 在 `docs/acceptance-tests/specs/monthly-reporting.md` 增补分类视角验收矩阵与对账要求。
- [x] Step 2: 扩展 schema 与业务行快照。
  - 为 `stock_in_order_line` 与 `sales_stock_order_line` 增加叶子分类快照和祖先链快照字段。
  - 为历史数据设计一次性 backfill，补齐已有行的分类快照。
- [x] Step 3: 在写侧冻结分类归属。
  - 创建/修改入库与销售单据时，同步写入分类快照。
  - 明确历史边界：迁移后新数据具备严格发生时快照语义；迁移前旧数据以 backfill 时主数据为基线。
- [x] Step 4: 新增分类月报事实行读模型。
  - 在 `reporting` 中引入“按单据行读取”的分类月报事实，覆盖四类业务事实。
  - 按叶子分类归账，再按祖先链汇总父级分类。
- [x] Step 5: 新增分类视角接口与导出。
  - 增加分类视角 summary/detail/export 接口，不替换既有领域视角接口。
  - Excel 至少包含 `总览`、`分类汇总`、`单据行明细` 三个工作表。
- [x] Step 6: 改造月报页面。
  - 在现有月报页增加视角切换。
  - 分类视角采用树形表格展示分类汇总，并提供单据行级明细下钻。
- [x] Step 7: 做口径对账与回归验证。
  - 验证分类视角与领域视角在覆盖范围内金额对齐。
  - 验证现有领域视角、`RD_SUB` 权限隔离、导出与异常标识无回归。

## Coder Handoff

- Execution brief:
  - 这是现有 `monthly-reporting` 的新增视角，不是新开一套无关报表。
  - 从“单据行事实 + 分类快照”开始实现，而不是尝试对现有单据头月报结果做二次 regroup。
  - 历史稳定性优先于实现便利，分类归属必须在业务发生时冻结。
- Required source docs or files:
  - `docs/requirements/domain/monthly-reporting.md`
  - `docs/requirements/domain/inbound-business-module.md`
  - `docs/requirements/domain/sales-business-module.md`
  - `docs/acceptance-tests/specs/monthly-reporting.md`
  - `prisma/schema.prisma`
  - `src/modules/inbound/**`
  - `src/modules/sales/**`
  - `src/modules/reporting/**`
  - `web/src/views/reporting/monthly-reporting/**`
  - `web/src/api/reporting.js`
  - this task doc
- Owned paths:
  - `docs/requirements/domain/monthly-reporting.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/acceptance-tests/specs/monthly-reporting.md`
  - `prisma/schema.prisma`
  - `src/modules/inbound/**`
  - `src/modules/sales/**`
  - `src/modules/reporting/**`
  - `web/src/views/reporting/monthly-reporting/**`
  - `web/src/api/reporting.js`
  - 相关 `test/**`
- Forbidden shared files:
  - `docs/architecture/**`
  - `src/modules/workshop-material/**`
  - `src/modules/rd-project/**`
  - `src/modules/rd-subwarehouse/**`
  - `src/modules/master-data/**` 除非 parent 明确扩 scope
- Constraints and non-goals:
  - 不替换或下线现有领域视角。
  - 不把现有库存分类分布页复用成月度发生金额报表。
  - 不用“当前主数据分类”去重算历史月份归属。
  - 不把第一版扩到车间、研发项目或 RD 小仓分类核算。
  - 不把分类明细继续做成单据头粒度。
- Validation command for this scope:
  - `bun run test -- src/modules/reporting/application/monthly-reporting.shared.spec.ts src/modules/reporting/application/monthly-reporting.service.spec.ts src/modules/reporting/infrastructure/reporting.repository.spec.ts src/modules/inbound/application/inbound.service.spec.ts src/modules/sales/application/sales.service.spec.ts`
  - `bun run test:e2e -- test/batch-d-slice.e2e-spec.ts`
  - `bun run typecheck`
  - `pnpm --dir web build:prod`
  - browser walkthrough for `/reporting/monthly-reporting`

## Reviewer Handoff

- Review focus:
  - 分类月报是否真正基于单据行事实，而不是前端 regroup 或后端继续依赖单据头 totals。
  - `stock_in_order_line` 与 `sales_stock_order_line` 的分类快照是否覆盖创建、修改和历史 backfill。
  - 父级分类汇总是否来自存储的祖先链，而不是查询时回读当前分类树。
  - 分类视角与领域视角在同一过滤条件下是否可对账。
  - 现有领域视角、权限、异常标识、导出合同是否保持稳定。
- Requirement alignment check:
  - 对照用户已锁定的四个决策：同页切换、`inbound + sales`、叶子+父级、发生时快照。
  - 确认 shared truth 已补写到 `monthly-reporting` requirement/spec，而不是只存在 task doc。
- Final validation gate:
  - focused tests for `reporting/inbound/sales`
  - `bun run test:e2e -- test/batch-d-slice.e2e-spec.ts`
  - `bun run typecheck`
  - `pnpm --dir web build:prod`
  - browser walkthrough with category view export evidence
- Required doc updates:
  - `docs/requirements/domain/monthly-reporting.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/acceptance-tests/specs/monthly-reporting.md`
  - new acceptance run doc for material-category view

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` 页面视角切换
  - `[AC-2]` 分类金额口径
  - `[AC-3]` 历史分类稳定性
  - `[AC-4]` 叶子归账与父级汇总
  - `[AC-5]` 单据行明细下钻
  - `[AC-6]` 与领域视角对账
  - `[AC-7]` 权限/异常/导出一致性
  - `[AC-8]` 交付闭环
- Evidence pointers:
  - schema migration / backfill validation
  - `src/modules/reporting/**` focused tests
  - `src/modules/inbound/**` focused tests
  - `src/modules/sales/**` focused tests
  - `test/batch-d-slice.e2e-spec.ts`
  - `pnpm --dir web build:prod`
  - browser walkthrough of category view and export
- Evidence gaps, if any:
  - `none`

## Review Log

- Validation results:
  - `bun run test -- src/modules/reporting/application/monthly-reporting.shared.spec.ts src/modules/reporting/application/monthly-reporting.service.spec.ts src/modules/reporting/infrastructure/reporting.repository.spec.ts src/modules/inbound/application/inbound.service.spec.ts src/modules/sales/application/sales.service.spec.ts` => `pass`
  - `bun run test:e2e -- test/batch-d-slice.e2e-spec.ts` => `pass`
  - `bun run typecheck` => `pass`
  - `bun run migration:typecheck` => `pass`
  - `pnpm --dir web build:prod` => `pass`
  - `bun run migration:monthly-reporting-material-category-snapshot:dry-run` => `pass`
  - `bun run migration:monthly-reporting-material-category-snapshot:execute` => `pass`
  - live API `GET /api/reporting/monthly-reporting/details?...&categoryNodeKey=<live nodeKey>` => `pass`
- Delivered scope summary:
  - `prisma/schema.prisma` 新增两张业务行表的物料分类快照字段。
  - `src/modules/inbound/**` 与 `src/modules/sales/**` 在创建 / 修改 / 销售退货写入分类叶子与祖先链快照。
  - `src/modules/reporting/**` 新增 `MATERIAL_CATEGORY` 视角 summary/detail/export 与行级分类聚合。
  - `web/src/views/reporting/monthly-reporting/index.vue` 同页新增 `领域视角 / 物料分类视角` 切换，并保留既有领域视角默认行为。
  - `scripts/migration/monthly-reporting-material-category-snapshot/migrate.ts` 新增 schema/backfill dry-run/execute 工具，并已在本地 `.env.dev` 执行完成。
- Independent review:
  - `saifute-code-reviewer` 复审结论：`approved`

## Acceptance

- Acceptance status: `accepted`
- Acceptance QA: `saifute-acceptance-qa`
- Acceptance date: `2026-04-16`
- Complete test report: `yes`
- Acceptance run:
  - `docs/acceptance-tests/runs/run-20260416-1213-monthly-reporting-material-category-view.md`
- Browser evidence:
  - `agent-browser` 使用 `admin/admin123` 登录 `http://127.0.0.1:5173/reporting/monthly-reporting`
  - 验证默认仍为领域视角，再切换到 `物料分类视角`
  - 验证分类汇总、单据行明细、`销售退货` 操作筛选与 UI 导出
- Live API evidence:
  - `GET /api/reporting/monthly-reporting?yearMonth=2026-04&viewMode=MATERIAL_CATEGORY`
  - `GET /api/reporting/monthly-reporting/details?yearMonth=2026-04&viewMode=MATERIAL_CATEGORY&topicKey=SALES_RETURN`
  - `GET /api/reporting/monthly-reporting/details?...&categoryNodeKey=<live nodeKey>`
  - `POST /api/reporting/monthly-reporting/export`

### Acceptance Checklist

- [x] `[AC-1]` 页面保留领域视角并新增物料分类视角 — Evidence: acceptance run + browser walkthrough — Verdict: `✓ met`
- [x] `[AC-2]` 分类视角覆盖四类业务事实金额 — Evidence: live summary / e2e / export — Verdict: `✓ met`
- [x] `[AC-3]` 分类归属采用发生时快照且历史稳定 — Evidence: schema/backfill + write-side specs + migration evidence — Verdict: `✓ met`
- [x] `[AC-4]` 叶子分类与父级汇总成立 — Evidence: category tree summary + service/repository specs — Verdict: `✓ met`
- [x] `[AC-5]` 分类明细为单据行粒度 — Evidence: live detail / e2e / browser walkthrough — Verdict: `✓ met`
- [x] `[AC-6]` 分类视角与领域视角可对账 — Evidence: live API reconciliation on `2026-04 MAIN` — Verdict: `✓ met`
- [x] `[AC-7]` 权限、异常与导出合同无回归 — Evidence: existing monthly-reporting baseline + current browser/live API evidence — Verdict: `✓ met`
- [x] `[AC-8]` schema/backfill/读模型/前端/测试证据完整 — Evidence: focused tests + `batch-d` e2e + typechecks + build + migration + acceptance run — Verdict: `✓ met`

### Acceptance Notes

- Acceptance path used: `full`
- Acceptance summary:
  - `saifute-acceptance-qa` 最终结论：`accepted`
  - requirement / spec / run / runtime contract 已对齐；live API 已验证 `categoryNodeKey` 精确下钻合同生效
- Report completeness check:
  - `yes`; spec、run、focused tests、e2e、`typecheck`、`migration:typecheck`、build、migration dry-run/execute、live API、browser evidence 均已补齐

## Final Status

- Outcome:
  - material-category view delivery accepted and archived as `retained-completed`
- Requirement alignment:
  - 用户锁定的四项默认决策均已落地：同页切换、`inbound + sales` 第一版范围、叶子归账 + 父级汇总、发生时快照
- Residual risks or testing gaps:
  - 若未来把分类视角扩到 `workshop-material / rd-project / rd-subwarehouse`，需要新的 requirement / task / acceptance slice
- Directory disposition after completion: `retained-completed`
- Next action:
  - 以当前 `F9` accepted baseline 为基础推进后续扩范围工作
