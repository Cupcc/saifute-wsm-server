# 全量旧库导入、目标库重建与库存重算

## Metadata

- Scope:
  - 将 `LEGACY_DATABASE_URL` 指向的旧库 `saifute` 全量导入到 `DATABASE_URL` 指向的目标库 `saifute-wms`。
  - 真实导入前先清理 / 重建目标库，确保 migration staging、主数据 map、业务单据、关系恢复、库存 replay 都从一致基线开始。
  - 最终目标不是构造 camelCase 迁移中间态，而是直接在当前运行时使用的 snake_case schema 上导入，并完成 `inventory_balance`、`inventory_log`、`inventory_source_usage` 重算与 validate。
- Related requirement:
  - `docs/architecture/30-java-to-nestjs-data-migration-reference.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/architecture/modules/inventory-core.md`
- Status: `replay-executed-validated`
- Review status: `review-fix-applied`
- Delivery mode: `standard`
- Acceptance mode: `full`
- Acceptance status: `not-assessed`
- Complete test report required: `yes`
- Lifecycle disposition: `active`
- Planner: `parent-orchestrator`
- Coder: `parent-orchestrator`
- Reviewer:
- Acceptance QA:
- Last updated: `2026-05-11`
- Related checklist:
  - `scripts/migration/reports/full-import-replay-dry-run-report.md`
  - `scripts/migration/reports/full-import-reset-execution-plan.md`
- Related acceptance spec:
  - `docs/acceptance-tests/specs/master-data.md`
  - `docs/acceptance-tests/specs/inbound.md`
  - `docs/acceptance-tests/specs/workshop-material.md`
  - `docs/acceptance-tests/specs/sales-project.md`
- Related acceptance run: (optional)
- Related files:
  - `.env.dev`
  - `prisma/schema.prisma`
  - `scripts/migration/**`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `scripts/migration/reports/full-import-replay-dry-run-report.md`

## Requirement Alignment

- Domain capability:
  - 旧 Java 业务事实迁入 NestJS 当前领域模型，并用已迁入单据重新生成库存事实。
- User intent summary:
  - 用户要求明确目标，清理目标库，然后跑从旧库到目标库的全量迁移，并补全 replay 数据。
- Acceptance criteria carried into this task:
  - `[AC-1]` 清库 / 重建前必须确认目标库为 `.env.dev` 的 `DATABASE_URL`，且有可恢复备份或快照。
  - `[AC-2]` 迁移执行必须从干净基线开始，包含 `migration_staging` schema 和 batch map。
  - `[AC-3]` 业务数据导入完成后，目标库必须回到当前运行时 snake_case schema。
  - `[AC-4]` 库存 replay 必须先 dry-run clean，再 execute，再 validate。
  - `[AC-5]` 最终报告必须列出每个迁移 slice 的 execute / validate 结果，以及剩余 warning / blocker。
- Requirement evidence expectations:
  - 备份路径 / 快照说明。
  - 清库前后 schema 与行数报告。
  - 每个 migration slice 的 JSON report。
  - 最终 `inventory-replay-dry-run-report.json`、`inventory-replay-execute-report.json`、`inventory-replay-validate-report.json`。
- Open questions requiring user confirmation:
  - 无迁移执行 blocker。后续需要业务确认 `420` 个最终负库存盘点 warning 的盘点调整安排。

## Progress Sync

- Phase progress:
  - `full business import executed; material-category snapshots backfilled; inventory replay executed and validated`
