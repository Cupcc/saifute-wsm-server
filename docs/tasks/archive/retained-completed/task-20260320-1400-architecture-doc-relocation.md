# Architecture Doc Relocation And Reference Cleanup

## Metadata

- Scope: relocate the repository architecture docs into `docs/architecture/**`, add one layout explainer for the new subtree, and retarget stale repo-wide references without changing runtime behavior
- Related requirement: `docs/requirements/req-20260320-1400-architecture-doc-relocation.md`
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder:
- Reviewer: `code-reviewer`
- Last updated: `2026-03-20`
- Related checklist:
- Related files:
  - `docs/requirements/req-20260320-1400-architecture-doc-relocation.md`
  - `docs/00-architecture-overview.md`
  - `docs/20-wms-database-tables-and-schema.md`
  - `docs/modules/**`
  - `.cursor/agents/planner.md`
  - `.cursor/agents/coder.md`
  - `.cursor/agents/code-reviewer.md`
  - `.cursor/skills/saifute-subagent-orchestration/SKILL.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1416-migration-outbound-base.md`

## Requirement Alignment

- Requirement doc: `docs/requirements/req-20260320-1400-architecture-doc-relocation.md`
- Requirement status: `confirmed`; the requested scope is clear enough for planning and does not require additional user confirmation.
- User intent summary:
  - move `docs/00-architecture-overview.md` into `docs/architecture/00-architecture-overview.md`
  - move `docs/20-wms-database-tables-and-schema.md` into `docs/architecture/20-wms-database-tables-and-schema.md`
  - move the full `docs/modules/` subtree into `docs/architecture/modules/`
  - add one explanatory doc for the new architecture-doc layout
  - update repo docs and prompt/skill references that still point at the old locations
- Acceptance criteria carried into this task:
  - the old top-level architecture docs are physically relocated into `docs/architecture/`
  - the full module-doc tree is physically relocated into `docs/architecture/modules/`
  - one new explainer doc documents the new layout, purpose split, and recommended reading order under `docs/architecture/`
  - stale references in repo docs, prompts, skills, task docs, and checklists are retargeted to the new canonical paths
  - the implementation stays docs-only and does not change application code or runtime behavior
- Open questions requiring user confirmation:
  - None.

## Requirement Sync

- Req-facing phase progress: 已完成 docs-only 架构文档迁移、目录说明补充与引用清理，并完成 review 收口。
- Req-facing current state: `docs/architecture/**` 已成为架构文档唯一 canonical 根目录；旧顶层 live docs 已移除，仓库内旧路径残留仅剩 requirement 与本 task 文档。
- Req-facing blockers: None.
- Req-facing next step: 当前 scope 已完成；若后续还要继续调整架构文档布局，应新开 task 处理。
- Requirement doc sync owner: `parent orchestrator`

## Goal And Acceptance Criteria

- Goal: make `docs/architecture/**` the single canonical home for repository architecture documentation, while preserving the current content semantics and cleaning up repo-wide stale references to the old locations.
- Acceptance criteria:
  - `docs/00-architecture-overview.md` is moved to `docs/architecture/00-architecture-overview.md`.
  - `docs/20-wms-database-tables-and-schema.md` is moved to `docs/architecture/20-wms-database-tables-and-schema.md`.
  - `docs/modules/**` is moved to `docs/architecture/modules/**` with no duplicate legacy copies left behind.
  - internal references among the moved architecture docs are updated, including the overview doc, the flow/schema doc, and module docs that currently point at the old top-level files.
  - a new explanatory doc, preferably `docs/architecture/README.md`, explains the subtree layout, which doc answers which question, and the recommended reading order.
  - repo-wide stale references found in the current baseline are updated, including the known `.cursor/agents/*.md`, `.cursor/skills/saifute-subagent-orchestration/SKILL.md`, affected `docs/tasks/*.md`, and affected `docs/fix-checklists/*.md`.
  - after implementation, repo searches for `docs/00-architecture-overview.md`, `docs/20-wms-database-tables-and-schema.md`, and `docs/modules/` return only the linked requirement doc and this task doc, unless the reviewer explicitly records another intentional historical exception.
  - no `src/**`, `scripts/**`, `prisma/**`, `test/**`, or runtime/tooling behavior files are changed for this scope.

## Scope And Ownership

