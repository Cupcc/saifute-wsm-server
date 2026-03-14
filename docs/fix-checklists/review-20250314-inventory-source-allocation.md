# Batch B inventory-core Source Allocation / Release Re-check

## Review Scope

- **Branch/context**: Batch B follow-up re-check after source allocation/release hardening
- **Files reviewed**:
  - `src/modules/inventory-core/application/inventory.service.ts`
  - `src/modules/inventory-core/infrastructure/inventory.repository.ts`
  - `src/modules/inventory-core/application/inventory.service.spec.ts`
  - `docs/modules/inventory-core.md`
- **Source of truth**: `docs/00-architecture-overview.md`, `docs/10-subagent-build-batches.md`, `docs/modules/inventory-core.md`, `docs/20-wms-business-flow-and-optimized-schema.md`

---

## Fix Checklist

- [x] [blocking] **allocateInventorySource / releaseInventorySource retry safety**: Fixed. The APIs now use cumulative `targetAllocatedQty` / `targetReleasedQty` semantics per source-consumer tuple, so retrying the same target returns the existing state instead of double-writing.

- [x] [blocking] **allocateInventorySource over-allocation race**: Fixed. The service now locks the source `inventory_log` row with `SELECT ... FOR UPDATE` before reading source-usage totals and writing `inventory_source_usage`, serializing concurrent allocations on the same source.

- [x] [important] **release retry over-release risk**: Fixed. `targetReleasedQty` is validated as a cumulative target and cannot move backwards or exceed the allocated total.

- [x] [suggestion] **allocate update path and full release coverage**: Fixed. `inventory.service.spec.ts` now covers updating an existing source usage and the terminal `RELEASED` state.

- [x] No actionable findings from this re-check.

---

## Integration Test Results

- **Commands run**: `pnpm test -- inventory.service.spec.ts`, `pnpm test`, `pnpm lint`
- **Result**: Targeted inventory tests passed (`10/10`), full test suite passed (`17/17`), lint passed with one pre-existing warning in generated Prisma code (`src/generated/prisma/models.ts`)
- **Batch B gate**: `pnpm lint && pnpm test` — **satisfied**

---

## Open Questions

- None blocking for this re-check.

---

## Residual Risks Or Testing Gaps

- No DB-backed integration tests yet for `allocateInventorySource` / `releaseInventorySource`; locking and transaction behavior are still validated at the unit-test level only.
- No true concurrent integration test yet for same-source allocation serialization.
- `increaseStock()` / `decreaseStock()` still perform master-data existence validation before entering the transaction; this follow-up did not change that behavior.

---

## Short Summary

The Batch B source allocation/release supplement is now closed. Retry safety is handled through cumulative target quantities, same-source allocation is serialized with a pessimistic row lock, and the missing unit-test branches are covered. No actionable findings remain from this re-check; the only remaining gaps are deeper DB-backed integration coverage items.
