# Task-Doc Center And Cleanup Governance

## Metadata

- Scope: optimize `docs/tasks/**` mechanism design by introducing a task-center board entrypoint, clarifying overview-vs-protocol-vs-history ownership, aligning `README.md` and `_template.md`, and identifying cleanup candidates without deleting any file
- Related requirement: `req-20260320-1244-task-doc-center-and-cleanup`（需求已闭环，文档已删除）
- Status: `completed`
- Review status: `reviewed-no-findings`
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
  - `task-20260319-1632-req-interaction-layer.md`（cleanup 候选；已于 2026-03-20 经用户确认删除）
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`
  - `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`

## Requirement Alignment

- Requirement doc: `req-20260320-1244-task-doc-center-and-cleanup`（需求已闭环，文档已删除）
- Requirement status: `confirmed`; the requirement is clear enough for execution planning.
- User intent summary:
  - add one task-center overview or board file as the human entrypoint for `docs/tasks/**`
  - reduce doc bloat by separating overview content, folder protocol, and per-task detailed history
  - define lifecycle governance for active, retained completed, and cleanup-candidate docs, while keeping room for later simplification if any category proves unnecessary
  - identify cleanup candidates but keep actual deletion out of scope until the user explicitly confirms it
- Acceptance criteria carried into this task:
- the implementation creates a board entrypoint and aligns `README.md` plus `_template.md` to the new responsibility split
- lifecycle governance clearly distinguishes active, retained completed, and cleanup candidate states; later mechanism simplification may delete obsolete replaced briefs instead of preserving a separate bucket
  - the implementation produces an evidence-based cleanup-candidate list only; it does not delete, rename, or move task docs
  - the implementation stays inside `docs/tasks/**`
- Open questions requiring user confirmation:
  - None.

## Requirement Sync

- Req-facing phase progress: 已完成 `docs/tasks/**` 机制治理文档落地与 review 收口。
- Req-facing current state: `TASK_CENTER.md`、`README.md`、`_template.md` 已按 requirement 完成分层治理对齐，cleanup 仍保持候选清单且未执行删除。
- Req-facing blockers: None.
- Req-facing next step: 本轮 requirement scope 已完成；若后续正式关闭该治理 task，由 parent 在允许的 `docs/tasks/**` pass 中同步 `TASK_CENTER.md` 条目即可。
- Requirement doc sync owner: `parent orchestrator`

## Goal And Acceptance Criteria

- Goal: make `docs/tasks/**` easier to navigate and maintain by adding one concise task-center board, narrowing `README.md` to protocol guidance, aligning `_template.md` to lifecycle governance, and capturing cleanup candidates without deleting history.
- Acceptance criteria:
  - `docs/tasks/TASK_CENTER.md` exists as the task-center overview or board entrypoint and uses concise rows or bullets instead of duplicating full task history.
  - `docs/tasks/README.md` becomes the folder protocol or mechanism doc, explicitly stating where overview content belongs versus detailed task history.
  - `docs/tasks/_template.md` gains concise lifecycle-governance guidance so future docs can be classified without expanding every brief into a directory index.
  - the delivered governance language establishes a small set of board categories with a clear rule that only the board should maintain the current cross-task inventory, while later cleanup may remove obsolete replaced briefs instead of retaining a dedicated category for them.
  - 本轮当时的仓库状态已足以发布首版 `cleanup-candidate` 清单；其中曾列入 `task-20260319-1632-req-interaction-layer.md`（该文件已于 2026-03-20 经用户确认删除）。部分更旧的迁移 brief 当时因仍有引用而未进入删除范围。
  - no file deletion, move, or rename occurs in this implementation pass; any actual cleanup action remains out of scope until the user explicitly confirms it.

## Scope And Ownership

- Allowed code paths:
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/README.md`
  - `docs/tasks/_template.md`
  - this task doc only if the parent explicitly reassigns documentation ownership
- Frozen or shared paths:
  - `req-20260320-1244-task-doc-center-and-cleanup`（需求已闭环，文档已删除）
  - existing `docs/tasks/task-*.md` files other than classification reads
  - `docs/fix-checklists/**`
  - `.cursor/**`
  - all `src/**`, `scripts/**`, `prisma/**`, tests, and other docs outside `docs/tasks/**`
- Task doc owner: `planner`
- Contracts that must not change silently:
  - `docs/tasks/TASK_CENTER.md` is the overview and board layer, not a second full README or a replacement for individual task history
  - `docs/tasks/README.md` remains the folder mechanism or protocol guide, not the live directory board
  - individual `docs/tasks/task-*.md` files remain the detailed execution, review, and provenance record
- lifecycle governance for this scope uses a small set of board categories and should stay open to later simplification if one bucket proves mechanically noisy
  - a `cleanup-candidate` classification is advisory only; deletion, rename, or archival changes require explicit user confirmation in a later pass

## Implementation Plan

- [ ] Step 1: create `docs/tasks/TASK_CENTER.md` as the concise task-center board.
  - add short sections for purpose, lifecycle definitions, active docs, retained completed docs, and cleanup candidates
  - keep each entry brief; link or mention task docs instead of copying their acceptance criteria, review logs, or long history
  - include a visible rule that cleanup candidates are list-only and cannot be deleted in this pass
- [ ] Step 2: slim `docs/tasks/README.md` into protocol guidance.
  - keep role split, workflow, filename pattern, required structure, and maintenance rules
  - remove any directory-overview burden that should live in `TASK_CENTER.md`
  - explicitly document the content boundary: board for overview, README for mechanism, task docs for detailed history
- [ ] Step 3: align `docs/tasks/_template.md` with lifecycle governance.
  - add the smallest useful lifecycle field or post-completion disposition prompt so future task docs can declare whether they should stay active, remain retained, or become cleanup candidates
  - avoid turning the template into a second board; future task docs should record only their own disposition, not a directory-wide index
- [ ] Step 4: publish an evidence-based initial lifecycle classification for the current doc set inside `TASK_CENTER.md`.
  - `active`: `docs/tasks/archive/retained-completed/task-20260317-1416-migration-outbound-base.md`, `docs/tasks/archive/retained-completed/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`, `docs/tasks/archive/retained-completed/task-20260319-1045-migration-workshop-return-formal-admission.md`, `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`, `docs/tasks/archive/retained-completed/task-20260319-1605-feishu-runtime-summary.md`, `docs/tasks/archive/retained-completed/task-20260319-1715-feishu-subagent-runtime-duration.md`, and this new governance task while it remains open
  - `retained-completed`: `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`, `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`, and `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md` because later active docs still treat them as durable upstream references
  - a later follow-up governance pass may remove any dedicated replaced-brief bucket if the active source-of-truth docs already carry the required change explanation and the obsolete files no longer justify retention
  - `cleanup-candidate`: 曾列入 `task-20260319-1632-req-interaction-layer.md`（已完成；后于 2026-03-20 经用户确认删除）
- [ ] Step 5: keep deletion and bulk historical edits out of scope.
  - do not delete, rename, or move any task doc
  - do not rewrite existing task docs just to add lifecycle metadata in this pass
  - if any candidate classification becomes ambiguous during implementation, prefer `retained-completed` over aggressive cleanup labeling

## Coder Handoff

- Execution brief: deliver a docs-only governance cleanup of `docs/tasks/**`. Introduce `TASK_CENTER.md` as the overview board, reduce `README.md` to folder protocol, and minimally extend `_template.md` so future task docs can record lifecycle disposition. Publish a candidate-only cleanup list in the board, but do not delete or rewrite historical task docs.
- Required source docs or files:
  - `req-20260320-1244-task-doc-center-and-cleanup`（需求已闭环，文档已删除）
  - `docs/tasks/archive/retained-completed/task-20260320-1244-task-doc-center-and-cleanup.md`
  - `docs/tasks/README.md`
  - `docs/tasks/_template.md`
  - `task-20260319-1632-req-interaction-layer.md`（cleanup 候选；已于 2026-03-20 经用户确认删除）
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1745-migration-outbound-order-type4-reservations.md`
  - `docs/tasks/archive/retained-completed/task-20260317-2035-migration-workshop-pick-base.md`
- Owned paths:
  - `docs/tasks/TASK_CENTER.md`
  - `docs/tasks/README.md`
  - `docs/tasks/_template.md`
- Forbidden shared files:
  - `docs/requirements/**`
  - `docs/fix-checklists/**`
  - existing `docs/tasks/task-*.md` files in this pass
  - `.cursor/**`
  - all application code, scripts, schema, tests, and non-`docs/tasks/**` docs
- Constraints and non-goals:
  - do not delete, rename, or move any file
  - do not backfill lifecycle edits across historical task docs
  - do not broaden this work into requirement or rule cleanup
  - do not turn `TASK_CENTER.md` into a copy of `README.md` or of the underlying task briefs
  - if a listed cleanup candidate still shows active downstream references, downgrade it to retained instead of forcing it into cleanup
- Validation command for this scope:
  - docs-only validation: re-read `docs/tasks/TASK_CENTER.md`, `docs/tasks/README.md`, and `docs/tasks/_template.md` together against this task doc and the linked requirement
  - confirm the three docs agree on the board-vs-protocol-vs-history split, the four lifecycle buckets, and the candidate-list-only deletion rule
  - run a repo search for any listed cleanup candidate before treating it as deletion-ready; in this pass the expected result is candidate-list-only, not deletion execution

## Reviewer Handoff

- Review focus:
  - confirm `TASK_CENTER.md` is concise and operates as the directory board instead of duplicating detailed task content
  - confirm `README.md` no longer carries live directory inventory that belongs in the board
  - confirm `_template.md` adds only minimal lifecycle or disposition guidance and does not bloat future task briefs
  - confirm the lifecycle classification is evidence-based, especially that older migration briefs are only retained when active docs or review artifacts still need them
  - confirm no deletion, rename, or move was performed
- Requirement alignment check:
  - confirm the implementation satisfies the confirmed requirement without expanding beyond `docs/tasks/**`
  - confirm the cleanup output is a candidate list only and explicitly states that actual deletion requires user confirmation
- Final validation gate:
  - docs-only diff review of `docs/tasks/TASK_CENTER.md`, `docs/tasks/README.md`, and `docs/tasks/_template.md` against this task doc and the linked requirement
  - one repo search for any file listed under `cleanup-candidate` to ensure no active reference was overlooked before reporting the governance cleanup as complete
- Required doc updates:
  - update this task doc's `Review status`, `Review Log`, and `Final Status`
  - if the candidate list changes during implementation, keep `TASK_CENTER.md` and this task doc aligned on the reason

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `docs/tasks/TASK_CENTER.md`, `docs/tasks/README.md`, and `docs/tasks/_template.md` define one shared governance model and must stay in sync
  - lifecycle classification and cleanup-candidate rules should be authored by one writer to avoid contradictory labels or unsafe cleanup guidance

## Review Log

- Validation results:
  - Reviewed the scoped docs diff for `docs/tasks/README.md` and `docs/tasks/_template.md`, then re-read `docs/tasks/TASK_CENTER.md`, `docs/tasks/README.md`, and `docs/tasks/_template.md` against this task brief and the linked requirement.
  - 当时检索曾表明 `task-20260319-1632-req-interaction-layer.md` 主要仅见于 `TASK_CENTER.md` 与本 governance task；后续 2026-03-20 用户已确认删除该候选文件并闭环关联需求文档。
  - Repo searches at that time also confirmed that some older migration briefs still had active downstream citations, while the retained-completed migration baselines remained referenced by active downstream briefs.
  - Scoped `git status` shows only the expected `docs/tasks/**` additions and edits for this governance pass; no scoped delete, move, or rename was found.
- Findings:
  - No `[blocking]` or `[important]` findings for the reviewed docs-only governance scope.
- Follow-up action:
  - No coder repair is required for `docs/tasks/TASK_CENTER.md`, `docs/tasks/README.md`, or `docs/tasks/_template.md`.
  - If the parent later marks this governance task itself as closed, sync its `docs/tasks/TASK_CENTER.md` entry in the same allowed pass so the live board remains authoritative.

## Final Status

- Outcome:
  - Reviewed clear for the delivered docs-only governance scope: `docs/tasks/TASK_CENTER.md` stays concise as the live board, `docs/tasks/README.md` now describes protocol instead of live inventory, `_template.md` adds lightweight lifecycle/disposition support, and cleanup remains candidate-list-only.
- Requirement alignment:
  - Matches the confirmed requirement and this task brief: lifecycle buckets are evidence-based, the cleanup candidate is still explicitly advisory pending user confirmation, and the implementation stays inside `docs/tasks/**` without deleting files.
- Residual risks or testing gaps:
  - No runtime validation is required for this docs-only scope. The only remaining coordination note is that a future formal closure of this governance task should update `docs/tasks/TASK_CENTER.md` in the same pass if the task is moved out of the `active` bucket.
- Next action:
  - Parent orchestrator can treat the reviewed docs as delivered. If they want to close this governance task fully, perform the board-sync follow-up in a later permitted `docs/tasks/**` edit.
- Post-closure（2026-03-20）:
  - 已按用户确认删除 `task-20260319-1632-req-interaction-layer.md`，并删除需求 `req-20260320-1244-task-doc-center-and-cleanup`；`TASK_CENTER.md` 看板已更新为无待处理 `cleanup-candidate`。
