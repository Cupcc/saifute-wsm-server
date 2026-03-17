# @nestjs/swagger

## Local Version Snapshot

- Primary package: `@nestjs/swagger`
- Related packages: `@nestjs/common`, `@nestjs/core`, `swagger-ui-express`
- `package.json` range: `@nestjs/swagger: ^11.2.6`
- Lockfile version: `@nestjs/swagger: 11.2.6`
- Repo touchpoints: `src/app.setup.ts`
- Last refreshed: `2026-03-15 (local snapshot only)`
- Refresh status: `seed-only, pending Context7 enrichment`

## Context7 Resolve Result

- Library search name: `@nestjs/swagger`
- Resolve query: `NestJS 11 Swagger OpenAPI bootstrap configuration and document generation`
- Selected library ID: `pending first Context7 resolve`
- Selected library name: `pending first Context7 resolve`
- Description: `pending first Context7 resolve`
- Source reputation: `pending first Context7 resolve`
- Benchmark score: `pending first Context7 resolve`
- Snippet count: `pending first Context7 resolve`
- Available versions: `pending first Context7 resolve`
- Selection reason: `Seeded from local dependency data; needs first Context7 resolve to lock the canonical library ID.`

## Context7 Query Record

- Library ID used: `pending first Context7 resolve`
- Query used: `How should @nestjs/swagger be configured in NestJS 11 for centralized bootstrap setup, bearer auth, and OpenAPI document generation?`
- Version scope requested: `NestJS 11 / @nestjs/swagger 11.2.6`
- Retrieved date: `pending first Context7 query`
- Supporting references: `optional after Context7 verification or manual official-doc confirmation`

## Recommended APIs

### Bootstrap Swagger once at app startup

- Recommended API: `DocumentBuilder`, `SwaggerModule.createDocument()`, and `SwaggerModule.setup()`
- Why this is preferred: `This matches the current NestJS bootstrap flow in the repository and keeps Swagger generation in one place.`
- Minimal pattern:

```ts
const config = new DocumentBuilder()
  .setTitle("App API")
  .setVersion("1.0.0")
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config, {
  deepScanRoutes: true,
  autoTagControllers: true,
});

SwaggerModule.setup("swagger", app, document, {
  useGlobalPrefix: true,
});
```

- Notes for this repo: `This is a repo-baseline pattern captured from current code; verify with Context7 before treating it as the preferred external API recommendation. Keep Swagger bootstrap centralized in src/app.setup.ts so global prefix, auth metadata, and public-route overrides stay consistent.`

## Deprecated Or Avoid

- API or pattern: `Duplicating Swagger bootstrap logic in multiple files`
- Status: `avoid in this repo`
- Replacement: `Single centralized setup in src/app.setup.ts`
- Why to avoid: `Config drift makes auth schemes, tags, and route visibility inconsistent.`

## Repo Usage Notes

- Current local conventions: `The repo enables bearer auth, keeps global prefix support on, enables deep route scanning, and clears security for explicitly public operations.`
- Wrappers or abstractions in this repo: `setupSwagger()` inside src/app.setup.ts owns Swagger bootstrap behavior.`
- Known gaps or TODOs: `Fill Context7 resolve metadata and confirm any NestJS 11.2-specific Swagger guidance before reusing this note as an authoritative API reference.`

## Refresh Triggers

- `@nestjs/swagger` version changed
- OpenAPI bootstrap behavior changed
- New decorator or schema-generation topic is needed
- Context7 resolves a different canonical NestJS Swagger documentation entry

## Refresh Checklist

- [ ] Re-check `package.json` and `pnpm-lock.yaml`
- [ ] Re-run Context7 resolve step for `@nestjs/swagger`
- [ ] Re-run Context7 docs query for the needed NestJS 11 Swagger topic
- [ ] Update recommended and deprecated sections
- [ ] Reconfirm repo-specific notes in `src/app.setup.ts`
