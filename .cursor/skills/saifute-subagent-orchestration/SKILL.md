---
name: saifute-subagent-orchestration
description: Orchestrates planner, execution, review, and commit phases for non-trivial scoped work in the Saifute NestJS WMS repository. Use when work clearly benefits from a `plan -> code -> review -> fix -> commit` flow with durable handoffs; skip this heavy lane for small, clear, low-risk requests.
---

# Saifute Subagent Orchestration

Use this skill when repository work is large enough to benefit from delegated subagents, or when the user wants a structured delivery flow instead of ad hoc edits. This includes migration, backfill, reconciliation, and cutover-prep work, not only feature delivery.

Do not use this skill as the default for every request. If the request is small, clear, low-risk, and can be completed safely by the parent with direct edits plus focused validation, stay on the lightweight direct lane instead of opening the full orchestration chain.

Default orchestration order:

1. `plan`
2. `code`
3. `review`
4. `fix`
5. `commit`
6. `retrospect`

Do not skip forward unless the user explicitly narrows the scope, or the step is not applicable. Migration-style work keeps the same order, but it requires stricter context, staging or exclusion handling, deterministic generation, replay-vs-copy judgment, and blocker-aware validation.

This is the heavy lane. It is correct for non-trivial work, but it is intentionally too expensive for tiny asks.

## Lightweight direct lane

Use the lightweight direct lane when the request is clearly scoped and does not need durable orchestration state.

Typical signals:

- one file or a very small path set
- no cross-module design choice
- no migration, backfill, reconciliation, or cutover semantics
- no shared-contract rewrite or frozen-boundary risk
- no need for a task doc to resume safely in a later chat
- validation can stay focused and local

On the lightweight direct lane:

- do not create `docs/requirements/*.md` or `docs/tasks/*.md` by default
- do not start `planner` just to satisfy process symmetry
- do not require `code-reviewer` for low-risk docs, rules, wording, or similarly small edits
- read only the smallest relevant files
- edit directly in the parent agent
- run the narrowest useful validation
- escalate to the heavy lane immediately if hidden complexity appears

## Required context

Read the smallest relevant source of truth before assigning work:

- the linked requirement doc under `docs/requirements/**` when the task is driven by a user request
- the workspace folder under `docs/workspace/<workflow>/` when the workflow has one — check `docs/workspace/DASHBOARD.md` for the index
- `docs/architecture/00-architecture-overview.md`
- the specific module docs in `docs/architecture/modules/`
- the files directly related to the task

For any task type with an existing playbook, also read:

- the relevant `docs/playbooks/*/playbook.md` for accumulated execution tips and reusable scripts

For migration, backfill, reconciliation, or cutover-prep work, also read:

- `docs/tasks/archive/retained-completed/task-20260319-1905-migration-master-plan-relocation.md`
- `docs/architecture/20-wms-business-flow-and-optimized-schema.md` when the work touches inventory, workflow, reporting, document relations, reservation semantics, or business-state semantics
- the relevant `prisma/**`, `scripts/**`, `docs/**`, or module surfaces that define the current schema and runtime behavior

Treat those docs and files as the source of truth for requirement scope, module boundaries, dependencies, transaction rules, testing scope, runtime semantics, staging expectations, and cutover constraints.

If legacy data and the current runtime disagree, adapt the legacy data to the current runtime and schema unless the user explicitly expands scope to change runtime behavior.

## Requirement-first orchestration

For non-trivial work, create or locate one concise requirement doc under `docs/requirements/**` before planning.

- requirement doc: a concise Chinese user-and-AI interaction layer that records the user's requirement plus concise user-facing orchestration status
- workspace under `docs/workspace/<workflow>/`: human decision workspace — progress narrative, pending decisions with trade-offs, decision log, rich media assets; write access restricted to parent orchestrator
- task doc in `docs/tasks/**`: detailed execution scope, validation state, review loop, handoff

The requirement doc should stay concise. Use it for user-facing status only:

- `阶段进度`
- `当前状态`
- `阻塞项`
- `下一步`

Completed-state requirement docs may explicitly say `阻塞项: None` and `下一步: None / 归档 / 等待新需求`. Do not manufacture pending confirmations, blockers, or faux follow-up steps after the scoped work is objectively complete.

The task doc must link back to the requirement doc and carry forward the confirmed understanding.

When the workflow warrants a workspace (non-trivial scope, pending human decisions, or multiple decision points), the parent orchestrator should create or update `docs/workspace/<workflow>/` and keep the `DASHBOARD.md` index current. Workspace content is optimized for human reading — trade-off tables, option analysis, decision rationale — not agent metadata.

