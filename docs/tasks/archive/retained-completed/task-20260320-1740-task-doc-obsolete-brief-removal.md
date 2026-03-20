# Task-Doc Obsolete Brief Removal

## Metadata

- Scope: simplify the `docs/tasks/**` governance model by removing the dedicated obsolete-brief bucket, deleting the no-longer-needed replaced return-family task docs, and rewriting the current docs to carry change explanations in the active source-of-truth instead of preserving a separate obsolete-doc module
- Related requirement: `req-20260320-1740-task-doc-obsolete-brief-removal`（需求已闭环，文档已删除）
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `parent-orchestrator`
- Coder: `parent-orchestrator`
- Reviewer: `parent-orchestrator`
- Last updated: `2026-03-20`
- Related checklist:
- Related files:
  - `req-20260320-1740-task-doc-obsolete-brief-removal`（需求已闭环，文档已删除）
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/README.md`
  - `docs/tasks/_template.md`
  - `docs/tasks/archive/retained-completed/task-20260320-1244-task-doc-center-and-cleanup.md`
  - `docs/tasks/archive/retained-completed/task-20260320-1343-task-doc-archival-cleanup.md`
  - `req-20260320-1244-task-doc-center-and-cleanup`（上游治理需求；闭环后需求文件已删除）

## Requirement Alignment

- Requirement doc: `req-20260320-1740-task-doc-obsolete-brief-removal`（需求已闭环，文档已删除）
- User intent summary:
  - remove the dedicated obsolete-brief archive module because it is too verbose for the value it provides
  - keep the change explanation in the current truth docs instead of preserving separate replaced-brief references
  - delete the old replaced task docs rather than keeping them as a dedicated bucket
- Acceptance criteria carried into this task:
  - remove the dedicated obsolete-brief governance language from `TASK_CENTER.md`, `README.md`, and `_template.md`
  - delete the replaced return-family task docs that no longer have retention value
  - keep the simpler governance model documented in current docs
  - preserve only the governance records that still explain the mechanism change itself
- Open questions requiring user confirmation:
  - None. The user explicitly confirmed immediate execution and deletion.

## Requirement Sync

- Req-facing phase progress: 已完成机制简化与旧已替代 brief 删除。
- Req-facing current state: `docs/tasks/` 现在只保留 `active`、`retained-completed`、`cleanup-candidate` 三类治理语义；当前真源文档承担变更说明，不再保留专门的“已替代归档”模块。
- Req-facing blockers: None.
- Req-facing next step: 后续若出现旧 brief 被当前真源完全承接的情况，默认先在当前文档写清替代说明，再按用户确认执行删除。
- Requirement doc sync owner: `parent orchestrator`

## Goal And Acceptance Criteria

- Goal: reduce governance noise by removing a bucket that only preserved obsolete replaced briefs and pushing all durable explanation into the current source-of-truth docs.
- Acceptance criteria:
  - `TASK_CENTER.md` no longer contains a dedicated obsolete-brief section
  - `README.md` and `_template.md` no longer describe a dedicated obsolete-brief lifecycle
  - the four replaced return-family task docs are deleted
  - the completed `task-20260320-1343-task-doc-archival-cleanup.md` record is archived under `retained-completed`
  - repo searches show no remaining references to the removed obsolete-brief bucket or the four deleted filenames inside `docs/**/*.md`

## Scope And Ownership

- Allowed code paths:
  - `docs/requirements/**`
  - `docs/tasks/**`
- Frozen or shared paths:
  - application code, schema, scripts, tests, and `.cursor/**`
- Task doc owner: `parent-orchestrator`
- Contracts that must not change silently:
  - `TASK_CENTER.md` remains the live inventory board
  - historical governance records may stay retained only when they still explain the current mechanism
  - deletion of obsolete briefs happens only because the user explicitly confirmed it for this scope

## Implementation Plan

- [x] Step 1: define the simplified governance target and record it in a new requirement doc.
- [x] Step 2: rewrite `TASK_CENTER.md`, `README.md`, `_template.md`, and retained governance docs so they no longer depend on a dedicated obsolete-brief bucket.
- [x] Step 3: archive the completed `task-20260320-1343-task-doc-archival-cleanup.md` record under `retained-completed`.
- [x] Step 4: delete the four replaced return-family task docs that had no remaining retention value.
- [x] Step 5: rerun repo searches to confirm the removed bucket and deleted filenames no longer appear in `docs/**/*.md`.

## Coder Handoff

- Execution brief: completed in the parent turn; no further coder action remains for this scope.
- Required source docs or files:
  - `req-20260320-1740-task-doc-obsolete-brief-removal`（需求已闭环，文档已删除）
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/README.md`
  - `docs/tasks/_template.md`
  - `docs/tasks/archive/retained-completed/task-20260320-1244-task-doc-center-and-cleanup.md`
  - `docs/tasks/archive/retained-completed/task-20260320-1343-task-doc-archival-cleanup.md`
- Owned paths:
  - `docs/requirements/**`
  - `docs/tasks/**`
- Forbidden shared files:
  - application code, schema, scripts, tests, and `.cursor/**`
- Constraints and non-goals:
  - keep the explanation in current truth docs instead of adding another archive layer
  - do not widen this docs cleanup into unrelated code or architecture changes
- Validation command for this scope:
  - search `docs/**/*.md` for the removed bucket token and deleted filenames; expect zero matches

## Reviewer Handoff

- Review focus:
  - confirm the simplified governance model is internally consistent
  - confirm only the intended obsolete briefs were deleted
  - confirm retained governance docs still explain the current mechanism clearly
- Requirement alignment check:
  - the delivered change matches the user's explicit request to remove the dedicated obsolete-brief module and delete the related docs
- Final validation gate:
  - repo search for removed bucket token and deleted filenames under `docs/**/*.md`
- Required doc updates:
  - keep this task as the durable change explanation after the requirement is closed and deleted

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `TASK_CENTER.md`, `README.md`, retained governance docs, and deletion decisions all depend on one final consistent mechanism

## Review Log

- Validation results:
  - Verified that `docs/**/*.md` no longer contains the removed bucket token.
  - Verified that `docs/**/*.md` no longer contains the four deleted return-family filenames.
  - Verified that `docs/**/*.md` no longer references the pre-archive path of `task-20260320-1343-task-doc-archival-cleanup.md`.
- Findings:
  - No `[blocking]` or `[important]` findings for this docs-only governance simplification.
- Follow-up action:
  - None required for the removed obsolete-brief bucket.
  - Post-closure (`2026-03-20`): related requirement `req-20260320-1740-task-doc-obsolete-brief-removal` was deleted after completion; this retained task doc remains the single durable execution record.

## Final Status

- Outcome:
  - Removed the dedicated obsolete-brief governance module, deleted the four obsolete return-family task docs, archived the completed `1343` governance task, and rewrote the current docs so replacement explanations now live in the current truth docs instead of a separate bucket.
- Requirement alignment:
  - Matches the confirmed request exactly: simplify the mechanism, remove the dedicated module, and stop retaining those obsolete replaced docs.
- Residual risks or testing gaps:
  - The only remaining cleanup workflow still requiring explicit user confirmation is the existing `cleanup-candidate` deletion path.
- Directory disposition after completion: `retained-completed`
- Next action:
  - Reuse this simplified rule for future docs cleanup: explain the replacement in the current truth doc, then delete the obsolete brief once cleanup is confirmed.
