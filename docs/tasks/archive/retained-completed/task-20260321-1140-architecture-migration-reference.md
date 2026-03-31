# Architecture Migration Reference

## Metadata

- Scope: docs-only architecture reference for the full legacy Java -> NestJS data migration, focused on explaining old tables, business purpose, target NestJS tables, replay-vs-copy rules, staging/archive handling, and cutover semantics in one organized architecture document
- Related requirement: `docs/requirements/archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md`
- Status: `implemented`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `parent-orchestrator`
- Reviewer: `code-reviewer`
- Last updated: `2026-03-21`
- Related checklist:
- Related files:
  - `docs/requirements/archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md`
  - `docs/architecture/README.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `prisma/schema.prisma`
  - `scripts/migration/bootstrap-staging.ts`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `scripts/migration/reports/preflight-report.json`
  - `scripts/migration/reports/master-data-validate-report.json`
  - `scripts/migration/reports/stock-in-validate-report.json`
  - `scripts/migration/reports/customer-validate-report.json`
  - `scripts/migration/reports/workshop-pick-validate-report.json`
  - `scripts/migration/reports/customer-sales-return-validate-report.json`
  - `scripts/migration/reports/workshop-return-validate-report.json`
  - `scripts/migration/reports/return-post-admission-validate-report.json`
  - `scripts/migration/reports/customer-reservation-validate-report.json`
  - `scripts/migration/reports/project-validate-report.json`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/workflow.md`
  - `docs/architecture/modules/inbound.md`
  - `docs/architecture/modules/customer.md`
  - `docs/architecture/modules/workshop-material.md`
  - `docs/architecture/modules/project.md`
  - `docs/architecture/modules/rbac.md`
  - `docs/architecture/modules/audit-log.md`
  - `docs/architecture/modules/scheduler.md`

## Requirement Alignment

- Requirement doc: `docs/requirements/archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md`
- User intent summary:
  - 用一份 architecture 文档把“旧库有哪些表、各自做什么、迁到现在哪些表、现在这些表做什么”一次性讲清楚。
  - 文档需要覆盖全局迁移范围，但组织必须按业务域和表组收口，不能写成零散表清单或执行流水账。
  - 语言要简洁凝练，同时保留足够细节，让它成为完整的 old -> new migration reference。
- Acceptance criteria carried into this task:
  - 推荐并落地一个专门的 architecture migration reference 文档路径，而不是把大段 legacy -> target mapping 塞进 `00` 或 `20` 冻结基线。
  - 最终 architecture 文档必须同时说明旧表分组、新表分组、按域映射、重放/重建对象、无落点对象、staging/archive/excluded 处理，以及 cutover 口径。
  - 文档必须明确区分“已迁入 / 重放 / 归档 / 排除 / 后移 / 待决”，不能把当前尚未签收或尚未确定的范围写成既定完成事实。
  - 本 task 只做 docs planning，不改运行时代码、schema、迁移脚本或 requirement 文档。
- Open questions requiring user confirmation:
  - None for planning this docs-only reference, provided the final architecture doc keeps `project`、`scrap`、平台表、`全局 cutover gate` 明确标为当前状态或待决事项，而不是擅自改写成已收口结论。

## Requirement Sync

- Req-facing phase progress: 已完成“全量迁移架构参考文档”任务规划，下一步进入 parent-owned architecture 文档起草。
- Req-facing current state: 已明确推荐的 architecture 文档落点、章节结构、必读 repo 真源、措辞边界，以及 docs-only 校验方式；当前尚未开始正式改写 `docs/architecture/**`。
- Req-facing blockers: 无新增 blocker；但 `project`、`scrap`、平台表与全局 cutover 仍需在文档中保持“当前状态/待签收”口径，不能写成已决。
- Req-facing next step: 由 `parent-orchestrator` 读取 schema、migration scripts/reports、模块文档与 master migration task，起草 dedicated migration architecture reference，并补最小导航更新。
- Requirement doc sync owner: `parent-orchestrator`

## Goal And Acceptance Criteria