New or materially changed requirement docs default to `needs-confirmation`. Do not treat them as accepted scope until the user explicitly confirms and the doc can be marked `confirmed`.

If you only sync current progress into an already confirmed requirement doc without changing the requirement understanding, keep it `confirmed`.

If the requirement is unclear, has unresolved questions, or the planned execution would widen or rewrite it, stop and ask the user before planning, coding, or review sign-off.

## Intent mapping

Interpret these requests as delivery requests unless the user explicitly narrows scope:

- `implement this`
- `finish this task`
- `complete this`
- `fix this issue`
- `continue`
- `resume this task`
- `continue in a new chat`
- `pick up from the task doc`
- `接着上次继续`
- `deliver this`
- `prepare this migration`
- `write the backfill`
- `reconcile this legacy data`
- `make this cutover-ready`
- `finish the migration script`

For delivery requests, do not stop after only planning, one implementation pass, one review pass, or one targeted validation run. Keep the `review -> fix` loop moving until the scoped work is ready for handoff or a real blocker requires user direction.

## Resume and new-chat continuation

When the user says `continue`, `resume`, `pick this up`, or asks to continue in a new chat:

1. Check lifecycle truth first: `docs/tasks/TASK_CENTER.md`, `docs/requirements/REQUIREMENT_CENTER.md`, and `docs/workspace/DASHBOARD.md` / archive placement decide whether a scope is still active.
2. Look for an existing root-level `docs/tasks/*.md` execution brief only for the still-active scope before starting fresh exploration.
3. If an active task doc exists, treat it as the primary runtime handoff source and also read:
   - the linked requirement doc under `docs/requirements/**`, if the task doc names one
   - the related `docs/fix-checklists/*.md`
   - any report files, validation artifacts, or generated outputs referenced by the task doc
4. If only archived docs exist, treat them as provenance only. Do not revive that scope unless the user explicitly asks to reopen it or a new requirement/task is created for a real follow-up.
5. Reconstruct and state, at least to yourself before delegating:
   - current scope
   - last completed step
   - validations already passed
   - remaining blockers, pending gates, or sign-off needs
   - the next smallest safe action
6. Do not restart planning from scratch unless:
   - no task doc exists
   - the task doc is stale, contradictory, or no longer matches the repo state
   - the user explicitly asks to replan

For migration-style work, also recover:

- whether `dry-run`, `execute`, and `validate` were actually run or only planned
- the latest relevant report paths and which one should be read first
- whether rerun is safe from the current target baseline
- any required environment, credentials, or operational prerequisites that are still missing

## Subagent roles

Choose the smallest useful set:

- `planner`: use the repo's dedicated `planner` subagent to scope the task, identify impacted files, surface risks, propose validation, decide whether parallel writers are safe, and write or update the task doc under `docs/tasks/**`
- `coder`: implementation and refactor worker for explicitly assigned files, modules, scripts, schema surfaces, or docs, using the assigned task doc as the execution brief
- `code-reviewer`: review worker for correctness, regressions, missing tests, contract drift, validation sufficiency, and review-phase task-doc or checklist updates

Use `explore` only as a supporting readonly discovery worker when the planner needs fast codebase search.

## Migration and backfill guardrails

Use these durable rules for migration-style orchestration:

- adapt legacy data to the current runtime and schema; do not widen runtime semantics by default
- isolate uncertain, conflicting, or incomplete records into explicit staging or exclusion paths instead of forcing them into live tables
- keep generated identifiers, renumbering, ordering, derived dates, and mapping outputs deterministic so reruns produce the same result
- prefer replay for derived or operational state such as inventory and similar projections; use direct copy only when the target is not derived and the plan explicitly supports it
- do not invent relations, audit outcomes, or stock effects from ambiguous legacy signals; unresolved records stay pending, archived, or excluded until safely resolved
- do not silently drop unmapped legacy fields; archive them, carry them through an explicit schema change, or require explicit sign-off that they are intentionally discarded
- do not claim cutover readiness while pending relation work, unresolved exclusions, or required business sign-off are still hidden in the workflow
- do not use `cutover` as a catch-all synonym for technical completion, operational switchover instructions, and business sign-off; name those states separately

## Default workflow

### 1. Plan

Start with the `planner` subagent only when the task is non-trivial, ambiguous, cross-cutting, high-risk, or needs a durable task doc for continuation.

Do not start `planner` for lightweight direct-lane requests just because the repository has a planning system.

