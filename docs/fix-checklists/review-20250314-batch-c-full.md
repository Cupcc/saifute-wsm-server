# Batch C Full Code Review

## Review Scope

- **Branch/context**: Uncommitted Batch C implementation (inbound, outbound, workshop-material, project)
- **Modules**: All four Batch C modules + shared changes in workflow, master-data, inventory-core, app.module
- **Source of truth**: `docs/00-architecture-overview.md`, `docs/10-subagent-build-batches.md`, `docs/20-wms-business-flow-and-optimized-schema.md`, `docs/modules/*.md`

---

## Findings

### [blocking]

- **workshop-material void pick order does not release inventory_source_usage**: `docs/20-wms-business-flow-and-optimized-schema.md` §5.3 states "作废时执行逆操作并释放来源占用". When voiding a pick order, the service calls `reverseStock` but never calls `releaseInventorySource` for the allocated lines. The `inventory_source_usage` records remain allocated, causing orphaned allocations and inconsistent source availability. Fix: Before reversing stock in `voidOrder` for PICK orders, call `listSourceUsages` for `consumerDocumentType=WorkshopMaterialOrder`, `consumerDocumentId=id`, then for each usage with `allocatedQty > releasedQty`, call `releaseInventorySource` with `targetReleasedQty = allocatedQty` in the same transaction.

### [important]

- **outbound update: factory number reservations not released when deleting lines**: When `updateOrder` deletes lines (lines present in current but not in dto.lines), the service reverses stock and deletes the line but does not release `factory_number_reservation` for those lines. Orphaned RESERVED records remain. Fix: Add `releaseFactoryNumberReservationsByLine` (or equivalent) to inventory-core, or extend `releaseFactoryNumberReservations` to accept optional `businessDocumentLineIds`; when deleting a line during update, release its reservation before deleting the line.

- **outbound update: factory number reservations not updated when modifying line start/end**: When `updateOrder` modifies an existing line's `startNumber` or `endNumber` (in `inventoryNeedsRepost` or when those fields change), the old reservation is not released and a new one is not created. The line snapshot and the reservation record become inconsistent. Fix: When updating a line, if `startNumber` or `endNumber` changed, release the old reservation (if any) and create a new one for the new range. Ensure this happens in the same transaction as the line update.

### [suggestion]

- **workshop-material has no update flow**: `docs/modules/workshop-material.md` states "修改单据不能只改表头，需重新计算明细差异与库存副作用". The module has create and void but no update. Pick, return, and scrap orders cannot be modified after creation. Consider adding update flow per inbound/outbound pattern if product requirements allow.

- **app.module import order**: `pnpm lint` fails with "The imports and exports are not sorted" — `WorkshopMaterialModule` and `WorkflowModule` should be reordered alphabetically. Run `pnpm format` or fix manually.

- **inbound hasActiveDownstreamDependencies uses documentLineRelation**: The inbound repo checks both `documentRelation` and `documentLineRelation` for `upstreamFamily: DocumentFamily.STOCK_IN`. There is no `DocumentRelationType` that uses STOCK_IN as upstream in the current schema. The check is defensive but may return false for all stock-in orders. Consider documenting whether stock-in has defined downstream relations or removing the line-level check if not applicable.

---

## Integration Test Results

- **Commands run**: `pnpm test`, `pnpm lint`
- **Test result**: 56 tests passed (7 suites)
- **Lint result**: Failed — 1 error (prisma generated file suppression), 1 warning (app.module import order). The prisma suppression is pre-existing; the app.module import order is introduced by Batch C.
- **Batch C gate**: `pnpm lint && pnpm test` — **not satisfied** due to lint failure. Tests pass.

---

## Open Questions / Assumptions

- **Project downstream dependencies**: `project.repository.hasActiveDownstreamDependencies` checks `documentRelation` with `upstreamFamily: DocumentFamily.PROJECT`. No `DocumentRelationType` in the schema uses PROJECT as upstream. Assumed correct for future extensibility.
- **Workshop-material update**: Docs imply update is required; implementation omits it. Assumed deferred to a later iteration unless explicitly required for Batch C delivery.

---

## Residual Risks Or Testing Gaps

- **No DB-backed integration tests** for any Batch C module. Document flow consistency (create → inventory, update → audit reset, void → reversal + workflow) is covered only by unit tests with mocks.
- **Factory number interval overlap validation**: Outbound does not validate that `startNumber`–`endNumber` intervals do not overlap with existing reservations before reserving. May allow double-booking.
- **Negative stock on decrease**: `decreaseStock` throws when `afterQty < 0`. No explicit negative-stock policy configuration; default is to reject.
- **Audit log integration**: All modules mention "操作审计" but audit-log is Batch D; not implemented.

---

## Short Summary

Batch C implementation is structurally sound: atomic transactions, inventory via inventory-core only, workflow create/reset/void alignment, and downstream dependency checks before void. The previous checklist blocking item (workflow audit reset on update) and important item (markAuditNotRequired on void) are **resolved**. One new blocking issue: workshop-material void pick does not release inventory source usage, violating schema docs. Two important outbound gaps: factory number reservations are not released when deleting or modifying lines during update. Lint fails on import order; tests pass. DB-backed integration tests remain the main validation gap for document-flow consistency.
