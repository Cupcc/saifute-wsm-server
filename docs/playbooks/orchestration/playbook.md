# Orchestration Playbook

Accumulated execution experience for subagent coordination, parallel writer management, review loops, and cross-chat continuation.

---

## Acceptance Mode Selection

- `none`: no meaningful runtime behavior change, or the user explicitly says to skip acceptance.
- `light`: the default for low-risk runtime changes when direct evidence in the task doc is enough.
- `full`: UI, multi-role, cross-page, high-risk, release-gating, or explicitly strict acceptance work; use `acceptance-qa` plus `docs/acceptance-tests/**`.

## Acceptance Guardrails

- Keep only these as hard constraints: requirement acceptance-state aggregation, audited full-mode runs, explicit `environment-gap` routing, QA not editing business code, and evidence-backed `accepted`.
- Treat everything else as mode-dependent defaults, not as a one-size-fits-all forced workflow.
- When an agent needs browser-based testing or acceptance execution, use `agent-browser` as the default execution surface so browser evidence and reproduction steps stay consistent across runs.

## 2026-04-03 · Browser Acceptance Contract Checks

**Source task**: `master-data` F4 supplier CRUD full-mode acceptance
**Scenario**: browser acceptance initially drifted to Chrome DevTools MCP and a stale assumption that captcha was still enabled, while the repo policy required `agent-browser` and the live `.env.dev` backend had captcha disabled.
**Lesson**:
- When the repo policy says browser acceptance uses `agent-browser`, use the CLI directly. Do not substitute Chrome DevTools MCP unless the task doc explicitly records an exception.
- Before scripting a login flow, verify env-sensitive assumptions against the live backend first, then confirm them with a browser snapshot. In this repo, `GET /api/auth/captcha` was the fastest truth source for whether captcha was really enabled.
- For async dropdowns, do not trust a transient same-name suggestion during typing as proof that the backend returned a real option. Cross-check the browser network request, optionally probe the backend directly, and take a fresh snapshot to confirm whether the combobox actually resolved a selectable record.
**Reusable action**: for browser acceptance that touches login or remote selects, follow `live backend probe -> agent-browser open -> snapshot -> interact -> network check -> re-snapshot -> write evidence`.
**Maturity**: verified ✓

## 2026-04-02 · agent-browser Reference Baseline

**Source task**: user-requested browser-usage validation and documentation update
**Scenario**: the repo had a policy saying browser-based acceptance should use `agent-browser`, but it did not yet contain a validated how-to reference for agents.
**Lesson**: the policy is not enough by itself; agents also need a short, verified workflow covering page open, snapshot, interaction, network evidence, screenshot capture, and the shared-profile recovery path.
**Reusable action**: use `docs/playbooks/orchestration/agent-browser-reference.md` as the default operating note whenever a task needs browser testing or browser-backed acceptance evidence.
**Maturity**: verified ✓

## Full-Mode Closure

- Prepare or reuse an acceptance spec before full-mode execution when possible.
- Update the spec's `Latest Verification` as the default current acceptance record.
- Only create a separate acceptance run when a standalone or frozen report is justified.
- Do not archive while the current acceptance record remains `blocked`.

<!-- Append new entries below in reverse chronological order. -->
