# Redis Real Integration

## Metadata

- Scope: replace the current in-memory `Map` implementation behind `shared/redis` with a real Redis client while preserving the existing `session` and `auth` runtime semantics, configuration expectations, and verification surface
- Related requirement: `docs/requirements/archive/retained-completed/req-20260327-1840-redis-real-integration.md`
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Last updated: `2026-03-28`
- Related checklist:
- Related files:
  - `docs/requirements/archive/retained-completed/req-20260327-1840-redis-real-integration.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/session.md`
  - `docs/architecture/modules/auth.md`
  - `src/shared/redis/redis-store.service.ts`
  - `src/shared/redis/redis.module.ts`
  - `src/shared/config/app-config.service.ts`
  - `src/modules/session/session.module.ts`
  - `src/modules/auth/auth.module.ts`
  - `src/modules/session/infrastructure/session.repository.ts`
  - `src/modules/auth/infrastructure/auth-state.repository.ts`
  - `src/shared/redis/redis-store.service.spec.ts`
  - `src/modules/auth/infrastructure/auth-state.repository.spec.ts`
  - `src/modules/session/infrastructure/session.repository.spec.ts`
  - `test/redis-real-integration.e2e-spec.ts`
  - `test/redis-store.e2e-stub.ts`
  - `test/redis-test.utils.ts`
  - `test/app.e2e-spec.ts`
  - `test/batch-d-slice.e2e-spec.ts`
  - `.env.example`
  - `.env.dev`

## Requirement Alignment

- Requirement doc: `docs/requirements/archive/retained-completed/req-20260327-1840-redis-real-integration.md`
- User intent summary:
  - 当前仓库已经把 `session` 与 `auth` 的会话、验证码、密码错误计数等能力建立在 `RedisStoreService` 抽象之上，但底层仍是进程内 `Map` 假实现。
  - 本轮需要将 `shared/redis` 切到真实 Redis，并保持现有接口语义不变，不把系统改回纯无状态 JWT，也不改变 `auth` / `session` 对外行为。
  - 交付要同时覆盖运行依赖、环境变量配置、真实连接生命周期、以及 `session` / `auth` 关键语义验证。
- Acceptance criteria carried into this task:
  - `RedisStoreService` 不再使用进程内 `Map`，而是通过真实 Redis 客户端完成 `set/get/del/ttl/listByPrefix` 能力。
  - `session` 继续遵守“JWT 只是票据、Redis 才是会话真源”的冻结口径；登录、恢复会话、续期、注销、强退的仓储语义不变。
  - `auth` 继续用 Redis 保存验证码与密码错误计数，且验证码一次性消费、失败计数锁定与成功清理的行为语义不退化。
  - 仓库声明 Redis 运行依赖，并在 repo-owned 环境配置文件中补齐最小可用 `REDIS_*` 配置说明，支持本地开发按配置连接。
  - 需要补齐与真实 Redis 语义匹配的测试或验证，避免把内存实现下的偶然行为带到生产实现。
- Open questions requiring user confirmation:
  - None.

## Requirement Sync

- Req-facing phase progress: 阶段一架构/文档/配置契约与阶段二代码接入/验证均已完成；新增 real Redis e2e 已补齐应用级接管证据。
- Req-facing current state: `shared/redis` 已由真实 `ioredis` 客户端接管，`AppConfigService` 已读取 `REDIS_*` 配置，`session` / `auth` 的 TTL、验证码一次性消费、密码失败窗口与模块依赖边界已对齐真实 Redis 语义。
- Req-facing blockers: None.
- Req-facing next step: 归档。
- Requirement doc sync owner: `parent`

## Goal And Acceptance Criteria

