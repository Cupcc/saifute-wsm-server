# Feishu Subagent Completion Runtime Duration

## Metadata

- Scope: extend the Feishu notification contract so `subagent_complete` can append the finished subagent's own runtime duration without weakening the strict session-runtime behavior already enforced for `task_complete` / `complete`
- Related requirement: `req-20260319-1715-feishu-subagent-runtime-duration`（需求已闭环，`docs/requirements` 下文件已删除）
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder:
- Reviewer: `code-reviewer`
- Last updated: `2026-03-20`
- Related checklist:
- Related files:
  - `docs/tasks/_template.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1605-feishu-runtime-summary.md`
  - `.cursor/rules/feishu-agent-stop-notify.mdc`
  - `.cursor/hooks/session-start-runtime.js`
  - `.cursor/hooks/task-start-notify.js`
  - `scripts/notify-feishu.mjs`
  - `test/notify-feishu.spec.ts`

## Requirement Alignment

- Requirement doc: `req-20260319-1715-feishu-subagent-runtime-duration`（需求已闭环，文档已删除；验收口径见本 task 与 Final Status）
- Requirement status: `confirmed`（历史）；实施与 review 已完成。
- User intent summary:
  - when a subagent finishes work, the Feishu notification should also include that subagent's own runtime duration
  - the runtime extension must complete the surrounding notification mechanism rather than regress the existing `task_complete` session-runtime contract
  - relevant rule, runtime, and test surfaces should stay internally consistent after the change
- Acceptance criteria carried into this task:
  - `subagent_complete` notifications can include a human-readable runtime for the finished subagent
  - the subagent runtime source is exact and explicit; it must not be guessed from session/task hook state that belongs to different semantics
  - `task_complete` / `complete` keep their current session-scoped automatic timing behavior
  - the standing rule text, CLI behavior, and focused tests agree on which events may append runtime and where that runtime comes from
- Open questions requiring user confirmation:
  - None.

## Requirement Sync

- Req-facing phase progress: `已与实现对齐并完成 review，task doc 已归档。`
- Req-facing current state: `subagent_complete` 仅接受显式 duration/started-at 参数，与 `task_complete` 会话级计时语义分离；规则与单测已覆盖。
- Req-facing blockers: `None`
- Req-facing next step: `无（治理收口已由 parent 更新 TASK_CENTER）。`
- Requirement doc sync owner: `parent orchestration agent`

## Goal And Acceptance Criteria

- Goal: deliver the smallest safe notification-contract change that makes `subagent_complete` report the completed subagent's own runtime while preserving the already-fixed strict session timing for final completion events.
- Acceptance criteria:
  - `scripts/notify-feishu.mjs` treats `subagent_complete` as a runtime-bearing event with a subagent-specific label such as `本次子代理运行：...`.
  - `subagent_complete` uses only exact caller-provided timing input such as `--duration-ms` or `--started-at-ms`; it does not auto-read session/task hook state or any shared "current" pointer.
  - `task_complete` / `complete` continue to derive runtime from canonical session state or exact explicit overrides exactly as the older scoped fix intended.
  - non-runtime events still reject hand-written runtime text in `msg`, and rule examples show the correct calling pattern.
  - `test/notify-feishu.spec.ts` proves the `subagent_complete` success path and the guardrail paths without relying on real network calls.

## Scope And Ownership

- Allowed code paths:
  - `scripts/notify-feishu.mjs`
  - `.cursor/rules/feishu-agent-stop-notify.mdc`
  - `test/notify-feishu.spec.ts`
  - this task doc only if the parent explicitly reassigns documentation ownership
- Frozen or shared paths:
  - `.cursor/hooks/session-start-runtime.js`
  - `.cursor/hooks/task-start-notify.js`
  - `docs/requirements/**`
  - `docs/tasks/**` except this file under planner ownership
  - `package.json`
  - any webhook secret or environment-specific configuration
- Task doc owner: `planner`
- Contracts that must not change silently:
  - `task_complete` / `complete` keep session-scoped automatic runtime resolution
  - `subagent_complete` must not borrow task/session runtime state, because those sources do not model an individual subagent's wall-clock execution
  - the notification script remains the single place that injects runtime text; callers still must not handwrite duration into `msg`
  - start notifications remain non-runtime events

## Implementation Plan

- [x] Step 1: lock the event/runtime contract before code changes.
  - reread `docs/tasks/archive/retained-completed/task-20260319-1605-feishu-runtime-summary.md`, `.cursor/rules/feishu-agent-stop-notify.mdc`, and `scripts/notify-feishu.mjs`
  - preserve the old strict rule that only final completion events auto-resolve runtime from session state
  - define `subagent_complete` as a separate runtime-bearing event class that requires exact caller-provided timing rather than hook-derived fallback
