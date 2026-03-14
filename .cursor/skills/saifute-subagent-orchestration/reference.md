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

## Cross-cutting agents

### `architecture-guardian`

- Best for: large refactors, shared-contract changes, or parallel tasks that risk boundary drift
- Default mode: review-first; readonly unless explicitly asked to patch
- Checks:
  - module boundaries align with docs
  - transaction ownership stays in application layer
  - controllers stay thin and DTO-driven
  - no accidental direct table reach-through across modules
  - permission, session, and stock semantics are preserved

### `code-reviewer`

- Best for: reviewing correctness, deciding missing tests, running the correct integration or e2e gate, and optionally adding validation coverage when the parent task allows edits
- Typical files: `test/**`, module `*.spec.ts`, e2e specs, fixtures, and changed implementation files under review
- Checks:
  - auth/session lifecycle
  - inventory side effects and reverse operations
  - workflow resets and downstream-void rules
  - scheduler execution logging
  - AI SSE protocol and tool-call boundaries
  - required batch-level validation command was actually executed

### `doc-checklist-cleaner`

- Best for: cleaning `docs/fix-checklists/**` after follow-up work, marking resolved checklist items complete, refreshing summaries and residual risks, and conservatively removing obsolete review artifacts
- Typical files: `docs/fix-checklists/*.md`, especially an original review file plus any later re-check or follow-up file used as closure evidence
- Checks:
  - only evidence-backed fixes are marked `- [x]`
  - unresolved or uncertain items stay open
  - residual risks and summaries still match the latest code and test state
  - duplicate or stale checklist files are deleted only when clearly safe

## Suggested combinations

- Batch A implementation: `execution-agent` + `code-reviewer`
- Checklist-driven fix flow: `execution-agent` -> `code-reviewer` when validation is needed -> `doc-checklist-cleaner`
- Batch finalization flow: `execution-agent` -> `architecture-guardian` when contracts drift -> `code-reviewer` -> `doc-checklist-cleaner` -> parent orchestrator -> commit subagent using the commit skill
- Shared contracts or transactions: `execution-agent` + `architecture-guardian` + `code-reviewer`
- Batch C implementation: `execution-agent` + `architecture-guardian` + `code-reviewer`
- Batch D implementation: `execution-agent` + `architecture-guardian` + `code-reviewer`
- Large end-to-end feature: one delivery `execution-agent`, plus both cross-cutting agents, then `doc-checklist-cleaner` if a persisted fix checklist must be updated

## Finalization ownership

- Commit creation belongs to the parent orchestrator only after the scoped batch passes its validation gate and cleanup checks
- When commit creation is allowed, the parent orchestrator must hand off the final commit work to a dedicated commit subagent that uses the commit skill
- `doc-checklist-cleaner` may report that checklist cleanup is complete, but it does not own the commit decision
- IDE hooks may format markdown or guard shell usage, but they must not decide that a batch is complete or trigger the final commit step automatically
- If the parent task does not explicitly allow commit creation, stop after review and cleanup handoff instead of invoking the commit subagent

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
