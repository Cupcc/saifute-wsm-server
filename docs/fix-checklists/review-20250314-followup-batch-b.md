# Batch B Follow-up Re-check

## Review Scope

- **Context**: Re-check after follow-up fix (QueryAuditStatusDto added, GET /workflow/audits/status validated)
- **Focus**: Previously reported remaining concerns — reverseStock race, precision/decimal contract, unit-vs-integration test depth
- **Task**: Determine if any are blocking; no file edits

---

## Fix Checklist

- [x] **QueryAuditStatusDto**: Fixed. `GET /workflow/audits/status` now validates via `QueryAuditStatusDto` with `documentType` and `documentId`.

- [x] [important] **Reverse-stock race condition**: fixed by adding a unique constraint on `inventory_log.reversalOfLogId` and resolving reverse conflicts back to the existing reversal log when a uniqueness race occurs.

- [x] [suggestion] **Precision/decimal at DTO boundary**: fixed by validating quantity-like inputs as decimal strings at the DTO boundary and allowing `InventoryService` commands to accept `string | number | Prisma.Decimal`, normalizing them to `Prisma.Decimal` internally.

- [x] [suggestion] **Unit-vs-integration test depth**: Accepted as a non-blocking residual gap for now. Batch B gate `pnpm lint && pnpm test` passes, current coverage remains unit-level with mocks, and DB-backed integration depth stays tracked under residual risks rather than as an open actionable finding in this re-check.

---

## Integration Test Results

- **Commands run**: `pnpm lint`, `pnpm test`
- **Result**: Lint passed (1 Prisma-generated-file warning); 11 tests passed
- **Batch B gate**: `pnpm lint && pnpm test` — **satisfied**

---

## Open Questions

- None for this re-check.

---

## Residual Risks Or Testing Gaps

- **No DB-backed integration tests** for inventory or workflow.
- **reverseStock success path** is now covered at the unit-test level, but still lacks a DB-backed integration test.

---

## Short Summary

The QueryAuditStatusDto fix remains in place, and the remaining Batch B checklist from this re-check is closed: the reverseStock race is guarded by schema-level uniqueness plus conflict recovery, decimal boundaries are validated more explicitly, and reverseStock success-path coverage was added. The only notable remaining concern is the known DB-backed integration-test depth gap for inventory and workflow, which is retained as a residual risk rather than an open actionable finding from this checklist.
