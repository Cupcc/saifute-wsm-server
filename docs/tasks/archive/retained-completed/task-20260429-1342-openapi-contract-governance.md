# OpenAPI Contract Governance Phase 0 And Phase 1

## Metadata

- Scope:
  - Create the durable execution handoff for OpenAPI / Swagger contract governance.
  - First delivery slice only: Phase 0 baseline audit plus Phase 1 contract truthfulness.
  - This task does not implement application code in the planning turn; implementation is delegated to downstream subagents from this handoff.
- Related requirement: `-`
- Status: `accepted`
- Review status: `passed`
- Delivery mode: `standard`
- Acceptance mode: `light`
- Acceptance status: `accepted`
- Complete test report required: `no`
- Lifecycle disposition: `retained-completed`
- Planner: `saifute-planner`
- Coder: `saifute-coder`
- Reviewer: `saifute-code-reviewer`
- Acceptance QA: `parent-orchestrator`; invoke `saifute-acceptance-qa` only if light evidence proves insufficient
- Last updated: `2026-04-29 14:10 Asia/Shanghai`
- Related checklist: `-`
- Related acceptance spec: `-`
- Related acceptance run: (optional)
- Related files:
  - `docs/workspace/notes/swagger-api-docs-review.md`
  - `docs/tasks/README.md`
  - `docs/tasks/_template.md`
  - `docs/architecture/README.md`
  - `docs/architecture/00-architecture-overview.md`
  - `src/app.setup.ts`
  - `src/shared/decorators/public.decorator.ts`
  - `src/shared/common/interceptors/skip-response-envelope.decorator.ts`
  - `src/shared/common/interceptors/response-envelope.interceptor.ts`
  - `src/shared/common/filters/http-exception.filter.ts`
  - `src/modules/auth/controllers/auth.controller.ts`
  - `src/modules/file-storage/controllers/file-storage.controller.ts`
  - `src/modules/reporting/controllers/reporting.controller.ts`
  - `src/modules/rbac/controllers/system-*.controller.ts`
  - `test/app.e2e-spec.ts`
  - `package.json`

## Requirement Alignment

- Domain capability:
  - `-`; this is an API contract governance task, not a domain capability task.
- User intent summary:
  - The user explicitly asked for subagents and completion of OpenAPI / Swagger governance work.
  - The source note says Swagger is reachable, but not reliable enough as an API contract because runtime metadata and OpenAPI metadata are maintained separately.
  - The first slice must make contract problems measurable, then fix truthful representation for public routes, no-envelope routes, file upload/download/export routes, and global error responses.
- Acceptance criteria carried into this task:
  - `[AC-1]` Phase 0 adds a reusable OpenAPI audit script and baseline output without immediately blocking CI on existing debt.
  - `[AC-2]` Phase 1 removes public-route Swagger hand-maintenance and derives `security: []` from `@Public()` metadata.
  - `[AC-3]` Phase 1 removes no-envelope Swagger hand-maintenance and derives envelope skipping from `@SkipResponseEnvelope()` metadata at method and class level.
  - `[AC-4]` Phase 1 adds centralized upload/download/export Swagger helpers for multipart request bodies and binary file responses.
  - `[AC-5]` Phase 1 adds a reusable global error response schema for `400`, `401`, `403`, and `500`.
  - `[AC-6]` Runtime response semantics do not change for governance convenience.
  - `[AC-7]` Large response DTO rollout, operation summaries, and query/path descriptions are explicitly deferred to later phases.
- Requirement evidence expectations:
  - Phase 0 evidence is the audit command output with concrete `path + method` findings and metrics comparable to the review note.
  - Phase 1 evidence is focused automated coverage over generated OpenAPI JSON, plus the audit command proving the targeted P0/P1 truthfulness findings changed in the expected direction.
  - Light acceptance can be recorded in this task doc; a separate browser acceptance spec/run is not expected for this slice.
- Open questions requiring user confirmation:
  - `none`; the source note and parent prompt define a narrow enough first delivery slice.

## Progress Sync

- Phase progress:
  - `Phase 0 baseline audit and Phase 1 contract truthfulness implemented, reviewed, and light-accepted`
- Current state:
  - `src/app.setup.ts` now delegates Swagger post-processing to `src/shared/api-docs/openapi/apply-openapi-contract-policies.ts`.
  - `@Public()` metadata now drives OpenAPI `security: []`; `POST /api/auth/refresh` is covered without a manual route list.
  - `@SkipResponseEnvelope()` metadata now drives envelope skipping at method and class level; `/api/system/**` operations no longer receive JSON envelope schemas.
  - File upload endpoints document multipart binary fields through `ApiMultipartFile`.
  - File download/export endpoints document binary responses through `ApiFileResponse`.
  - The generated OpenAPI document includes shared `ApiErrorResponseDto` references for required error statuses.
