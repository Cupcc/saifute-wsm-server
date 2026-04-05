# Saifute Codex Agents

This directory holds reusable handoff templates for runtime subagents launched with `spawn_agent`.

These files are not an auto-registered Codex agent registry. They are prompt templates the parent agent should read and adapt before delegation.

## Files

- `planner.md`: create or repair `docs/tasks/**` handoffs
- `coder.md`: implement within explicit writable scope
- `code-reviewer.md`: review changes for bugs, regressions, and validation gaps
- `acceptance-qa.md`: verify requirement-level or user-flow completion

## Usage rules

- Only use subagents when the user explicitly asks for subagents, delegation, or parallel agent work.
- Use this repository subagent model map unless the user explicitly overrides it:
- `$saifute-planner`: `model: gpt-5.4`, `reasoning_effort: high`
- `$saifute-coder`: `model: gpt-5.4`, `reasoning_effort: high`
- `$saifute-code-reviewer`: `model: gpt-5.4`, `reasoning_effort: high`
- `$saifute-acceptance-qa`: `model: gpt-5.4`, `reasoning_effort: high`
- Keep the critical path local unless delegation clearly helps.
- Pass only task-local context, not the whole repository story.
- Prefer one writer by default.
- Launch multiple writers only when writable scopes are explicitly disjoint.
- Keep shared files parent-owned unless one worker is explicitly assigned sole ownership.
