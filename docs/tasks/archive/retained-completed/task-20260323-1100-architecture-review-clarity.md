# Architecture Review Clarity For Business Domains And Shared Core

## Metadata

- Scope: review-only architecture assessment for `master-data`, `inventory-core`, `workflow`, `customer`, `workshop-material`, `project`, `reporting`, and the shared-core surfaces they depend on; evaluate against the target migration architecture, keep `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-business-flow-and-optimized-schema.md` frozen, and capture clarification notes plus a docs-vs-code gap list in this task doc
- Related requirement: `docs/requirements/req-20260321-1109-architecture-review-clarity.md`
- Status: `completed`
- Review status: `reviewed-with-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `None (review-only task; parent may hand directly to reviewer)`
- Reviewer: `code-reviewer`
- Last updated: `2026-03-23`
- Related checklist:
- Related files:
  - `docs/requirements/PROJECT_REQUIREMENTS.md`
  - `docs/requirements/req-20260321-1109-architecture-review-clarity.md`
  - `docs/architecture/README.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/workflow.md`
  - `docs/architecture/modules/customer.md`
  - `docs/architecture/modules/workshop-material.md`
  - `docs/architecture/modules/project.md`
  - `docs/architecture/modules/reporting.md`
  - `src/app.module.ts`
  - `src/swagger-metadata.ts`
  - `src/shared/**`
  - `src/modules/master-data/**`
  - `src/modules/inventory-core/**`
  - `src/modules/workflow/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/project/**`
  - `src/modules/reporting/**`

## Requirement Alignment

- Requirement doc: `docs/requirements/req-20260321-1109-architecture-review-clarity.md`
- Requirement status: the linked requirement file still shows `needs-confirmation`, but the parent supplied the user-confirmed answers `Q1=B`, `Q2=B`, `Q3=C`, `Q4=B`, `Q5=all-selected`; that is sufficient for planning this review-only task, and the parent can sync the concise requirement progress separately after review.
- User intent summary:
  - review the scoped business domains and shared core against the target migration architecture / ideal design rather than only the current implementation snapshot
  - deliver clarification notes plus a concrete gap list between current docs and current code structure
  - keep `docs/requirements/**` concise and avoid modifying the frozen baseline bodies in `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
- Acceptance criteria carried into this task:
  - review scope is limited to the confirmed modules `master-data`, `inventory-core`, `workflow`, `customer`, `workshop-material`, `project`, and `reporting`, plus the shared-core boundaries they rely on
  - review must explicitly cover module responsibilities, module dependencies and cross-module access rules, shared-vs-business boundaries, current-vs-target relation, and doc organization / reading path clarity
  - review baseline is the target migration architecture documented in `docs/architecture/00-architecture-overview.md`, `docs/architecture/20-wms-business-flow-and-optimized-schema.md`, and the scoped module docs; current code is compared against that target rather than used to redefine it
  - detailed findings, clarification notes, and follow-up actions must be written in this task doc instead of bloating `docs/requirements/**`
  - this task does not edit application code and does not rewrite the frozen baseline bodies in `00` or `20`
- Open questions requiring user confirmation:
  - None for planning.
  - If the later review finds a contradiction that can only be resolved by editing the frozen baseline bodies or by widening into platform modules outside the confirmed scope, the parent must confirm that follow-up explicitly before any write step.

## Requirement Sync

- Req-facing phase progress: 已完成业务域与 shared core 架构 review 的 task brief，下一步进入 reviewer 执行。
- Req-facing current state: 已锁定 review 基线、模块范围、检查维度、首批 inspect 路径，以及 findings 记录位置；需求文档后续仅需由 parent 同步简洁进展。
- Req-facing blockers: 关联 requirement 文件正文尚未回写最新确认答案，但 parent 已提供确认范围，不阻塞本 task 进入 review。
- Req-facing next step: parent 将此 task 交给 `code-reviewer`，先做 docs-vs-code 架构差距审查，再把 detailed findings 写回本 task。
- Requirement doc sync owner: `parent-orchestrator`

## Goal And Acceptance Criteria

- Goal: prepare one execution-ready review brief that lets the parent run a scoped architecture review for the confirmed business domains and shared core, with findings captured in a durable task doc and without widening into repo-wide implementation changes.
- Acceptance criteria:
  - the reviewer can execute from this task doc without reopening scope questions
  - the completed review produces a prioritized gap list between architecture docs and current code structure for the scoped modules
  - the completed review produces clarification notes for responsibilities, dependency rules, current-vs-target relation, and reading-path ambiguity, all recorded in this task doc
  - the completed review clearly separates docs-only clarity gaps from real code-structure or module-boundary gaps
  - the completed review does not mutate application code and does not rewrite the frozen baseline bodies of `docs/architecture/00-architecture-overview.md` or `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - if no important gaps are found, the reviewer states that explicitly and records residual risks or testing gaps instead of padding the requirement doc

## Review Method And Findings Home

- Review method:
  - re-read the source-of-truth docs in this order: `docs/requirements/PROJECT_REQUIREMENTS.md` -> `docs/requirements/req-20260321-1109-architecture-review-clarity.md` -> `docs/architecture/00-architecture-overview.md` -> `docs/architecture/20-wms-business-flow-and-optimized-schema.md` -> the scoped module docs -> shared wiring and scoped code modules
  - inspect only the scoped code surfaces needed to judge architecture fit, naming, layering, and cross-module coupling; do not turn this into a full repo audit
  - compare current code and docs through five lenses: `职责`, `依赖/跨模块访问`, `shared-vs-business 边界`, `当前-vs-目标`, `文档阅读路径`
  - when code currently differs because migration is still in progress, record that as a `current-vs-target gap` rather than silently lowering the target baseline
- Findings home:
  - detailed findings must be written in this task doc under `## Review Log`
  - if the findings grow beyond a short list, add a compact matrix or subsection inside this task doc rather than expanding `docs/requirements/**`
  - requirement doc updates stay limited to concise progress and status lines handled by the parent

## Scope And Ownership

- Allowed code paths:
  - planner-owned in this planning slice: `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md` and `docs/tasks/TASK_CENTER.md`
  - reviewer-owned review output in the next phase: `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`
  - review targets, read-only in this task: all `Related files` listed above
- Frozen or shared paths:
  - `docs/requirements/**`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `src/app.module.ts`
  - `src/swagger-metadata.ts`
  - `src/shared/**`
  - all `src/modules/**` remain read-only for this review pass
- Task doc owner: `planner` during planning; `code-reviewer` may update the review-phase fields in this same doc
- Contracts that must not change silently:
  - `inventory-core` is the only stock write entry point
  - `workflow` owns audit review-state semantics and audit projection behavior
  - `reporting` is read-only and must not become a hidden transaction owner
  - business modules must not directly read or mutate another module's internal tables; cross-module access should go through public services or query surfaces
  - `customer` is the canonical target module name for the former outbound family, while compatibility wording and route reality must be compared carefully against current code
  - the frozen baseline docs `00` and `20` stay read-only in this task; contradictions are findings, not silent rewrite permission

## Architecture And Repository Considerations

- Apply the NestJS architecture review lens from `C:/Users/Administrator/.agents/skills/nestjs-best-practices/SKILL.md`, especially:
  - avoid circular module dependencies
  - keep feature-module ownership clear and avoid duplicate providers or service-locator style cross-wiring
  - prefer focused application services over cross-domain "god services"
  - keep controllers transport-thin and keep orchestration plus transaction boundaries in application services
  - keep repository and raw-SQL responsibilities in infrastructure, not in controllers or DTOs
  - prefer constructor injection and explicit module exports/imports for cross-module collaboration
  - watch for weak DTO validation, missing guards, hidden authorization coupling, and N+1 style query drift in read models
- Repository-specific review lens:
  - `inventory-core` write exclusivity and `workflow` audit ownership are frozen repository rules and take precedence over convenience coupling in current code
  - `reporting` may aggregate across modules, but should stay a read model rather than a transactional coordinator
  - the review should distinguish "docs are unclear" from "code already violates the target boundary" because the follow-up owner may differ
  - platform modules are out of scope except where they materially affect the scoped modules' boundary story or reading-path clarity

## Implementation Plan

- [ ] Step 1: establish the review baseline from `docs/requirements/PROJECT_REQUIREMENTS.md`, the linked requirement, `docs/architecture/00-architecture-overview.md`, `docs/architecture/20-wms-business-flow-and-optimized-schema.md`, and the scoped module docs.
  - extract target responsibilities, dependency expectations, and reading-order assumptions for each scoped module
  - note explicitly that the review baseline is the target migration architecture or ideal design, not merely the current code state
- [ ] Step 2: inspect the shared-core wiring and scoped code surfaces.
  - start with `src/app.module.ts`, `src/swagger-metadata.ts`, and `src/shared/**` to understand current module registration, shared boundary exposure, and route/doc surface
  - then inspect `src/modules/master-data/**`, `src/modules/inventory-core/**`, `src/modules/workflow/**`, `src/modules/customer/**`, `src/modules/workshop-material/**`, `src/modules/project/**`, and `src/modules/reporting/**`
- [ ] Step 3: compare docs vs code across the five confirmed lenses.
  - `模块职责是否清晰且与当前代码相符`
  - `模块依赖与跨模块访问是否符合冻结约束`
  - `shared 层与业务层边界是否稳定`
  - `当前实现与目标架构的关系是否在文档中说清`
  - `docs/architecture/**` 的阅读路径是否能帮助后续实现与 review`
- [ ] Step 4: record the findings in this task doc.
  - prioritize by severity, using `blocking`, `important`, `minor`, or `clarification-only`
  - for each finding, cite the affected doc or code paths and explain whether it is a docs gap, a code-structure gap, or both
  - keep the requirement doc untouched except for later parent-owned progress sync
- [ ] Step 5: close the review loop in this task doc.
  - add concise next-step recommendations for the parent: docs-only follow-up, code follow-up, or no action
  - update `Review status`, `Review Log`, and `Final Status`

## Coder Handoff

- Execution brief:
  - No coder phase by default. Parent should hand this task directly to `code-reviewer` for a review-only architecture assessment.
  - If the review later justifies doc clarification edits or code-boundary fixes, open or assign a follow-up docs or code execution step explicitly rather than widening this review pass implicitly.
- Required source docs or files:
  - `docs/requirements/PROJECT_REQUIREMENTS.md`
  - `docs/requirements/req-20260321-1109-architecture-review-clarity.md`
  - `docs/architecture/README.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - `docs/architecture/modules/master-data.md`
  - `docs/architecture/modules/inventory-core.md`
  - `docs/architecture/modules/workflow.md`
  - `docs/architecture/modules/customer.md`
  - `docs/architecture/modules/workshop-material.md`
  - `docs/architecture/modules/project.md`
  - `docs/architecture/modules/reporting.md`
  - `src/app.module.ts`
  - `src/swagger-metadata.ts`
  - `src/shared/**`
  - `src/modules/master-data/**`
  - `src/modules/inventory-core/**`
  - `src/modules/workflow/**`
  - `src/modules/customer/**`
  - `src/modules/workshop-material/**`
  - `src/modules/project/**`
  - `src/modules/reporting/**`
- Owned paths:
  - `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`
- Forbidden shared files:
  - `docs/requirements/**`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-business-flow-and-optimized-schema.md`
  - all application code under `src/**`
- Constraints and non-goals:
  - do not review unrelated platform modules in depth (`auth`, `session`, `rbac`, `audit-log`, `scheduler`, `file-storage`) unless a scoped module depends on them in a way that creates a concrete boundary finding
  - do not turn current code drift into new architecture truth without evidence from the frozen baseline docs or `docs/requirements/PROJECT_REQUIREMENTS.md`
  - do not rewrite module docs during this review-only pass; capture clarification text or proposed wording in this task doc instead
  - do not evaluate implementation correctness feature-by-feature; focus on architecture responsibilities, layering, module boundaries, and document clarity
- Validation command for this scope:
  - `git diff --name-only -- "docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md" "docs/tasks/TASK_CENTER.md"`
  - reviewer semantic gate: re-read the required docs and inspect the scoped code paths listed above; no `pnpm lint`, `pnpm test`, or runtime gate is required unless the task later widens into actual docs or code edits outside `docs/tasks/**`

## Reviewer Handoff

- Review focus:
  - verify target responsibilities for each scoped module against `docs/requirements/PROJECT_REQUIREMENTS.md`, `docs/architecture/00-architecture-overview.md`, `docs/architecture/20-wms-business-flow-and-optimized-schema.md`, and the module docs
  - verify code structure and naming align or diverge, especially `customer` vs historical outbound naming, `project` as a transaction domain, `reporting` as a read model, `inventory-core` as the sole stock writer, and `workflow` as an audit projection only
  - verify cross-module access and shared-boundary expectations via `src/shared/**`, repositories, services, controller surfaces, and module wiring
  - verify the docs clearly explain current-vs-target relation and recommended reading path; call out ambiguity or contradictions
  - verify the findings stay scoped to business domains plus shared core rather than becoming a full platform audit
- Requirement alignment check:
  - confirm the review output matches the user-confirmed answers `Q1=B`, `Q2=B`, `Q3=C`, `Q4=B`, and `Q5=all-selected`
  - confirm the baseline-body freeze of `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-business-flow-and-optimized-schema.md` is respected
- Final validation gate:
  - this task doc contains the complete findings set, next-step recommendations, and updated final status
  - any suggested doc clarification is recorded here rather than silently pushed into `docs/requirements/**`
- Required doc updates:
  - update `## Metadata` -> `Review status`
  - update `## Review Log`
  - update `## Final Status`
  - if the findings need structured grouping, add a compact subsection inside this task doc rather than a new requirement artifact

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - one shared review baseline spans frozen docs, shared-core boundaries, and seven business modules; splitting writers risks inconsistent severity, duplicated gaps, or contradictory current-vs-target wording
  - the deliverable is one authoritative findings set in a single task doc
  - `src/app.module.ts`, `src/swagger-metadata.ts`, `src/shared/**`, and the frozen baseline docs are cross-cutting surfaces that make single-writer synthesis safer

## Review Log

- Validation results:
  - Re-read the required review baseline from `docs/requirements/PROJECT_REQUIREMENTS.md`, `docs/requirements/req-20260321-1109-architecture-review-clarity.md`, `docs/architecture/README.md`, `docs/architecture/00-architecture-overview.md`, `docs/architecture/20-wms-business-flow-and-optimized-schema.md`, and the scoped module docs under `docs/architecture/modules/`.
  - Inspected the current shared-core and scoped code surfaces directly: `src/app.module.ts`, `src/swagger-metadata.ts`, all files under `src/shared/**`, and the scoped modules under `src/modules/master-data/**`, `src/modules/inventory-core/**`, `src/modules/workflow/**`, `src/modules/customer/**`, `src/modules/workshop-material/**`, `src/modules/project/**`, and `src/modules/reporting/**`.
  - Re-read the current service specs for the scoped modules to judge whether the changed risk surface already has coverage: `src/modules/inventory-core/application/inventory.service.spec.ts`, `src/modules/workflow/application/workflow.service.spec.ts`, `src/modules/customer/application/customer.service.spec.ts`, `src/modules/workshop-material/application/workshop-material.service.spec.ts`, `src/modules/project/application/project.service.spec.ts`, and `src/modules/reporting/application/reporting.service.spec.ts`.
  - Ran the task's narrow git validation command `git diff --name-only -- "docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md" "docs/tasks/TASK_CENTER.md"`; it reported only `docs/tasks/TASK_CENTER.md` because that file already has unrelated tracked changes and this review task doc is currently untracked in git, so the persisted review content was confirmed by direct reread of this file instead.
  - This was a review-only architecture assessment against the current repository contents rather than a feature diff; no runtime gate such as `pnpm lint` or `pnpm test` applied to sign-off because the writable scope was limited to this task doc.
  - Confirmed that the major frozen boundaries are still intended in code structure: `inventory-core` remains the only stock-write entry point used by the scoped business modules, `workflow` remains the audit owner, and `reporting` stays read-only.
- Findings:
  - `[blocking][code gap]` `src/modules/customer/application/customer.service.ts`, `src/modules/customer/application/customer.service.spec.ts`: `createSalesReturn()` checks each new return line only against the original outbound line quantity, but it never subtracts quantities already returned by other active sales-return documents. A user can therefore split returns across multiple documents and cumulatively return more than the original outbound quantity, which over-increases stock and violates the documented "可退数量" / source-relation semantics. Fix direction: compute active returned quantity per source outbound line from the relation layer before insert, reject when `existingReturned + newReturn > sourceOutboundQty`, and add focused tests for split returns plus voided-return recovery.
  - `[blocking][code gap]` `src/modules/workshop-material/application/workshop-material.service.ts`, `src/modules/workshop-material/application/workshop-material.service.spec.ts`: `validateAndRecordReturnRelation()` only checks that the upstream pick order and line exist; it does not cap cumulative return quantity against the source pick line, and it fully releases every remaining `inventory_source_usage` allocation for that pick line even when the current return is partial. This breaks `inventory-core` source-tracking invariants and can make later return/void behavior inconsistent. Fix direction: validate remaining returnable quantity before relation creation, then release source usages incrementally by the actual returned quantity with deterministic ordering, backed by partial-return and repeated-return tests.
  - `[important][docs+code gap]` `docs/requirements/PROJECT_REQUIREMENTS.md`, `docs/architecture/modules/project.md`, `docs/architecture/20-wms-business-flow-and-optimized-schema.md`, `src/modules/project/**`: the target project-domain requirement still includes `项目采购入库`、`研发领料`、`项目退料`、`项目报废` and project-oriented inventory/cost views, but the current architecture docs and code have effectively collapsed `project` into a single consumption-style aggregate (`project` + `project_material_line` plus `PROJECT_CONSUMPTION_OUT`). Because the current-vs-target gap is not made explicit, the current partial implementation reads like settled target architecture. Fix direction: in a follow-up docs clarification pass, explicitly distinguish current implementation from target project-family design; in a later code pass, model the missing project transaction families before treating the project boundary as closed.
  - `[important][docs+code gap]` `docs/requirements/PROJECT_REQUIREMENTS.md`, `docs/architecture/00-architecture-overview.md`, `docs/architecture/modules/reporting.md`, `src/modules/reporting/**`: the reporting target includes monthly company/workshop/sales/project summaries and project-oriented analysis, but the current docs and code only cover dashboard metrics, inventory summary, category summary, and trend/export paths over inbound/outbound/workshop-material. `project` is missing from both the dependency story and the repository query set, so the docs currently understate the remaining reporting scope. Fix direction: add explicit current-vs-target wording for `reporting` and open a follow-up slice for monthly/project reporting instead of letting the existing module docs imply target completeness.
  - `[minor][docs+code gap]` `docs/architecture/modules/master-data.md`, `src/modules/master-data/controllers/master-data.controller.ts`, `src/modules/master-data/application/master-data.service.ts`: the module docs describe `master-data` as the owner of material/customer/supplier/personnel/workshop master records, but the current code only exposes material mutation paths while the other entities are list/read helpers. This does not currently break module boundaries, but it blurs what is already implemented versus what remains target scope. Fix direction: either add one concise "current implementation" note in the doc or schedule the remaining master-data write paths explicitly.
  - `[clarification-only][docs gap]` `docs/architecture/README.md`: the recommended reading order starts with `docs/architecture/20-wms-business-flow-and-optimized-schema.md` before `docs/architecture/00-architecture-overview.md`, even though the scoped review needed the module map and frozen constraints from `00` and the target baseline from `docs/requirements/PROJECT_REQUIREMENTS.md` first. The current reading path makes current-vs-target reasoning harder than necessary. Fix direction: in a follow-up docs pass, move readers through requirements/overview before the frozen flow/schema baseline, or explain why the current order is intentional.
- Follow-up action:
  - The two follow-up tracks have now been executed and closed in `docs/tasks/archive/retained-completed/task-20260323-1310-customer-workshop-return-invariants.md` and `docs/tasks/archive/retained-completed/task-20260323-1320-architecture-doc-clarity-followups.md`; parent should sync the requirement and reclassify the related task docs.

## Final Status

- Outcome:
  - Scoped architecture review completed with actionable findings, and the resulting follow-up code/doc slices have now both been completed with reviewer sign-off.
- Requirement alignment:
  - Review output aligns to `docs/requirements/req-20260321-1109-architecture-review-clarity.md` plus the parent-provided confirmed answers `Q1=B`, `Q2=B`, `Q3=C`, `Q4=B`, and `Q5=all-selected`: the deliverable is a clarification-plus-gap list, the baseline stayed the target migration architecture, the scope stayed limited to the confirmed business domains plus shared core, the frozen `00` / `20` baselines were not edited, and the findings distinguish docs-only clarity gaps from real code-structure gaps.
- Residual risks or testing gaps:
  - this review task itself remains review-only, so runtime proof lives in the follow-up execution tasks rather than in this doc; see `task-20260323-1310` for targeted Jest coverage and `task-20260323-1320` for docs-only semantic validation evidence.
  - other module docs outside this scoped follow-up set may still need explicit current-vs-target notes in future passes, but that is outside this task's confirmed scope.
  - requirement-facing progress has been synced back to `docs/requirements/req-20260321-1109-architecture-review-clarity.md`; any future architecture-clarity work should open a new requirement/task anchor instead of silently extending this one.
- Directory disposition after completion: parent may now close or reclassify this task alongside its two completed follow-up tasks.
- Next action:
  - `parent-orchestrator` should sync concise requirement-facing progress, update `docs/tasks/TASK_CENTER.md`, and archive or reclassify `task-20260323-1100`, `task-20260323-1310`, and `task-20260323-1320` according to the current requirement lifecycle.
