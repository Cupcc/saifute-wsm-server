# Saifute WMS Ralph Instructions

These instructions are copied into Ralph project storage by `pnpm ralph:bootstrap`.

## Project Context

- Repository root: `__PROJECT_ROOT__`
- Ralph storage path: `__RALPH_STORAGE_PATH__`
- Default agent configured by bootstrap: `__DEFAULT_AGENT__`
- This is a NestJS WMS backend for a small-team warehouse scenario.
- Real inventory scope is currently limited to `main warehouse + RD subwarehouse`.
- Inventory correctness, traceability, and auditability are higher priority than speed or speculative abstraction.

## Required Reading Order

Read these before making task decisions or code changes:

1. `docs/requirements/PROJECT_REQUIREMENTS.md`
2. `docs/requirements/REQUIREMENT_CENTER.md`
3. `docs/tasks/TASK_CENTER.md`
4. The relevant topic contract under `docs/requirements/topics/*.md`
5. Any active task doc under `docs/tasks/*.md`
6. `docs/acceptance-tests/README.md` if the task needs acceptance evidence or `full`-mode delivery
7. `docs/playbooks/browser/playbook.md` and `docs/playbooks/browser/agent-browser-reference.md` if browser evidence is needed

## Working Rules

- Keep tasks atomic and finish one task fully before marking it done.
- Do not silently expand scope across topics or business modules.
- If the requirement contract is unclear, stop and clarify instead of inventing behavior.
- Prefer the smallest sufficient change that preserves existing module boundaries.
- Respect existing uncommitted user changes; never revert unrelated work.
- Avoid destructive git commands unless the user explicitly asks for them.
- Use `pnpm`, not `npm`, for repo commands.
- Local dev defaults to `.env.dev`, matching `pnpm dev`.

## Validation Defaults

- For code changes, prefer the lightest command that proves the edited scope:
  - `pnpm typecheck`
  - `pnpm test`
  - targeted migration or module-specific commands when appropriate
- For acceptance scope, follow `docs/acceptance-tests/README.md` for mode selection, spec/run handling, and environment-gap routing.
- For browser-based acceptance, follow `docs/playbooks/browser/agent-browser-reference.md`: prefer the `agent-browser` CLI; use Chrome DevTools MCP as a documented fallback when the CLI cannot run.
- Do not claim completion without explicit evidence for the task's acceptance criteria.

## Repository-Specific Notes

- Long-term product truth lives in `docs/requirements/topics/*.md`.
- Runtime execution context belongs in `docs/tasks/*.md`.
- Architecture references live under `docs/architecture/` and `docs/architecture/modules/`.
- Migration and data-moving scripts live under `scripts/migration/`.
- Ralph session tuning for this project is written to `config.json` in the Ralph storage directory, not inside the git repo.