- Goal: 将当前 NestJS 仓库中的 `shared/redis` 从内存假实现切换为真实 Redis 接入，并在不改变 `session` / `auth` 对外行为语义的前提下，补齐依赖、配置、连接生命周期、并发安全与验证闭环。
- Acceptance criteria:
  - `src/shared/redis/redis-store.service.ts` 使用真实 Redis 客户端，覆盖 `set/get/del/ttl/listByPrefix`，并对 Redis 原生返回值做适配，保持现有仓储调用侧契约稳定。
  - `src/shared/config/app-config.service.ts` 提供最小必要 Redis 配置读取，repo-owned 环境文件补齐对应样例或开发默认值；本地开发可按配置连接 Redis。
  - `src/modules/session/infrastructure/session.repository.ts` 在真实 Redis 下仍能保存、恢复、删除、续期并列出在线会话，且不把 Redis 实现细节泄漏到业务层。
  - `src/modules/auth/infrastructure/auth-state.repository.ts` 在真实 Redis 下仍正确支持验证码一次性消费、密码失败计数累加、锁定窗口与成功清理。
  - 验证码消费与密码失败计数在真实 Redis 下具备并发安全方案，避免 `get`/`del` 或读改写导致语义退化。
  - 在线会话扫描不使用会阻塞实例的粗暴全量命令；若需要前缀扫描，应采用可接受的 Redis 扫描策略并保留现有返回语义。
  - 至少通过类型检查、focused 测试/验证，以及最终仓库级验证门禁；并提供真实 Redis 应用级 smoke 证明服务已完成接管。

## Scope And Ownership

- Allowed code paths:
  - `src/shared/redis/**`
  - `src/shared/config/app-config.service.ts`
  - `src/modules/session/**`
  - `src/modules/auth/**`
  - `test/redis-real-integration.e2e-spec.ts`
  - `test/redis-store.e2e-stub.ts`
  - `test/redis-test.utils.ts`
  - `test/app.e2e-spec.ts`
  - `test/batch-d-slice.e2e-spec.ts`
  - `.env.example`
  - `.env.dev`
- Frozen or shared paths:
  - `docs/requirements/archive/retained-completed/req-20260327-1840-redis-real-integration.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/architecture/**`
  - `.cursor/**`
  - `.env`
  - `src/modules/rbac/**`
  - `src/modules/inventory-core/**`
  - `src/modules/workflow/**`
  - 任何与本 task 无关的业务模块控制器、DTO、数据库 schema
- Task doc owner: `planner`
- Contracts that must not change silently:
  - `session` 继续是“JWT 票据 + Redis 会话真源”，不能借 Redis 接入之名改成纯无状态 JWT。
  - `auth` 继续负责验证码与密码错误计数，但不接管 `session` 的会话存储实现细节。
  - `RedisStoreService` 对上层暴露的序列化、TTL 与前缀扫描契约要稳定，不能把 Redis 的 `-1/-2`、二进制值或客户端特定异常直接泄漏给 repository。
  - 验证码必须保持一次性消费；密码错误计数必须保持累加、锁定和成功清理语义。
  - 不引入跨模块业务语义变更，不调整现有登录接口、JWT payload 结构或权限语义。

## Implementation Plan

- [x] Step 1: 收口运行时配置面。确认当前仓库已声明的 Redis 客户端依赖（当前为 `ioredis`），在 `.env.example`、`.env.dev` 与 `AppConfigService` 中落实最小必要的 `REDIS_*` 连接配置，同时明确 `.env` 只作为本地人工配置，不纳入提交真源。
- [x] Step 2: 重写 `src/shared/redis/redis-store.service.ts` 为真实 Redis 客户端适配层，并在 `src/shared/redis/redis.module.ts` 中补上连接初始化、关闭清理、必要的错误暴露与 provider 导出，保持调用侧仍通过 `RedisStoreService` 注入。
- [x] Step 3: 对齐基础语义。将 Redis 原生 `ttl` 返回值、JSON 序列化、可选 TTL 写入、删除结果与前缀扫描结果统一映射到当前服务契约；在线会话前缀查询采用非阻塞扫描策略，不使用 `KEYS`。
- [x] Step 4: 修正 `auth` 在真实 Redis 下的并发敏感点。将验证码一次性消费改为原子语义，将密码失败计数改为并发下不会丢计数的实现，并保持锁定窗口语义稳定。
- [x] Step 5: 校验 `session` 仓储在真实 Redis 下的 TTL 与续期链路。确保会话保存、读取、删除、TTL 查询与在线会话列举在真实 Redis 返回值下仍满足现有 `session` 设计文档口径。
- [x] Step 6: 补齐 focused 测试。补充 `RedisStoreService`、`AuthStateRepository`、`SessionRepository` 的真实 Redis integration spec，并为默认 e2e 显式接入 `RedisStoreE2eStub`。
- [x] Step 7: 完成最终验证。运行类型检查、focused 测试、静态检查、真实 Redis 应用级 smoke 与最终仓库级验证门禁。