- Acceptance state:
  - `accepted via light JSON-contract evidence`
- Blockers:
  - `none`
- Next step:
  - `retained-completed archive`

## Goal And Acceptance Criteria

- Goal:
  - Promote Swagger from a reachable debug document to a truthful, measurable API contract baseline for the core runtime policies already present in the NestJS app.
- Acceptance criteria:
  - `[AC-1]` A reusable OpenAPI audit script exists and can consume either a running `/api/docs-json` endpoint or a generated/local OpenAPI JSON file. It reports operation totals, public-route security mismatches, no-envelope wrapping mismatches, generic `data: object` counts, multipart upload counts, binary file response counts, error response coverage, empty `Object` schema references, and missing summary/description counts. Findings identify concrete `path + method`, not only totals.
  - `[AC-2]` The audit script has a package script entry such as `audit:openapi` or `lint:openapi`, runs in baseline/non-blocking mode for this slice, and does not hard-code the current `231` operation count as a pass condition.
  - `[AC-3]` `@Public()` is the single runtime/OpenAPI source for public routes. Generated OpenAPI marks every public route, including `POST /api/auth/refresh`, with `security: []` and does not require extending `PUBLIC_SWAGGER_OPERATIONS`.
  - `[AC-4]` `@SkipResponseEnvelope()` is the single runtime/OpenAPI source for no-envelope responses at both method and class level. Generated OpenAPI no longer wraps those operations in `{ success, code, data }`, and implementation does not grow `SKIP_RESPONSE_ENVELOPE_SWAGGER_OPERATIONS`.
  - `[AC-5]` Upload endpoints such as `POST /api/files/upload` and `POST /api/files/avatar` use a centralized helper to declare `multipart/form-data` request bodies with the correct binary field names.
  - `[AC-6]` Download/export endpoints returning `StreamableFile` use a centralized helper to declare binary responses and are excluded from JSON envelope wrapping in OpenAPI. This covers `file-storage`, reporting exports, and system-management exports that are in the first-slice truthfulness surface.
  - `[AC-7]` A shared error response DTO/schema represents `{ success: false, code, message }`, and generated OpenAPI includes appropriate `400`, `401`, `403`, and `500` responses through a centralized policy/helper rather than copied schema snippets in each controller.
  - `[AC-8]` The delivery does not change business return values, HTTP route behavior, guard behavior, response-envelope runtime behavior, or file-stream runtime behavior unless separately approved as a business contract change.
  - `[AC-9]` Later phases remain out of this slice: large successful response DTO rollout, full module response DTO coverage, operation summaries, business tags, query/path parameter descriptions, enum cleanup, and CI-blocking thresholds.

## Scope And Ownership

- Allowed code paths for downstream implementation:
  - `scripts/**` or a similarly scoped existing script directory for the OpenAPI audit utility.
  - `package.json` for one audit script entry only.
  - `src/shared/api-docs/**` or an equivalent shared-layer OpenAPI contract helper boundary.
  - `src/app.setup.ts` for Swagger bootstrap simplification and centralized policy invocation.
  - `src/shared/decorators/public.decorator.ts`
  - `src/shared/common/interceptors/skip-response-envelope.decorator.ts`
  - `src/shared/common/interceptors/response-envelope.interceptor.ts`
  - `src/shared/common/filters/http-exception.filter.ts`
  - Targeted controller surfaces needed for upload/download/export helper usage:
    - `src/modules/file-storage/controllers/file-storage.controller.ts`
    - `src/modules/reporting/controllers/reporting.controller.ts`
    - `src/modules/rbac/controllers/system-*.controller.ts`
  - Focused tests:
    - `test/app.e2e-spec.ts`
    - colocated specs for new shared OpenAPI helper/policy code, if useful
- Frozen or shared paths:
  - `docs/workspace/notes/swagger-api-docs-review.md` is the source review note for this task but remains frozen for this planning slice.
  - `docs/architecture/**` is reference-only unless the parent explicitly opens an architecture-doc update.
  - Business controllers outside the targeted public/no-envelope/file surfaces are out of scope for bulk annotation.
  - DTO rollout for major business modules is out of scope for this first delivery slice.
- Task doc owner:
  - `saifute-planner` during planning; parent may update status fields after subagent handoff.