- Goal: create an execution-ready brief for a parent-owned docs implementation that adds one canonical architecture reference explaining the full legacy Java -> NestJS migration in domain-organized form without widening scope into code or broad architecture review.
- Acceptance criteria:
  - 推荐主文档路径为 `docs/architecture/30-java-to-nestjs-data-migration-reference.md`，并仅做最小必要的 `docs/architecture/README.md` 导航补充。
  - 不把这份迁移总览塞进 `docs/architecture/00-architecture-overview.md` 或 `docs/architecture/20-wms-database-tables-and-schema.md`，避免污染模块总览和冻结 schema baseline。
  - 新文档必须包含以下章节：
    - `1. 迁移范围与适用对象`
    - `2. 如何阅读这份映射（迁入 / 重放 / 归档 / 排除 / 后移 / 无落点）`
    - `3. 旧库表组与业务作用`
    - `4. 目标 NestJS 表组与业务作用`
    - `5. 按业务域的 old -> new 表映射`
    - `6. 重放/重建而不是直拷的对象`
    - `7. 无目标落点、仅旧库归档、或明确排除的对象`
    - `8. staged / archived / excluded 数据如何处理`
    - `9. cutover 口径：什么算 migrated，什么算 archived / excluded / deferred`
    - `10. 当前未决项与阅读边界`
  - 映射方式必须以业务域和表组组织，优先写“作用 + 去向 + 原因”，而不是巨量逐字段对照。
  - 任何关于 `project`、`scrap`、平台表、关系恢复、`inventory_source_usage`、最终 cutover 的描述都必须与当前 requirement、master migration task、脚本和 validate reports 一致。

## Scope And Ownership

- Allowed code paths:
  - archived successor path: `docs/tasks/archive/retained-completed/task-20260321-1140-architecture-migration-reference.md`
  - parent-owned implementation target: `docs/architecture/30-java-to-nestjs-data-migration-reference.md`
  - optional parent-owned navigation update: `docs/architecture/README.md`
- Frozen or shared paths:
  - `docs/requirements/archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/architecture/modules/*.md`
  - `prisma/schema.prisma`
  - `scripts/migration/**`
  - existing migration task docs and report files
- Task doc owner: `planner`
- Contracts that must not change silently:
  - “58 张旧表 -> 25 张新表” 的总述只能表达业务事实迁移进入重构后的目标 schema，不能暗示 one-to-one 表复制。
  - `inventory-core` 仍是库存唯一写入口；库存现值、库存日志、来源追踪、编号区间属于 replay/rebuild or transformed targets，不得描述为旧表直灌。
  - `workflow` 仍只承接审核投影，不替代业务单据主状态。
  - `project`、`scrap`、平台账号/权限/菜单、最终 cutover readiness 仍有待决/待签收部分；文档只能如实呈现当前状态。
  - 这次交付是 migration reference，不是全仓 architecture review；不要把 `req-20260321-1109-architecture-review-clarity` 的广义 review scope 混入本 task。

## Implementation Plan

- [ ] Step 1: parent confirms the dedicated architecture target path as `docs/architecture/30-java-to-nestjs-data-migration-reference.md` and treats `docs/architecture/README.md` as the only required navigation companion update.
- [ ] Step 2: re-read the requirement, architecture overview/baseline docs, migration master task, `prisma/schema.prisma`, staging SQL, and the relevant module docs to lock the target-table grouping and business semantics.
- [ ] Step 3: read the domain migration evidence in `scripts/migration/**`, prioritizing each slice's `legacy-reader.ts`, `migrate.ts`, `validate.ts`, and the latest `scripts/migration/reports/*-validate-report.json`, so the doc reflects current runtime truth rather than only historic planning text.
- [ ] Step 4: draft the new architecture document in Chinese using domain-led tables and short explanatory paragraphs; keep report counts only where they clarify migrated vs excluded vs deferred status, especially for `project`.
- [ ] Step 5: add explicit sections for replay/rebuild targets, no-landing-table legacy objects, staging/archive/excluded handling, and cutover semantics.
- [ ] Step 6: run a docs-only truth review against schema, migration scripts, and reports; then update this task doc review/final-status fields after the draft is reviewed.

## Coder Handoff

- Execution brief:
  - This is a parent-owned docs-only implementation.
  - Create `docs/architecture/30-java-to-nestjs-data-migration-reference.md` as the canonical migration reference.
  - Update `docs/architecture/README.md` only enough to list the new doc and reading order.
  - Keep `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-database-tables-and-schema.md` unchanged unless the parent finds a real contradiction that requires separate user confirmation.
  - Use the following section skeleton in the final architecture doc:
    - `1. 文档目标、适用对象、与现有 architecture 文档的关系`
    - `2. 阅读方法：如何理解 migrated / replayed / archived / excluded / deferred / no-target`
    - `3. 旧库表组总览：按主数据、单据家族、库存/审核/关系辅助、平台与横切分类`
    - `4. 新库表组总览：按 master-data / inventory-core / workflow / 单据家族 / relation / logs / scheduler 分类`
    - `5. 按业务域的旧表 -> 新表映射矩阵`
    - `6. 哪些对象是重放/重建，不是复制`
    - `7. 哪些旧表没有目标落点，为什么`
    - `8. staged / archived / excluded / archived-only 数据处理`
    - `9. cutover 口径：什么算已迁移，什么只算归档或后移`
    - `10. 当前待决项与文档边界`
