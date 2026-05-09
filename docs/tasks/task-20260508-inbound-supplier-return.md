# Inbound Supplier Return

## Metadata

- Scope:
  - 新增从入库管理发起“退给厂家 / 供应商退货”的能力：从既有入库来源层扣减真实库存，保留来源分配证据，并支持查询、作废、审计和页面发起。
  - 本 task 是执行切片，不修改本轮只读的 domain / architecture 文档；如实现前需要先补需求真源，见 Requirement Alignment 中的 `F9` follow-up 标记。
- Related requirement: `docs/requirements/domain/inbound-business-module.md (F7; follow-up: add F9 supplier return)`
- Status: `implemented`
- Review status: `approved`
- Delivery mode: `autonomous`
- Acceptance mode: `full`
- Acceptance status: `automated-passed-schema-applied-live-api-passed-page-pending`
- Complete test report required: `yes`
- Lifecycle disposition: `active`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Acceptance QA: `acceptance-qa`
- Last updated: `2026-05-08`

## Goal And Acceptance Criteria

- Goal:
  - 在不旁路库存核心、不新建平行库存账的前提下，让用户可以在入库管理中对已有入库来源发起供应商退货；退货过账必须扣减当前可用库存、按来源层记录成本与数量分配、可作废回滚，并能从页面/API/数据库证据追溯到原入库单行和库存来源流水。
- Acceptance criteria:
  - `[AC-1]` 后端新增供应商退货写路径，复用 `stock_in_order` / `stock_in_order_line` 入库家族主从表承载单据，不新增孤立 supplier-return 主从表；如需扩 enum / 字段，必须同步 Prisma、生成客户端、权限和审计口径。
  - `[AC-2]` 退货过账通过 `inventory-core` 扣减库存并生成明确 OUT 库存流水，不直接更新 `inventory_balance`、`inventory_log` 或 `inventory_source_usage`；该 OUT 动作不得被当成 FIFO 来源层。
  - `[AC-3]` 每条退货明细必须能选择或自动分配可用来源层，并在 `inventory_source_usage` 中保留 `consumer line -> sourceLogId -> stock_in_order_line` 的数量证据；超出来源可用量、库存范围不匹配、物料不匹配时必须失败。
  - `[AC-4]` 退货明细的成本快照来自被退回来源层：`unitPrice/amount` 或等价成本字段不得退化为物料主档静态单价，也不得改写原入库行的 `quantity/unitPrice/amount` 或原来源流水成本。
  - `[AC-5]` 供应商退货作废必须经由 `inventory-core` 逆操作与来源释放恢复库存和来源可用量，保持幂等键稳定；已作废单据不得重复作废或继续参与可用退货量计算。
  - `[AC-6]` 前端在入库管理入口提供“退给厂家 / 供应商退货”操作，支持按入库单/入库明细带入供应商、物料、可退数量、来源成本层，提交后能查询详情、列表状态和作废结果。
  - `[AC-7]` 自动化与验收证据覆盖 schema、后端 service/repository、inventory-core 来源分配/释放、前端 API 映射、页面主流程和数据库追溯结果；full acceptance 不得仅以单元测试替代。

## Requirement Alignment

- Linked domain path:
  - `docs/requirements/domain/inbound-business-module.md`
  - Current executable alignment: `F7` 后续入库扩展切片承接。
  - Follow-up requirement-doc repair: 供应商退货是独立业务事务，不只是体验优化；domain 文档后续应补充显式 `F9`（或等价编号）“供应商退货 / 退厂”能力合同，再把本 task 关联过去。
- Requirement clarity:
  - Clear enough for planning and coding. 用户已冻结关键事实：入库家族统一使用 `stock_in_order` / `stock_in_order_line`；库存副作用必须走 `inventory-core`；入库明细成本是来源层真源；退回必须保留来源分配证据。
- Requirement evidence expectations:
  - 代码证据能证明没有直接写库存底表。
  - 数据证据能从退货单行追溯到 `inventory_source_usage.sourceLogId`、`inventory_log.unitCost` 和原 `stock_in_order_line`。
  - 页面证据能证明用户从入库管理入口发起，而不是通过后台脚本或库存页面绕行。