- [x] Step 2: extend `scripts/notify-feishu.mjs` with explicit subagent-completion timing behavior.
  - add event classification that distinguishes session-completion events from subagent-completion events
  - for `subagent_complete`, accept `--duration-ms` or `--started-at-ms`, inject a subagent-specific runtime phrase, and fail explicitly if no exact timing input is provided
  - keep all hook-state readers scoped to `task_complete` / `complete` only
- [x] Step 3: update the standing rule text to match the delivered contract.
  - document that `subagent_complete` should include the completed subagent's runtime via exact timing flags instead of handwritten message text
  - keep `subagent_start`, `phase_complete`, `need_user_input`, and `agent_stop` as non-runtime events
  - keep `task_complete` / `complete` described as session-runtime events
- [x] Step 4: add focused regression coverage in `test/notify-feishu.spec.ts`.
  - success case: `subagent_complete --duration-ms ...` appends the expected runtime text and sends the webhook
  - success case: `subagent_complete --started-at-ms ...` derives the duration from the provided start time
  - failure case: `subagent_complete` without exact timing exits non-zero before any webhook post
  - regression case: `task_complete` still uses session runtime and does not adopt the subagent-only contract
- [x] Step 5: keep hook files unchanged unless a concrete blocker proves this is insufficient.
  - the inspected hook files currently model session-level and task-level timing only
  - do not introduce implicit `current-subagent` state or shared pointer files for this scope, because concurrent subagents would make that contract race-prone without an explicit per-subagent identity

## Coder Handoff

- Execution brief: implement the smallest safe contract extension for `subagent_complete`. Reuse the existing explicit timing flags already supported by `notify-feishu.mjs`, but do not reuse session/task hook state for subagent timing. Update the rule examples and focused tests so the new caller contract is explicit and regression-resistant.
- Required source docs or files:
  - `docs/tasks/archive/retained-completed/task-20260319-1715-feishu-subagent-runtime-duration.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1605-feishu-runtime-summary.md`
  - `.cursor/rules/feishu-agent-stop-notify.mdc`
  - `.cursor/hooks/session-start-runtime.js`
  - `.cursor/hooks/task-start-notify.js`
  - `scripts/notify-feishu.mjs`
  - `test/notify-feishu.spec.ts`
- Owned paths:
  - `scripts/notify-feishu.mjs`
  - `.cursor/rules/feishu-agent-stop-notify.mdc`
  - `test/notify-feishu.spec.ts`
- Forbidden shared files:
  - `.cursor/hooks/session-start-runtime.js`
  - `.cursor/hooks/task-start-notify.js`
  - `docs/requirements/**`
  - `docs/tasks/**`
  - `package.json`
- Constraints and non-goals:
  - do not reopen or weaken the older strict session-runtime fix for `task_complete` / `complete`
  - do not invent automatic subagent runtime by reading `current-session.json`, `current-task.json`, or any new shared "current-subagent" file
  - do not broaden the work into generic telemetry, new hooks, or agent-prompt rewrites outside the standing rule text
  - do not require real network access for validation
- Validation command for this scope:
  - `pnpm test -- --runTestsByPath test/notify-feishu.spec.ts`
  - `pnpm exec biome check "scripts/notify-feishu.mjs" ".cursor/rules/feishu-agent-stop-notify.mdc" "test/notify-feishu.spec.ts"`

## Reviewer Handoff

- Review focus:
  - confirm `subagent_complete` injects runtime only from exact explicit timing input
  - confirm `task_complete` / `complete` still use the canonical session-runtime path
  - confirm no hook-state file can silently influence subagent runtime
  - confirm rule wording and examples match the final CLI contract
  - confirm failure happens before webhook send when `subagent_complete` lacks required exact timing
- Requirement alignment check:
  - confirm the delivered behavior matches the user request for subagent-finish duration reporting
  - confirm the implementation does not regress the older strict session-runtime behavior for final completion events
- Final validation gate:
  - `pnpm test -- --runTestsByPath test/notify-feishu.spec.ts`
  - `pnpm exec biome check "scripts/notify-feishu.mjs" ".cursor/rules/feishu-agent-stop-notify.mdc" "test/notify-feishu.spec.ts"`
  - verify the focused test file covers:
    - `subagent_complete` with `--duration-ms`
    - `subagent_complete` with `--started-at-ms`
    - `subagent_complete` without explicit timing
    - existing `task_complete` session-runtime regression coverage
- Required doc updates:
  - update `## Review Log`
  - update `## Final Status`

## Architecture And Repository Considerations