- Contracts that must not change silently:
  - `@Public()` guard semantics.
  - `@SkipResponseEnvelope()` and `ResponseEnvelopeInterceptor` runtime semantics.
  - `HttpExceptionFilter` payload shape: `{ success: false, code, message }`.
  - File upload field names: `file` and `avatar`.
  - `StreamableFile` runtime download/export behavior.

## Implementation Plan

- [x] Step 1: Freeze the current OpenAPI baseline.
  - Add a reusable audit utility that can read a running docs-json URL or local JSON.
  - Report the Phase 0 metrics from the review note and emit concrete `path + method` rows for mismatches.
  - Add one package script entry for repeatable local use.
- [x] Step 2: Move OpenAPI contract policy into the shared layer.
  - Add shared helpers/policies under `src/shared/api-docs/**` or an equivalent shared boundary.
  - Keep `src/app.setup.ts` responsible for building the Swagger document, applying the centralized policy, and mounting UI/JSON.
- [x] Step 3: Replace manual public-route Swagger security with metadata-driven behavior.
  - Reuse `IS_PUBLIC_KEY` from `public.decorator.ts`.
  - Apply `security: []` to every generated operation whose controller method/class is public.
  - Confirm `POST /api/auth/refresh` is covered without adding another manual route descriptor.
- [x] Step 4: Replace manual no-envelope Swagger wrapping with metadata-driven behavior.
  - Reuse `SKIP_RESPONSE_ENVELOPE_KEY` from `skip-response-envelope.decorator.ts`.
  - Respect method-level and class-level metadata when deciding whether a success response should be wrapped in the documented envelope.
  - Do not alter runtime response wrapping rules to satisfy OpenAPI.
- [x] Step 5: Add upload/download/export helpers and apply them only to the first-slice surfaces.
  - Provide centralized helpers for multipart file request bodies and binary file responses.
  - Apply upload helpers to `file-storage` upload/avatar endpoints.
  - Apply file response helpers to `file-storage` download, reporting exports, and system-management exports returning `StreamableFile`.
- [x] Step 6: Add the shared error response schema and global response policy.
  - Define a reusable error DTO/schema matching `HttpExceptionFilter`.
  - Add `400`, `401`, `403`, and `500` response entries through centralized policy/helper code.
  - Avoid duplicating the same schema in every controller method.
- [x] Step 7: Validate with generated OpenAPI JSON and focused tests.
  - Update existing Swagger e2e assertions in `test/app.e2e-spec.ts` to cover public refresh, no-envelope class-level routes, multipart uploads, binary file responses, and global error responses.
  - Run the new audit script before and after changes and capture the targeted metric movement in the review handoff.

## Coder Handoff

- Execution brief:
  - Implement only Phase 0 baseline audit and Phase 1 truthfulness. Do not start the response DTO rollout or readability pass.
  - Prefer centralized shared OpenAPI helpers/policies over per-controller schema duplication.
  - Preserve runtime behavior; generated OpenAPI should describe reality, not force runtime changes.
- Required source docs or files:
  - `docs/workspace/notes/swagger-api-docs-review.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/README.md`
  - `src/app.setup.ts`
  - `src/shared/decorators/public.decorator.ts`
  - `src/shared/common/interceptors/skip-response-envelope.decorator.ts`
  - `src/shared/common/interceptors/response-envelope.interceptor.ts`
  - `src/shared/common/filters/http-exception.filter.ts`
  - `src/modules/file-storage/controllers/file-storage.controller.ts`
  - `test/app.e2e-spec.ts`
- Owned paths:
  - `scripts/**` for the audit script
  - `package.json` for one audit script entry
  - `src/shared/api-docs/**` or equivalent shared OpenAPI helper boundary
  - `src/app.setup.ts`
  - targeted decorators/interceptors/filter files listed above
  - targeted upload/download/export controllers listed above
  - focused tests covering generated OpenAPI JSON
- Forbidden shared files:
  - `docs/workspace/**`
  - `docs/architecture/**`
  - `docs/requirements/**`
  - broad business controller/DTO rollout outside targeted Phase 1 truthfulness surfaces
- Constraints and non-goals:
  - No CI-blocking OpenAPI gate in this slice.
  - No bulk response DTO rollout.
  - No operation summaries, business tags, or query/path description cleanup.
  - No business contract or runtime response shape changes.
  - No manual-path-list expansion as the final fix.
- Validation command for this scope:
  - `bun run typecheck`
  - `bun run test -- test/app.e2e-spec.ts`
  - New audit command, for example `bun run audit:openapi -- --input <docs-json-url-or-file>`
  - Run `bun run lint` if shared helper files or package scripts change formatting-sensitive code.