- Current state:
  - `LEGACY_DATABASE_URL` 可连接到 `120.26.116.249:3306/saifute`。
  - `DATABASE_URL` 当前可连接到 `127.0.0.1:3306/saifute-wms`；迁移脚本以 env 实际库名为准，不再硬编码目标库名。
  - 2026-05-11 已补充系统用户迁移入口 `migration:system-users:warehouse-managers:dry-run/execute`，从旧库 `sys_user` 读取 `田晓晶`、`徐文静`、`王子云`、`aliu`，写入当前 `DATABASE_URL` 的 `sys_user` / `sys_user_role` / `sys_user_post`；本次 execute 报告显示 4 人均已存在且绑定 `warehouse-manager` / `WAREHOUSE_MANAGER`。
  - 2026-05-11 apply 已按当前 `.env.dev` 重新执行：目标库业务域清理后保留 `sys_*`，`stock_scope` 收敛为 `MAIN/RD_SUB` 两行；`migration_staging` 通过 `bootstrap-staging --reset` 初始化为 20 张表。
  - 2026-05-11 apply 前已生成目标库备份 `scripts/migration/backups/saifute-wms-before-full-import-20260511-084725.sql`，旧库快照 `scripts/migration/backups/legacy-saifute-full-20260511-084725.sql`。
  - 2026-05-11 全链路已执行并验证通过：主数据、入库、销售、销售预留、销售退货、销售退货 finalize、车间领料、车间退料、车间退料 finalize、return-post-admission、报废、RD 项目、月报物料分类快照、stock-scope validate、库存 replay。
  - 2026-05-11 源库实时数据较 2026-05-10 基线继续变化；本轮已调整迁移 guard，使其校验当前批次 staging / map / live 表一致性，而不是固定旧快照总数。
  - 2026-05-11 `inventory-replay:return-source-links:execute` 已回填 `17` 条可证明来源链；随后 `inventory-replay:dry-run` 为 `blockers=[]`。
  - 2026-05-11 `inventory-replay:execute` 已完成：计划并写入 `inventory_balance=1262`、`inventory_log=5159`、`inventory_source_usage=3093`、价格层 `468`。
  - 2026-05-11 `inventory-replay:validate` 已通过：validate blocker 为 `0`，剩余 `420` 个最终负库存盘点 warning，不阻塞迁移 replay。
  - 2026-05-11 最终目标库关键行数：`stock_in_order=1160`、`stock_in_order_line=2093`、`sales_stock_order=537`、`sales_stock_order_line=687`、`factory_number_reservation=429`、`workshop_material_order=586`、`workshop_material_order_line=1872`、`rd_project=21`、`rd_project_material_line=675`、`approval_document=2187`、`document_relation=21`、`document_line_relation=23`。
  - 2026-05-11 验证通过：`bun run migration:typecheck`；`bun run test -- test/migration --runInBand` 结果为 24 suites / 347 tests 通过。
  - 2026-05-10 apply 已清理目标库残留迁移域数据，保留 `stock_scope` 与 `sys_*` 系统表。
  - `migration_staging` 已通过 `bootstrap-staging --reset` 初始化，当前 20 张 staging 表。
  - 主数据、入库、销售、销售预留、销售退货、销售退货 finalize、车间领料、车间退料、车间退料 finalize、return-post-admission、报废、RD 项目均已真实 execute 且 validate 通过。
  - `migration:monthly-reporting-material-category-snapshot:execute` 已回填入库 / 销售单据行物料分类快照：`stock_in_order_line=2072`、`sales_stock_order_line=684`，剩余缺口为 0；2026-03 物料分类月报来源行 `937` 行、`14` 个分类、`未分类=0`。
  - `inventory-replay:return-source-links:execute` 已自动回填 15 条可证明来源链。
  - 2026-05-10 已按归档规则清理 replay blocker：
    - `RD_PROJECT_OUT` 使用既有历史无来源 / 后续来源冲抵 / 最终负库存盘点 warning 规则。
    - `RK20260306005` / `wg17` 是仓库已确认错误冲红单，已从目标库删除对应业务行、审批投影、迁移 map 和旧库存流水；stock-in 迁移计划已加入确定性排除。
    - 最终负库存且无可用价格层的事件级负库存 blocker 已同步转为盘点 warning。
  - `inventory-replay:dry-run` 已 clean：`blockers=[]`。
  - `inventory-replay:execute` 已完成：删除旧余额 861、旧流水 4770、旧来源占用 14；写入余额 1232、流水 5081、来源占用 3060。
  - `inventory-replay:validate` 已通过：实际余额 / 流水 / 来源占用均等于计划，validate blocker 为 0。
  - 目标库当前是 snake_case 运行时 schema；迁移脚本已改为目标库 SQL 直接使用 snake_case 列名，TS 侧只保留结果 alias / DTO camelCase。
  - 最新执行报告见 `scripts/migration/reports/full-import-replay-dry-run-report.md`。
  - 清库重建设计报告见 `scripts/migration/reports/full-import-reset-execution-plan.md`。
  - 原“临时 camelCase 迁移中间 schema”方案已废弃；当前方案直接用 `prisma/schema.prisma` 的 snake_case 最终 schema 重建目标库。
  - 4 条 inactive 物料缺单位已按旧库证据在迁移侧补齐，不修改旧库；`migration:master-data:dry-run` 当前 `blockerCount=0`。
  - 业务 writer 已直接写入 `stock_scope_id`：入库 / 销售 / 销售退货 / 领料 / 退料默认 `MAIN`，报废 / RD 按车间映射 `MAIN` 或 `RD_SUB`，销售预留默认 `MAIN`。
  - `migration:typecheck` 通过；`bun run test -- test/migration --runInBand` 结果为 24 suites / 347 tests 通过。
  - 旧库源库已完成本地全量 SQL 备份：`scripts/migration/backups/legacy-saifute-full-20260510-111122.sql`；备份报告见 `scripts/migration/reports/legacy-full-backup-report.md`。
  - 2026-05-10 replay 后复跑 `migration:stock-in:validate` 失败，原因是当前 `LEGACY_DATABASE_URL` 在本次迁移快照后又新增 4 张 2026-05-04 至 2026-05-10 的入库单 / 6 行；该命令重新读取实时旧库，不能代表本次备份快照和已导入目标的一致性。
