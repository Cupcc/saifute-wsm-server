# Feishu Completion Runtime Summary Fix

## Metadata

- Scope: fix the Feishu completion-notification timing chain so `task_complete` and `complete` use total session runtime instead of last-prompt runtime, fail explicitly when canonical total-runtime state is unavailable, and remove misleading automatic fallback to task-scoped timing data
- Related requirement: `req-20260319-1605-feishu-runtime-summary`（需求已闭环，`docs/requirements` 下文件已删除）
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder:
- Reviewer: `code-reviewer`
- Last updated: `2026-03-20`
- Related checklist:
- Related files:
  - 历史需求 `req-20260319-1605-feishu-runtime-summary`（`docs/requirements` 下文件已删除）
  - `docs/tasks/_template.md`
  - `.cursor/rules/feishu-agent-stop-notify.mdc`
  - `.cursor/hooks/task-start-notify.js`
  - `.cursor/hooks/session-start-runtime.js`
  - `scripts/notify-feishu.mjs`

## Requirement Alignment

- Requirement doc: `req-20260319-1605-feishu-runtime-summary`（需求已闭环，文档已删除；验收见本 task Final Status）
- Requirement status: `confirmed`（历史）；实施与 review 已完成。
- User intent summary:
  - fix the hook/runtime state chain so `task_complete` reflects the total runtime of the current session rather than the latest prompt/runtime slice
  - when canonical total-runtime state is missing or invalid, fail explicitly instead of sending a guessed or shortened runtime
  - remove automatic fallback paths that can silently downgrade completion timing to task-scoped state
- Acceptance criteria carried into this task:
  - completion events resolve runtime from session-scoped state, not task-scoped state
  - task-start state may still support task-start notifications, but it must not become a completion-runtime source
  - if canonical total-runtime state cannot be resolved for auto timing, completion notification exits with an explicit error before sending a misleading message
  - no automatic fallback to `current-task.json` or other guessed/shortened timing sources remains in the completion path
- Open questions requiring user confirmation:
  - None.

## Goal And Acceptance Criteria

- Goal: repair the Feishu notification runtime plumbing so completion notifications measure the whole active session and prefer a hard failure over an inaccurate runtime.
- Acceptance criteria:
  - `task_complete` and `complete` derive runtime from a session-scoped start timestamp written at session start and preserved as the canonical completion-timing source.
  - Per-task prompt timing is isolated from session timing and cannot be mistaken for total runtime during completion notification.
  - Missing, malformed, or unreadable canonical total-runtime state causes an explicit failure path for completion events instead of a guessed, shortened, or silently downgraded runtime.
  - The runtime contract described in the implementation and rule surface is internally consistent after the change.

## Scope And Ownership

- Allowed code paths:
  - `.cursor/hooks/task-start-notify.js`
  - `.cursor/hooks/session-start-runtime.js`
  - `scripts/notify-feishu.mjs`
  - `.cursor/rules/feishu-agent-stop-notify.mdc`
  - `test/notify-feishu.spec.ts`
  - this task doc only if the parent explicitly reassigns ownership
- Frozen or shared paths:
  - `.cursor/**` except the three exact owned paths above
  - 无仍冻结中的 requirement 文件（本需求文档已删除）
  - `docs/tasks/**` except this file under planner ownership
  - `package.json`
  - any webhook endpoint secret or environment-specific configuration
- Task doc owner: `planner`
- Contracts that must not change silently:
  - completion-notification runtime must represent total session runtime, not latest prompt runtime
  - failing to send a completion notification is safer than sending a misleading shortened runtime
  - task-start notification behavior may continue, but its persisted state must remain semantically separate from completion-runtime state
  - explicit, operator-provided exact timing inputs may remain supported only if they do not reintroduce guessed or misleading fallback behavior

## Implementation Plan

- [x] Step 1: separate session-runtime state from task-runtime state and make the canonical completion source explicit.
  - inspect the current collision where `.cursor/hooks/task-start-notify.js` and `.cursor/hooks/session-start-runtime.js` both write `.cursor/hooks/state/agent-runtime/${conversationId}.json` with different semantics
  - keep a single canonical session-runtime record for completion timing and isolate any task-level state used for prompt-start notifications
- [x] Step 2: tighten completion runtime resolution in `scripts/notify-feishu.mjs`.
  - completion events must prefer the canonical session-runtime state and must not auto-read `current-task.json`
  - when canonical total-runtime state is absent, unreadable, or invalid, throw an explicit error before issuing the webhook request
  - keep non-completion events free of runtime text injection behavior