- Allowed code paths:
  - `docs/00-architecture-overview.md` and `docs/architecture/00-architecture-overview.md`
  - `docs/20-wms-database-tables-and-schema.md` and `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/modules/**` and `docs/architecture/modules/**`
  - `docs/architecture/README.md`
  - stale-reference files found by repo search under `docs/tasks/**`
  - stale-reference files found by repo search under `docs/fix-checklists/**`
  - the explicitly identified prompt/skill docs that still reference the old locations: `.cursor/agents/planner.md`, `.cursor/agents/coder.md`, `.cursor/agents/code-reviewer.md`, and `.cursor/skills/saifute-subagent-orchestration/SKILL.md`
  - any additional docs or prompt files found by the execution-time stale-reference search, as long as they remain inside docs/prompt/rule-cleanup scope and do not widen into runtime behavior changes
- Frozen or shared paths:
  - `docs/requirements/**`, including `docs/requirements/req-20260320-1400-architecture-doc-relocation.md`; old-path mentions there are part of the requirement narrative and are not stale runtime anchors to clean up in this pass
  - this task doc unless the parent explicitly reassigns ownership during review or repair
  - `docs/tasks/TASK_CENTER.md`, `docs/tasks/README.md`, and `docs/tasks/_template.md` unless execution-time search proves they contain an in-scope stale architecture-path reference
  - `.cursor/rules/**` unless execution-time search proves they contain an in-scope stale architecture-path reference
  - all runtime or tooling surfaces outside docs/prompt cleanup, including `src/**`, `scripts/**`, `prisma/**`, `test/**`, and `package.json`
- Task doc owner: `planner`
- Contracts that must not change silently:
  - this is a docs/prompt/rule cleanup only; do not change business semantics, migration semantics, validation semantics, or runtime behavior
  - `docs/architecture/**` becomes the new canonical architecture-doc home, but the moved architecture content should keep its current meaning unless a wording change is strictly required to explain the new layout
  - module docs remain module-scoped architecture references; the reorganization changes where they live, not their business ownership model
  - prompt and skill docs must preserve their existing orchestration intent while retargeting the source-of-truth paths they cite
  - use the current working-copy content as the move source; do not recreate moved docs from stale snapshots, especially because `docs/20-wms-database-tables-and-schema.md` already has local modifications in the worktree

## Implementation Plan

- [ ] Step 1: capture the exact stale-reference baseline before any move.
  - run repo searches for `docs/00-architecture-overview.md`, `docs/20-wms-database-tables-and-schema.md`, and `docs/modules/`
  - turn that search result into the explicit edit set for docs, prompts, skills, tasks, and checklists
  - if an additional shared file appears outside the planned docs/prompt scope, stop and ask the parent whether to widen the writable set
- [ ] Step 2: create the new architecture subtree and move the current files into it.
  - create `docs/architecture/`
  - move `docs/00-architecture-overview.md` to `docs/architecture/00-architecture-overview.md`
  - move `docs/20-wms-database-tables-and-schema.md` to `docs/architecture/20-wms-database-tables-and-schema.md`
  - move the entire `docs/modules/` subtree to `docs/architecture/modules/`
  - prefer a move or rename operation that preserves git history rather than copy-plus-delete
- [ ] Step 3: repair internal architecture-doc links after the move.
  - update the moved overview doc to reference `docs/architecture/20-wms-database-tables-and-schema.md`
  - update the moved flow/schema doc to reference `docs/architecture/00-architecture-overview.md`
  - update moved module docs that currently point at `docs/20-wms-database-tables-and-schema.md` so they now point at `docs/architecture/20-wms-database-tables-and-schema.md`
- [ ] Step 4: add one explainer doc for the new layout.
  - add `docs/architecture/README.md` unless execution reveals a clearly better name inside the same subtree
  - document the purpose split between the overview doc, the flow/schema doc, and `modules/**`
  - include a concise recommended reading order and a note that `docs/architecture/**` is the canonical architecture-doc root
  - avoid repeating large architecture content in the README; it should explain structure, not duplicate the moved docs
- [ ] Step 5: update repo-wide stale references to the new canonical paths.
  - retarget the known prompt and skill docs: `.cursor/agents/planner.md`, `.cursor/agents/coder.md`, `.cursor/agents/code-reviewer.md`, and `.cursor/skills/saifute-subagent-orchestration/SKILL.md`
  - retarget affected task docs under `docs/tasks/**`, including the currently known migration-task references surfaced during planning
  - retarget affected review artifacts under `docs/fix-checklists/**`
  - retarget any other in-scope repo docs found by the stale-reference search
  - do not edit the requirement doc solely to remove historical old-path mentions