- Required source docs or files:
  - `docs/requirements/archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md`
  - `docs/architecture/README.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `prisma/schema.prisma`
  - `scripts/migration/sql/000-create-migration-staging.sql`
  - `scripts/migration/bootstrap-staging.ts`
  - `scripts/migration/master-data/legacy-reader.ts`
  - `scripts/migration/master-data/migrate.ts`
  - `scripts/migration/master-data/validate.ts`
  - `scripts/migration/stock-in/legacy-reader.ts`
  - `scripts/migration/stock-in/migrate.ts`
  - `scripts/migration/stock-in/validate.ts`
  - `scripts/migration/customer/legacy-reader.ts`
  - `scripts/migration/customer/migrate.ts`
  - `scripts/migration/customer/validate.ts`
  - `scripts/migration/workshop-pick/legacy-reader.ts`
  - `scripts/migration/workshop-pick/migrate.ts`
  - `scripts/migration/workshop-pick/validate.ts`
  - `scripts/migration/customer-sales-return/legacy-reader.ts`
  - `scripts/migration/customer-sales-return/migrate.ts`
  - `scripts/migration/customer-sales-return/validate.ts`
  - `scripts/migration/workshop-return/legacy-reader.ts`
  - `scripts/migration/workshop-return/migrate.ts`
  - `scripts/migration/workshop-return/validate.ts`
  - `scripts/migration/customer-reservation/legacy-reader.ts`
  - `scripts/migration/customer-reservation/migrate.ts`
  - `scripts/migration/customer-reservation/validate.ts`
  - `scripts/migration/return-post-admission/planner.ts`
  - `scripts/migration/return-post-admission/writer.ts`
  - `scripts/migration/return-post-admission/validate.ts`
  - `scripts/migration/customer-sales-return-finalize/planner.ts`
  - `scripts/migration/customer-sales-return-finalize/validate.ts`
  - `scripts/migration/workshop-return-finalize/planner.ts`
  - `scripts/migration/workshop-return-finalize/validate.ts`
  - `scripts/migration/project/legacy-reader.ts`
  - `scripts/migration/project/migrate.ts`
  - `scripts/migration/project/validate.ts`
  - `scripts/migration/reports/preflight-report.json`
  - `scripts/migration/reports/master-data-validate-report.json`
  - `scripts/migration/reports/stock-in-validate-report.json`
  - `scripts/migration/reports/customer-validate-report.json`
  - `scripts/migration/reports/workshop-pick-validate-report.json`
  - `scripts/migration/reports/customer-sales-return-validate-report.json`
  - `scripts/migration/reports/workshop-return-validate-report.json`
  - `scripts/migration/reports/return-post-admission-validate-report.json`
  - `scripts/migration/reports/customer-reservation-validate-report.json`
  - `scripts/migration/reports/project-validate-report.json`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/workflow.md`
  - `docs/architecture/modules/inbound.md`
  - `docs/architecture/modules/customer.md`
  - `docs/architecture/modules/workshop-material.md`
  - `docs/architecture/modules/project.md`
  - `docs/architecture/modules/rbac.md`
  - `docs/architecture/modules/audit-log.md`
  - `docs/architecture/modules/scheduler.md`
- Owned paths:
  - `docs/architecture/30-java-to-nestjs-data-migration-reference.md`
  - `docs/architecture/README.md`
- Forbidden shared files:
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `prisma/schema.prisma`
  - `scripts/migration/**`
  - `docs/requirements/**`
  - unrelated task docs