- Open questions requiring user confirmation:
  - None for this task doc. 命名细节（如 enum 值 `SUPPLIER_RETURN` / `SUPPLIER_RETURN_OUT`）由 coder 按现有代码风格落地，但不得改变上述业务合同。

## Acceptance Planning

- Chosen mode: `full`
- Why:
  - 该能力同时影响用户页面、业务单据、schema / enum、库存扣减、来源分配、作废回滚和成本追溯；属于 cross-module write path 且会改变真实库存，light mode 不足以签收。
- Expected spec/run:
  - Expected spec: `docs/acceptance-tests/specs/inbound.md`
  - Expected case file: `docs/acceptance-tests/cases/inbound.json` if browser/manual cases are not already code-covered.
  - Expected run: `docs/acceptance-tests/runs/run-YYYYMMDD-HHMM-inbound-supplier-return.md`
- Execution surface:
  - Automated: Prisma validate/generate, focused NestJS tests for `inbound` and `inventory-core`, focused frontend build/type checks.
  - Live/browser: start `.env.dev` aligned backend/web, create or use a test inbound source, submit supplier return from entry page, verify list/detail/void and database traceability.
- Complete test report required: `yes`

## Referenced Docs

- `docs/catalog/README.md`
- `docs/catalog/catalog.jsonl` entries `MOD-003`, `REQ-IN-001`, `MOD-004`, `REQ-IC-001`
- `docs/architecture/modules/inbound.md`
- `docs/architecture/modules/inventory-core.md`
- `docs/requirements/domain/inbound-business-module.md`
- `docs/requirements/domain/inventory-core-module.md`
- `docs/acceptance-tests/README.md`
- `docs/architecture/20-wms-database-tables-and-schema.md`
- `docs/architecture/21-database-field-dictionary.md`

## Impacted Scope

- Backend scope:
  - `src/modules/inbound/controllers/inbound.controller.ts`
  - `src/modules/inbound/application/**`
  - `src/modules/inbound/infrastructure/inbound.repository.ts`
  - `src/modules/inbound/dto/**`
  - `src/modules/inventory-core/application/**`
  - `src/modules/inventory-core/infrastructure/inventory.repository.ts`
  - Permission / audit touchpoints needed for new inbound actions.
- Frontend scope:
  - `web/src/views/entry/order/index.vue`
  - `web/src/views/entry/detail/index.vue`
  - `web/src/api/entry/order.js`
  - `web/src/api/entry/detail.js`
  - Any narrowly required router/menu/permission config for the supplier-return entry and detail flow.
- Database scope:
  - `prisma/schema.prisma`
  - `generated/prisma/**`
  - Migration scripts or migration SQL for enum / column / index changes.
  - Existing canonical tables: `stock_in_order`, `stock_in_order_line`, `inventory_log`, `inventory_source_usage`, `document_relation`, `document_line_relation`.
- Test scope:
  - `src/modules/inbound/application/*.spec.ts`
  - `src/modules/inventory-core/application/*.spec.ts`
  - `src/modules/inbound/controllers/inbound.controller.spec.ts`
  - Focused frontend API/page tests if available in the repo pattern.
  - `docs/acceptance-tests/**` evidence artifacts during acceptance.
- Frozen / read-only for current planning turn:
  - `docs/requirements/**`
  - `docs/architecture/**`
  - Application code, schema, frontend, tests.

## Proposed Implementation Plan