- Acceptance state:
  - `not-assessed`
- Blockers:
  - 无 replay blocker。
  - 剩余 420 个 validate warning 均为最终负库存盘点调整项，不阻塞迁移 replay。
- Next step:
  - 进入验收 / review；仓库后续通过盘点调整补平最终负库存 warning。

## Goal And Acceptance Criteria

- Goal:
  - 清理并重建目标库到当前 snake_case 运行时 schema，从旧库全量导入业务事实，并完成库存价格层 replay。
- Acceptance criteria:
  - `[AC-1]` 清理前报告列出目标库、表清单、现有行数、备份路径和清理方式。
  - `[AC-2]` 目标库重建后直接使用当前 `prisma/schema.prisma` 的 snake_case 表 / 列名。
  - `[AC-3]` `stock_scope` 已有 `MAIN` / `RD_SUB`，`migration:bootstrap-staging` 执行成功，staging map 表存在。
  - `[AC-4]` 所有业务导入 slice 的 execute / validate 报告生成，并区分 accepted excluded / archived / pending。
  - `[AC-5]` 所有主业务 writer 直接写 `stock_scope_id` / `source_stock_scope_id` / `target_stock_scope_id`，导入后不依赖 snake-case cutover。
  - `[AC-6]` `migration:inventory-replay:dry-run` 输出 `blockers=[]`。
  - `[AC-7]` `migration:inventory-replay:execute` 与 `migration:inventory-replay:validate` 均完成，validate 只有已接受 warning 或完全 clean。
  - `[AC-8]` 入库 / 销售行表的月报物料分类快照已回填，分类月报不再因空快照退回 `未分类`。

## Scope And Ownership

- Allowed code paths:
  - `docs/tasks/**`
  - `scripts/migration/**`
  - `scripts/migration/reports/**`
- Frozen or shared paths:
  - `.env.dev` 只读取，不修改。
  - 当前未提交的 supplier-return / inventory-replay 代码改动不得回滚。
- Task doc owner:
  - `parent-orchestrator`
- Contracts that must not change silently:
  - `DATABASE_URL` 是真实目标库。
  - `LEGACY_DATABASE_URL` 是旧库源。
  - 最终运行时 schema 必须是当前 `prisma/schema.prisma` 定义的 snake_case schema。
  - 库存重算必须通过 dry-run gate；有 blocker 时不得 execute。

## Implementation Plan

- [x] Step 1: 根据上一轮 dry-run 明确目标 schema 策略。
- [x] Step 2: 建立 active task，记录清库 / 全量迁移 / replay 的执行边界。
- [x] Step 3: 生成清库前 manifest：目标库、表清单、行数、备份命令、拟删除对象。
- [x] Step 4: 废弃 camelCase 中间 schema 方案，改为迁移脚本直接对齐当前 snake_case schema。
- [x] Step 4.5: 用迁移侧 override 补齐 4 条 inactive 旧物料单位，master-data dry-run blocker 清零。
- [x] Step 4.6: 修改迁移 writer，使业务导入直接写 `stock_scope_id`，不再迁完后统一补范围列。
- [x] Step 4.7: review 检查：`migration:typecheck` 通过，迁移单测 24 suites / 345 tests 通过。
- [x] Step 5: 在用户确认目标库已清理后，清理残留迁移域数据并保持当前 snake_case schema。
- [x] Step 6: 执行 `migration:stock-scope-phase2:execute`，提前 seed `MAIN/RD_SUB`。
- [x] Step 7: 执行 `migration:bootstrap-staging --reset`。
- [x] Step 8: 执行主数据导入并 validate；单位 blocker 已在 dry-run 阶段处理完。
- [x] Step 9: 按依赖顺序执行业务单据导入与 validate，业务 writer 直接落 `stock_scope_id`。
- [x] Step 10: 执行 `inventory-replay` 的 `dry-run -> execute -> validate`；当前 replay blocker 已清零，execute / validate 已完成。
- [x] Step 11: 更新执行报告；最终完整报告已补齐 replay execute / validate 结果。

