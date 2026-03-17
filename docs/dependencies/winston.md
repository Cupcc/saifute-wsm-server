# winston

## Local Version Snapshot

- Primary package: `winston`
- Related packages: `nest-winston`, `winston-daily-rotate-file`
- `package.json` range: `winston: ^3.19.0`, `nest-winston: ^1.10.2`, `winston-daily-rotate-file: ^5.0.0`
- Lockfile version: `winston: 3.19.0`, `nest-winston: 1.10.2`, `winston-daily-rotate-file: 5.0.0`
- Repo touchpoints: `src/main.ts`, `src/shared/logger/shared-logger.module.ts`, `src/shared/logger/winston.config.ts`, `src/shared/logger/http-logging.middleware.ts`
- Last refreshed: `2026-03-15 (local snapshot only)`
- Refresh status: `seed-only, pending Context7 enrichment`

## Context7 Resolve Result

- Library search name: `winston`
- Resolve query: `Winston 3 NestJS integration file transports daily rotate logging middleware`
- Selected library ID: `pending first Context7 resolve`
- Selected library name: `pending first Context7 resolve`
- Description: `pending first Context7 resolve`
- Source reputation: `pending first Context7 resolve`
- Benchmark score: `pending first Context7 resolve`
- Snippet count: `pending first Context7 resolve`
- Available versions: `pending first Context7 resolve`
- Selection reason: `Seeded from local dependency data; needs first Context7 resolve to lock the canonical Winston documentation entry.`

## Context7 Query Record

- Library ID used: `pending first Context7 resolve`
- Query used: `What is the recommended Winston 3 and nest-winston setup for NestJS bootstrap logging, console formatting, file transports, and HTTP request logging?`
- Version scope requested: `winston 3.19 / nest-winston 1.10`
- Retrieved date: `pending first Context7 query`
- Supporting references: `optional after Context7 verification or manual official-doc confirmation`

## Recommended APIs

### Register the logger once through nest-winston

- Recommended API: `WinstonModule.forRootAsync()` with a shared factory for transport configuration
- Why this is preferred: `The repository already centralizes transport creation and lets Nest resolve the logger through dependency injection.`
- Minimal pattern:

```ts
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        createWinstonModuleOptions(config),
    }),
  ],
})
export class SharedLoggerModule {}
```

- Notes for this repo: `This is a repo-baseline pattern captured from current code; verify with Context7 before treating it as the preferred external API recommendation. Keep all transport wiring in the shared logger module so bootstrap and middleware use the same logger graph.`

### Bridge the Nest logger during bootstrap

- Recommended API: `app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))`
- Why this is preferred: `This routes Nest internal logs through the same configured Winston transports used elsewhere in the app.`
- Minimal pattern:

```ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
app.flushLogs();
```

- Notes for this repo: `This is a repo-baseline pattern captured from current code; verify with Context7 before treating it as the preferred external API recommendation. Bootstrap logger handoff lives in src/main.ts and should stay aligned with the shared logger module.`

## Deprecated Or Avoid

- API or pattern: `Mixing unrelated ad hoc logger instances with the DI-managed Winston logger`
- Status: `avoid in this repo`
- Replacement: `Inject the shared Winston logger or use the Nest logger bridge`
- Why to avoid: `Split logger instances cause inconsistent formatting, missing transports, and partial request correlation.`

## Repo Usage Notes

- Current local conventions: `The repo uses colored console logs in development, JSON file logs for app/http/error streams, and dedicated exception and rejection handlers.`
- Wrappers or abstractions in this repo: `createWinstonModuleOptions()` owns transport and format assembly; HttpLoggingMiddleware emits structured request logs with context HTTP.`
- Known gaps or TODOs: `Fill Context7 resolve metadata and confirm any Winston 3 or nest-winston recommendations around transport typing, error handlers, and request logging before reusing this note as an authoritative API reference.`

## Refresh Triggers

- `winston`, `nest-winston`, or `winston-daily-rotate-file` version changed
- Transport configuration patterns changed
- Request logging or bootstrap logger integration changed
- Context7 resolves a different canonical Winston docs entry

## Refresh Checklist

- [ ] Re-check `package.json` and `pnpm-lock.yaml`
- [ ] Re-run Context7 resolve step for `winston`
- [ ] Re-run Context7 docs query for the needed logging topic
- [ ] Update recommended and deprecated sections
- [ ] Reconfirm repo-specific notes in `src/main.ts` and `src/shared/logger/*`
