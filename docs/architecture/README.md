# Architecture Documentation

This directory is the canonical home for all Saifute WMS NestJS repository architecture documentation.

## Layout

| Path | Purpose |
| ---- | ------- |
| `00-architecture-overview.md` | Module inventory, target tech stack, code structure conventions, shared infrastructure map, frozen semantic constraints, and module dependency graph. Start here before touching any module. |
| `20-wms-business-flow-and-optimized-schema.md` | Frozen business-flow definitions, optimized schema decisions, and domain-state semantics across inbound, outbound, workshop, and inventory flows. Read this before implementing or migrating any document-flow, inventory, or workflow surface. |
| `30-java-to-nestjs-data-migration-reference.md` | Canonical legacy Java -> NestJS migration reference. Explains old table groups, target table groups, domain-by-domain mapping, replay-vs-copy rules, staging/archive handling, and cutover terminology. |
| `modules/` | Per-module architecture references — one file per NestJS module. Each file describes the module's boundaries, responsibilities, data access rules, and cross-module constraints. |

## Recommended Reading Order

0. `docs/architecture/20-wms-business-flow-and-optimized-schema.md` — domain and schema baseline
1. `docs/architecture/30-java-to-nestjs-data-migration-reference.md` — old-to-new migration reference and cutover vocabulary
2. `docs/architecture/00-architecture-overview.md` — module map and frozen constraints
3. Per-module file under `docs/architecture/modules/<module>.md` — module-specific detail

## Notes

- `docs/architecture/**` is the single canonical architecture-doc root. Do not add architecture content outside this subtree.
- Module docs describe architecture and boundaries only; per-task execution plans live under `docs/tasks/**`.
- The business-flow and schema doc is a frozen baseline. Changes to it require explicit user confirmation and a dedicated task doc.

## Revision Guidance

- Update the relevant architecture doc in the same delivery scope when code changes alter module boundaries, shared infrastructure contracts, canonical directory structure, or frozen domain semantics already documented here.
- Use `docs/tasks/**` to capture execution history, review notes, migration steps, and temporary rollout detail. When a task closes, keep only the lasting architectural truth in `docs/architecture/**`.
- Treat `20-wms-business-flow-and-optimized-schema.md` and any frozen constraints in `00-architecture-overview.md` as controlled baselines: changing them requires explicit user confirmation and a dedicated task doc.
- Module files under `docs/architecture/modules/*.md` may be revised in place by the task that changes that module's boundaries or cross-module contract; do not open a separate archive track just to preserve superseded wording.
- If architecture text becomes obsolete, update or remove the stale section in the current canonical file and keep provenance in the related task doc instead of leaving parallel outdated copies under `docs/architecture/**`.