## Target Schema Design

全量导入只使用一段 schema：当前运行时最终态。

- 表名沿用当前 `@@map` 后的真实表名，例如 `stock_in_order`、`sales_stock_order`。
- 数据库列名直接使用当前 `@map` 定义的 snake_case，例如 `document_no`、`stock_scope_id`、`created_at`。
- TypeScript 内部对象属性可以继续使用 camelCase，但所有目标库 raw SQL 的列名必须是 snake_case；必要时用 `AS documentNo` 这类 SELECT alias 给 TS 使用。
- `stock_scope` 的 `MAIN` / `RD_SUB` 在业务导入前 seed；主业务 writer 直接写 `stock_scope_id`，不再依赖导入后的统一回填。
- `migration:snake-case-columns:*` 仅保留为历史兼容工具，不进入本次全量重建主链路。

## Proposed Execution Order

只在备份和清库确认后执行。

1. 备份目标库：
   - `mysqldump` 或 NAS / 数据库快照，保存 `saifute-wms` 与现有 `migration_staging`（如存在）。
2. 重建目标库到当前 snake_case schema：
   - 使用 `prisma/schema.prisma` 对 `DATABASE_URL` 执行 force reset / db push。
3. Seed stock scope：
   - `bun run migration:stock-scope-phase2:execute`
   - 空库阶段该命令只需要确保 `stock_scope` 有 `MAIN` / `RD_SUB`；业务表范围列由后续 writer 直接写入。
4. 初始化 staging：
   - `bun --env-file .env.dev scripts/migration/bootstrap-staging.ts --reset`
5. 主数据：
   - `bun run migration:master-data:dry-run`
   - 复查单位 override warning。
   - `bun run migration:master-data:execute`
   - `bun run migration:master-data:validate`
6. 入库 / 出库 / 编号 / 退货 / 退料 / 报废 / RD：
   - `stock-in`
   - `sales`
   - `sales-reservation`
   - `sales-return`
   - `sales-return-finalize`
   - `workshop-pick`
   - `workshop-return`
   - `workshop-return-finalize`
   - `return-post-admission`
   - `scrap`
   - `rd-project`
7. 月报物料分类快照回填：
   - `bun run migration:monthly-reporting-material-category-snapshot:dry-run`
   - `bun run migration:monthly-reporting-material-category-snapshot:execute`
   - execute 后必须复跑 dry-run，确认 `stockInMissingSnapshotRows=0` 且 `salesMissingSnapshotRows=0`。
8. stock scope validate：
   - `bun run migration:stock-scope-phase2:validate`
   - 目标：各业务表不再有缺失 `stock_scope_id` 的导入行。
9. 库存重算：
   - `bun run migration:inventory-replay:dry-run`
   - `bun run migration:inventory-replay:return-source-links:dry-run`
   - 如需要，先处理来源链 backfill。
   - `bun run migration:inventory-replay:execute`
   - `bun run migration:inventory-replay:validate`

## Coder Handoff

- Execution brief:
  - 先确认备份 / 覆盖边界；不要在没有确认备份的情况下执行 destructive reset。执行时直接重建当前 snake_case schema，不再生成 camelCase 中间 schema。
