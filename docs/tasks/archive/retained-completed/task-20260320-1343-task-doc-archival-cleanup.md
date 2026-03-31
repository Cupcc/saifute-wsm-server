# Task-Doc Historical Archival Cleanup

## Metadata

- Scope: execute the first docs-only archival pass for `docs/tasks/**` by introducing archive subfolders for non-active historical task docs, keeping active task docs at the root, repairing all in-`docs/tasks/**` references to the moved files, and enumerating remaining reference updates outside `docs/tasks/**` without deleting any doc
- Related requirement: `req-20260320-1244-task-doc-center-and-cleanup`（需求已闭环，文档已删除）
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder:
- Reviewer: `code-reviewer`
- Last updated: `2026-03-20`
- Related checklist:
- Related files:
  - `req-20260320-1244-task-doc-center-and-cleanup`（需求已闭环，文档已删除）
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/README.md`
  - `docs/tasks/_template.md`
  - `docs/tasks/archive/retained-completed/task-20260320-1244-task-doc-center-and-cleanup.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`
  - `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`
  - `task-20260319-1632-req-interaction-layer.md`（已于 2026-03-20 经用户确认删除）
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1416-migration-outbound-base.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
  - historical `docs/fix-checklists/review-*.md` artifacts were deleted after closure（2026-03-20）；recover via git history if needed

## Requirement Alignment

- Requirement doc: `req-20260320-1244-task-doc-center-and-cleanup`（需求已闭环，文档已删除）
- Requirement status: `confirmed`; the requirement is clear enough for planning and execution.
- User intent summary:
  - clean the task-doc directory instead of keeping all history at the root
  - archive historical docs that still need to be retained into subfolders, creating those folders if needed
  - keep active task docs easy to discover at the root
  - preserve historical references through path repair instead of deleting documents
  - keep deletion out of scope because the user asked for archival cleanup, not removal
- Acceptance criteria carried into this task:
  - the archival pass uses a new execution brief instead of reopening the completed governance-only task
  - `docs/tasks/**` gains an explicit archive folder model for non-active historical docs
  - active task docs remain at the root together with `TASK_CENTER.md`, `README.md`, and `_template.md`
  - historical docs that must be retained move into bucketed archive subfolders
  - all references inside `docs/tasks/**` are repaired to the new archive paths
  - remaining references outside `docs/tasks/**` are explicitly identified for follow-up ownership instead of being silently left stale
  - no task doc is deleted in this pass
- Open questions requiring user confirmation:
  - None. This plan assumes that a `cleanup-candidate` doc may also be moved into `docs/tasks/archive/cleanup-candidate/` because archival is now in scope, but deletion still is not.

## Requirement Sync

- Req-facing phase progress: 已从 `docs/tasks/**` 机制治理进入历史 task 文档归档执行规划阶段。
- Req-facing current state: 已确认这轮工作需要独立归档 task brief；目标布局为根目录只保留活跃 task 与治理入口，历史保留文档进入 `archive` 子目录，并同步修复 `docs/tasks/**` 内引用。
- Req-facing blockers: None.
- Req-facing next step: 由 `coder` 按本 task brief 创建 archive 子目录、移动非活跃历史 task 文档、修复 `docs/tasks/**` 内路径引用，并把 `docs/requirements/**` 与 `docs/fix-checklists/**` 的剩余引用作为后续跟进项显式交回。
- Requirement doc sync owner: `parent orchestrator`

## Goal And Acceptance Criteria

- Goal: reduce root-level task-doc noise by moving preserved historical task docs into stable archive subfolders while keeping active work at the root and preserving traceability through reference repair.
- Acceptance criteria:
  - this archival pass is tracked in this task doc and preserved as a retained governance record after completion
  - `docs/tasks/TASK_CENTER.md` describes the target archive layout and tracks this archival pass as active
  - the initial archive layout uses stable retained-history storage plus a cleanup-candidate area, while later governance simplification may remove any bucket that exists only to hold obsolete replaced briefs
  - the root of `docs/tasks/**` keeps only `TASK_CENTER.md`, `README.md`, `_template.md`, and `active` `task-*.md` files
  - the planned `retained-completed` archive set is `task-20260320-1244-task-doc-center-and-cleanup.md`, `task-20260317-1745-migration-outbound-order-type4-reservations.md`, `task-20260317-2035-migration-workshop-pick-base.md`, and `task-20260319-1905-migration-master-plan-relocation.md`
  - the initial pass may temporarily isolate some replaced return-family briefs while the archive model is being normalized, but later governance is free to delete those obsolete files once current truth docs carry the change explanation
  - the planned `cleanup-candidate` archive set is `task-20260319-1632-req-interaction-layer.md`
  - the planned root-active set is `task-20260317-1416-migration-outbound-base.md`, `task-20260319-1035-migration-outbound-sales-return-formal-admission.md`, `task-20260319-1045-migration-workshop-return-formal-admission.md`, `task-20260319-1100-migration-return-family-shared-post-admission.md`, `task-20260319-1605-feishu-runtime-summary.md`, `task-20260319-1715-feishu-subagent-runtime-duration.md`, and this task while it remains open
  - all in-`docs/tasks/**` references to archived docs are updated to `docs/tasks/archive/**`
  - remaining external path repairs are called out explicitly for parent-owned follow-up
  - no task-doc deletion occurs

## Scope And Ownership

- Allowed code paths:
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/README.md`
  - `docs/tasks/archive/**`
  - `docs/tasks/task-*.md` files inside `docs/tasks/**` that need to move or need path-reference updates
  - this task doc only if the parent explicitly reassigns documentation ownership
- Frozen or shared paths:
  - `docs/requirements/**`
  - `docs/fix-checklists/**`
  - `.cursor/**`
  - all application code, tests, scripts, schema, and non-`docs/tasks/**` docs
- Task doc owner: `planner`
- Contracts that must not change silently:
  - `TASK_CENTER.md` remains the authoritative live board
  - active task docs stay easy to discover at the root
  - archive bucket names must stay stable once introduced to avoid repeated path churn
  - historical docs are archived instead of deleted
  - repo-relative path references should stay in the `docs/tasks/...` style; archived docs should use `docs/tasks/archive/...`
  - references outside `docs/tasks/**` must not be silently broken; if they are not updated in the same pass, they must be listed explicitly for follow-up

## Implementation Plan

- [ ] Step 1: split this archival pass from the completed governance task.
  - keep `task-20260320-1244-task-doc-center-and-cleanup.md` as historical governance evidence and do not reopen it as the execution brief
  - use this new task doc as the single execution brief for archive moves and reference repair
- [ ] Step 2: establish the archive folder model under `docs/tasks/**`.
  - create `docs/tasks/archive/retained-completed/`
  - create `docs/tasks/archive/cleanup-candidate/`
  - keep only `active` task docs plus `TASK_CENTER.md`, `README.md`, and `_template.md` at the root
- [ ] Step 3: move non-active historical task docs into their bucket directories.
  - move `task-20260320-1244-task-doc-center-and-cleanup.md`, `task-20260317-1745-migration-outbound-order-type4-reservations.md`, `task-20260317-2035-migration-workshop-pick-base.md`, and `task-20260319-1905-migration-master-plan-relocation.md` into `docs/tasks/archive/retained-completed/`
  - move `task-20260319-1632-req-interaction-layer.md` into `docs/tasks/archive/cleanup-candidate/`
  - keep `task-20260317-1416-migration-outbound-base.md`, `task-20260319-1035-migration-outbound-sales-return-formal-admission.md`, `task-20260319-1045-migration-workshop-return-formal-admission.md`, `task-20260319-1100-migration-return-family-shared-post-admission.md`, `task-20260319-1605-feishu-runtime-summary.md`, `task-20260319-1715-feishu-subagent-runtime-duration.md`, and this task at the root while they remain active
- [ ] Step 4: repair all references inside `docs/tasks/**` to the new archive paths.
  - update `docs/tasks/TASK_CENTER.md` entries and any explicit path mentions
  - update `docs/tasks/README.md` so the folder protocol explains the root-vs-archive layout
  - update active task docs and archived task docs inside `docs/tasks/**` that cite the moved historical files
- [ ] Step 5: produce a parent-owned follow-up list for path repairs outside `docs/tasks/**`.
  - `req-20260320-1244-task-doc-center-and-cleanup`（需求已闭环，文档已删除）
  - follow-up fix-checklist paths are obsolete: completed `docs/fix-checklists/review-*.md` files were removed（2026-03-20）
- [ ] Step 6: re-read the archived and root layout to verify no stale root-path references remain inside `docs/tasks/**`.
  - if any moved doc still appears as `docs/tasks/task-...` inside `docs/tasks/**`, fix it before review
  - if a supposedly historical doc proves to still be active, keep it at the root and update `TASK_CENTER.md` instead of forcing the archive move

## Coder Handoff

- Execution brief: perform the first real archival cleanup of `docs/tasks/**`. Create the archive bucket directories, move non-active historical task docs out of the root into bucketed subfolders, update all in-`docs/tasks/**` references to the new archive paths, and keep an explicit list of parent-owned references outside `docs/tasks/**` that still need repair. Do not delete any file.
- Required source docs or files:
  - `req-20260320-1244-task-doc-center-and-cleanup`（需求已闭环，文档已删除）
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/README.md`
  - `docs/tasks/_template.md`
  - `docs/tasks/archive/retained-completed/task-20260320-1244-task-doc-center-and-cleanup.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`
  - `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`
  - `task-20260319-1632-req-interaction-layer.md`（已于 2026-03-20 经用户确认删除）
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1416-migration-outbound-base.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`
- Owned paths:
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/README.md`
  - `docs/tasks/archive/**`
  - `docs/tasks/task-*.md` files inside `docs/tasks/**` that must move or have path references updated
- Forbidden shared files:
  - `docs/requirements/**`
  - `docs/fix-checklists/**`
  - `.cursor/**`
  - all application code, tests, scripts, schema, and non-`docs/tasks/**` docs
  - this task doc unless the parent explicitly reassigns documentation ownership
- Constraints and non-goals:
  - keep active task docs at the root
  - preserve filenames and only change directory placement plus path references
  - archive historical docs instead of deleting them
  - keep `TASK_CENTER.md` as the authoritative board and `README.md` as the folder protocol
  - do not change lifecycle classification without evidence from current references
  - do not repair external references outside `docs/tasks/**` in this writer scope; hand them back explicitly
- Validation command for this scope:
  - iteration check: search `docs/tasks/**` for each moved filename and confirm surviving references use `docs/tasks/archive/...` instead of `docs/tasks/task-...`
  - iteration check: re-read `docs/tasks/TASK_CENTER.md` and `docs/tasks/README.md` together to confirm the root-vs-archive model is consistent
  - final gate: run one combined `docs/tasks/**` search for the moved root paths and expect zero matches, then run a second repo search across `docs/requirements/**` and `docs/fix-checklists/**` to capture any remaining external follow-up references explicitly in review notes

## Reviewer Handoff

- Review focus:
  - confirm this archival pass uses a new task doc instead of reopening the completed governance-only task
  - confirm the archive layout keeps only active tasks at the root and uses the correct bucket directories for non-active history
  - confirm all in-`docs/tasks/**` references to moved docs were updated
  - confirm remaining external references outside `docs/tasks/**` are explicitly listed rather than silently broken
  - confirm no file deletion occurred
- Requirement alignment check:
  - confirm the work matches the confirmed requirement plus the user's new archival request without expanding beyond `docs/tasks/**`
  - confirm archival is treated as move-only preservation, not deletion
- Final validation gate:
  - diff review of moved docs plus `docs/tasks/TASK_CENTER.md` and `docs/tasks/README.md`
  - search `docs/tasks/**` for any stale root-path references to the archived docs; zero unresolved matches required
  - search `docs/requirements/**` and `docs/fix-checklists/**` for the moved paths; any matches must be called out as follow-up ownership, not ignored
- Required doc updates:
  - update this task doc's `Status`, `Review status`, `Review Log`, and `Final Status`
  - if execution finds a different lifecycle bucket for any file, keep `TASK_CENTER.md` and this task doc aligned on the reason

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `docs/tasks/TASK_CENTER.md`, `docs/tasks/README.md`, root task docs, and archived task docs must stay consistent on one path model
  - moving files and repairing cross-references is one shared contract surface; split writers would risk stale paths and contradictory bucket placement
  - the external follow-up list must be derived from the final post-move state, which favors one writer

## Review Log

- Validation results:
  - Re-read `docs/tasks/TASK_CENTER.md` and `docs/tasks/README.md` against the delivered archive layout; the root-vs-archive model is now internally consistent.
  - Searched `docs/**/*.md` for the moved root-level task paths after follow-up fixes in `docs/requirements/**` and `docs/fix-checklists/**`; no stale root-path references remain.
  - Verified `docs/tasks/` now keeps only active task docs plus `TASK_CENTER.md`, `README.md`, `_template.md`, and the `archive/` subtree.
  - At review time, `task-20260320-1400-architecture-doc-relocation.md` still existed with `Lifecycle disposition: active`, so its `TASK_CENTER.md` active entry was correct; that task was archived later in its own completion pass.
  - Dedicated `code-reviewer` subagent could not be launched in this session because the tool returned an account-billing error; parent performed the final docs-only review pass and synchronization directly.
- Findings:
  - No `[blocking]` or `[important]` findings for the delivered archival cleanup.
- Follow-up action:
  - No further repair is required for the archival move itself.
  - 2026-03-20：`cleanup-candidate` 中 `task-20260319-1632-req-interaction-layer.md` 已按用户确认删除；需求 `req-20260320-1244-task-doc-center-and-cleanup` 同步闭环并删除。

## Final Status

- Outcome:
  - Completed the first archival cleanup pass for task docs: created bucketed `archive/` directories, moved all non-active historical task docs into their lifecycle buckets, repaired in-scope and external docs references, and kept the root focused on active work.
- Requirement alignment:
  - Matches the confirmed requirement plus the user's archival instruction: preserved history moved into subfolders, no file deletion occurred, and the docs corpus now points to the archived canonical task-doc paths.
- Residual risks or testing gaps:
  - 与原先 `cleanup-candidate` 相关的清理决策已结束：`task-20260319-1632-req-interaction-layer.md` 已于 2026-03-20 删除；后续新候选仍须单独检索引用并经用户确认后方可删除。
- Residual mechanism note:
  - A later governance pass may further simplify the archive model by deleting obsolete replaced briefs instead of retaining a dedicated bucket for them; that follow-up does not change the correctness of this initial archival pass.
- Directory disposition: canonical copy at `docs/tasks/archive/retained-completed/task-20260320-1343-task-doc-archival-cleanup.md`；2026-03-20 跟进清理已删除误留在 `docs/tasks/` 根目录的重复副本（与归档版内容一致）。
- Next action:
  - 新产生的 `cleanup-candidate` 仍按 `TASK_CENTER.md` 规则：全文检索引用 + 用户明确确认后再删。