- [ ] Step 6: validate path consistency and changed-file scope.
  - confirm the new `docs/architecture/**` tree exists and the old top-level architecture paths no longer exist as live docs
  - rerun the stale-reference searches and confirm only the linked requirement doc and this task doc still mention the old paths, unless the reviewer records a deliberate historical exception
  - review the changed-file set to confirm the pass stayed inside docs/prompt cleanup scope

## Coder Handoff

- Execution brief: deliver the confirmed docs-only architecture-doc reorganization. Physically move the two top-level architecture docs and the full `docs/modules/` subtree into `docs/architecture/**`, add one concise layout explainer under the new subtree, then retarget stale repo references so future docs, prompts, and skills read from the new canonical locations.
- Required source docs or files:
  - `docs/requirements/req-20260320-1400-architecture-doc-relocation.md`
  - `docs/tasks/archive/retained-completed/task-20260320-1400-architecture-doc-relocation.md`
  - `docs/00-architecture-overview.md`
  - `docs/20-wms-database-tables-and-schema.md`
  - `docs/modules/**`
  - `.cursor/agents/planner.md`
  - `.cursor/agents/coder.md`
  - `.cursor/agents/code-reviewer.md`
  - `.cursor/skills/saifute-subagent-orchestration/SKILL.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
  - `docs/tasks/archive/retained-completed/task-20260317-1416-migration-outbound-base.md`
- Owned paths:
  - `docs/00-architecture-overview.md` and `docs/architecture/00-architecture-overview.md`
  - `docs/20-wms-database-tables-and-schema.md` and `docs/architecture/20-wms-database-tables-and-schema.md`
  - `docs/modules/**` and `docs/architecture/modules/**`
  - `docs/architecture/README.md`
  - the stale-reference docs found by repo search under `docs/tasks/**` and `docs/fix-checklists/**`
  - the named `.cursor` prompt/skill docs above, but only because this requirement explicitly needs those references retargeted; treat them as one shared single-writer scope, not as ad hoc opportunistic cleanup
- Forbidden shared files:
  - `docs/requirements/**`
  - this task doc
  - `docs/tasks/TASK_CENTER.md`, `docs/tasks/README.md`, and `docs/tasks/_template.md` unless execution-time search proves they contain an in-scope stale architecture-path reference
  - `.cursor/rules/**` unless execution-time search proves they contain an in-scope stale architecture-path reference
  - all application code, runtime scripts, schema, tests, and tooling files outside docs/prompt cleanup
- Constraints and non-goals:
  - do not change runtime behavior, business rules, module contracts, or migration logic
  - preserve the current working-copy content when moving files; do not lose existing uncommitted edits
  - prefer move or rename operations over duplicate-copy patterns so the old canonical paths do not remain as live duplicates
  - keep the new explainer concise and structural; do not rewrite the architecture corpus
  - do not edit the requirement doc just to remove historical mentions of old paths
  - if execution discovers stale references in additional shared files that are clearly outside the planned docs/prompt scope, stop and ask the parent before widening
- Validation command for this scope:
  - `rg -n "docs/00-architecture-overview\\.md|docs/20-wms-database-tables-and-schema\\.md|docs/modules/" docs .cursor`
  - `rg -n "docs/architecture/(00-architecture-overview\\.md|20-wms-database-tables-and-schema\\.md|modules/)" docs .cursor`
  - `git diff --name-status -- docs .cursor`
  - `git status --short -- docs .cursor`
  - validation expectation: the first search should report only the linked requirement doc and this task doc after the cleanup, while the second search and changed-path review should show the new canonical layout and only docs/prompt-scope edits

## Reviewer Handoff

- Review focus:
  - confirm the architecture docs were truly moved, not copied while leaving duplicate live docs at the old paths
  - confirm the new `docs/architecture/README.md` clearly explains the layout without duplicating the moved docs
  - confirm internal links among the overview doc, the flow/schema doc, and the moved module docs now point at `docs/architecture/**`
  - confirm the known prompt and skill docs now cite the new canonical locations and preserve their prior orchestration meaning
  - confirm affected task docs and fix checklists no longer point at the old locations
  - confirm no runtime, schema, script, or test files were touched
  - confirm any residual old-path matches are limited to the linked requirement doc and this task doc, unless an intentional historical exception is recorded explicitly in the review log
- Requirement alignment check:
  - confirm the delivered diff matches the confirmed requirement exactly: physical relocation, one layout explainer, and repo-wide reference cleanup for docs/prompt surfaces
  - confirm the implementation remains docs-only and does not widen into app-code or runtime-behavior changes
- Final validation gate:
  - rerun the stale-reference searches for the three old path patterns
  - inspect the changed-file set to confirm only docs/prompt files changed
  - re-read the moved overview doc, moved flow/schema doc, and `docs/architecture/README.md` together for structure and internal-reference correctness
- Required doc updates:
  - update this task doc's `Review status`, `Review Log`, and `Final Status`
  - if review accepts any intentional residual old-path reference beyond the requirement doc and this task doc, record the exact file and reason in `Review Log`

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - the move itself and the reference cleanup share one canonical path contract, so splitting writers risks broken renames, duplicate old-path edits, or inconsistent final references
  - `.cursor` prompt/skill docs, historical task docs, and review artifacts all need one authoritative replacement path set
  - validation depends on one exhaustive stale-reference baseline and one final residual-reference check, which is easiest to keep correct with a single writer

## Review Log

- Validation results:
  - Reviewer reread the linked requirement doc, this task doc, `docs/architecture/README.md`, `docs/architecture/00-architecture-overview.md`, `docs/architecture/20-wms-database-tables-and-schema.md`, `.cursor/agents/planner.md`, `.cursor/agents/coder.md`, `.cursor/agents/code-reviewer.md`, `.cursor/skills/saifute-subagent-orchestration/SKILL.md`, and `docs/tasks/archive/retained-completed/task-20260317-1416-migration-outbound-base.md`.
  - Repo searches for `docs/00-architecture-overview.md`, `docs/20-wms-database-tables-and-schema.md`, and `docs/modules/` now return only `docs/requirements/req-20260320-1400-architecture-doc-relocation.md` and this task doc; no residual old-path matches remain in `.cursor/**`, `docs/tasks/**` outside this task doc, or `docs/fix-checklists/**` (only `README.md` may remain there after checklist cleanup).
  - Repo searches for `docs/architecture/00-architecture-overview.md`, `docs/architecture/20-wms-database-tables-and-schema.md`, and `docs/architecture/modules/` confirm the new canonical paths are used from the moved architecture docs, affected task/checklist docs, archived migration baseline docs, `.cursor/agents/*.md`, and `.cursor/skills/saifute-subagent-orchestration/SKILL.md`.
  - Directory and git-state checks confirmed the old top-level live docs are gone and replaced by `docs/architecture/**`; `docs/00-architecture-overview.md`, `docs/20-wms-database-tables-and-schema.md`, and `docs/modules/` no longer exist as live paths.
  - Scoped diff review confirmed the prompt and skill updates retarget canonical paths without changing their orchestration meaning. The moved `docs/architecture/20-wms-database-tables-and-schema.md` diff also carries forward pre-existing working-copy content, which matches this task doc's explicit preserve-latest-content rule rather than a relocation regression.
  - Current repo state still contains unrelated non-scope worktree changes outside this relocation task, including `package.json`, `scripts/notify-feishu.mjs`, and `.cursor/hooks/**`; those broader edits do not indicate relocation drift, but they mean the overall worktree is not a docs-only branch snapshot.
- Findings:
  - No `[blocking]` or `[important]` findings for the scoped docs-only architecture-relocation review.
- Follow-up action:
  - No further repair is required for this scope.

## Final Status

- Outcome:
  - Reviewed clear for the scoped docs-only architecture relocation: `docs/architecture/**` is now the canonical architecture-doc root, the old live paths are gone, `docs/architecture/README.md` explains the subtree layout, and the scoped stale references were retargeted successfully.
- Requirement alignment:
  - Matches the confirmed requirement and this task brief: the two top-level architecture docs and the full module-doc tree were relocated, `.cursor/agents/*.md` and `.cursor/skills/saifute-subagent-orchestration/SKILL.md` now cite the new canonical paths, affected task/checklist references were updated, and no residual old-path matches remain beyond the linked requirement doc and this task doc.
- Residual risks or testing gaps:
  - No runtime or schema validation is required for this docs-only scope. The only delivery caution is repository hygiene: the broader worktree still contains unrelated non-scope changes outside docs/prompt cleanup, so any later commit should keep the relocation files scoped deliberately.
- Directory disposition after completion: archived at `docs/tasks/archive/retained-completed/task-20260320-1400-architecture-doc-relocation.md` and synced in `docs/tasks/TASK_CENTER.md`.
- Next action:
  - None for this scope.
