# Architecture Doc Clarity Followups For Project Reporting And Master Data

## Metadata

- Scope: clarify only the review-confirmed current-vs-target gaps and reading-path ambiguity in the scoped architecture docs, while keeping `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-database-tables-and-schema.md` frozen and read-only
- Related requirement: `docs/requirements/archive/retained-completed/req-20260321-1109-architecture-review-clarity.md`
- Status: `completed`
- Review status: `reviewed-clean`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Last updated: `2026-03-23`
- Related checklist:
- Related files:
  - `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`
  - `docs/requirements/PROJECT_REQUIREMENTS.md`
  - `docs/architecture/README.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/architecture/modules/project.md`
  - `docs/architecture/modules/reporting.md`
  - `docs/architecture/modules/master-data.md`

## Requirement Alignment

- Requirement doc: `docs/requirements/archive/retained-completed/req-20260321-1109-architecture-review-clarity.md`
- Requirement status: clear enough for planning. The requirement is `confirmed`, the review task already identified the docs-only follow-up track, and the user explicitly asked to continue with parallelizable follow-up slices.
- User intent summary:
  - continue from the completed architecture review instead of reopening the original review
  - isolate the docs clarification work for `project`, `reporting`, `master-data`, and architecture reading-path clarity into one execution-ready brief
  - keep `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-database-tables-and-schema.md` frozen; clarify surrounding docs rather than rewriting the frozen baseline
- Acceptance criteria carried into this task:
  - `docs/architecture/modules/project.md` must clearly distinguish current implementation from target project-domain scope already stated in `docs/requirements/PROJECT_REQUIREMENTS.md`
  - `docs/architecture/modules/reporting.md` must clearly distinguish current reporting coverage from target monthly and project-oriented reporting scope
  - `docs/architecture/modules/master-data.md` must clarify current implementation maturity versus target ownership without shrinking the target boundary
  - `docs/architecture/README.md` must make the architecture reading path clearer without editing `00` or `20`
  - no code files, requirement files, or frozen baseline docs may be edited in this slice
- Open questions requiring user confirmation:
  - None for planning.

## Requirement Sync

- Req-facing phase progress: 已从架构 review findings 中拆出 `project` / `reporting` / `master-data` 文档澄清切片，并完成执行 brief。
- Req-facing current state: 已锁定允许编辑的文档、冻结 baseline、current-vs-target 口径与并行边界，可直接进入 docs coder。
- Req-facing blockers: 当前无规划阻塞；若执行中发现必须改动 `PROJECT_REQUIREMENTS.md` 或冻结的 `00` / `20`，需先回到 parent 确认。
- Req-facing next step: 将本 task 交给 `coder` 更新限定文档并自检语义一致性，再由 `code-reviewer` 复核口径、边界与阅读路径。
- Requirement doc sync owner: `parent-orchestrator`

## Goal And Acceptance Criteria

- Goal: close the review-confirmed docs clarification follow-up by making the scoped architecture docs accurately explain current implementation maturity versus target architecture, while preserving the frozen baseline docs untouched.
- Acceptance criteria:
  - `docs/architecture/README.md` gives a clearer reading path that helps readers anchor in requirements plus overview before consuming module-level detail, without rewriting frozen baseline content
  - `docs/architecture/modules/project.md` explicitly states that the current code surface is still narrower than the target project-family scope already required in `docs/requirements/PROJECT_REQUIREMENTS.md`
  - `docs/architecture/modules/reporting.md` explicitly states that current reporting coverage is narrower than the target monthly and project-oriented reporting scope, and that `reporting` remains read-only
  - `docs/architecture/modules/master-data.md` explicitly states the current implementation maturity gap for non-material master-data writes while preserving `master-data` as the target owner
  - the final wording helps future coders and reviewers distinguish `current implementation`, `target architecture`, and `frozen baseline` instead of silently collapsing them together

## Scope And Ownership

- Allowed code paths:
  - `docs/tasks/archive/retained-completed/task-20260323-1320-architecture-doc-clarity-followups.md`
  - `docs/architecture/README.md`
  - `docs/architecture/modules/project.md`
  - `docs/architecture/modules/reporting.md`
  - `docs/architecture/modules/master-data.md`