- [x] Step 1: Freeze contract and naming. Inspect current `StockInOrderType`, `InventoryOperationType`, permissions and entry page routes; choose existing-style enum/API names for supplier return without creating a parallel supplier-return table family.
- [x] Step 2: Extend persistence contract. Add the minimal schema support required for supplier return order type, explicit OUT operation type, relation metadata and indexes; regenerate Prisma client and keep migration reversible/testable.
- [x] Step 3: Implement backend command path. Add create/list/get/void supplier-return APIs under `inbound`, with DTO validation for source line, material, stock scope, quantity, cost snapshot and idempotency inputs.
- [x] Step 4: Route stock effects through `inventory-core`. Use settlement/source allocation APIs to deduct available source layers, write OUT `inventory_log`, write/update `inventory_source_usage`, and reject insufficient or mismatched sources before committing.
- [x] Step 5: Implement void/reversal. Reverse the supplier-return OUT log and release source usages in the same transaction; preserve stable idempotency keys and block duplicate voids.
- [x] Step 6: Implement frontend flow. Add the entry/order row action and create dialog with source order/material/cost display; add 入库管理 second-level pages `退货单` and `退货单明细` for supplier-return list/detail/void lookup.
- [x] Step 7: Add focused tests. Cover successful return, over-return rejection and void release/reversal. Frontend is covered by production build; browser acceptance remains pending.
- [ ] Step 8: Run full validation and acceptance. Automated gates, target enum schema update and controlled live API create/void/DB trace passed; browser walkthrough for the new 入库管理 `退货单` / `退货单明细` pages remains pending.

## Implementation Update 2026-05-08

- Implemented schema enum support for `SUPPLIER_RETURN`, `SUPPLIER_RETURN_OUT` and `STOCK_IN_RETURN_TO_SUPPLIER`, plus migration SQL at `scripts/migration/sql/20260508-inbound-supplier-return-enums.sql`.
- Added `InboundSupplierReturnService` and DTOs. Create requires an effective posted acceptance source order, validates active returned quantity, snapshots source cost, writes stock-in family return records, links source/return lines, and settles outbound stock through `InventoryService.settleConsumerOut`.
- Supplier return source resolution follows active stock-in price-correction chains and returns against the current `PRICE_CORRECTION_IN` source layer when the original acceptance layer has been adjusted.
- Added supplier-return list/detail/create/void endpoints under `inbound`, with stock-scope checks and existing inbound permissions.
- Added supplier-return preview API so the page can display current source log, current source cost, already returned quantity, source available quantity and actual returnable quantity before submission.
- Added repository helpers for document and line relations plus active returned-quantity aggregation.
- Added entry/order frontend action “退给厂家”, a return dialog, quantity validation capped by available return quantity, source cost/source log display and API submission through `returnOrderToSupplier`.
- Added 入库管理 second-level pages `退货单` and `退货单明细`, wired through supplier-return list/detail/void APIs and frontend route fallback permissions.
- Removed the supplier-return ledger/detail dialogs from the 验收单 page so list/detail browsing lives under the 入库管理二级页面 instead of inside the source-order page.
- Added monthly-reporting support for supplier return as an inbound-domain OUT topic, including material-category net amount and inventory trend netting.
- Fixed source acceptance dependency checks so voided supplier-return line relations no longer keep the source acceptance order blocked.
- Added focused backend tests for create, preview, over-return rejection, price-corrected source selection, void release/reversal and voided downstream dependency filtering.

## Validation 2026-05-08

- `bun run --env-file .env.dev prisma:generate` passed.
- `bun run --env-file .env.dev prisma:validate` passed.
- Read-only target schema check confirmed the supplier-return enum values were initially absent.
- Applied `scripts/migration/sql/20260508-inbound-supplier-return-enums.sql` to the `.env.dev` target database; post-apply schema check confirmed all four required enum values are present.
- `bun run build` passed.
- `bun run typecheck` passed.
- `bun test --runInBand src/modules/inbound/application/inbound-supplier-return.service.spec.ts src/modules/inbound/infrastructure/inbound.repository.spec.ts src/modules/inbound/controllers/inbound.controller.spec.ts` passed: `11` tests.
- `bun test --runInBand src/modules/reporting/infrastructure/reporting.repository.spec.ts src/modules/reporting/application/monthly-report-material-category.service.spec.ts src/modules/reporting/application/monthly-report-export.service.spec.ts src/modules/reporting/application/monthly-report-domain-summary.service.spec.ts src/modules/reporting/application/reporting.service.spec.ts` passed: `24` tests.
- `cd web && bun run build:prod` passed after restructuring supplier-return list/detail into the new `退货单` and `退货单明细` pages.
- Root Biome config excludes `web` (`!!web`), so the new Vue/API page files are validated by `cd web && bun run build:prod`; earlier focused backend Biome pass had no required formatting changes aside from existing large-file warnings in touched areas.
- Controlled live API acceptance created and voided supplier return `TGC20260508134533446` from source acceptance order `YS20260508134533804`; DB trace confirmed return line -> `inventory_source_usage.source_log_id` -> `inventory_log.unit_cost` -> original `stock_in_order_line`, and void released the source usage with a reversal inventory log.
- Live API list/detail verification after the page split returned `orderTotal=1` and `detailTotal=1` for `TGC20260508134533446`, including line `3069`, material `cp001`, quantity `1.25`, unit price `12.34`, amount `15.43`.
- `git diff --check` passed.

