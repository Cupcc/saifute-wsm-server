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
- `architecture-guardian`: boundary review, transaction review, dependency drift detection, shared-contract planning, and architecture-doc alignment
- `code-reviewer`: code review, integration-test coverage review, final validation-gate execution, and ownership of review findings plus `docs/fix-checklists/` maintenance for the touched batch

## Launch rules

1. Default to at most 4 concurrent worker subagents.
2. Use `execution-agent` for delivery work and keep each worker scoped to one explicit batch assignment.
3. For cross-module work, include `architecture-guardian` early.
4. Before finalizing substantive work, involve `code-reviewer` and require the batch-appropriate integration or e2e gate.
5. For batch-delivery tasks, treat review as a repair loop rather than a terminal step:
   - if `code-reviewer` reports any open `[blocking]` or `[important]` item, hand the findings back to `execution-agent` for fixes
   - rerun `code-reviewer` after the fixes until the scoped work is clear or a real blocker requires user direction
   - do not stop merely because a review markdown file or fix checklist was generated
6. When a task is driven by a file under `docs/fix-checklists/`, keep responsibilities separated:
   - `execution-agent` fixes code and tests based on the unchecked checklist items
   - `code-reviewer` owns correctness review, findings, severity, the required batch gate, and any updates to the related checklist markdown
7. Do not ask `execution-agent` to close checklist items directly unless the task is explicitly documentation-only; after reviewing the fix evidence, let `code-reviewer` update the relevant `docs/fix-checklists/` file.
8. If a task touches shared contracts, route the doc decision explicitly. Module-local fact docs may be updated by `execution-agent` within its owned scope. Cross-module, architecture, dependency, or transaction docs should be reviewed or patched by `architecture-guardian`. `docs/fix-checklists/` remains owned by `code-reviewer`.
9. If a downstream task is blocked by unstable docs or competing contract proposals, involve `architecture-guardian` before more implementation spreads.
10. Never let a subagent bypass these frozen rules:

- `inventory-core` is the only stock write entry point.
- `workflow` owns audit-document workflow behavior.
- `session` uses JWT as a session ticket, with Redis as the session source of truth.
- `rbac` owns permission strings, route trees, and data-scope policies.
- `ai-assistant` may query and orchestrate tools, but must not write business data directly.

## Shared knowledge layers

The parent orchestrator owns the distinction between durable rules and runtime context.

- Put stable, reusable facts in `.cursor/rules/*.mdc`, such as verified local environment details, long-lived workflow constraints, and repository-wide behavioral rules.
- Do not write temporary runtime observations into rules, such as the current task plan, transient blockers, a one-off failing test, or branch-local decisions that may expire soon.
- Put task-scoped runtime context in the parent handoff, or in a clearly temporary shared context artifact when multiple subagents need the same live status.
- Before promoting a new observation into rules, confirm that it is likely to remain valid across future tasks and does not contain secrets.

## File ownership guidance

The `execution-agent` may edit:

- Its owned module directories under `src/modules/<module>/`
- Tests for those modules
- Module-local docs that describe its owned contracts or behavior
- Narrow shared files that are directly required by the task

The `execution-agent` must avoid:

- Unapproved edits to another module's internal repository or table access
- New cross-module dependencies that are not documented
- Silent changes to shared contracts without updating docs

The `architecture-guardian` may edit when the parent task allows it:

- `docs/00-architecture-overview.md`
- `docs/10-subagent-build-batches.md`
- Shared-contract sections under `docs/modules/`
- Other architecture-facing docs that define boundaries, dependency direction, or transaction ownership

The `architecture-guardian` must avoid:

- Acting as the default owner of `docs/fix-checklists/`
- Rewriting module-internal implementation notes that do not affect cross-module understanding
- Promoting temporary execution state into durable rules without parent approval

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

For tasks whose goal is to implement, finish, deliver, or fully repair a scoped batch, review artifacts and checklist cleanup are intermediate milestones, not valid stopping points. The parent orchestrator must keep the fix-review-cleanup loop moving until one of these is true:

1. The batch satisfies the completion conditions below and the final commit is created.
2. The user explicitly asked for `review-only`, `docs-only`, or `no-commit`.
3. A real blocker remains that requires user direction.

A batch is eligible for the final commit skill step only when all of the following are true:

1. The affected batch's required validation gate passed.
2. `code-reviewer` reports no remaining open `[blocking]` or `[important]` findings for the scoped work.
3. `code-reviewer` updated any relevant `docs/fix-checklists/` file and there is no remaining actionable unchecked item that still belongs to the completed scope.
4. There is no unresolved shared-contract, architecture-boundary, or transaction-ownership blocker.
5. The parent task is a delivery/completion request for the scoped batch, or otherwise explicitly allows commit creation after validation and cleanup.

Follow this ownership rule:

- Only the parent orchestrator may trigger the final commit skill step.
- For a delivery/completion request, the parent orchestrator must continue after review findings by routing fixes back to `execution-agent`, then re-running review until the scope is actually ready for commit.
- When commit creation is allowed, the parent orchestrator must delegate the work to a dedicated commit subagent that uses the commit skill, because that skill defines the repository's commit conventions and safety rules.
- Do not let `execution-agent`, `architecture-guardian`, or `code-reviewer` create the commit directly or bypass the commit skill.
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
