# Batch C Re-Review (Post-Fixes)

## Review Scope

- **Context**: Re-review of uncommitted Batch C implementation after latest fixes
- **Modules**: `inbound`, `outbound`, `workshop-material`, `project` (untracked) + shared changes in `workflow`, `master-data`, `inventory-core`, `app.module`
- **Previous checklist**: `docs/fix-checklists/review-20250314-batch-c-inbound.md`

---

## Findings

- **None.** The prior blocking and important items have been addressed:
  - `createOrRefreshAuditDocument` now resets audit status on update (PENDING, decidedBy/decidedAt/rejectReason null, resetCount increment, lastResetAt)
  - `markAuditNotRequired` added and called by inbound, outbound, workshop-material on void
  - `inbound.repository.ts` uses `DocumentFamily.STOCK_IN` (not string literals)

---

## Open Questions / Assumptions

- **Workflow controller POST /workflow/audits**: When called for a document that already has an audit (e.g. created by inbound at order creation), upsert hits the update path and resets. This may be intentional for "re-submit for audit" flows. If the controller should never reset on manual create, consider adding `resetToPending?: boolean` to `CreateAuditDocumentCommand` and passing it only from document update flows.
- **Project module**: Correctly does not use workflow per `docs/modules/project.md` ("第一阶段不接 workflow"). No `markAuditNotRequired` or `createOrRefreshAuditDocument` calls.

---

## Gate / Test Assessment

- **Commands run**: `pnpm lint`, `pnpm test`
- **Result**: Both passed (7 test suites, 58 tests)
- **Batch C gate** (`pnpm lint && pnpm test`): **satisfied**

---

## Residual Risks Or Testing Gaps

- **No DB-backed integration tests** for document flows. Inventory, workflow, and audit consistency are covered only by unit tests with mocks. `docs/10-subagent-build-batches.md` §6 requires "单据流一致性测试"; current coverage is unit-level.
- **Prisma models.ts**: Diff removed `biome-ignore-all lint: generated file`. If this was intentional, no action; if accidental, consider restoring for generated-file lint exclusion.
- **Production receipt route**: `GET /inbound/into-orders` exists; `GET /inbound/into-orders/:id` does not. Documented as acceptable (clients use `GET /inbound/orders/:id`).

---

## Short Summary

Batch C implementation and shared fixes are in good shape. The blocking workflow reset issue and the important void-audit update gap are resolved. Inbound, outbound, and workshop-material correctly call `createOrRefreshAuditDocument` (with tx) and `markAuditNotRequired` on void. Project module correctly omits workflow. Inventory-core additions (`getLogsForDocument`, `reserveFactoryNumber`, `releaseFactoryNumberReservations`, `findOriginalLogsByBusinessDocument`) support outbound and workshop-material flows. Master-data `getSupplierById`, `getCustomerById`, `getPersonnelById` support document snapshots. The Batch C gate passes. Main remaining gap: DB-backed integration tests for document-flow consistency.