- If parallel work is approved, add one subsection per writer with the same fields:
  - Not approved by default for this first implementation pass; see `## Parallelization Safety`.

## Reviewer Handoff

- Review focus:
  - Verify OpenAPI now follows runtime metadata for public routes and no-envelope routes.
  - Verify shared helpers/policies are centralized and not copied across controllers.
  - Verify the audit script reports concrete `path + method` findings and avoids fixed-count pass conditions.
  - Verify runtime behavior remains unchanged.
  - Verify large response DTO rollout/readability work was not pulled into this slice.
- Requirement alignment check:
  - Compare changes against `docs/workspace/notes/swagger-api-docs-review.md` Phase 0 and Phase 1 only.
  - Check all `[AC-*]` entries in this task doc.
- Final validation gate:
  - `bun run typecheck`
  - `bun run test -- test/app.e2e-spec.ts`
  - new OpenAPI audit command
  - `bun run lint` when practical; if skipped because of pre-existing repo-wide lint debt, record the focused validation actually run.
- Required doc updates:
  - Update this task doc status/review log/acceptance evidence.
  - Do not update `docs/workspace/**` or `docs/architecture/**` unless parent explicitly expands the writable boundary.

### Acceptance Evidence Package

- Covered criteria:
  - `[AC-1]` through `[AC-9]`
- Evidence pointers:
  - New audit script output.
  - Generated `/api/docs-json` assertions in `test/app.e2e-spec.ts`.
  - Focused before/after metric comparison for public security, no-envelope wrapping, multipart uploads, binary responses, and error responses.
- Evidence gaps, if any:
  - Browser UI is not required for this slice because JSON contract assertions and audit output are stronger evidence for the actual contract.
- Complete test report requirement: `no`

### Acceptance Test Expectations

- Acceptance mode: `light`
- User-visible flow affected: `no`
- Cross-module write path: `no`
- Irreversible or high-cost business effect: `no`
- Existing automated user-flow coverage: `partial`; `test/app.e2e-spec.ts` already asserts Swagger docs-json behavior and should be extended
- Browser test required: `no`
- Browser waiver reason:
  - The deliverable is generated OpenAPI JSON contract truthfulness, not a business UI flow. Focused JSON assertions plus the audit script provide direct evidence. A Swagger UI browser smoke is optional only if the implementation changes UI mounting behavior.
- Related acceptance cases:
  - `-`
- Related acceptance spec:
  - `-`
- Separate acceptance run required: `no`
- Complete test report required: `no`
- Required regression / high-risk tags:
  - `openapi`
  - `swagger`
  - `response-envelope`
  - `auth-public-route`
  - `file-upload-download`
  - `error-response`
- Suggested environment / accounts:
  - No authenticated browser account is required for light acceptance.
  - If validating against a running app, use local `.env.dev` and `/api/docs-json`.
- Environment owner / setup source:
  - Parent orchestrator / local dev environment.

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
  - `not approved for simultaneous implementation by default`
- If not safe, list the shared files or contracts that require a single writer:
  - `src/app.setup.ts`
  - `src/shared/api-docs/**` or equivalent shared helper/policy boundary
  - `src/shared/decorators/public.decorator.ts`
  - `src/shared/common/interceptors/skip-response-envelope.decorator.ts`
  - `src/shared/common/interceptors/response-envelope.interceptor.ts`
  - `src/shared/common/filters/http-exception.filter.ts`
  - `test/app.e2e-spec.ts`
  - `package.json`
  - OpenAPI envelope/security/error schema conventions
- Limited disjoint ownership suggestion, only if the parent explicitly wants multiple writers:
  - Writer A may own only the Phase 0 audit script and its tests, plus `package.json` script entry.
  - Writer B must be the sole owner of Phase 1 shared OpenAPI policy/helper code, `src/app.setup.ts`, runtime metadata integration, targeted controller helper application, and Swagger e2e updates.
  - Writer C should wait until Writer B lands the helper API before applying additional export annotations; otherwise controller edits will depend on an unstable helper contract.

## Review Log

- Validation results:
  - `bun run typecheck` — passed.
  - `./node_modules/.bin/biome check ...focused OpenAPI governance paths...` — passed.
  - `bun run test:e2e -- --runTestsByPath test/app.e2e-spec.ts --runInBand` — passed, `8/8`.
  - `bun run audit:openapi -- --input http://127.0.0.1:8112/api/docs-json --json` — passed; reported `publicRouteSecurityMismatches: 0`, `noEnvelopeWrappingMismatches: 0`, `operationsWithRequiredErrorResponses: 238`, `missingRequiredErrorResponses: 0`, `multipartOperations: 2`, `binaryResponseOperations: 9`.
  - `bun run audit:openapi -- --help` — passed.
  - `git diff --check -- <tracked OpenAPI governance paths>` — passed.