- This is notification tooling contract work, not business-module logic. Keep the writable surface limited to the Feishu CLI, the standing notification rule, and focused regression tests.
- The older scoped fix established that final completion runtime belongs to session state. This new scope should add a second explicit contract for subagent completion instead of mixing the two timing semantics.
- Multiple subagents may exist over time, and parallel writers are allowed only in explicit disjoint scopes. That makes implicit "current subagent" runtime state a poor fit unless the contract adds a stable per-subagent identity, which this scope should avoid.
- Centralized runtime injection in `scripts/notify-feishu.mjs` is preferable to handwritten durations in rule examples or caller messages.
- Validation should continue to stub the webhook and assert failure-before-send semantics where timing input is missing or invalid.

## Risks And Contract-Sensitive Areas

- Caller-contract drift:
  - once `subagent_complete` starts carrying runtime, the standing rule and examples must show the exact flag-based calling pattern or future callers may omit the required timing input.
- Parallel-subagent ambiguity:
  - any automatic subagent timing inferred from shared hook state would be race-prone and could misattribute duration when more than one subagent runs in a session.
- Regression against the prior fix:
  - changes in `notify-feishu.mjs` must not accidentally expand or reorder the current `task_complete` session-runtime path.
- Message wording ambiguity:
  - using the same `本次任务运行` label for subagent completion could blur whether the duration belongs to the whole task or one child worker; prefer an explicit subagent label.
- Requirement/task drift:
  - implementation must stay aligned to the now-confirmed requirement wording, especially the boundary that subagent runtime belongs only to `subagent_complete` while session runtime remains reserved for `task_complete` / `complete`.

## Validation Plan

- Narrow iteration commands:
  - `pnpm test -- --runTestsByPath test/notify-feishu.spec.ts`
- Supporting static check:
  - `pnpm exec biome check "scripts/notify-feishu.mjs" ".cursor/rules/feishu-agent-stop-notify.mdc" "test/notify-feishu.spec.ts"`
- Final command or gate aligned to the risk surface:
  - rerun the focused test file and targeted Biome check above
  - ensure the focused tests prove send/no-send behavior for the new `subagent_complete` contract and preserve the existing `task_complete` runtime contract
- Required behavioral gates:
  - `subagent_complete` appends an explicit subagent runtime when called with exact timing input
  - `subagent_complete` fails explicitly before webhook send when exact timing input is missing
  - `task_complete` still derives runtime from canonical session state rather than task or subagent timing
  - rule text and examples match the shipped behavior

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `scripts/notify-feishu.mjs`
  - `test/notify-feishu.spec.ts`
  - `.cursor/rules/feishu-agent-stop-notify.mdc`
  - the shared runtime-message contract across `subagent_complete` and `task_complete`

## Review Log

- Validation results:
  - Reviewer reread the confirmed requirement, this task doc, `docs/tasks/archive/retained-completed/task-20260319-1605-feishu-runtime-summary.md`, `.cursor/hooks/session-start-runtime.js`, `.cursor/hooks/task-start-notify.js`, the focused diff, `scripts/notify-feishu.mjs`, `.cursor/rules/feishu-agent-stop-notify.mdc`, and `test/notify-feishu.spec.ts`.
  - Reviewer ran `pnpm test -- --runTestsByPath test/notify-feishu.spec.ts`; it passed with `10/10` tests green.
  - Reviewer ran `pnpm exec biome check "scripts/notify-feishu.mjs" ".cursor/rules/feishu-agent-stop-notify.mdc" "test/notify-feishu.spec.ts"`; it passed for the scoped static-check surface.
  - Reviewer confirmed the focused regression coverage now includes `subagent_complete` success via `--duration-ms`, `subagent_complete` success via `--started-at-ms`, explicit pre-send failure when `subagent_complete` lacks exact timing, handwritten-runtime rejection, and retained `task_complete` session-runtime regression coverage.
- Findings:
  - none; no `[blocking]` or `[important]` findings remain in the scoped notification-contract change.
- Follow-up action:
  - parent can treat this scoped review as signed off and sync the requirement-facing progress.

## Final Status

- Outcome:
  - focused rereview completed with no remaining `[blocking]` or `[important]` findings; the notification-contract change is safe to sign off.
- Requirement alignment:
  - 与已确认需求口径一致（需求文件已删除）；`subagent_complete` 仅从显式 `--duration-ms` / `--started-at-ms` 注入运行时长，不读取 session/task hook 状态，缺少必要参数时在发 webhook 前失败；`task_complete` / `complete` 仍走会话级计时路径。
- Residual risks or testing gaps:
  - the required focused gates are covered and passed; the only minor gap is that `subagent_complete`'s independence from hook-state files is proven mainly by direct code-path inspection rather than a dedicated conflicting-state regression case, which is non-blocking for this narrowly scoped change.
- Directory disposition:
  - 已于 `2026-03-20` 将本 task 归档至 `docs/tasks/archive/retained-completed/task-20260319-1715-feishu-subagent-runtime-duration.md`；此前根目录副本系元数据未同步「已完成」所致。
- Next action:
  - 无。
