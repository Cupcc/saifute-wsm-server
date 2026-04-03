# Ralph CLI Project Bootstrap

Verified on `2026-04-02` with `ralph v0.16.0` on macOS arm64.

This repository keeps Ralph usage split across two places:

- repo-tracked bootstrap assets:
  - `scripts/ralph/bootstrap-project.mjs`
  - `docs/playbooks/ralph/project-instructions.md`
- machine-local Ralph runtime state:
  - `~/.ralph/projects/<project>/config.json`
  - `~/.ralph/projects/<project>/instructions.md`
  - `~/.ralph/projects/<project>/prd.json`
  - `~/.ralph/projects/<project>/session.json`

Ralph does **not** read a repo-local `.ralph/` folder automatically, so the bootstrap step writes the actual runtime config into Ralph's own storage directory.

## One-Time Install

If `ralph` is not installed, install the binary manually:

```bash
curl -fL https://github.com/nitodeco/ralph/releases/download/0.16.0/ralph-darwin-arm64 -o "$HOME/.local/bin/ralph"
chmod +x "$HOME/.local/bin/ralph"
ralph --version
```

If you are on a different platform, use the matching release asset from `nitodeco/ralph`.

## Bootstrap This Repo

From the repository root:

```bash
pnpm ralph:bootstrap -- --agent codex
```

What this does:

- discovers the current Ralph project storage path with `ralph projects current --json`
- writes project-scoped long-running settings to `config.json`
- copies repo-maintained instructions into Ralph's `instructions.md`
- leaves global Ralph settings untouched

If you prefer a different agent, replace `codex` with `cursor` or `claude`.

## Default Long-Running Settings

The bootstrap script writes these project-level defaults:

- `agent`: selected at bootstrap time
- `maxRetries`: `5`
- `retryDelayMs`: `10000`
- `agentTimeoutMs`: `14400000`
- `stuckThresholdMs`: `1800000`
- `maxRuntimeMs`: `43200000`
- `notifications.systemNotification`: `true`
- `notifications.markerFilePath`: `<ralph storage>/complete.marker`
- `memory.maxOutputBufferBytes`: `10485760`
- `memory.memoryWarningThresholdMb`: `1536`
- `memory.memoryThresholdMb`: `3072`

These settings target long-running multi-step tasks with nested subagent orchestration while still putting a ceiling on runaway sessions.

## Daily Commands

Initialize a PRD interactively:

```bash
pnpm ralph:init
```

Inspect the bound Ralph project:

```bash
pnpm ralph:project
pnpm ralph:config
```

Run a long background session:

```bash
pnpm ralph:run:bg -- 20
```

Monitor, resume, or stop:

```bash
pnpm ralph:status
pnpm ralph:resume:bg
pnpm ralph:stop
```

## Recommended Usage In This Repo

1. Run `pnpm ralph:bootstrap -- --agent codex` once per machine.
2. Run `pnpm ralph:init` in an interactive terminal and describe the exact scoped task you want Ralph to execute.
3. Review the generated PRD with `ralph task list` before running.
4. Use `pnpm ralph:run:bg -- 20` for unattended sessions.
5. Check `pnpm ralph:status` periodically instead of watching the foreground UI.

## Notes

- `ralph init` is interactive, so run it in a real terminal rather than through a non-TTY automation path.
- Project-specific instructions are sourced from `docs/playbooks/ralph/project-instructions.md`; rerun bootstrap after editing that file.
- If Ralph's global install script fails to detect the latest version, use the manual binary install shown above.
