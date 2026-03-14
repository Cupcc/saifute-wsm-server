---
name: saifute-subagent-orchestration
description: Orchestrates project-specific subagents for the Saifute NestJS WMS migration. Use when implementing, refactoring, reviewing, or parallelizing work in this repo across auth/session/rbac, shared business core, transactional document modules, platform services, or their integration tests.
---

# Saifute Subagent Orchestration

Use this skill when work in this repository is large enough to benefit from delegated subagents or when a request spans multiple modules.

## Required context

Read these before assigning work:

- `docs/00-architecture-overview.md`
- `docs/10-subagent-build-batches.md`
- The specific module docs in `docs/modules/`

Treat those docs as the source of truth for module boundaries, dependencies, transaction rules, and testing scope.

## Batch order

Respect the documented dependency order:

1. Batch A: `auth`, `session`, `rbac`
2. Batch B: `master-data`, `inventory-core`, `workflow`
3. Batch C: `inbound`, `outbound`, `workshop-material`, `project`
4. Batch D: `audit-log`, `reporting`, `file-storage`, `scheduler`, `ai-assistant`

Do not start downstream implementation until upstream prerequisites are satisfied, unless the task is explicitly docs-only.

## Subagent selection

Choose the smallest useful set:

- `execution-agent`: batch-aware implementation and refactor worker for explicitly assigned modules in one batch at a time
- `architecture-guardian`: boundary review, transaction review, dependency drift detection, and shared-contract checks
- `code-reviewer`: code review, integration-test coverage review, and final validation-gate execution for the touched batch
- `doc-checklist-cleaner`: post-fix markdown cleanup worker for `docs/fix-checklists/`; marks completed `- [ ]` items as `- [x]`, refreshes summaries and residual risks, and removes stale review artifacts only when deletion is clearly safe

## Launch rules

1. Default to at most 4 concurrent worker subagents.
2. Use `execution-agent` for delivery work and keep each worker scoped to one explicit batch assignment.
3. For cross-module work, include `architecture-guardian` early.
4. Before finalizing substantive work, involve `code-reviewer` and require the batch-appropriate integration or e2e gate.
5. When a task is driven by a file under `docs/fix-checklists/`, keep responsibilities separated:
   - `execution-agent` fixes code and tests based on the unchecked checklist items
   - `code-reviewer` validates correctness and the required batch gate when needed
   - `doc-checklist-cleaner` updates the checklist markdown after the fix evidence exists
6. Do not ask `execution-agent` to close checklist items directly unless the task is explicitly documentation-only; prefer a final handoff to `doc-checklist-cleaner` to avoid context rot between implementation and review artifacts.
7. If a task touches shared contracts, update docs first or stop and ask for direction.
8. Never let a subagent bypass these frozen rules:
   - `inventory-core` is the only stock write entry point.
   - `workflow` owns audit-document workflow behavior.
   - `session` uses JWT as a session ticket, with Redis as the session source of truth.
   - `rbac` owns permission strings, route trees, and data-scope policies.
   - `ai-assistant` may query and orchestrate tools, but must not write business data directly.

## File ownership guidance

The `execution-agent` may edit:

- Its owned module directories under `src/modules/<module>/`
- Tests for those modules
- Narrow shared files that are directly required by the task

The `execution-agent` must avoid:

- Unapproved edits to another module's internal repository or table access
- New cross-module dependencies that are not documented
- Silent changes to shared contracts without updating docs

## Required handoff from every subagent

Ask each subagent to return:

- A concise summary of what it changed or proposes
- Files or modules touched
- Shared contracts assumed or changed
- Tests run or still needed
- Risks, blockers, and follow-up work

For checklist-driven execution tasks, also require:

- Which unchecked checklist items were addressed in code
- What evidence exists for closing each item
- Which checklist items remain open and why

## Validation gates

- Batch A work: `pnpm lint && pnpm test:e2e`
- Batch B work: `pnpm lint && pnpm test`
- Batch C work: `pnpm lint && pnpm test`
- Batch D work: `pnpm lint && pnpm test`

Use narrower test commands when appropriate during iteration, but do not skip the documented gate for the affected batch before declaring the work complete.

## Batch completion and commit protocol

Treat commit creation as a parent-orchestrator decision, not as a side effect of file edits or checklist cleanup.

A batch is eligible for the final commit skill step only when all of the following are true:

1. The affected batch's required validation gate passed.
2. `code-reviewer` reports no remaining open `[blocking]` or `[important]` findings for the scoped work.
3. `doc-checklist-cleaner` updated any relevant `docs/fix-checklists/` file and there is no remaining actionable unchecked item that still belongs to the completed scope.
4. There is no unresolved shared-contract, architecture-boundary, or transaction-ownership blocker.
5. The parent task explicitly allows commit creation after validation and cleanup.

Follow this ownership rule:

- Only the parent orchestrator may trigger the final commit skill step.
- When commit creation is allowed, the parent orchestrator must delegate the work to a dedicated commit subagent that uses the commit skill, because that skill defines the repository's commit conventions and safety rules.
- Do not let `execution-agent`, `architecture-guardian`, `code-reviewer`, or `doc-checklist-cleaner` create the commit directly or bypass the commit skill.
- Do not replace the commit skill with ad hoc parent-agent git commands when the task is in the finalization phase.
- Do not use IDE hooks to decide whether a batch is complete; hooks may format files or guard risky commands, but they do not own batch lifecycle decisions.

When you need commit readiness from subagents, ask them to report:

- Whether the required gate passed for their scoped work
- Whether any `[blocking]` or `[important]` item remains open
- Whether checklist cleanup is complete for the scoped batch
- Whether any blocker still prevents safe finalization
- Whether the parent orchestrator may hand off to the commit subagent that runs the commit skill

## Additional reference

- See [reference.md](reference.md) for the recommended subagent matrix and ownership details.