Ask the planner to return:

- related requirement path and whether it is clear enough for planning
- goal and acceptance criteria
- exact `docs/tasks/*.md` path created or updated
- impacted files, modules, or operational surfaces
- proposed implementation steps
- likely risks and contract-sensitive areas
- required validation commands
- whether multiple writer agents are safe

For migration-style tasks, also require:

- staging-or-exclusion handling for ambiguous, conflicting, or out-of-scope records
- replay-vs-copy judgment for each derived or operational target
- deterministic generation rules for identifiers, ordering, renumbering, or derived dates
- blocker list, sign-off needs, and cutover-readiness gates

The `planner` subagent may edit only `docs/tasks/**`. It must not edit application code or shared rules as part of planning.

### 2. Code

Use `coder` for implementation after the plan and task doc are clear.

Each writer handoff must include:

- assigned `docs/tasks/*.md` path
- owned paths
- forbidden shared files
- task goal
- validation command for that scope
- any frozen contracts that must not change silently

For migration-style handoffs, also include:

- whether the scope owns staging structures, mapping outputs, reconciliation queries, or cutover-prep artifacts
- which records are allowed into runtime tables versus required to stay staged or excluded
- the deterministic generation rules the writer must preserve
- whether the work is replay, direct copy, reconciliation-only, or readiness-only

One writer is the default. Use multiple writer agents only when their writable scopes are explicitly disjoint before launch. Shared staging schemas, reconciliation outputs, and cutover-readiness artifacts default to single-owner.

### 3. Review

Run `code-reviewer` after substantive edits or when the changed risk surface benefits from an independent review pass.

For lightweight direct-lane requests such as low-risk docs, rules, wording, or tiny configuration changes, parent self-check plus focused validation is usually enough unless hidden risk appears.

The reviewer should focus on:

- bugs and behavioral regressions
- requirement drift between `docs/requirements/**`, `docs/tasks/**`, and delivered changes
- missing or weak tests
- contract drift
- auth, workflow, inventory, and transaction safety where relevant
- whether the selected validation is sufficient for the affected scope
- whether the assigned task doc still matches the delivered code and recorded validation
- for migration-style work, silent runtime widening, missing staging or exclusion handling, non-deterministic generation, replay-vs-copy mismatch, and hidden blockers

The reviewer should read the assigned task doc before review and update the task doc and `docs/fix-checklists/**` when the scope warrants a durable review artifact.

### 4. Fix

If `code-reviewer` reports any open `[blocking]` or `[important]` finding, route the findings back to `coder` for fixes, then rerun `code-reviewer`.

Treat review as a repair loop, not a stopping point.

### 5. Commit

Commit creation is a parent-orchestrator step only.

Only proceed to commit when all of the following are true:

1. The required validation passed for the scoped work.
2. `code-reviewer` reports no remaining open `[blocking]` or `[important]` findings.
3. There is no unresolved shared-contract or ownership blocker.
4. The user explicitly asked for a commit.
5. For migration-style work, unresolved staged or excluded records are either handled within scope or explicitly reported with the required sign-off or follow-up owner.

Do not let subagents create the commit directly.

## Launch rules

1. It is valid to use no subagent at all when the request fits the lightweight direct lane.
2. Default to at most 4 concurrent subagents.
3. The `planner` subagent may write only `docs/tasks/**`.
4. Multiple writer subagents are allowed only when their writable scopes are explicitly disjoint before launch; shared staging schemas, mapping tables, reconciliation reports, and cutover evidence stay single-owner.
5. Do not run write-capable subagents in background mode.
6. Shared files default to parent ownership unless one worker is explicitly named as the sole owner.
7. Before finalizing substantive work, involve `code-reviewer`.
8. If the task is ambiguous or has meaningful trade-offs, either switch to Plan Mode first or use the `planner` subagent before any code write step.

## Frozen repo constraints

Never let a subagent bypass these repository rules:

- `inventory-core` is the only stock write entry point
- `workflow` owns audit-document behavior and review-state semantics
- `session` uses JWT as a session ticket, with Redis as the session source of truth
- `rbac` owns permission strings, route trees, and data-scope policies
- `ai-assistant` may query and orchestrate tools, but must not write business data directly
- migration and backfill work must adapt legacy data to the current runtime and schema unless the user explicitly approves a runtime or contract change

## Shared knowledge layers

The parent orchestrator owns the distinction between durable rules and runtime context.

