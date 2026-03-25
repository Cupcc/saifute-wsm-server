# Subagent Matrix

## Lightweight direct lane

- Best for: small, clear, low-risk requests that can be completed safely by the parent without durable task-state management
- Typical work:
  - wording or comment fixes
  - rule or prompt phrasing adjustments
  - single-file config tweaks
  - clearly localized bug or lint fixes
  - simple command execution or read-only investigation
- Default path: parent reads the smallest relevant files -> edits directly -> runs focused validation -> stops
- Escalate when: hidden complexity appears, scope expands beyond a tiny path set, a frozen/shared contract is touched, or safe continuation would require a durable `docs/tasks/*.md` handoff

## Planner agent

### `planner`

- Best for: turning a user request into an implementation plan and task doc before any code write step with the repo's dedicated planning worker
- Owns:
  - requirement-to-task alignment
  - requirement-doc sync guidance for the parent orchestrator
  - task decomposition
  - impacted file, module, schema, script, doc, and operational-surface discovery
  - validation planning
  - parallelization safety judgment
  - blocker and sign-off visibility
  - writing or updating `docs/tasks/*.md`
- Must not:
  - edit files outside `docs/tasks/**`
  - invent unsupported contracts
  - recommend parallel writers without naming disjoint writable scopes

Typical output:

- task goal and acceptance criteria
- impacted files, modules, shared surfaces, and operational targets
- ordered implementation steps
- likely risks and frozen-contract touchpoints
- recommended validation commands
- for migration, backfill, reconciliation, or cutover-prep work: staging-or-exclusion handling, replay-vs-copy judgment, deterministic generation rules, cutover blockers, sign-off or follow-up needs, and runtime-alignment checks for target constants or status semantics

## Delivery agent

### `coder`

- Best for: scoped implementation, refactor, bug-fix, migration, backfill, reconciliation, cutover-prep, and related docs or tooling work
- Owns: one explicitly assigned writable scope at a time, using an assigned `docs/tasks/*.md` as the execution brief and staying aligned with the linked `docs/requirements/*.md`
- Typical files:
  - `src/modules/**`
  - related tests
  - `prisma/**`
  - `scripts/**`
  - `docs/**`
  - `src/shared/**`
  - `src/app*.ts`
  - module-local docs
  - narrow shared files or operational artifacts directly required by the task
- Must preserve:
  - documented module boundaries
  - `inventory-core` as the only stock write entry point
  - `workflow` as the owner of workflow behavior
  - JWT ticket plus Redis session model
  - RBAC ownership of permission and scope policy
  - AI as query-orchestration only
  - `docs/tasks/**` as read-only unless documentation ownership was explicitly reassigned

## Review agent

### `code-reviewer`

- Best for: reviewing correctness, regressions, test sufficiency, and validation completeness
- Typical files:
  - changed implementation files
  - related `*.spec.ts` files
  - e2e specs and fixtures when relevant
- Owns:
  - review findings
  - severity judgment
  - validation judgment
  - explicit fix requests for follow-up loops

Checks include:

- requirement drift between the linked requirement doc, task doc, and delivered changes
- auth and session lifecycle where relevant
- inventory side effects and reverse operations
- workflow regressions
- transaction safety
- missing tests
- whether the executed validation actually matches the changed risk surface
- for migration-style work, staging or exclusion handling, replay-vs-copy fit, deterministic generation, runtime-alignment checks, and blocker visibility

## Parallel writer policy

- Multiple writer `coder` workers are allowed only when their writable scopes are explicitly disjoint before launch
- Write-capable subagents should not run in background mode
- Shared files such as `src/app.module.ts`, `src/main.ts`, `src/shared/**`, `prisma/schema.prisma`, route or permission registries, shared docs or contracts, active `docs/tasks/*.md`, shared staging schemas, reconciliation outputs, cutover evidence, and cross-module tests stay parent-owned unless one worker is explicitly named as the sole owner
- Each writer handoff should list owned paths, forbidden shared files, and the validation command for that scope
- If overlapping child changes appear and the source is clearly an active child worker, the parent should re-read the latest content and merge on top of it instead of stopping immediately

## Rules vs runtime context

- Use `.cursor/rules/*.mdc` for durable facts and repository-wide constraints that future tasks should inherit
- Keep detailed live execution state in `docs/tasks/*.md`, the parent handoff, or a temporary shared context artifact, not in rules
- Keep concise user-facing orchestration status in the linked `docs/requirements/*.md`
- Keep decision-relevant findings (trade-offs, options, human-intervention needs) in `docs/workspace/<workflow>/`; parent orchestrator owns all workspace writes
- Good rule candidates: verified dev environment facts, frozen workflow rules, repo-wide orchestration conventions
- Bad rule candidates: current task status, temporary blockers, one-off test failures, or branch-local workaround notes