- [x] Step 3: align hook outputs with the new state contract.
  - `session-start-runtime` should write the canonical total-runtime state once per session
  - `task-start-notify` may write task-scoped metadata, but its file names and payloads must not masquerade as total session timing
  - preserve the current start-notification summary behavior unless a direct conflict is proven
- [x] Step 4: add focused automated coverage for the runtime-selection and failure semantics.
  - success case: session state present, completion runtime reflects session elapsed time
  - failure case: only task-scoped state present, completion notification fails explicitly
  - failure case: malformed or unreadable session state fails explicitly
  - regression case: task-start notifications still persist/use prompt summary without affecting completion runtime
- [x] Step 5: align the standing rule text with the delivered strict-runtime behavior.
  - update `.cursor/rules/feishu-agent-stop-notify.mdc` so it no longer implies that missing hook state should silently fall back to a shorter or guessed completion runtime path
  - keep the rule explicit that user-facing completion messages must not handwrite runtime text

## Coder Handoff

- Execution brief: repair the hook/runtime chain with the smallest possible surface. The key bug is that completion timing currently has access to task-scoped state and both hooks also write the same per-conversation state filename with different semantics. Make session timing the only automatic completion-timing source, ensure missing total-runtime state hard-fails before sending, and cover the success/failure paths with focused tests.
- Required source docs or files:
  - `docs/tasks/archive/retained-completed/task-20260319-1605-feishu-runtime-summary.md`（归档后真源）
  - 历史需求 `req-20260319-1605-feishu-runtime-summary`（文档已删除）
  - `.cursor/rules/feishu-agent-stop-notify.mdc`
  - `.cursor/hooks/task-start-notify.js`
  - `.cursor/hooks/session-start-runtime.js`
  - `scripts/notify-feishu.mjs`
- Owned paths:
  - `.cursor/hooks/task-start-notify.js`
  - `.cursor/hooks/session-start-runtime.js`
  - `scripts/notify-feishu.mjs`
  - `.cursor/rules/feishu-agent-stop-notify.mdc`
  - `test/notify-feishu.spec.ts`
- Forbidden shared files:
  - `package.json`
  - `.cursor/**` except the three exact owned paths above
  - `docs/requirements/**`
  - other `docs/tasks/**`
- Constraints and non-goals:
  - do not redesign the webhook payload format beyond the runtime-source and failure-semantics fix
  - do not introduce any guessed start-time reconstruction logic
  - do not silently downgrade completion timing to task-level state
  - do not broaden the change into general telemetry, analytics, or notification templating work
  - do not require network-dependent tests; failure behavior should be validated before any real webhook post
- Validation command for this scope:
  - `pnpm test -- --runTestsByPath test/notify-feishu.spec.ts`
  - `pnpm biome check ".cursor/hooks/task-start-notify.js" ".cursor/hooks/session-start-runtime.js" "scripts/notify-feishu.mjs" ".cursor/rules/feishu-agent-stop-notify.mdc" "test/notify-feishu.spec.ts"`
- Iteration report gates:
  - completion runtime uses session-scoped timing when both session and task state exist
  - completion runtime fails explicitly when session state is absent, even if task state exists
  - no webhook request is sent on the explicit-failure path
  - rule text matches the final strict-runtime behavior

## Reviewer Handoff

- Review focus:
  - confirm the automatic completion-timing source is session-scoped only
  - confirm task-scoped timing files can no longer influence `task_complete` runtime
  - confirm missing or malformed total-runtime state causes an explicit pre-send failure
  - confirm the shared state-file naming no longer allows session/task semantic collision
  - confirm the rule text and implementation no longer contradict each other
- Requirement alignment check:
  - confirm delivered behavior matches historical `req-20260319-1605-feishu-runtime-summary` intent（需求文件已删除，以本 task 与代码为准）
  - confirm completion notifications do not send shortened runtimes when only task-scoped timing is available
