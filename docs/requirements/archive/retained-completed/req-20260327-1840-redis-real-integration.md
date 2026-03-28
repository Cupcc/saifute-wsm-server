# Redis 真实接入

## Metadata

- ID: `req-20260327-1840-redis-real-integration`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260327-1845-redis-real-integration.md`

## 分阶段说明

整体拆为 **两阶段** 推进：**先完成架构层说明与边界收口，再落地真实客户端与业务语义对齐**。

- **阶段一（架构先行）**：在架构/需求层面固化 Redis 接入边界，例如 `shared/redis` 与 `AppConfigService` 的职责、`REDIS_*` 配置约定、连接生命周期与启动失败策略、与 `session` / `auth` 的依赖关系及键空间/文档索引（含总览图与模块文档的补全），保证后续实现有单一真源、不擅自扩大范围。
- **阶段二（实现与验证）**：按已定架构引入真实 Redis 客户端，替换进程内 `Map`；保证 `session` / `auth` 语义不退化；完成并发与 TTL 等对齐及 focused 验证。

阶段二交付项已按下方「用户需求」完成；阶段一产出作为实现前置契约保留，阶段二已补齐真实接入与验证闭环。

## 用户需求

- [x] 将当前 `shared/redis` 从进程内 `Map` 假实现替换为真实 Redis 客户端接入，不再只保留“Redis 命名”的抽象层。
- [x] 保持现有 `session` 与 `auth` 的对外语义不变，包括会话 TTL、验证码一次性消费、密码失败计数与锁定窗口。
- [x] 为仓库补齐最小必要的 `REDIS_*` 环境配置与连接生命周期管理：默认指向本机开发环境（如 `127.0.0.1:6379`），并允许通过环境变量覆盖 host、port、密码、库号等连接参数，以便本地开发与后续部署一致可调。
- [x] 真实 Redis 连接在进程启动阶段完成「接管」：`onModuleInit`（或等效初始化）若无法建立可用连接或探测失败，应记录明确错误并令进程退出，不得静默回退到内存实现或带病启动。
- [x] 接入范围仅限当前已经依赖 `RedisStoreService` 的能力收口，不额外扩展消息队列、缓存平台或其他 Redis 用途。
- [x] 交付时需要有 focused 验证，证明当前 NestJS 服务确实在真实 Redis 上完成读写，而不是继续回落到内存实现。

## 当前进展

- 阶段进度: 阶段一架构收口与阶段二实现/验证均已完成；新增 `test/redis-real-integration.e2e-spec.ts` 已补齐“真实 Redis 接管 + 启动 fail-fast”的应用级证据。
- 当前状态: `src/shared/redis/redis-store.service.ts` 已切到真实 `ioredis` 客户端，`AppConfigService` 已接管 repo-owned `REDIS_*` 配置，`session` 会话真源与 `auth` 验证码/失败窗口语义已对齐真实 Redis；已通过 `pnpm typecheck`、`pnpm test -- redis-store`、`pnpm test -- auth-state.repository`、`pnpm test -- session.repository`、`pnpm test:e2e -- redis-real-integration.e2e-spec.ts`、`pnpm test:e2e -- batch-d-slice.e2e-spec.ts` 与 `pnpm verify`。`pnpm test:e2e -- app.e2e-spec.ts` 仍有与本轮无关的 RBAC routes 数量断言漂移，但不构成本需求 blocker。
- 阻塞项: None。
- 下一步: 归档。

## 待确认

- None。