## Coder Handoff

- Execution brief:
  - 先收口依赖和配置，再动 Redis 适配层，最后修 `auth` / `session` 语义细节和测试；不要直接在 repository 层分散写客户端调用。
  - 保持 `RedisStoreService` 作为唯一 Redis 访问入口，避免 `session` / `auth` 直接依赖具体 Redis 客户端，符合 NestJS 分层与 DI 边界。
  - 对真实 Redis 的差异重点收口在三个点：TTL 返回值兼容、验证码消费原子性、密码失败计数并发正确性。
  - 在线会话查询只允许用可接受的扫描方案，不能为了方便引入 `KEYS login_tokens:*` 这类高风险命令。
- Required source docs or files:
  - `docs/requirements/archive/retained-completed/req-20260327-1840-redis-real-integration.md`
  - `docs/tasks/archive/retained-completed/task-20260327-1845-redis-real-integration.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/session.md`
  - `docs/architecture/modules/auth.md`
  - `src/shared/redis/redis-store.service.ts`
  - `src/shared/redis/redis.module.ts`
  - `src/shared/config/app-config.service.ts`
  - `src/modules/session/infrastructure/session.repository.ts`
  - `src/modules/auth/infrastructure/auth-state.repository.ts`
  - `test/redis-real-integration.e2e-spec.ts`
  - `test/redis-store.e2e-stub.ts`
  - `test/redis-test.utils.ts`
- Constraints and non-goals:
  - 不改登录接口、JWT payload、权限模型或 `session` / `auth` 对外 API 语义。
  - 不把 Redis 客户端散落到 controller、application service 或 repository 之外的任意位置。
  - 不为了本轮接入引入数据库 schema 变更、跨模块业务逻辑调整或新的缓存产品形态。
  - 不提交本地私有 `.env` 或任何秘密值。
  - 不以“测试环境没有 Redis”为理由保留 `Map` 回退主路径；如需测试替身，也必须显式且不改变生产接入真相。
- Validation command for this scope:
  - Iteration:
    - `pnpm typecheck`
    - `pnpm exec biome check src/shared/redis src/shared/config/app-config.service.ts src/modules/auth/infrastructure/auth-state.repository.ts src/modules/session/infrastructure/session.repository.ts .env.example .env.dev`
    - `pnpm test -- redis-store`
    - `pnpm test -- auth-state.repository`
    - `pnpm test -- session.repository`
  - Runtime smoke when Redis is available:
    - `pnpm test:e2e -- redis-real-integration.e2e-spec.ts`
  - Final gate:
    - `pnpm verify`

## Reviewer Handoff

