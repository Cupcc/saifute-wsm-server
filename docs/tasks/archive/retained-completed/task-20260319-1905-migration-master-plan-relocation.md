# Migration Master Plan Relocation

> Supersession note: this task doc is the durable replacement home for the deleted `docs/30-data-migration-plan.md`. It now supersedes the old top-level plan as the runtime migration planning source of truth; the old file is deleted, the active guidance sweep is complete, and the only remaining old-path mentions are provenance-only.

## Metadata

- Scope: relocate the repository-level migration master plan from `docs/30-data-migration-plan.md` into `docs/tasks/**`, preserving the legacy evidence baseline, table-mapping conclusions, batch sequencing, blockers, and verification gates while recording where later migration task docs already supersede stale return-family execution wording
- Related requirement: `docs/requirements/req-20260319-1905-migration-plan-to-task.md`
- Status: `completed`
- Review status: `reviewed-no-findings`
- Planner: `planner`
- Coder: `parent-orchestrator`
- Reviewer: `code-reviewer`
- Last updated: `2026-03-20`
- Related files:
  - `docs/requirements/req-20260319-1905-migration-plan-to-task.md`
  - deleted former source: `docs/30-data-migration-plan.md`
  - `.cursor/agents/planner.md`
  - `.cursor/agents/coder.md`
  - `.cursor/agents/code-reviewer.md`
  - `.cursor/skills/saifute-subagent-orchestration/SKILL.md`
  - `docs/tasks/task-20260317-1416-migration-outbound-base.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`
  - `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`
  - `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
## Requirement Alignment

- Requirement doc: `docs/requirements/req-20260319-1905-migration-plan-to-task.md`
- User intent summary:
  - move `docs/30-data-migration-plan.md` under `docs/tasks/**` and stop treating it as a standalone top-level migration plan
  - preserve the old plan's useful content instead of losing analysis, sequencing, blockers, or verification rules
  - make it safe for the parent to update references and then delete the old file
- Acceptance criteria carried into this task:
  - a new task doc exists under `docs/tasks/**` as the durable replacement home for the old plan
  - the new doc explicitly states that it supersedes `docs/30-data-migration-plan.md` as the runtime migration planning source of truth
  - the migrated doc preserves evidence, batch sequencing, blockers, and verification or cutover gates from the old plan
  - the migrated doc records where later slice task docs already supersede stale parts of the old plan
  - the migrated doc gives clear follow-up ownership notes so the parent can update references and delete the old file safely
- Open questions requiring user confirmation:
  - None.

## Requirement Sync

- Req-facing phase progress: 已完成旧文件删除、迁移 task/checklist 引用收口，以及四个活跃 `.cursor` guidance 文件的主引用迁移；仓库内仅保留 supersession/provenance 用途的旧路径说明。
- Req-facing current state: 新 master task 已成为仓库级迁移规划的运行时 source of truth；`docs/30-data-migration-plan.md` 已删除，planner/coder/reviewer 与 orchestration skill 也已全部改为引用本 task。
- Req-facing blockers: None.
- Req-facing next step: 由 `parent-orchestrator` 同步 requirement doc 的简洁当前进展，然后将该 relocation 视为已完成。
- Requirement doc sync owner: `parent-orchestrator`

## Goal And Acceptance Criteria

- Goal: create one durable master migration task doc inside `docs/tasks/**` that preserves the useful content of `docs/30-data-migration-plan.md`, reconciles it with newer reviewed migration briefs, and gives the parent a safe handoff for reference migration and old-file deletion.
- Acceptance criteria:
  - this doc clearly states that it supersedes `docs/30-data-migration-plan.md` as the runtime migration planning source of truth after reference updates
  - the old plan's evidence sources, database baseline, mapping conclusions, frozen migration rules, batch sequencing, blockers, and validation or cutover gates are preserved here in durable form
  - later reviewed task docs for return-family formal admission and shared post-admission are called out as authoritative where the old plan's recoverable-only or queue-drain assumptions became stale
  - parent-owned follow-up work is clearly limited to reference updates and deletion of the old file; this planner slice does not rewrite other files
  - no edits occur outside `docs/tasks/**`

## Scope And Ownership

- Allowed code paths:
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
- Frozen or shared paths:
  - `docs/requirements/req-20260319-1905-migration-plan-to-task.md`
  - deleted former source: `docs/30-data-migration-plan.md`
  - other `docs/tasks/**` files
  - `.cursor/**`
  - `docs/fix-checklists/**`
  - all `src/**`, `scripts/**`, `prisma/**`, tests, and other docs
- Task doc owner: `planner`
- Contracts that must not change silently:
  - this doc is now the durable runtime migration planning source of truth in place of the deleted `docs/30-data-migration-plan.md`
  - narrower and newer slice task docs remain authoritative for their owned scopes; this master doc must not roll back or dilute those later decisions
  - the old plan's recoverable-only and family-local queue-drain assumptions for sales returns and workshop returns are historical context only, not the current execution contract
  - the final parent-owned reference sweep had to clear active guidance surfaces that pointed at the deleted path before this relocation could be treated as complete, and that sweep is now done

## Implementation Plan

- [x] Step 1: read the confirmed requirement, task template, legacy master plan, and the currently relevant migration task docs that already narrowed or superseded parts of the old plan.
- [x] Step 2: author this replacement task doc using the task template structure plus a migrated-plan appendix that preserves the old plan's durable content.
- [x] Step 3: parent completed the remaining repository reference sweep from `docs/30-data-migration-plan.md` to this master task doc or to narrower task docs where a more specific runtime source of truth already exists; current migration task docs, related fix-checklists, and the active guidance surfaces under `.cursor/**` now point at the correct replacement source.
- [x] Step 4: parent deleted `docs/30-data-migration-plan.md` after establishing this task doc as the durable replacement home, and final rereview confirmed the relocation is safe and internally consistent.

## Coder Handoff

- Execution brief: this slice is complete. The replacement master task doc is in place, the old file is deleted, migration task-doc plus checklist references are swept, and the four active `.cursor` guidance surfaces now point at this master task. No downstream coder follow-up remains for this relocation.
- Required source docs or files:
  - `docs/requirements/req-20260319-1905-migration-plan-to-task.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - `.cursor/agents/planner.md`
  - `.cursor/agents/coder.md`
  - `.cursor/agents/code-reviewer.md`
  - `.cursor/skills/saifute-subagent-orchestration/SKILL.md`
- Owned paths:
  - none by default for a downstream coder in this planner slice
  - no downstream writer ownership is needed now that the active guidance sweep is complete
- Forbidden shared files:
  - do not rewrite migration semantics, task acceptance criteria, or requirement understanding while only performing reference migration
  - do not edit `docs/requirements/**` from this planner-owned slice
  - do not recreate `docs/30-data-migration-plan.md` as a workaround; update the remaining references instead
- Constraints and non-goals:
  - preserve the narrower task-doc authority map
  - preserve historical evidence from the old plan instead of collapsing it to a shallow summary
  - do not reopen reviewed migration slices just because the repository-level master doc is moving
  - do not treat superseded historical task docs as active execution briefs
- Validation command for this scope:
  - docs-only validation: confirm this doc remains the durable replacement home for the old plan, run a repository reference search for `docs/30-data-migration-plan.md`, and ensure no active guidance surface still treats the deleted file as the current source of truth

## Reviewer Handoff

- Review focus:
  - confirm this doc is a faithful replacement home for the old master migration plan rather than a thin pointer
  - confirm the doc explicitly states the supersession of `docs/30-data-migration-plan.md`
  - confirm the authority map correctly keeps newer slice task docs as the active source of truth where the old plan went stale
  - confirm the remaining parent-owned follow-up is limited to any stale active guidance references and that the deleted old file is no longer required
- Requirement alignment check:
  - confirm the content matches `docs/requirements/req-20260319-1905-migration-plan-to-task.md`
  - confirm the doc preserves useful legacy plan content without widening scope beyond relocation
- Final validation gate:
  - docs-only review of this task doc and the deleted-file relocation using git history for the old plan when needed
  - repository search for remaining references to `docs/30-data-migration-plan.md`, with special attention to active guidance surfaces
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status` after the remaining active guidance sweep is complete

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - this master task doc is a shared planning source-of-truth file
  - the parent reference sweep touches cross-cutting docs and repository guidance surfaces
  - the remaining stale-reference cleanup should stay single-owner so the final relocation status does not drift across shared guidance surfaces

## Review Log

- Validation results:
  - Read `docs/requirements/req-20260319-1905-migration-plan-to-task.md` and this task doc.
  - Ran repository searches for `docs/30-data-migration-plan.md` and `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`.
  - Confirmed `docs/30-data-migration-plan.md` is absent from `docs/`.
  - Confirmed the active and historical migration task docs plus the related review checklists now point at this master task doc or to narrower active slice docs where appropriate.
  - Inspected the deleted old plan via `git show HEAD:"docs/30-data-migration-plan.md"` and compared it against this task doc; the migrated appendices preserve the old evidence baseline, table-mapping conclusions, frozen rules, batch strategy, blockers, and verification gates, with explicit return-family supersession notes.
  - Re-read `.cursor/agents/planner.md`, `.cursor/agents/coder.md`, `.cursor/agents/code-reviewer.md`, and `.cursor/skills/saifute-subagent-orchestration/SKILL.md`; they now direct migration-style work to `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`.
  - Re-ran the repository search for `docs/30-data-migration-plan.md`; remaining matches are limited to this master task doc, the linked requirement doc, and the historical review artifact, all for supersession or provenance context rather than active source-of-truth routing.
- Findings:
  - No remaining `[blocking]` or `[important]` findings. The prior stale-guidance issue is resolved, the deleted path is no longer used as an active runtime source of truth, and the remaining mentions are intentional historical context.
- Follow-up action:
  - no further repair is required in this task doc; parent-owned requirement-doc sync is the only remaining orchestration bookkeeping step

## Final Status

- Outcome:
  - this relocation is complete: the master task doc is the durable replacement home for the deleted top-level migration plan, the old file is deleted, the migration task-doc plus checklist reference sweep is complete, and the active guidance sweep is done
- Requirement alignment:
  - aligned to `docs/requirements/req-20260319-1905-migration-plan-to-task.md`; the relocated task doc preserves the old plan's useful migration analysis, batch sequencing, blockers, and validation gates while keeping newer slice task docs authoritative where they supersede stale return-family wording
- Residual risks or testing gaps:
  - no remaining relocation-specific `[blocking]` or `[important]` risks were found
  - this was a docs/prompt consistency rereview, so no runtime test gate was required; the only remaining follow-up outside this writable scope is syncing the linked requirement doc's user-facing progress
- Next action:
  - no further relocation repair is needed; parent may sync the requirement doc current progress and close the loop

## Appendix A. Supersession And Authority Map

- This task doc is the durable replacement home for the deleted old top-level migration plan.
- Use this file instead of `docs/30-data-migration-plan.md` for repository-level migration planning context.
- For narrower execution work, the latest slice task docs remain the active source of truth. If this master doc and a later slice doc differ, the later slice doc wins for that slice.
- Active slice docs that already supersede parts of the old plan:
  - `docs/tasks/task-20260317-1416-migration-outbound-base.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`
  - `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`
  - `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
- Historical task docs that should remain treated as superseded evidence only:
- The key planning correction carried forward here is that old recoverable-only or family-local queue-drain wording for sales returns and workshop returns is historical context, while the formal-admission plus shared post-admission task docs are the current runtime contract.

## Appendix B. Legacy Evidence Baseline Carried Forward

### B1. Original evidence sources

- 旧项目配置：`E:/Projects/saifute-wms-server/ruoyi-admin/src/main/resources/application-druid.yml`
- 旧项目建库 SQL：`E:/Projects/saifute-wms-server/ruoyi-admin/src/main/resources/saifute_202600201_1629001.sql`
- 旧项目代码与 Mapper：`E:/Projects/saifute-wms-server/business/...`
- 新项目目标 schema：`prisma/schema.prisma`
- 新项目设计文档：`docs/architecture/00-architecture-overview.md`
- 新项目优化表设计：`docs/architecture/20-wms-database-tables-and-schema.md`
- 旧库实时 MySQL：`saifute`
- 新库实时 MySQL：`saifute-wsm`
- 原计划分析时间：`2026-03-15`

### B2. 当前数据库基线

- 旧库 `saifute` 当前共有 `58` 张表。
- 新库 `saifute-wsm` 当前共有 `25` 张表。
- 新库当前 `25` 张表在原计划分析时均为空表，适合按首批全量导入设计，不是增量合并场景。
- 旧库同时包含业务表、RuoYi 平台表、Quartz 表、代码生成器表。
- 新库当前只落了主数据、库存核心、业务单据、工作流投影、日志和调度表，没有落 `sys_user`、`sys_role`、`sys_menu`、`sys_dept`、`sys_config`、`sys_dict_*` 等平台表。

新库当前已存在的核心表分组：

- 主数据：`material_category`、`material`、`customer`、`supplier`、`personnel`、`workshop`
- 库存核心：`inventory_balance`、`inventory_log`、`inventory_source_usage`、`factory_number_reservation`
- 工作流：`workflow_audit_document`
- 入库家族：`stock_in_order`、`stock_in_order_line`
- 客户收发家族：`customer_stock_order`、`customer_stock_order_line`
- 车间物料家族：`workshop_material_order`、`workshop_material_order_line`
- 项目：`project`、`project_material_line`
- 关系表：`document_relation`、`document_line_relation`
- 日志与调度：`sys_job`、`sys_job_log`、`sys_logininfor`、`sys_oper_log`

### B3. 表级映射结论

| 业务域 | 旧库来源表 | 实际行数 | 新库目标表 | 当前行数 | 迁移结论 |
| --- | --- | ---: | --- | ---: | --- |
| 物料分类 | `sys_dict_data`(`dict_type='saifute_material_category'`) | 8 | `material_category` | 0 | 需要从旧字典构造新分类表，不能直接从旧业务表复制 |
| 物料 | `saifute_material` | 458 | `material` | 0 | 可迁，但要做字段重命名、分类映射、编码去重 |
| 客户 | `saifute_customer` | 184 | `customer` | 0 | 可迁，但要做字段裁剪、编码去重 |
| 供应商 | `saifute_supplier` | 93 | `supplier` | 0 | 可迁，字段比旧库更收敛 |
| 人员 | `saifute_personnel` | 51 | `personnel` | 0 | 可迁，字段比旧库更收敛 |
| 车间 | `saifute_workshop` | 12 | `workshop` | 0 | 可迁，但旧库没有 `workshopCode`，需要生成 |
| 库存现值 | `saifute_inventory` | 226 | `inventory_balance` | 0 | 不建议直接拷贝，建议重建 |
| 库存流水 | `saifute_inventory_log` | 766 | `inventory_log` | 0 | 不建议直接拷贝，建议重建 |
| 来源追踪 | `saifute_inventory_used` | 226 | `inventory_source_usage` | 0 | 需要转换模型后迁移 |
| 编号区间 | `saifute_interval` | 161 | `factory_number_reservation` 等 | 0 | 旧表语义混合，需按 `order_type` 分流，不能整表直灌 |
| 库存预警 | `saifute_inventory_warning` | 31 | `vw_inventory_warning` | - | 旧库是物理表，新设计是视图，不做表对表迁移 |
| 审核投影 | `saifute_audit_document` | 2 | `workflow_audit_document` | 0 | 可迁，但首批只对最终有效且需要审核的历史单据落表 |
| 验收单 + 生产入库单 | `saifute_inbound_order` + `saifute_into_order` | 138 + 72 | `stock_in_order` | 0 | 两套旧表收敛为一套新表，`orderType` 需由来源表决定 |
| 入库明细 | `saifute_inbound_detail` + `saifute_into_detail` | 258 + 131 | `stock_in_order_line` | 0 | 两套旧表收敛为一套新表 |
| 出库单 + 销售退货单 | `saifute_outbound_order` + `saifute_sales_return_order` | 112 + 10 | `customer_stock_order` | 0 | 两套旧表收敛为一套新表，且必须补 `workshopId` |
| 客户收发明细 | `saifute_outbound_detail` + `saifute_sales_return_detail` | 141 + 14 | `customer_stock_order_line` | 0 | 可迁，但上下游关系不能直接从头表得到 |
| 领料单 + 退料单 + 报废单 | `saifute_pick_order` + `saifute_return_order` + `saifute_scrap_order` | 75 + 3 + 0 | `workshop_material_order` | 0 | 三套旧表收敛为一套新表 |
| 车间物料明细 | `saifute_pick_detail` + `saifute_return_detail` + `saifute_scrap_detail` | 197 + 4 + 0 | `workshop_material_order_line` | 0 | 三套旧表收敛为一套新表 |
| 项目 | `saifute_composite_product` | 5 | `project` | 0 | 可迁，但旧库没有项目编码，需稳定生成 `projectCode` |
| 项目物料明细 | `saifute_product_material` | 138 | `project_material_line` | 0 | 可迁，但字段会明显收敛 |
| 调度 | `sys_job` + `sys_job_log` | 3 + 0 | `sys_job` + `sys_job_log` | 0 + 0 | 后移，需单独补齐枚举值和时间字段映射规则 |
| 日志 | `sys_logininfor` + `sys_oper_log` | 202 + 827 | `sys_logininfor` + `sys_oper_log` | 0 + 0 | 后移，需单独补齐动作类型、时间字段和状态映射规则 |

### B4. 当前没有目标落点的旧库表

- 权限与组织：`sys_user`、`sys_role`、`sys_role_dept`、`sys_role_menu`、`sys_user_post`、`sys_user_role`
- 菜单与系统配置：`sys_menu`、`sys_dept`、`sys_config`、`sys_dict_type`、`sys_dict_data`、`sys_post`、`sys_notice`
- 代码生成器：`gen_table`、`gen_table_column`
- Quartz：`qrtz_*`

已确认的平台数据规模：

- `sys_user`：7
- `sys_role`：4
- `sys_menu`：211
- `sys_dept`：10
- `sys_config`：12
- `sys_dict_type`：21
- `sys_dict_data`：78

结论：

- 平台表迁移必须等新库先落对应持久化表结构。
- 这部分属于后续批次阻塞项，不应混入当前业务表迁移脚本。

### B5. 新库新增而旧库没有直接同名表的对象

- `material_category`
- `document_relation`
- `document_line_relation`
- `factory_number_reservation`
- `vw_inventory_warning`

这些对象必须从旧表组合、推导或重建，不能做 `INSERT ... SELECT * ...`。

## Appendix C. Durable Frozen Rules And Known Corrections

### C1. `orderType` 与来源表规则

- 原计划已确认旧库多个 `*_type` 字段真实数据为空，不能直接作为新库 `orderType` 来源：
  - `saifute_inbound_order.inbound_type` 全部 `NULL`
  - `saifute_into_order.into_type` 全部 `NULL`
  - `saifute_sales_return_order.source_id/source_type` 全部 `NULL`
  - `saifute_return_order.source_id/source_type` 全部 `NULL`
- 因此 `orderType` 必须按来源表固定映射：
  - `saifute_inbound_order` -> `ACCEPTANCE`
  - `saifute_into_order` -> `PRODUCTION_RECEIPT`
  - `saifute_outbound_order` -> `OUTBOUND`
  - `saifute_sales_return_order` -> `SALES_RETURN`
  - `saifute_pick_order` -> `PICK`
  - `saifute_return_order` -> `RETURN`
  - `saifute_scrap_order` -> `SCRAP`

### C2. 车间维度与默认车间规则

- 原计划已确认旧库多个家族缺少完整 `workshop_id`：
  - `saifute_inventory` 无 `workshop_id`
  - `saifute_outbound_order` 无 `workshop_id`
  - `saifute_sales_return_order` 无 `workshop_id`
  - `saifute_composite_product` 无 `workshop_id`
  - `saifute_inbound_order` 的 `138` 条里有 `23` 条为 `NULL`
  - `saifute_pick_order` 的 `75` 条里有 `10` 条为 `NULL`
- 冻结结论：
  - 历史缺失车间维度的记录统一归到默认车间 `WS-LEGACY-DEFAULT / 历史默认车间`
  - 不能把旧单维库存强行直拷到新多维库存模型

### C3. 唯一编码、生成编码与主数据停用语义

- 旧库存在重复编码：
  - `saifute_material.material_code` 有 `21` 组重复
  - `saifute_customer.customer_code` 有 `1` 组重复
- 必须先清洗再导入主数据。
- 旧 `saifute_workshop` 没有 `workshop_code`，迁移时需稳定生成。
- 旧 `saifute_composite_product` 没有项目编码，迁移时需稳定生成 `projectCode`。
- 主数据状态冻结规则：
  - `del_flag='0'` -> `status=ACTIVE`
  - `del_flag='2'` -> `status=DISABLED`
- `void_description` 以及联系人、类型等无直接承接位字段不得静默丢失；必须归档、扩表或取得明确签收。

### C4. 审核状态映射与工作流投影

- 旧 `saifute_audit_document.audit_status` 注释已确认：
  - `0` 未审核
  - `1` 审核通过
  - `2` 审核不通过
- 映射规则：
  - `0` -> `PENDING`
  - `1` -> `APPROVED`
  - `2` -> `REJECTED`
- 对需要审核的历史单据家族：
  - 若缺失审核行且单据最终有效，可补建 `workflow_audit_document`
  - 若历史单据最终作废，仅在业务表收口到 `auditStatusSnapshot=NOT_REQUIRED`
- `project` 第一阶段不接 `workflow_audit_document`

### C5. 关系恢复、nullable source 字段与 return-family supersession

- 原计划的持久有效结论：
  - `document_relation` 与 `document_line_relation` 不能只依赖旧头表 `source_id/source_type`
  - `saifute_inventory_used` 是关系和来源追踪的重要证据，但不能机械一对一回填
  - 无法证明的关系必须显式输出，不能静默造关系
- 需要显式携带到新 master doc 的更正：
  - 原顶层计划里关于销售退货单、退料单的 recoverable-only / queue-drain 语言已经被后续 task 文档 supersede
  - 当前有效规则来自：
    - `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
    - `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md`
    - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - 在这些新任务文档下：
    - 结构性有效的销售退货单、退料单允许先进入正式业务表
    - 缺失可证明上游关系时，行内 `sourceDocumentType/sourceDocumentId/sourceDocumentLineId` 允许为空
    - 关系增强转为共享 post-admission 阶段，而不是 admission gate
    - 无法证明关系本身不再是进入 `excluded_documents` 的充分条件

### C6. 遗留字段归档与孤儿库存

- 以下旧字段在新 schema 中无直接同名落点，应视为必须归档、扩表或签收的遗留字段：
  - `saifute_composite_product.classification`
  - `saifute_composite_product.salesman`
  - `saifute_composite_product.out_bound_date`
  - `saifute_product_material.acceptance_date`
  - `saifute_product_material.supplier_id`
  - `saifute_product_material.tax_included_price`
  - `saifute_product_material.instruction`
  - `saifute_change_record.old_value/new_value/change_reason`
- 已确认 `saifute_inventory` 存在 `1` 条 `material_id IS NULL` 的孤儿库存记录，不能直接进入新库，必须输出异常清单后再由业务决定补料、归档或舍弃。

### C7. 历史单据号冲突与编号区间分流

- 原计划已确认旧库存在重复单号：
  - `saifute_inbound_order` 有 `2` 组重复
  - `saifute_into_order` 有 `1` 组重复
  - `saifute_pick_order` 有 `3` 组重复
- 冻结重编号规则：
  - 同一目标家族内按 `CASE WHEN del_flag='0' THEN 0 ELSE 1 END, legacy_id` 排序
  - 第 `1` 条保留原单号
  - 其余记录改写为 `<原单号>-LEGACY-<legacy_id>`
- `saifute_interval` 分布结论：
  - `order_type=2`：`74`
  - `order_type=4`：`82`
  - `order_type=7`：`5`
- 冻结分流规则：
  - `order_type=4` 进入 `factory_number_reservation`
  - 仅“单明细单区间”的 `order_type=4` 记录回填 `customer_stock_order_line.startNumber/endNumber`
  - `order_type IN (2, 7)` 一律进入 `migration_staging.archived_intervals`
- 后续已执行 slice 的当前证据：
  - `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md` 的复核结果显示当前基线为 `80` 条 live reservation，`81` 条 archived interval，其中 `74` 条为 type `2`、`5` 条为 type `7`、`2` 条为归档的 type `4`

### C8. 目标常量冻结

- 迁移脚本统一使用当前 NestJS 聚合级字符串：
  - `StockInOrder`
  - `CustomerStockOrder`
  - `WorkshopMaterialOrder`
  - `Project`
- `inventory_log.businessModule` 统一使用：
  - `inbound`
  - `customer`
  - `workshop-material`
  - `project`
- family 常量统一使用：
  - `STOCK_IN`
  - `CUSTOMER_STOCK`
  - `WORKSHOP_MATERIAL`
  - `PROJECT`
- `inventory_log.operationType` 统一使用：
  - `ACCEPTANCE_IN`
  - `PRODUCTION_RECEIPT_IN`
  - `OUTBOUND_OUT`
  - `SALES_RETURN_IN`
  - `PICK_OUT`
  - `RETURN_IN`
  - `SCRAP_OUT`
  - `PROJECT_CONSUMPTION_OUT`
  - 作废逆向流水：`REVERSAL_IN` / `REVERSAL_OUT`
- 关系类型统一使用：
  - `SALES_RETURN_FROM_OUTBOUND`
  - `WORKSHOP_RETURN_FROM_PICK`
  - `REVERSAL_REFERENCE`
  - `TRACEABILITY_REFERENCE`

## Appendix D. Batch Strategy And Current Execution Map

### D1. 总体迁移策略

原计划把迁移策略分为三类，这一层级仍然有效：

1. 字段归一化迁移型：
   - 主数据
2. 结构重建型：
   - `inventory_balance`
   - `inventory_log`
   - `inventory_source_usage`
   - `factory_number_reservation`
   - `workflow_audit_document`
   - `document_relation`
   - `document_line_relation`
3. 暂缓型：
   - 平台表、日志、调度、代码生成器、Quartz 等

### D2. `migration_staging` 与映射表要求

原计划要求迁移期间引入独立暂存 schema，例如 `migration_staging`，至少包含：

- `map_material`
- `map_customer`
- `map_supplier`
- `map_personnel`
- `map_workshop`
- `map_stock_in_order`
- `map_stock_in_order_line`
- `map_customer_stock_order`
- `map_customer_stock_order_line`
- `map_workshop_material_order`
- `map_workshop_material_order_line`
- `map_project`
- `map_project_material_line`

并保留以下承接结构：

- `pending_relations`
- `archived_relations`
- `archived_field_payload`
- `archived_intervals`
- `excluded_documents`

### D3. 首批正式纳入与明确后移范围

原计划保留为正式纳入范围的对象：

- `material_category`
- `material`、`customer`、`supplier`、`personnel`、`workshop`
- `stock_in_order` / `stock_in_order_line`
- `customer_stock_order` / `customer_stock_order_line`
- `workshop_material_order` / `workshop_material_order_line`
- `project` / `project_material_line`
- 可恢复的 `document_relation` / `document_line_relation`
- `order_type=4` 的 `factory_number_reservation`
- 基于正式业务表重放得到的 `inventory_balance` / `inventory_log` / `inventory_source_usage`
- 仅对最终有效且需要审核的历史单据补 `workflow_audit_document`

原计划明确排除或后移：

- `sys_user`、`sys_role`、`sys_menu`、`sys_dept`、`sys_config`、`sys_dict_*`
- `sys_job`、`sys_job_log`、`sys_logininfor`、`sys_oper_log`
- `gen_*`、`qrtz_*`
- 旧 `saifute_inventory`、`saifute_inventory_log` 的直接复制
- `saifute_interval.order_type IN (2, 7)` 的首批正式落库
- 真正结构性无效、无法形成正式业务事实的销售退货单、退料单
- 无直接落点的主数据和项目遗留字段

### D4. 原计划推荐顺序与当前有效执行地图

原计划推荐顺序仍可保留为 master sequencing：

1. 冻结默认车间、冲突单号、金额口径、排除清单和 staging 结构
2. 清洗主数据编码并导入主数据
3. 导入正式业务表允许纳入的四类单据家族
4. 恢复可确定的关系并补 `order_type=4` 区间
5. 基于正式业务表重放库存
6. 仅为最终有效且需要审核的历史单据补 `workflow_audit_document`
7. 完成对账、签收和 cutover

当前仓库中与该顺序相衔接的已知 task-doc 状态：

- `docs/tasks/task-20260317-1416-migration-outbound-base.md`
  - 作为 `batch2c-outbound-base` 的主任务文档存在
  - 当前 rereview 无剩余重要问题，但文档记录 DB-backed gate 仍受 `LEGACY_DATABASE_URL` 环境缺失影响
- `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`
  - 当前为 `reviewed-no-findings`
  - 已记录 `80` 条 live reservation 与 `81` 条 archived interval 的当前基线
- `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`
  - 当前为 `reviewed-no-findings`
  - 已记录 `61` 单 / `145` 行 admitted 与 `14` 单排除、`10` 条默认车间 fallback 的当前基线
- `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - 当前为 `reviewed-no-findings`
  - 已记录 `9` 个 admitted sales-return headers、`13` 个 admitted lines、`1` 个 structural exclusion、`12` 个 nullable-source lines
- `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - 当前为 `reviewed-no-findings`
  - 已记录 `3` 个 admitted headers、`4` 个 admitted lines、`0` structural exclusion、`4` 个 nullable-source lines
- `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - 当前是 return-family 下游共享阶段的主 source of truth
  - 覆盖关系投影、库存重放、`inventory_source_usage`、`workflow_audit_document` 以及 readiness policy

### D5. 原计划中的执行进展清单迁入

以下进展点从旧总计划迁入，并与当前 task-doc 地图对齐理解：

- [x] 建 `migration_staging` 承接结构，并已落地当前已执行批次所需映射表与承接结构
- [x] 固定默认车间：`WS-LEGACY-DEFAULT / 历史默认车间`
- [x] 输出主数据编码清洗结果并冻结冲突处理口径
- [x] 输出并冻结历史冲突单号重编号规则
- [x] 先导入 `material_category` 与 5 类主数据，再推进事务单据迁移
- [x] 只把 `order_type=4` 区间写入 `factory_number_reservation`
- [x] 只在“单明细单区间”时回填 `customer_stock_order_line.startNumber/endNumber`
- [x] 销售退货单、退料单 formal admission 已由后续 task 文档拆出并重新定义为“formal rows first, relations later”
- [ ] 只恢复可确定的 `document_relation` / `document_line_relation`
- [ ] 基于正式业务表重放库存，不直接拷贝 `saifute_inventory` / `saifute_inventory_log`
- [ ] `inventory_source_usage` 写入前按 `(consumerDocumentType, consumerLineId, sourceLogId)` 聚合
- [ ] 只给最终有效且需要审核的历史单据补 `workflow_audit_document`
- [ ] admitted return-family rows 中的 nullable `sourceDocument*` 缺口已被单独统计，并纳入后续共享关系增强 / 来源追踪清单
- [ ] `excluded_documents` 若非空，仅包含真正结构性无效数据，且已取得业务签收
- [ ] 完成库存、关系、唯一键、快照字段和 cutover 门槛核验

## Appendix E. Blockers, Verification Gates, And Parent-Owned Reference Migration

### E1. 当前仍需显式保留的阻塞项与 cutover 前置门槛

从旧总计划迁入后仍然有效的前置门槛：

1. 若 `migration_staging.excluded_documents` 非空，必须取得业务签收后才能 cutover。
2. 主数据唯一键冲突必须清零。
3. 正式业务表唯一单号冲突必须清零。
4. 库存对账必须按“首批实际纳入重放范围”的口径通过，而不是按旧库存表直接复制口径通过。
5. `order_type IN (2, 7)` 区间与遗留字段必须进入 staging 归档结构。
6. 审核投影、关系表、库存表必须与当前运行时常量一致。
7. admitted 销售退货单、退料单中的 nullable `sourceDocument*` 缺口必须被单独统计并纳入共享关系增强与来源追踪核验。

### E2. 对账与验证门槛

从旧总计划迁入的批次级核验要求：

- 计数核验：
  - 按迁移规则归一化后的可迁记录数与新行数一致
  - 被判定为重复编码、空关系、孤儿库存、人工复核项的记录必须单独出报表
  - 目标库所有唯一编码无重复
- 业务核验：
  - `stock_in_order.documentNo` 唯一
  - `customer_stock_order.documentNo` 唯一
  - `workshop_material_order.documentNo` 唯一
  - `project.projectCode` 唯一
  - 关键快照字段不为空
- 库存核验：
  - 对比“首批实际纳入库存重放范围”的期望库存与新 `inventory_balance`
  - 旧 `saifute_inventory.current_qty` 仅作为参考基线，不是直接复制验收口径
  - `material_id IS NULL` 的孤儿库存记录必须单独核验
  - 默认车间补录记录要单独输出差异清单
- 关系核验：
  - `factory_number_reservation` 只与可迁子集对齐，不与总量 `161` 机械对齐
  - `saifute_interval.order_type IN (2, 7)` 必须全部进入 `archived_intervals`
  - 多区间出库明细必须逐段落到 `factory_number_reservation`
  - admitted 销售退货、退料关系中无法自动还原的记录必须全部进入后续关系增强或人工清单，不允许漏报
  - `excluded_documents` 若非空必须附带业务签收记录

### E3. 剩余引用收口与已完成删除的所有权说明

父代理在本 planner slice 之后的剩余 follow-up 已全部完成；迁移 task docs、历史 task docs 中需要保留历史上下文的引用、相关 review checklist，以及四个活跃 guidance surfaces 的引用都已完成收口，`docs/30-data-migration-plan.md` 也已删除。

已完成引用收口的范围：

- 当前活跃迁移 task docs：
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `docs/tasks/task-20260317-1416-migration-outbound-base.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`
  - `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`
- 已 superseded 但仍需要保留历史上下文的 task docs：
- 已完成迁移的活跃 guidance surfaces：
  - `.cursor/agents/planner.md`
  - `.cursor/agents/coder.md`
  - `.cursor/agents/code-reviewer.md`
  - `.cursor/skills/saifute-subagent-orchestration/SKILL.md`

用于确认旧文件删除正确性的当前证据：

- 已完成针对 `docs/30-data-migration-plan.md` 的仓库引用搜索，并确认剩余命中仅为本 master task、关联 requirement 和历史 review artifact 中的 supersession/provenance 说明
- 需要保留历史上下文的地方已改为引用本 master task doc 或更窄的当前 slice task doc
- `docs/30-data-migration-plan.md` 已从 `docs/` 中删除
- 当前不存在需要继续修复的活跃 dead-path guidance 引用