- put stable, reusable facts in `.cursor/rules/*.mdc`
- do not write temporary runtime observations into rules
- put detailed task-scoped runtime context in `docs/tasks/**`, the parent handoff, or another clearly temporary shared context artifact when multiple subagents need the same live status
- keep the linked `docs/requirements/**` updated with concise user-facing progress instead of leaving orchestration status only in chat memory
- put decision-relevant findings (trade-offs, option analysis, decision rationale, human-intervention needs) in `docs/workspace/<workflow>/` instead of leaving them only in task docs or chat history; parent orchestrator owns all workspace writes
- before promoting a new observation into rules, confirm that it is likely to remain valid across future tasks and does not contain secrets

## End-of-turn handoff requirements

Before stopping and returning control to the user on any non-trivial task, make sure the continuation-critical runtime state is written to durable docs instead of relying on chat memory alone.

Prefer the active `docs/tasks/*.md` as the detailed handoff source, and sync concise user-facing progress into the linked `docs/requirements/*.md`. If task-doc ownership belongs to `planner` or `code-reviewer`, route the detailed update through the appropriate owner before stopping instead of leaving the latest state only in the conversation.

The durable handoff should capture:

- current status
- what changed this turn
- validation run and result
- remaining blockers, risks, sign-off needs, or pending gates
- the next recommended step
- exact commands, report paths, or artifacts the next chat should read or run first
- any required environment or credential prerequisites still missing

The requirement doc should capture the same turn in concise user-facing form:

- `阶段进度`
- `当前状态`
- `阻塞项`
- `下一步`

When the workflow has a workspace under `docs/workspace/<workflow>/`, also sync:

- new or resolved decision items to `decisions.md`
- progress narrative updates to the workspace `README.md`
- dashboard row updates to `docs/workspace/DASHBOARD.md` (health status, pending decision summary)

If a future chat must be able to resume safely, the task doc and related checklist should be sufficient for the parent orchestrator to continue without hidden assumptions.

Also perform one explicit consistency sweep before ending the turn:

- requirement lifecycle and path match the real scope state
- task lifecycle and path match the linked requirement
- workspace dashboard row and workspace folder placement agree on active vs archived
- reports and user-facing docs do not describe completed technical steps as waiting on fake acknowledgement
- if the scope is complete, archive it now instead of leaving a stale root anchor for `continue` to pick up later

## File ownership guidance

The `coder` may edit:

- its owned module directories under `src/modules/<module>/`
- tests for those modules
- module-local docs that describe its owned contracts or behavior
- explicitly assigned `prisma/**`, `scripts/**`, `docs/**`, `src/shared/**`, `src/app*.ts`, or other shared surfaces directly required by the task
- the assigned task doc under `docs/tasks/**` only when the parent explicitly grants documentation ownership
- narrow shared files that are directly required by the task
- parallel-owned scopes only when the parent explicitly assigned a disjoint writable boundary

The `coder` must avoid:

- editing `docs/tasks/**` by default when the task doc is only an execution brief
- unapproved edits to another module's internal repository or table access
- new cross-module dependencies that are not documented
- silent changes to shared contracts without updating docs when needed
- touching parent-owned shared files unless the handoff explicitly made that worker the sole owner

The `planner` subagent must avoid:

- file edits outside `docs/tasks/**`
- speculative contract rewrites
- calling for parallel writers without naming disjoint scopes
- calling migration work cutover-ready without naming remaining blockers and sign-off needs

The `code-reviewer` owns:

- review findings and severity
- validation judgment
- test coverage feedback
- blocker visibility and readiness judgment for migration-style work

## Parent merge behavior

When parallel writers were active:

- re-read the latest file content before any parent merge or shared-file edit
- auto-reconcile overlapping child changes only when the source is attributable to active child agents and the frozen boundaries are still respected
- stop and ask the user only if the source may be a real user edit, ownership is ambiguous, or the overlap crosses an unapproved shared boundary

## Required handoff from every subagent

Ask each subagent to return:

- the task doc path used or created
- a concise summary of what it changed or proposes
- files, modules, or operational surfaces touched
- shared contracts assumed or changed
- tests or validation run, plus what still needs to run
- the resume point for the next chat
- which reports, artifacts, or commands should be read or run first on continuation
- concise requirement-doc sync lines for `阶段进度` / `当前状态` / `阻塞项` / `下一步`
- risks, blockers, sign-off needs, and follow-up work
- `decision_candidates` (optional): items discovered during execution that may need human decision — include the issue, options considered, trade-offs, and recommended action; the parent orchestrator will evaluate and write qualifying items into `docs/workspace/<workflow>/decisions.md`