- Review focus:
  - `RedisStoreService` 是否真的切到了真实客户端，并且通过 DI 与模块生命周期统一管理连接，而不是在多处重复创建连接。
  - `ttl`、序列化、删除结果与 `listByPrefix` 的契约是否对调用侧保持稳定，特别是有没有把 Redis 原生 `-1/-2` 或客户端异常直接暴露给上层。
  - `consumeCaptcha()` 是否具备原子一次性消费语义；`recordPasswordFailure()` 是否在并发失败登录下仍然正确累加并维持锁定窗口。
  - 在线会话枚举是否避免 `KEYS`，以及在 key 数量增长时仍保持可接受风险。
  - 配置与依赖是否最小化收口在 `AppConfigService` / repo-owned env 文件 / 模块 imports 中，没有把本地私有配置写进仓库。
  - 是否补齐了与风险面匹配的 focused 测试与真实 Redis 应用级 smoke，而不是只靠手工验证。
- Requirement alignment check:
  - 复核交付是否完整覆盖 requirement 中的三件事：真实 Redis 接入、`session` / `auth` 语义保持不变、以及依赖与环境配置补齐。
- Final validation gate:
  - `pnpm typecheck`
  - `pnpm test -- redis-store`
  - `pnpm test -- auth-state.repository`
  - `pnpm test -- session.repository`
  - `pnpm test:e2e -- redis-real-integration.e2e-spec.ts`
  - `pnpm verify`
- Required doc updates:
  - 在 task 内回填实际使用的 Redis 连接参数名、验证结果、残余风险与任何未覆盖的测试空白。
  - 给 `parent` 提供 requirement 可直接同步的 `阶段进度 / 当前状态 / 阻塞项 / 下一步` 四行短句。

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `src/shared/redis/redis-store.service.ts`、`src/shared/redis/redis.module.ts`、`src/shared/config/app-config.service.ts` 共同定义真实 Redis 接入的唯一基础设施边界，无法安全拆给多个 writer。
  - `src/modules/auth/infrastructure/auth-state.repository.ts` 与 `src/modules/session/infrastructure/session.repository.ts` 同时依赖 `RedisStoreService` 契约；若并行改写，极易出现 TTL、原子性或序列化约定漂移。
  - `test/redis-real-integration.e2e-spec.ts`、`test/redis-store.e2e-stub.ts` 与两组现有 e2e 共同定义验证层真相，需要单一 writer 保持测试口径一致。

## Review Log

- Validation results: `pnpm typecheck`、`pnpm test -- redis-store`、`pnpm test -- auth-state.repository`、`pnpm test -- session.repository`、`pnpm test:e2e -- redis-real-integration.e2e-spec.ts`、`pnpm test:e2e -- batch-d-slice.e2e-spec.ts` 与 `pnpm verify` 均通过；`pnpm test:e2e -- app.e2e-spec.ts` 仍失败于既存 RBAC routes 数量断言漂移，已明确不计入本轮 Redis blocker。
- Findings: `code-reviewer` closing re-review `No findings.`；上一轮指出的“缺少应用级真实 Redis 接管证据”已由新增 real Redis e2e 补齐。
- Follow-up action: 归档；若后续要修 `app.e2e` 的 admin routes 断言漂移，应另开 RBAC 相关 scope。

## Final Status

- Outcome: 已完成真实 Redis 客户端接入、配置接管、启动 fail-fast、验证码一次性消费、密码失败窗口并发正确性、会话 TTL / 前缀扫描适配、模块依赖显式化，以及 focused / 应用级验证闭环。
- Requirement alignment: 与 `req-20260327-1840-redis-real-integration` 对齐，完整保留“JWT 票据 + Redis 真源”和“`auth` 保存验证码/密码错误计数”的冻结口径。
- Residual risks or testing gaps:
  - `pnpm test:e2e -- app.e2e-spec.ts` 仍有与本轮无关的 RBAC routes 数量断言漂移，不构成当前 Redis scope blocker。
  - `pnpm verify` 通过，但 Jest 仍打印仓库级既存的 `MaxListenersExceededWarning` / open-handle 提示；当前未发现其与本轮 Redis 行为正确性存在直接 blocker 关系。
- Directory disposition after completion: 已归档至 `docs/tasks/archive/retained-completed/task-20260327-1845-redis-real-integration.md`，并同步更新索引看板。
- Next action: None；归档完成。