- Findings:
  - Initial review found the audit script did not yet report public security or no-envelope mismatch categories.
  - Fix extended the audit script with default expected public/no-envelope baselines plus repeatable `--expect-public`, `--expect-no-envelope`, and `--expect-no-envelope-prefix` flags.
  - Re-review result: `approved`; no findings.
- Follow-up action:
  - Keep large response DTO rollout, summaries, query/path descriptions, enum cleanup, and CI-blocking thresholds for later OpenAPI governance phases.

## Acceptance

- Acceptance status: `accepted`
- Acceptance QA: `parent-orchestrator`
- Acceptance date: `2026-04-29`
- Complete test report: `no`

### Acceptance Checklist

> Acceptance QA 在验收时逐条填写。每条应对应 task doc 的 `[AC-*]` 条目。

- [x] `[AC-1]` OpenAPI audit script is reusable, concrete, and baseline-oriented — Evidence: `scripts/openapi-contract-audit.mjs` reports concrete metrics and examples, including public security mismatches and no-envelope wrapping mismatches — Verdict: `✓ met`
- [x] `[AC-2]` Audit script package entry exists and avoids fixed-count pass conditions — Evidence: `package.json` has `audit:openapi`; live audit reported `238` operations without hardcoded count checks — Verdict: `✓ met`
- [x] `[AC-3]` `@Public()` drives OpenAPI `security: []` for all public routes — Evidence: e2e asserts `POST /api/auth/refresh` has `security: []`; audit reports `publicRouteSecurityMismatches: 0` — Verdict: `✓ met`
- [x] `[AC-4]` `@SkipResponseEnvelope()` drives no-envelope OpenAPI behavior at method and class level — Evidence: e2e asserts `/api/system/user/list` is not envelope-wrapped; audit reports `noEnvelopeWrappingMismatches: 0` — Verdict: `✓ met`
- [x] `[AC-5]` Upload endpoints document multipart binary request bodies through shared helpers — Evidence: e2e asserts `/api/files/upload` field `file` and `/api/files/avatar` field `avatar`; audit reports `multipartOperations: 2` — Verdict: `✓ met`
- [x] `[AC-6]` Download/export endpoints document binary responses through shared helpers — Evidence: e2e asserts files/reporting/system-user binary responses; audit reports `binaryResponseOperations: 9` — Verdict: `✓ met`
- [x] `[AC-7]` Global error response schema appears in generated OpenAPI — Evidence: e2e asserts `ApiErrorResponseDto` refs for `400/401/403/500`; audit reports `missingRequiredErrorResponses: 0` — Verdict: `✓ met`
- [x] `[AC-8]` Runtime response/file/auth behavior is unchanged — Evidence: targeted e2e auth/session/RBAC and docs tests pass `8/8`; helper use only describes existing upload/download/export surfaces — Verdict: `✓ met`
- [x] `[AC-9]` Later phases remain deferred — Evidence: response DTO rollout, summaries, query/path descriptions, enum cleanup, and CI-blocking thresholds were not implemented in this slice — Verdict: `✓ met`

### Acceptance Notes

- Acceptance path used: `light`
- Acceptance summary:
  - Accepted. JSON contract assertions and the audit command directly cover this slice's contract-truthfulness surface.
- Report completeness check:
  - Complete for Phase 0 + Phase 1. Full browser acceptance is not required because the deliverable is generated OpenAPI JSON contract behavior, not a user workflow.
- If rejected or blocked: root cause（`requirement-misunderstanding` | `implementation-gap` | `evidence-gap` | `environment-gap`）+ 精确修复指引 / 环境修复指引
- If conditionally accepted: follow-up requirement / task:

## Final Status

- Outcome:
  - `accepted`
- Requirement alignment:
  - Completed the first governance slice from `docs/workspace/notes/swagger-api-docs-review.md`: Phase 0 baseline audit and Phase 1 contract truthfulness.
- Residual risks or testing gaps:
  - The audit expected-route defaults must be extended when future public or no-envelope surfaces are added.
  - Existing broad Swagger quality debt remains intentionally out of scope for later phases.
- Directory disposition after completion:
  - `retained-completed`
- Next action:
  - Start a later OpenAPI governance phase for response DTO rollout, summaries, query/path descriptions, enum cleanup, and CI thresholds when needed.
