# Task Docs

This directory stores planner-authored task docs for delivery work in this repository.

Purpose:

- Give each non-trivial task a durable execution brief under `docs/tasks/**`.
- Keep task-scoped runtime context out of `.cursor/rules/*.mdc`.
- Let `planner`, `coder`, and `code-reviewer` share one source of truth across the delivery loop.

Role split:

- `planner` creates or updates the task doc and owns planning-phase edits.
- `coder` reads the task doc as the execution brief and treats it as read-only unless documentation ownership is explicitly reassigned.
- `code-reviewer` updates the task doc with review status, validation results, and follow-up state.
- The parent orchestrator decides whether to continue the fix loop or create a commit when the user explicitly asks for one.

Recommended filename pattern:

- `task-YYYYMMDD-HHMM-[scope].md`
- If the scope is unclear, use `task-YYYYMMDD-HHMM-general.md`

Required structure:

- `## Metadata`
- `## Goal And Acceptance Criteria`
- `## Scope And Ownership`
- `## Implementation Plan`
- `## Coder Handoff`
- `## Reviewer Handoff`
- `## Parallelization Safety`
- `## Review Log`
- `## Final Status`

Workflow:

1. Create a new task doc from `docs/tasks/_template.md` when the task is not trivially small.
2. Have `planner` fill the goal, scope, implementation plan, coder handoff fields, validation expectations, and parallelization safety.
3. Have `coder` implement from the task doc instead of inventing a new execution scope.
4. Have `code-reviewer` record review status, validation, findings, and next action in the same task doc.
5. If review finds open `[blocking]` or `[important]` items, route the work back to `coder` and keep the task doc current.

Task-doc field expectations:

- `## Metadata` should include an explicit `Review status` field so repair loops can tell whether the latest review passed, failed, or is blocked.
- `## Coder Handoff` should record `owned paths`, `forbidden shared files`, and the `validation command for that scope`.
- If the planner marks `## Parallelization Safety` as safe, the task doc should add one handoff subsection per writer with those same fields.

Maintenance rules:

- Keep durable repository rules in `.cursor/rules/*.mdc`.
- Keep per-task plans, status, and review updates in `docs/tasks/*.md`.
- Use `docs/fix-checklists/*.md` only when the review needs a standalone checklist artifact in addition to the task doc.
- Do not treat task-doc creation by itself as task completion.