## Suggested combinations

- Lightweight direct task: parent reads the smallest relevant files -> edits directly -> runs focused validation -> optional parent self-review -> stop
- Non-trivial task flow: create or confirm `docs/requirements/*.md` -> `planner` writes `docs/tasks/*.md` and returns req-sync lines + decision_candidates -> parent syncs concise progress to the requirement doc -> parent writes qualifying decision_candidates to `docs/workspace/<workflow>/decisions.md` and updates dashboard -> `coder` executes from the task doc -> `code-reviewer` reviews, tests, and updates docs -> if any `[blocking]` or `[important]` finding remains, route back to `coder` -> rerun `code-reviewer` -> parent syncs progress to requirement doc and workspace -> parent commit step only if the user explicitly asked for a commit -> parent retrospect: append lessons to `docs/playbooks/{domain}/playbook.md`
- Requirement-first flow for durable work: create or confirm `docs/requirements/*.md` -> create workspace folder under `docs/workspace/<workflow>/` when scope is non-trivial -> `planner` writes `docs/tasks/*.md` against it -> `coder` executes the aligned scope -> `code-reviewer` checks requirement drift and validation -> parent keeps requirement doc and workspace updated
- Multi-module task with safe disjoint scopes: `planner` writes task docs or explicit scoped sections -> parallel `coder` workers with explicit boundaries -> `code-reviewer` -> fix loop as needed
- Review-heavy task: `planner` writes `docs/tasks/*.md` -> `code-reviewer`
- Small but non-trivial bugfix: `planner` writes `docs/tasks/*.md` -> `coder` -> `code-reviewer` -> fix loop -> parent commit step only if the user explicitly asked for a commit

## Retrospect phase

After a non-trivial task completes, the parent orchestrator reviews the full lifecycle and writes to `docs/playbooks/`.

Signals worth capturing:

- review → fix loop count > 1 for the same root cause
- validation commands that had to be added mid-task (gap discovered late)
- scope drift between plan and delivered code
- migration edge cases: staging surprises, replay-vs-copy misfits, deterministic generation fixes
- subagent coordination issues: shared-file conflicts, context loss across handoffs
- patterns that shortened delivery time or prevented regressions

What to produce:

- A new entry in `docs/playbooks/{domain}/playbook.md` (see entry format in `docs/playbooks/README.md`)
- Optionally a reusable script in `docs/playbooks/{domain}/` when a manual step appeared 2+ times
- Optionally a rule candidate proposed to the user for L4 promotion

## Finalization ownership

- Commit creation belongs to the parent orchestrator only
- Do not let `coder` or `code-reviewer` create the commit directly
- Only proceed to commit after required validation passes, review is clear of open `[blocking]` and `[important]` findings, and the user explicitly asked for a commit
- For delivery requests, review is not a stopping point; the parent should keep the repair loop moving until commit readiness or a real blocker
- Only stop early when the user explicitly asked for `plan-only`, `review-only`, or `docs-only`
- If the user says `no-commit`, finish the requested scope and review or fix loop, then stop without creating a commit

## Handoff format

Ask every subagent to report back in this shape:

```markdown
Task doc path:
- ...

Requirement path:
- ...

Summary:
- ...

Files, modules, or operational surfaces touched:
- ...

Contracts assumed or changed:
- ...

Tests run or still needed:
- ...

Risks, blockers, sign-off needs, or follow-up work:
- ...

Requirement doc sync:
- 阶段进度: ...
- 当前状态: ...
- 阻塞项: ...
- 下一步: ...

Decision candidates (optional — items needing human decision):
- issue: ...
  options: ...
  trade-offs: ...
  recommended: ...
```

Planner append:

```markdown
Task doc status:
- created or updated, and whether it is ready for `coder`

Implementation steps:
- ...

Validation plan:
- ...

Parallel writer safety:
- safe or unsafe, with the reason

Migration-style append when relevant:
- staging-or-exclusion handling
- replay-vs-copy judgment
- deterministic generation rules
- cutover blockers and runtime-alignment checks
- required sign-off or follow-up owner
```

Reviewer append:

```markdown
Task doc updates:
- review status, validation notes, follow-up state

Findings:
- [blocking] ...
- [important] ...
- [suggestion] ...
- [praise] ...

Validation Results:
- commands run, what passed or failed, and whether the required gate was satisfied

Open Questions:
- ...

Residual Risks Or Testing Gaps:
- ...

Short Summary:
- ...
```