Additionally require:

- planner: implementation steps, validation plan, parallelization safety, and the exact execution scope assigned to `coder`
- planner for migration-style work: staging-or-exclusion plan, replay-vs-copy judgment, deterministic generation rules, cutover blockers, and current-runtime alignment checks for target constants or status semantics
- code-reviewer: findings ordered by severity, plus clear fix actions for any `[blocking]` or `[important]` item

## Validation rules

Use the narrowest useful validation command during iteration, but do not declare the task complete without the validation appropriate for the affected surface.

Typical gates include:

- `pnpm lint`
- targeted `pnpm test -- <scope>`
- `pnpm test`
- `pnpm test:e2e`
- migration dry-runs, repeatable script output checks, and scoped reconciliation queries or reports

For migration-style work, validation must cover:

- deterministic rerun behavior for mappings, ordering, renumbering, or derived dates
- alignment with current target constants, enum values, status strings, and runtime semantics so deterministic but wrong output still fails validation
- staging-or-exclusion handling for unresolved records
- replay-vs-copy justification for derived or operational tables
- blocker-aware reconciliation and cutover-readiness evidence instead of a single green script

Choose the smallest command that credibly proves the change during iteration, then run the broader gate that matches the final risk surface before review sign-off or commit readiness. For migration-style work, do not call the task complete just because one import or replay pass finished; require evidence that unresolved records, exclusions, and sign-off needs are surfaced.

## Completion protocol

Treat commit readiness as the end of the orchestration loop, not as a side effect of file edits.

Stop only when one of these is true:

1. The scoped task completed its `plan -> code -> review -> fix -> commit -> retrospect` loop.
2. The user explicitly asked for `plan-only`, `review-only`, or `docs-only`.
3. A real blocker remains that requires user direction.

For migration, backfill, reconciliation, or cutover-prep work, "ready" means:

- deterministic generation rules are defined and preserved
- unresolved records are staged, archived, or excluded instead of silently dropped or guessed
- unmapped legacy fields are archived, mapped through an approved schema change, or explicitly signed off as intentionally discarded
- replay-vs-copy decisions are explicit for derived or operational tables
- remaining blockers, sign-offs, or cutover gates are named in the handoff

Use this blocker bar:

- real blocker: user-edit conflict, frozen-boundary ownership ambiguity, contradictory architecture truth, missing required credentials or resources, an unresolved product choice that cannot be decided safely alone, a data-shape conflict that would widen runtime semantics, or remaining exclusions that need business sign-off before cutover
- not a real blocker: a partial implementation is stable, one test passed, a review found issues, or the parent simply wants to pause and summarize

If the user says `no-commit`, finish the requested scope and review or fix loop, then stop without creating a commit.

## Retrospect protocol

After a non-trivial task reaches completion (post-commit or post-completion-protocol), the parent orchestrator runs a lightweight retrospect pass. Skip retrospect for lightweight direct-lane tasks.

Retrospect is also triggered when the user explicitly says `总结经验`, `复盘`, `retrospect`, or `lessons learned`.

### What to capture

Review the full task lifecycle and identify:

- patterns that worked well (reusable approaches)
- anti-patterns or unexpected complexity discovered
- review → fix loops that repeated 2+ times for the same root cause
- validation gaps discovered late
- migration, backfill, or orchestration edge cases resolved

### Where to write

1. **L2 playbook entry**: append a new entry to the relevant `docs/playbooks/{domain}/playbook.md` using the entry format defined in `docs/playbooks/README.md`. Set maturity to `initial observation` for first-time patterns or `verified ✓` if the same pattern was confirmed across multiple tasks.
2. **L2 reusable script**: if a manual check or validation step appeared 2+ times during the task, extract it as a script in `docs/playbooks/{domain}/`.
3. **L4 rule candidate**: if an entry is stable enough to freeze as a cross-task constraint, propose it to the user for confirmation before writing to `.cursor/rules/*.mdc`. Mark the playbook entry as `promoted → rules/xxx.mdc`.

### Ownership

Retrospect is a parent-orchestrator step. Do not delegate it to subagents — only the parent has the full lifecycle view (plan iterations, review loop count, validation failure patterns, scope drift history).

### When to skip

- Lightweight direct-lane tasks with no non-obvious lessons
- The user explicitly says `skip retrospect` or `no-retrospect`
- The task was cancelled before meaningful execution

## Additional reference

- See [reference.md](reference.md) for the recommended agent matrix and handoff templates.