- Frozen or shared paths:
  - `docs/tasks/TASK_CENTER.md`
  - `docs/requirements/**`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - all other files under `docs/architecture/**`
  - all code, schema, script, and test paths under `src/**`, `prisma/**`, and `scripts/**`
- Task doc owner: `planner` during planning; `coder` owns execution updates for this task doc; `code-reviewer` owns review-phase updates in this same task doc
- Contracts that must not change silently:
  - `project` remains a transaction domain that uses `inventory-core`; this slice may clarify maturity gaps but must not redefine the target boundary downward
  - `reporting` remains a read-only aggregation domain and must not be reframed as a transaction owner
  - `master-data` remains the owner of master records and shared snapshots; this slice may clarify current implementation gaps but must not transfer ownership elsewhere
  - `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-database-tables-and-schema.md` remain frozen baselines in this slice
  - project-level requirements in `docs/requirements/PROJECT_REQUIREMENTS.md` remain read-only source of truth here

## Implementation Plan

- [ ] Step 1: re-anchor the wording in the completed review findings plus the project-level requirement baseline.
  - use `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md` for the exact gaps to fix
  - use `docs/requirements/PROJECT_REQUIREMENTS.md` only as read-only target scope evidence, especially the project-family and monthly-reporting clauses
- [x] Step 2: update `docs/architecture/README.md`.
  - clarify the recommended reading order so readers can understand requirement intent, module map, frozen flow/schema baseline, and then per-module docs with less ambiguity
  - keep the change editorial only; do not import new architecture truth that belongs in `00` or `20`
- [x] Step 3: update `docs/architecture/modules/project.md`.
  - add an explicit current-vs-target note that the current code surface is narrower than the target project family recorded in `PROJECT_REQUIREMENTS.md`
  - make clear that current implementation maturity does not close the target scope for project purchase-in, project pick, project return, project scrap, and project cost or inventory views
- [x] Step 4: update `docs/architecture/modules/reporting.md`.
  - add an explicit current-vs-target note that current reporting covers only part of the target read-model scope
  - clarify the still-open monthly and project-oriented reporting responsibilities without converting `reporting` into a write owner
- [x] Step 5: update `docs/architecture/modules/master-data.md`.
  - add a concise note that current implementation maturity is uneven across master-data entities, while the target module ownership remains broader than the current mutation surface
- [x] Step 6: run narrow markdown validation, re-read the changed docs against the review findings and frozen baseline, and hand the slice to `code-reviewer`.

## Coder Handoff

- Execution brief:
  - keep the changes explanatory and current-vs-target oriented; this is a docs clarification slice, not a baseline rewrite or a hidden scope expansion into implementation work
  - prefer the smallest wording changes that remove ambiguity and preserve the existing frozen architecture truth
- Required source docs or files:
  - `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`
  - `docs/requirements/PROJECT_REQUIREMENTS.md`
  - `docs/architecture/README.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/architecture/modules/project.md`
  - `docs/architecture/modules/reporting.md`
  - `docs/architecture/modules/master-data.md`
- Owned paths:
  - `docs/tasks/archive/retained-completed/task-20260323-1320-architecture-doc-clarity-followups.md`
  - `docs/architecture/README.md`
  - `docs/architecture/modules/project.md`
  - `docs/architecture/modules/reporting.md`
  - `docs/architecture/modules/master-data.md`