- Required source docs or files:
  - `docs/architecture/30-java-to-nestjs-data-migration-reference.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `scripts/migration/reports/full-import-replay-dry-run-report.md`
  - `prisma/schema.prisma`
- Owned paths:
  - `docs/tasks/task-20260509-full-legacy-import-reset-and-replay.md`
  - `docs/tasks/TASK_CENTER.md`
  - `scripts/migration/reports/full-import-replay-*`
- Forbidden shared files:
  - `.env.dev`
  - unrelated current supplier-return implementation files
- Constraints and non-goals:
  - 不导入旧平台权限 / 菜单 / Quartz / 日志历史，除非另开系统管理迁移任务。
  - 不伪造退货 / 退料来源关系；只写可证明关系。
  - 不在 replay 有 blocker 时 execute。
- Validation command for this scope:
  - `bun --env-file .env.dev prisma validate --schema prisma/schema.prisma`
  - `bun run migration:typecheck`
  - `bun run test -- test/migration --runInBand`

## Reviewer Handoff

- Review focus:
  - 清库策略是否有备份门槛。
  - 迁移脚本是否直接对齐当前 snake_case schema，尤其是 `document_no`、`stock_scope_id`、`business_document_*`。
  - 迁移顺序是否满足 map / relationship / replay 依赖。
- Requirement alignment check:
  - 检查是否真正满足“旧库导入目标库，再 replay 补完整数据”。
- Final validation gate:
  - 所有 execute 后必须对应 validate。
  - replay validate 必须无 blocker。
- Required doc updates:
  - 本 task 的 Progress Sync。
  - `scripts/migration/reports/full-import-replay-dry-run-report.md` 或最终执行报告。

### Acceptance Evidence Package

- Covered criteria:
  - 旧库源库全量 SQL 备份已完成；目标库已完成清理 / staging 初始化 / 业务导入 / replay execute / validate。
- Evidence pointers:
  - `scripts/migration/reports/**`
  - `scripts/migration/reports/legacy-full-backup-report.md`
  - `scripts/migration/backups/legacy-saifute-full-20260510-111122.sql`
- Evidence gaps, if any:
  - 未执行独立 browser acceptance；本轮为数据库迁移与 replay 验证。
  - 当前旧库源在迁移快照后继续新增入库单，后续若要再次全量重跑必须重新冻结源库或使用备份快照。
- Complete test report requirement: `yes`

### Acceptance Test Expectations

- Acceptance mode: `full`
- User-visible flow affected: `yes`
- Cross-module write path: `yes`
- Irreversible or high-cost business effect: `yes`
- Existing automated user-flow coverage: `partial`
- Browser test required: `yes`
- Browser waiver reason:
- Related acceptance cases:
  - 主数据、入库、销售、车间物料、库存价格层查询。
- Related acceptance spec:
  - `docs/acceptance-tests/specs/master-data.md`
  - `docs/acceptance-tests/specs/inbound.md`
  - `docs/acceptance-tests/specs/workshop-material.md`
  - `docs/acceptance-tests/specs/sales-project.md`
- Separate acceptance run required: `yes`
- Complete test report required: `yes`
- Required regression / high-risk tags:
  - `legacy-migration`
  - `database-reset`
  - `inventory-replay`
  - `snake-case-direct-import`
- Suggested environment / accounts:
  - `.env.dev` target DB and standard admin user after system seed / user migration policy is confirmed.
- Environment owner / setup source:
  - `parent-orchestrator`

## Parallelization Safety

- Status: `not-safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - 目标库清理、schema 重建、migration staging、业务导入、replay 均共享同一个 `DATABASE_URL`，必须单 writer 顺序执行。

## Review Log

- Validation results:
  - `2026-05-09`: previous dry-run report generated at `scripts/migration/reports/full-import-replay-dry-run-report.md`.
  - `2026-05-09`: current target DB readonly manifest generated in `scripts/migration/reports/full-import-reset-execution-plan.md`.
  - `2026-05-09`: camelCase intermediate schema option was investigated, then superseded by direct snake_case migration script changes.
  - `2026-05-09`: `bun test test/migration/master-data.spec.ts` passed, `3` tests.
  - `2026-05-09`: `bun run migration:master-data:dry-run` passed with `blockerCount=0`, `missingMaterialUnitCount=0`.
  - `2026-05-09`: `bun run migration:typecheck` passed.
  - `2026-05-09`: `bun run test -- test/migration --runInBand` passed with 24 suites / 342 tests.
  - `2026-05-10`: legacy source DB full SQL backup completed at `scripts/migration/backups/legacy-saifute-full-20260510-111122.sql`; SHA-256 `1b07a1887991c62d6203d0320877c94bb4c55302a45b6cf200446e804728078b`; report `scripts/migration/reports/legacy-full-backup-report.md`.
  - `2026-05-10`: full business import executed through `rd-project`; all business slice validates passed at execution time.
  - `2026-05-10`: `bun run migration:inventory-replay:dry-run` passed with `blockers=[]`.
  - `2026-05-10`: `bun run migration:inventory-replay:execute` passed; inserted `inventory_balance=1232`, `inventory_log=5081`, `inventory_source_usage=3060`.
  - `2026-05-10`: `bun run migration:inventory-replay:validate` passed with `0` blocker issues and `390` accepted stocktake warnings.
  - `2026-05-10`: `bun run migration:monthly-reporting-material-category-snapshot:execute` passed; updated `stock_in_order_line=2072` and `sales_stock_order_line=684`; follow-up dry-run reports both missing counts as `0`.
  - `2026-05-10`: live target check for 2026-03 material-category monthly-reporting source rows returned `937` rows, `14` categories, `0` uncategorized rows.
  - `2026-05-10`: `bun run migration:typecheck` passed.
  - `2026-05-10`: `bun run test -- test/migration --runInBand` passed with 24 suites / 345 tests.
  - `2026-05-10`: `bunx biome check scripts/migration/monthly-reporting-material-category-snapshot/migrate.ts` passed.
- Findings:
  - 当前目标库是 snake_case schema；迁移脚本已改为直接对齐该 schema。
  - 物料分类月报快照脚本原先仍混用 camelCase 列名，已修复为 snake_case 并执行回填。
  - replay blocker 已按历史确认规则清零；剩余最终负库存作为仓库盘点调整 warning 留痕。
  - 当前实时旧库已在迁移快照后新增入库单；不能再用实时旧库直接复核本次已导入快照。
- Follow-up action:
  - 进入验收；仓库后续通过盘点调整补平最终负库存 warning。

## Acceptance

- Acceptance status: `not-assessed`
- Acceptance QA:
- Acceptance date:
- Complete test report:

### Acceptance Checklist

- [x] `[AC-1]` 清理前报告列出目标库、表清单、行数、备份路径和清理方式 — Evidence: `scripts/migration/reports/full-import-reset-execution-plan.md`; source backup `scripts/migration/reports/legacy-full-backup-report.md` — Verdict: `✓ met`
- [x] `[AC-2]` 目标库重建后直接使用当前 snake_case schema — Evidence: migration scripts and final target table counts in `scripts/migration/reports/full-import-replay-dry-run-report.md` — Verdict: `✓ met`
- [x] `[AC-3]` `stock_scope` seed 与 staging 初始化成功 — Evidence: `bootstrap-staging-report.json`, final `stock_scope=2`, `migration_staging` 20 tables — Verdict: `✓ met`
- [x] `[AC-4]` 业务导入 execute / validate 完成 — Evidence: slice reports under `scripts/migration/reports/*execute-report.json` and `*validate-report.json`; Progress Sync — Verdict: `✓ met`
- [x] `[AC-5]` 业务 writer 直接写 `stock_scope_id` — Evidence: migration code and stock-scope validation in Progress Sync — Verdict: `✓ met`
- [x] `[AC-6]` replay dry-run clean — Evidence: `scripts/migration/reports/inventory-replay-dry-run-report.json`, `blockers=[]` — Verdict: `✓ met`
- [x] `[AC-7]` replay execute / validate 完成 — Evidence: `scripts/migration/reports/inventory-replay-execute-report.json`, `scripts/migration/reports/inventory-replay-validate-report.json` — Verdict: `✓ met`

### Acceptance Notes

- Acceptance path used: `full`
- Acceptance summary:
- Report completeness check:
- If rejected or blocked: root cause + fix guidance.
- If conditionally accepted: follow-up requirement / task.

## Final Status

- Outcome:
  - `replay executed and validated`
- Requirement alignment:
  - 目标与用户要求一致：旧库业务事实已导入目标库，库存 replay 已补齐并 validate。
- Residual risks or testing gaps:
  - 390 个最终负库存 bucket 需要仓库后续盘点调整。
  - 当前实时旧库已继续新增入库数据；再次全量重跑前必须重新冻结源库或改用本次备份快照。
- Directory disposition after completion:
  - keep `active` until user acceptance / archive decision.
- Next action:
  - 用户验收；确认后可归档到 `archive/retained-completed/`。