- Final validation gate:
  - `pnpm test -- --runTestsByPath test/notify-feishu.spec.ts`
  - `pnpm biome check ".cursor/hooks/task-start-notify.js" ".cursor/hooks/session-start-runtime.js" "scripts/notify-feishu.mjs" ".cursor/rules/feishu-agent-stop-notify.mdc" "test/notify-feishu.spec.ts"`
  - targeted smoke checks using a temporary `CURSOR_PROJECT_DIR`:
    - session-state present: completion notify path succeeds and injects runtime from session start
    - task-state only: completion notify path exits non-zero before any webhook post
    - malformed session state: completion notify path exits non-zero before any webhook post
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status`

## Architecture And Repository Considerations

- This is hook/tooling contract work, not business-module logic. Keep the writable surface limited to runtime-state writers, runtime-state readers, focused tests, and the standing notification rule.
- Prefer one clearly named canonical session-runtime source over precedence chains that hide which timestamp was used.
- Explicit failure is the intended safety behavior here because an incorrect shortened runtime is worse than a failed completion notification.
- Validation should stub or block network posting so runtime-source selection and failure semantics can be proven deterministically.
- The fix should preserve start-notification usability while preventing prompt-level timing from leaking into completion events.

## Risks And Contract-Sensitive Areas

- State-file collision:
  - both hooks currently write `.cursor/hooks/state/agent-runtime/${conversationId}.json`, but with different meanings; this makes the state contract ambiguous and is the first place to harden.
- Silent runtime downgrade:
  - `scripts/notify-feishu.mjs` currently treats `current-task.json` as an automatic runtime candidate, which can shorten `task_complete` duration to the latest prompt window.
- Rule drift:
  - `.cursor/rules/feishu-agent-stop-notify.mdc` currently describes a hook-first flow with manual fallback wording; it must not remain inconsistent with the stricter no-guessing behavior.
- Validation isolation:
  - tests must prove failure happens before the webhook request, otherwise network success could mask the runtime-selection bug.
- Environment sensitivity:
  - stale env or state from previous runs must not let completion notifications accidentally report the wrong session runtime.

## Validation Plan

- Narrow iteration commands:
  - `pnpm test -- --runTestsByPath test/notify-feishu.spec.ts`
- Supporting static check:
  - `pnpm biome check ".cursor/hooks/task-start-notify.js" ".cursor/hooks/session-start-runtime.js" "scripts/notify-feishu.mjs" ".cursor/rules/feishu-agent-stop-notify.mdc" "test/notify-feishu.spec.ts"`
- Final command or gate aligned to the risk surface:
  - rerun the focused test file and biome check above
  - perform temporary-directory smoke coverage for session-state success and missing-state failure before considering the scope done
- Required behavioral gates:
  - when session state exists, completion runtime is derived from the session start timestamp
  - when only task state exists, completion notification fails explicitly
  - when session state is malformed or unreadable, completion notification fails explicitly
  - no guessed/shortened runtime is sent on any completion path

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `.cursor/hooks/state/agent-runtime/**` state contract
  - `.cursor/hooks/task-start-notify.js`
  - `.cursor/hooks/session-start-runtime.js`
  - `scripts/notify-feishu.mjs`
  - `.cursor/rules/feishu-agent-stop-notify.mdc`

## Review Log

- Validation results:
  - Parent ran `pnpm test -- --runTestsByPath test/notify-feishu.spec.ts`; it passed.
  - Parent ran `pnpm exec biome check ".cursor/hooks/task-start-notify.js" ".cursor/hooks/session-start-runtime.js" "scripts/notify-feishu.mjs" ".cursor/rules/feishu-agent-stop-notify.mdc" "test/notify-feishu.spec.ts"`; it passed.
  - Reviewer reread the confirmed requirement, this task doc, the focused diff, `.cursor/hooks/task-start-notify.js`, `.cursor/hooks/session-start-runtime.js`, `scripts/notify-feishu.mjs`, `.cursor/rules/feishu-agent-stop-notify.mdc`, and `test/notify-feishu.spec.ts`.
  - Reviewer confirmed the focused regression coverage now includes session-vs-task precedence, task-only explicit failure, malformed canonical session-state failure, current-session mismatch failure, and task-start state remaining task-scoped.
- Findings:
  - none; rereview confirms the prior session-binding concern is resolved in the current scoped files and no `[blocking]` or `[important]` findings remain.
- Follow-up action:
  - none for this scoped fix.

## Final Status

- Outcome:
  - rereview completed with no remaining `[blocking]` or `[important]` findings; the scoped Feishu runtime summary fix is safe to sign off.
- Requirement alignment:
  - 与历史需求 `req-20260319-1605-feishu-runtime-summary` 口径一致（需求文件已删除）；`task_complete` / `complete` 仅从会话级状态解析运行时长，不以任务级状态兜底，缺省或损坏时在发 webhook 前失败。
- Residual risks or testing gaps:
  - the main regression paths are covered by `test/notify-feishu.spec.ts`; the only minor remaining gap is that malformed `current-session.json` is validated by code inspection rather than a dedicated regression case, which is non-blocking for this scope.
- Directory disposition:
  - 已于 `2026-03-20` 归档至 `docs/tasks/archive/retained-completed/task-20260319-1605-feishu-runtime-summary.md`（需求文件已删，根目录不再保留本 brief）。
- Next action:
  - 无。
