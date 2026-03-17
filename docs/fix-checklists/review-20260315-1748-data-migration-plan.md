# Data Migration Plan Review

## Review Scope

- Reviewed file: `docs/30-data-migration-plan.md`
- Review basis: current working copy (the file is currently untracked, so no git diff/history was available for this file)
- Anchors checked: `docs/00-architecture-overview.md`, `docs/20-wms-business-flow-and-optimized-schema.md`, module docs for `inbound` / `outbound` / `workshop-material` / `project`, `prisma/schema.prisma`, and live old/new MySQL facts referenced by the plan

## Fix Checklist

- [x] [important] The plan now defines executable document-state reconstruction rules, including `inventoryEffectStatus`, in batch 2 and batch 4.
- [x] [important] The plan now defines a disposition for populated project material line legacy fields: `unit` remaps to `project_material_line.unitCodeSnapshot`, `unit_price` remaps to `unitPrice`, `amount` generation is defined, and remaining legacy fields are routed to `migration_staging.archived_field_payload`.
- [x] [important] The plan now includes a self-contained numeric code mapping for old document, interval, and inventory-source type codes, so batch 3/4 steps no longer depend on external tribal knowledge.
- [x] [important] The plan now explicitly routes `saifute_interval.order_type = 2` rows to `migration_staging.archived_intervals` instead of forcing them into `factory_number_reservation`.
- [x] No actionable findings from this review.

## Integration Test Results

- No code or runtime validation gate was run. This was a docs-only final review of `docs/30-data-migration-plan.md`.
- Live MySQL facts referenced by the plan were spot-checked during this re-review and matched the document where checked, including old/new table counts, empty-state assertions for `saifute-wsm`, duplicate-code counts, null-source assertions for sales return / return orders, orphan inventory counts, and interval coverage from detail tables into `saifute_interval`.
- No batch lint/test/e2e gate applies to this review artifact itself.

## Open Questions

- None.

## Residual Risks Or Testing Gaps

- No remaining `[blocking]` or `[important]` factual/executability issues were identified in the latest revision of the plan.
- Because this is a planning document, the remaining risk sits in later script implementation and dry-run discipline rather than in the reviewed document text itself.

## Short Summary

- The latest revision closes the previously open execution-critical gaps. Based on the current document, the anchored design docs, `prisma/schema.prisma`, and spot-checked live MySQL facts, this migration plan no longer has remaining `[blocking]` or `[important]` factual/executability findings.