- Forbidden shared files:
  - `docs/tasks/TASK_CENTER.md`
  - `docs/requirements/**`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/20-wms-database-tables-and-schema.md`
  - all non-scoped files under `docs/architecture/**`
  - all `src/**`, `prisma/**`, and `scripts/**`
- Constraints and non-goals:
  - do not alter code, tests, schema, prompts, or requirement docs
  - do not rewrite the frozen baseline bodies in `00` or `20`
  - do not quietly narrow the target scope to match current incomplete code
  - do not promise implementation completeness that the codebase has not reached yet
  - do not open new follow-up tracks beyond the review-confirmed clarity gaps in `project`, `reporting`, `master-data`, and the architecture reading path
- Validation command for this scope:
  - iteration:
    - `pnpm exec biome check docs/architecture/README.md docs/architecture/modules/project.md docs/architecture/modules/reporting.md docs/architecture/modules/master-data.md`
  - final:
    - `git diff --name-only -- "docs/tasks/archive/retained-completed/task-20260323-1320-architecture-doc-clarity-followups.md" "docs/architecture/README.md" "docs/architecture/modules/project.md" "docs/architecture/modules/reporting.md" "docs/architecture/modules/master-data.md"`
    - `pnpm exec biome check docs/tasks/archive/retained-completed/task-20260323-1320-architecture-doc-clarity-followups.md docs/architecture/README.md docs/architecture/modules/project.md docs/architecture/modules/reporting.md docs/architecture/modules/master-data.md`
  - semantic gate:
    - reread the changed docs against `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`, `docs/requirements/PROJECT_REQUIREMENTS.md`, `docs/architecture/00-architecture-overview.md`, and `docs/architecture/20-wms-database-tables-and-schema.md` to ensure the wording clarifies current-vs-target gaps without mutating frozen truth

## Reviewer Handoff

- Review focus:
  - verify the changed docs clearly distinguish `current implementation` from `target architecture`
  - verify `project.md` does not imply the current narrow code surface fully satisfies the target project-family scope from `PROJECT_REQUIREMENTS.md`
  - verify `reporting.md` now acknowledges the open monthly and project-oriented reporting scope while keeping `reporting` read-only
  - verify `master-data.md` now acknowledges current implementation maturity gaps without shrinking module ownership
  - verify `README.md` improves the reading path and does not contradict the frozen baseline or the review findings
  - verify no forbidden files changed, especially `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-database-tables-and-schema.md`
- Requirement alignment check:
  - confirm this slice addresses only follow-up track `2` from the completed review task
  - confirm the final wording stays aligned with `docs/requirements/archive/retained-completed/req-20260321-1109-architecture-review-clarity.md` and `docs/requirements/PROJECT_REQUIREMENTS.md`
- Final validation gate:
  - the scoped markdown validation passes
  - the diff stays inside the owned paths
  - the final wording reduces ambiguity without changing frozen baseline truth or widening into implementation promises
- Required doc updates:
  - update `## Metadata` -> `Status` and `Review status`
  - update `## Review Log`
  - update `## Final Status`

## Parallelization Safety

- Status: `safe`
- If safe, list the exact disjoint writable scopes:
  - writer A, docs slice: `docs/tasks/archive/retained-completed/task-20260323-1320-architecture-doc-clarity-followups.md`, `docs/architecture/README.md`, `docs/architecture/modules/project.md`, `docs/architecture/modules/reporting.md`, `docs/architecture/modules/master-data.md`
  - writer B, code slice: `docs/tasks/archive/retained-completed/task-20260323-1310-customer-workshop-return-invariants.md`, `src/modules/customer/application/customer.service.ts`, `src/modules/customer/application/customer.service.spec.ts`, `src/modules/workshop-material/application/workshop-material.service.ts`, `src/modules/workshop-material/application/workshop-material.service.spec.ts`, plus the explicitly-listed conditional repository files only if justified
- If not safe, list the shared files or contracts that require a single writer:
  - `docs/tasks/TASK_CENTER.md` and requirement-doc sync remain parent-owned shared surfaces and must not be edited by either slice writer during parallel execution

## Review Log

- Validation results:
  - Re-read `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md` for the confirmed gap list; re-read `docs/requirements/PROJECT_REQUIREMENTS.md` sections `4.1.7`, `4.2.1`, and section `5` for the target project-family and monthly/project-reporting scope; re-read `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-database-tables-and-schema.md` for frozen-baseline alignment (read-only).
  - Re-read the changed docs `docs/architecture/README.md`, `docs/architecture/modules/project.md`, `docs/architecture/modules/reporting.md`, and `docs/architecture/modules/master-data.md` against the acceptance criteria in this task.
  - Spot-checked `docs/architecture/modules/customer.md`, `docs/architecture/modules/workflow.md`, and `docs/architecture/modules/inventory-core.md` after the updated `README.md` note to confirm the revised wording is scoped to this slice rather than making a repo-wide factual claim.
  - Ran `git status --short -- "docs/architecture/00-architecture-overview.md" "docs/architecture/20-wms-database-tables-and-schema.md" "docs/architecture/README.md" "docs/architecture/modules/project.md" "docs/architecture/modules/reporting.md" "docs/architecture/modules/master-data.md"`; both frozen baseline files show as modified from HEAD. Parent confirmed those modifications are pre-existing parent-owned working-tree changes that predate this docs slice and were not introduced by this coder. The diff for those two files contains unrelated parent-tracked content, and this slice made no edits to them.
  - Ran `git diff --name-only HEAD -- "docs/architecture/00-architecture-overview.md" "docs/architecture/20-wms-database-tables-and-schema.md"` to record the pre-existing state; both appear, confirming they were already modified before this slice.
  - Ran `pnpm exec biome check docs/tasks/archive/retained-completed/task-20260323-1320-architecture-doc-clarity-followups.md docs/architecture/README.md docs/architecture/modules/project.md docs/architecture/modules/reporting.md docs/architecture/modules/master-data.md`; biome reported `0 files processed` because markdown is excluded by `biome.json` — expected behavior, no actionable lint finding.
  - Confirmed the slice's own diff is limited to `docs/architecture/README.md`, `docs/architecture/modules/master-data.md`, `docs/architecture/modules/project.md`, `docs/architecture/modules/reporting.md`, and this task doc.
- Findings (post-fix re-review):
  - `[closed]` `docs/architecture/README.md` current-vs-target claim: tightened from a repo-wide factual claim to an explicit review lens with a scoped note naming the three clarified module docs. Future readers are no longer misled into treating other module docs' silence as evidence of target completeness.
  - `[closed]` frozen-doc scope gate: parent confirmed `docs/architecture/00-architecture-overview.md` and `docs/architecture/20-wms-database-tables-and-schema.md` were already modified in the working tree before this slice began; the modifications are parent-owned and unrelated to this slice. The slice validation gate is now accurately scoped to the five owned paths only.
  - `project.md`, `reporting.md`, and `master-data.md` remain directionally correct and unchanged from the prior review:
    - `project.md` clearly states that current implementation is narrower than the target project-family scope and preserves `inventory-core` as the stock-write owner.
    - `reporting.md` clearly states that current coverage is narrower than the target monthly/project reporting scope and keeps `reporting` read-only.
    - `master-data.md` clarifies maturity gaps without shrinking module ownership.
  - Frozen baseline contracts confirmed intact: `project` uses `inventory-core`, `reporting` is read-only, `master-data` retains target ownership.
- Follow-up action:
  - None for this slice. Parent to sync `TASK_CENTER.md` and requirement doc.

## Final Status

- Outcome:
  - docs clarification complete; all four review-confirmed gaps addressed; both `[important]` review findings resolved; slice is ready for archive
- Requirement alignment:
  - this slice addresses only follow-up track `2` from the completed architecture review (`task-20260323-1100-architecture-review-clarity.md`); all scoped module docs now accurately distinguish current implementation from target architecture; frozen contracts preserved; no forbidden files edited by this slice
- Residual risks or testing gaps:
  - no runtime tests required for this docs-only slice; semantic gate satisfied
  - `pnpm exec biome check` does not apply to markdown in this repo; semantic reread plus git-scope validation are the appropriate evidence, both satisfied
  - other module docs (`customer.md`, `workflow.md`, `inventory-core.md`, etc.) may still lack explicit current-vs-target sections; that is acknowledged in the updated `README.md` note and is out of scope for this slice
- Directory disposition after completion: archive this task; update `docs/tasks/TASK_CENTER.md` via parent
- Next action:
  - parent syncs `TASK_CENTER.md` and the linked requirement doc, then archives this task
