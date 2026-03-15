# Subagent Matrix

## Delivery agent

### `execution-agent`

- Owns: one explicitly assigned batch at a time
- Batch A typical files: `src/modules/auth/**`, `src/modules/session/**`, `src/modules/rbac/**`
- Batch B typical files: `src/modules/master-data/**`, `src/modules/inventory-core/**`, `src/modules/workflow/**`
- Batch C typical files: `src/modules/inbound/**`, `src/modules/outbound/**`, `src/modules/workshop-material/**`, `src/modules/project/**`
- Batch D typical files: `src/modules/audit-log/**`, `src/modules/reporting/**`, `src/modules/file-storage/**`, `src/modules/scheduler/**`, `src/modules/ai-assistant/**`
- Shared files allowed when needed: guards, decorators, events, Prisma transaction wrappers, typed constants, narrow DTO contracts, fixtures, and config directly required by the task
- Must preserve: batch order, documented module boundaries, `inventory-core` as the only stock write entry, lightweight `workflow`, JWT ticket plus Redis session model, and AI as query-orchestration only

## Parallel writer policy

- Multiple writer `execution-agent` workers are allowed only when their writable scopes are explicitly disjoint before launch
- Write-capable subagents should not run in background mode
- Shared files such as `src/app.module.ts`, `src/main.ts`, `src/shared/**`, `prisma/schema.prisma`, route or permission registries, shared docs/contracts, and cross-module tests stay parent-owned unless one worker is explicitly named as the sole owner
- Each writer handoff should list owned paths and forbidden shared files so the parent can verify scope separation before launch
- If overlapping child changes appear and the source is clearly an active child worker, the parent should re-read the latest content and merge on top of it instead of stopping immediately

## Cross-cutting agents

### `architecture-guardian`

- Best for: large refactors, shared-contract changes, or parallel tasks that risk boundary drift
- Default mode: review-first; it may switch into planning or doc-patch support when the parent task explicitly needs contract alignment
- Typical docs it may patch when authorized: `docs/00-architecture-overview.md`, `docs/10-subagent-build-batches.md`, and cross-module contract sections under `docs/modules/`
- It should not become the default editor of `docs/fix-checklists/` or module-internal implementation notes
- Checks:
  - module boundaries align with docs
  - transaction ownership stays in application layer
  - controllers stay thin and DTO-driven
  - no accidental direct table reach-through across modules
  - permission, session, and stock semantics are preserved

### `code-reviewer`

- Best for: reviewing correctness, deciding missing tests, running the correct integration or e2e gate, and optionally adding validation coverage when the parent task allows edits
- Typical files: `test/**`, module `*.spec.ts`, e2e specs, fixtures, and changed implementation files under review
- Owns: review findings, severities, validation judgment, and the review markdown/checklist content that records and updates those conclusions
- Checks:
  - auth/session lifecycle
  - inventory side effects and reverse operations
  - workflow resets and downstream-void rules
  - scheduler execution logging
  - AI SSE protocol and tool-call boundaries
  - required batch-level validation command was actually executed

## Doc ownership

- `execution-agent`: module-local fact docs and owned-module behavior notes, when the change is within its assigned scope
- `architecture-guardian`: cross-module contracts, dependency direction, transaction ownership, batch planning, and architecture-facing docs
- `code-reviewer`: `docs/fix-checklists/**` review and closure artifacts
- Parent orchestrator: decides when docs must be updated first and routes the edit to the right owner

## Rules vs runtime context

- Use `.cursor/rules/*.mdc` for durable facts and repository-wide constraints that future tasks should inherit
- Keep live execution state in the parent handoff or a temporary shared context artifact, not in rules
- Good rule candidates: verified dev environment facts, frozen workflow rules, repo-wide orchestration conventions
- Bad rule candidates: current task status, temporary blockers, one-off test failures, or branch-local workaround notes

## Suggested combinations

- Batch A implementation: `execution-agent` + `code-reviewer`
- Checklist-driven fix flow: `execution-agent` -> `code-reviewer` -> if any `[blocking]` or `[important]` finding remains, loop back to `execution-agent` -> once clear, `code-reviewer` updates the checklist and signs off
- Batch finalization flow: `execution-agent` -> `architecture-guardian` when contracts drift -> `code-reviewer` -> if findings remain, route them back to `execution-agent` and repeat review -> `code-reviewer` updates the checklist and signs off -> parent orchestrator -> commit subagent using the commit skill
- Shared contracts or transactions: `execution-agent` + `architecture-guardian` + `code-reviewer`
- Batch C implementation: `execution-agent` + `architecture-guardian` + `code-reviewer`
- Batch D implementation: `execution-agent` + `architecture-guardian` + `code-reviewer`
- Large end-to-end feature: one delivery `execution-agent`, plus both cross-cutting agents, with `code-reviewer` maintaining any persisted fix checklist that belongs to the reviewed scope

## Finalization ownership

- Commit creation belongs to the parent orchestrator only after the scoped batch passes its validation gate and cleanup checks
- Requests such as `continue building batch x`, `finish batch x`, or `don't stop until this batch is done` are delivery/completion requests by default, so the parent should not stop after a repaired slice or review handoff unless the user explicitly narrows scope
- For batch delivery/completion requests, review output and checklist generation are not valid stopping points; the parent orchestrator should keep the repair loop running until commit or a real blocker
- When commit creation is allowed, the parent orchestrator must hand off the final commit work to a dedicated commit subagent that uses the commit skill
- `code-reviewer` may report that checklist cleanup is complete, but it does not own the commit decision
- IDE hooks may format markdown or guard shell usage, but they must not decide that a batch is complete or trigger the final commit step automatically
- Only stop after review and cleanup handoff when the user explicitly asked for `review-only`, `docs-only`, or `no-commit`

## Handoff format

Ask every subagent to report back in this shape:

```markdown
Summary:
- ...

Files or modules touched:
- ...

Contracts assumed or changed:
- ...

Tests run or still needed:
- ...

Risks or blockers:
- ...
```

For checklist-driven repair work, append:

```markdown
Checklist items addressed:
- ...

Evidence for closure:
- ...

Checklist items still open:
- ...
```

For final batch sign-off, append:

```markdown
Batch gate passed:
- yes or no, with the command or evidence

Open blocking or important findings:
- none, or list the remaining items

Checklist cleanup complete:
- yes or no, with the target checklist file

Ready for parent commit step:
- yes or no, with the blocker if not ready
```

Interpret `Ready for parent commit step` strictly:

- `yes` means the parent orchestrator may now invoke the commit subagent that uses the commit skill
- `no` means no agent should create a commit yet