## Residual Work

- Run live browser acceptance for the new 入库管理 second-level pages `退货单` and `退货单明细` using controlled test data.
- Update `docs/requirements/domain/inbound-business-module.md` with an explicit supplier-return requirement item (`F9` or equivalent) after the feature contract is accepted.

## Risks And Parallelization Safety

- Key risks:
  - Mis-modeling supplier return as original inbound reversal would erase the difference between “原单作废” and “真实退给供应商”， breaking audit and source allocation history.
  - Treating return line `unitPrice` as a new inbound source cost would create false price layers; it must be a cost snapshot derived from selected/released source layers.
  - Direct writes to `inventory_balance` or manual inserts into `inventory_log` / `inventory_source_usage` would violate the inventory-core contract and make replay/traceability unsafe.
  - Adding a new enum or relation type without updating generated Prisma, permissions, frontend mapping and tests will cause runtime drift.
  - Browser-only success is not enough; database traceability must prove the source linkage.
- Parallelization safety: `not safe`
- Reason:
  - Schema enum/Prisma generation, inbound service contracts, inventory-core settlement semantics and frontend DTO mapping are tightly coupled. Use one writer until the backend/API/schema contract is merged or frozen; after that, frontend and acceptance evidence can proceed as separate read-mostly or narrowly scoped lanes.

## Structured Result

```json
{
  "agent": "planner",
  "status": "implemented_schema_applied_automated_validated_live_api_validated_page_browser_pending",
  "task_doc_path": "docs/tasks/task-20260508-inbound-supplier-return.md",
  "requirement_path": "docs/requirements/domain/inbound-business-module.md (F7; follow-up F9 supplier return)",
  "acceptance_mode": "full",
  "parallelization": "not_safe",
  "summary": [
    "implemented active supplier-return slice for inbound",
    "kept supplier return inside stock_in_order / stock_in_order_line instead of creating a parallel table family",
    "routed stock mutation through inventory-core source-bound OUT settlement",
    "moved supplier-return list and detail browsing into 入库管理 second-level pages 退货单 and 退货单明细"
  ],
  "impacted_scope": [
    "prisma/schema.prisma",
    "generated/prisma/**",
    "src/modules/inbound/**",
    "src/modules/inventory-core/**",
    "web/src/views/entry/**",
    "web/src/api/entry/**",
    "scripts/migration/sql/20260508-inbound-supplier-return-enums.sql",
    "docs/tasks/task-20260508-inbound-supplier-return.md"
  ],
  "validation": [
    "bun run --env-file .env.dev prisma:generate",
    "bun run --env-file .env.dev prisma:validate",
    "bun run typecheck",
    "bun test --runInBand src/modules/inbound/application/inbound-supplier-return.service.spec.ts src/modules/inbound/controllers/inbound.controller.spec.ts",
    "cd web && bun run build:prod"
  ],
  "risks": [
    "supplier return must not be modeled as original inbound void/reversal",
    "return OUT logs must not become FIFO source layers",
    "source allocation evidence must survive create and void",
    "domain docs still need a follow-up explicit F9 supplier-return contract"
  ],
  "next_step": "run live browser acceptance for 入库管理 second-level pages 退货单 and 退货单明细"
}
```