- Constraints and non-goals:
  - 文档正文以中文撰写，保持高信息密度，但不用冗长叙事。
  - 优先按业务域和表组解释“作用 + 去向 + 原因”，只在必要时加代表性 counts。
  - 不写逐字段 dump；字段层差异只用于解释重要迁移判断，如 `material_id` 缺失导致 `project` 不能正式迁入。
  - 不把 logs/scheduler 的存在写成“平台表整体已迁”；应明确 `sys_job` / `sys_job_log` / `sys_logininfor` / `sys_oper_log` 有目标表，而 `sys_user` / `sys_role` / `sys_menu` / `sys_dept` / `sys_config` / `sys_dict_*` / `gen_*` / `qrtz_*` 当前无正式业务落点。
  - 不把 `excluded_documents`、`archived_field_payload`、`archived_intervals`、`pending_relations` 写成失败垃圾箱；应写成受控 staging/archival 机制。
  - 不把 validate report 的结果原封不动贴满文档；它们只用于支撑“当前状态”结论。
- Validation command for this scope:
  - docs-only validation by source-of-truth reread: confirm every named target table exists in `prisma/schema.prisma`, every staging/archive table exists in `scripts/migration/sql/000-create-migration-staging.sql`, and every current-state statement about migrated/excluded/deferred domains is backed by the latest relevant validate report or retained migration task doc

## Reviewer Handoff

- Review focus:
  - confirm the new architecture doc is the right canonical home for the migration reference and does not overload `00` or `20`
  - confirm each legacy-table-group / target-table-group statement matches the migration master task, schema, and the relevant migration slice scripts or reports
  - confirm replay/rebuild statements are accurate for `inventory_balance`, `inventory_log`, `inventory_source_usage`, `factory_number_reservation`, `workflow_audit_document`, and relation tables
  - confirm no unresolved item (`project`, `scrap`, platform tables, cutover gate) is overstated as completed
  - confirm the document stays concise and domain-organized instead of becoming an execution diary
- Requirement alignment check:
  - confirm the final doc satisfies `docs/requirements/archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md`
  - confirm it documents current status faithfully without taking new business decisions on unresolved migration scope
- Final validation gate:
  - docs-only semantic review against the listed requirement, master migration task, `prisma/schema.prisma`, staging SQL, slice scripts, and latest validate reports
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status`
  - if the final title/path changes, sync `docs/architecture/README.md` references and this task doc

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - the main deliverable is one new shared architecture source-of-truth doc whose title, section ordering, and terminology must stay internally consistent
  - the optional `docs/architecture/README.md` update depends on the final chosen document title and path
  - the key risk is semantic drift across `migrated / replayed / archived / excluded / deferred` wording, which is better handled by a single writer using one evidence set

## Review Log

- Validation results:
  - Resumed review from the existing task doc findings and re-read the current contents of `docs/architecture/30-java-to-nestjs-data-migration-reference.md` and `docs/requirements/archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md`.
  - Because the reviewed files are currently workspace-local rather than represented by a useful git diff, rereview was performed against the current file contents directly.
  - Cross-checked the updated wording against `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`, `prisma/schema.prisma`, `scripts/migration/sql/000-create-migration-staging.sql`, `scripts/migration/reports/workshop-return-validate-report.json`, `scripts/migration/reports/customer-sales-return-validate-report.json`, and `scripts/migration/reports/return-post-admission-validate-report.json`.
  - Confirmed the target tables and nullable source-field contracts still match `prisma/schema.prisma`, and the staging/archive terminology still matches the live `migration_staging` SQL.
  - This was a docs-only semantic rereview; no runtime, schema, or linter gate was required for sign-off.
- Findings:
  - No remaining `[blocking]` or `[important]` findings in this docs-only rereview. The earlier workshop-return exclusion wording is corrected to admitted rows plus `pending_relations`, the sales-return nullable `sourceDocument*` count now matches the latest shared report at `13`, and the requirement-facing progress wording stayed conservative until this clean rereview completed.
- Follow-up action:
  - No further reviewer-side repair is required for this scope; parent may sync the requirement-facing progress to the now-clean rereview outcome and close the loop.

## Final Status

- Outcome:
  - docs-only rereview completed with no remaining `[blocking]` or `[important]` findings; the migration reference is ready for handoff for this scope.
- Requirement alignment:
  - aligned to `docs/requirements/archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md`; the current architecture reference now reflects workshop-return admitted-plus-pending-relations status, the latest sales-return nullable-source count, and a conservative pre-signoff requirement progress wording.
- Residual risks or testing gaps:
  - no remaining docs-specific `[blocking]` or `[important]` risks were found in the reviewed scope.
  - this was a docs-only semantic rereview against repository source-of-truth files; no runtime validation gate applied.
- Directory disposition after completion: archived here as `retained-completed` together with the linked migration requirement
- Next action:
  - None. Future migration follow-up should open a new active requirement / task instead of resuming this archived brief
