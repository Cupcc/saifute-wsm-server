# Architecture Documentation

This directory is the canonical home for all Saifute WMS NestJS repository architecture documentation.

## Layout

| Path | Purpose |
|------|---------|
| `00-architecture-overview.md` | Module inventory, target tech stack, code structure conventions, shared infrastructure map, frozen semantic constraints, and module dependency graph. Start here before touching any module. |
| `20-wms-business-flow-and-optimized-schema.md` | Frozen business-flow definitions, optimized schema decisions, and domain-state semantics across inbound, outbound, workshop, and inventory flows. Read this before implementing or migrating any document-flow, inventory, or workflow surface. |
| `modules/` | Per-module architecture references — one file per NestJS module. Each file describes the module's boundaries, responsibilities, data access rules, and cross-module constraints. |

## Recommended Reading Order

0. `docs/architecture/20-wms-business-flow-and-optimized-schema.md` — domain and schema baseline
1. `docs/architecture/00-architecture-overview.md` — module map and frozen constraints
2. Per-module file under `docs/architecture/modules/<module>.md` — module-specific detail

## Notes

- `docs/architecture/**` is the single canonical architecture-doc root. Do not add architecture content outside this subtree.
- Module docs describe architecture and boundaries only; per-task execution plans live under `docs/tasks/**`.
- The business-flow and schema doc is a frozen baseline. Changes to it require explicit user confirmation and a dedicated task doc.
