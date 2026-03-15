# Fix Checklists

This directory stores review outputs written by the `code-reviewer` agent.

Purpose:

- Persist actionable review findings so execution work can continue without depending on chat history.
- Keep one markdown file per review run.

In batch-delivery orchestration, generating a checklist is not a terminal state. The orchestrator should route actionable items back to `execution-agent`, rerun review as needed, then update the checklist with evidence before final sign-off and commit.

Recommended filename pattern:

- `review-YYYYMMDD-HHMM-<batch-or-module>.md`
- If the scope is unclear, use `review-YYYYMMDD-HHMM-general.md`

Recommended file structure:

- `### Review Scope`
- `### Fix Checklist`
- `### Integration Test Results`
- `### Open Questions`
- `### Residual Risks Or Testing Gaps`
- `### Short Summary`

Checklist rules:

- Every actionable finding should be written as `- [ ]`.
- Keep severity labels such as `[blocking]` and `[important]` in the checklist item text.
- If a review has no actionable findings, record `- [x] No actionable findings from this review.`
