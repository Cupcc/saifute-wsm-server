# 系统管理 F4 规范化真实落库验收规格

## 元数据

- 模块 / 主题：`system-management` F4 - 规范化数据库表真源切换
- 负责人：`acceptance-qa`
- 关联架构 / 主题文档：
  - `docs/architecture/modules/system-management.md`
  - `docs/requirements/topics/system-management-module.md`
- 最近更新：`2026-04-02`

## 覆盖范围

- 关联需求 / 任务类型：
  - `docs/requirements/topics/system-management-module.md` (F4)
  - `docs/tasks/archive/retained-completed/task-20260402-0139-system-management-f4-real-persistence.md`
- 覆盖验收标准族：`[AC-1]` ~ `[AC-5]`
- 默认证据类型：单元测试 / e2e API 测试 / Prisma schema / 数据库应用 / 浏览器冒烟
- 环境或角色假设：
  - 后端：本地 `.env.dev` + MySQL 8.0 + Redis 7.x
  - 账号：`admin / operator / rd-operator / procurement`
  - 浏览器：需要浏览器冒烟时使用 `agent-browser` skill；当前运行面若不可用则直接执行 `agent-browser` CLI；CLI 仍不可用时回退至 Chrome DevTools MCP，并在验收记录中注明通道与原因

## 验收用例

- `[AC-CASE-1]` 规范化表作为长期真源：无初始数据时执行 seed
  - 对应验收标准：`[AC-1]`
  - 覆盖标签：`main-flow` `system-management-f4` `restart-persistence`
  - 主要证据类型：单元测试
  - 验证目标：验证 `onModuleInit` 在规范化表全部为空、无历史 snapshot 时，执行一次性 canonical seed 并写入规范化表，不依赖进程内默认数组。
  - 前置条件：规范化 `sys_*` 表全为空；`system_management_snapshot` 无记录。
  - 操作步骤：
    1. 初始化带 mock Prisma（所有 count 返回 0）的 `InMemoryRbacRepository`。
    2. 调用 `onModuleInit()`。
  - 预期结果：`$transaction` 被调用一次（seed 写入）；`count` 被查询以确认无数据。
  - 证据预期：`in-memory-rbac.repository.spec.ts` - `"seeds normalized tables when no data exists on init"`
- `[AC-CASE-2]` 规范化表作为长期真源：从历史 snapshot backfill
  - 对应验收标准：`[AC-1]` `[AC-2]`
  - 覆盖标签：`main-flow` `system-management-f4` `restart-persistence`
  - 主要证据类型：单元测试
  - 验证目标：验证规范化表为空但存在历史 `system_management_snapshot` 时，执行一次性 backfill 并把 snapshot 数据写入规范化表；backfill 后 `findUserByUsername` 可命中 backfill 用户。
  - 前置条件：规范化 `sys_*` 表全为空；`system_management_snapshot` 含 1 条历史用户数据。
  - 操作步骤：
    1. 初始化带 mock Prisma（count 返回 0，snapshot 有记录）的 repository。
    2. 调用 `onModuleInit()`。
    3. 调用 `findUserByUsername("legacy-admin")`。
  - 预期结果：`$transaction` 调用 1 次（backfill 写入）；用户可被检索到，`userId` 与 snapshot 一致。
  - 证据预期：`in-memory-rbac.repository.spec.ts` - `"backfills normalized tables from legacy snapshot when normalized tables are empty"`
- `[AC-CASE-3]` 规范化表作为长期真源：规范化表已有数据时直接加载，不 reseed
  - 对应验收标准：`[AC-1]` `[AC-2]`
  - 覆盖标签：`main-flow` `system-management-f4` `restart-persistence` `regression-critical`
  - 主要证据类型：单元测试
  - 验证目标：验证规范化表已有数据时 `onModuleInit` 直接从规范化表加载，不触发 seed 或 backfill transaction，保证重启不破坏人工修改的数据。
  - 前置条件：`sysUser.count` 返回 1；`sysDept` 含 1 条数据。
  - 操作步骤：
    1. 初始化带 mock Prisma（`sysUser.count` 返回 1，`sysUser.findMany` 返回 admin 行）的 repository。
    2. 调用 `onModuleInit()`。
    3. 调用 `findUserByUsername("admin")`。
  - 预期结果：`$transaction` 未被调用；用户可被检索到，`userId === 1`。
  - 证据预期：`in-memory-rbac.repository.spec.ts` - `"loads from normalized tables when data exists"`
- `[AC-CASE-4]` 混合状态保护：非 users 规范化表已有数据时不 reseed
  - 对应验收标准：`[AC-2]`
  - 覆盖标签：`system-management-f4` `regression-critical` `high-risk`
  - 主要证据类型：单元测试
  - 验证目标：验证 `sysDept` 已有数据但 `sysUser` 为空的 mixed-state 场景下，`onModuleInit` 只加载已有数据行，不触发破坏性重灌，防止人工运维状态被覆盖。
  - 前置条件：`sysUser.count` 返回 0；`sysDept.count` 返回 1，`sysDept.findMany` 含仓库记录。
  - 操作步骤：
    1. 初始化带 mock Prisma（上述状态）的 repository。
    2. 调用 `onModuleInit()`。
    3. 检查 `getDept(300).deptName`。
  - 预期结果：`$transaction` 未被调用（无 reseed）；部门数据可被正常访问。
  - 证据预期：`in-memory-rbac.repository.spec.ts` - `"does not reseed when non-user normalized tables already contain data"`
- `[AC-CASE-5]` admin 完整路由与菜单权限
  - 对应验收标准：`[AC-3]`
  - 覆盖标签：`main-flow` `auth-rbac` `representative-accounts` `regression-critical`
  - 主要证据类型：e2e API 测试 + 单元测试
  - 验证目标：验证 admin 登录后 `/api/auth/me` 返回正确用户信息，`/api/auth/routes` 包含 `SystemManagement`；`rbacService.getRoutesForUser(1)` 包含全系统菜单。
  - 前置条件：backend 已启动（`.env.dev`）；`admin` 账号可登录。
  - 操作步骤：
    1. `POST /api/auth/login` (username: admin)。
    2. `GET /api/auth/me`。
    3. `GET /api/auth/routes`。
  - 预期结果：`me.username === "admin"`；`routes` 包含 `SystemManagement`、`Dashboard`、`RdSubwarehouse`。
  - 证据预期：`test/app.e2e-spec.ts` - `"should complete the admin auth/session/rbac acceptance flow"`；`rbac.service.spec.ts` - `"should keep full routes for admin user"`
- `[AC-CASE-6]` operator 路由边界限制
  - 对应验收标准：`[AC-3]`
  - 覆盖标签：`auth-rbac` `representative-accounts` `regression-critical`
  - 主要证据类型：e2e API 测试
  - 验证目标：验证 `operator` 账号的 `auth/routes` 不包含 `SystemManagement`；访问 session admin 端点返回 403。
  - 前置条件：backend 已启动；`operator` 账号可登录。
  - 操作步骤：
    1. `POST /api/auth/login` (username: operator)。
    2. `GET /api/auth/routes`。
    3. `GET /api/sessions/online`（期望 403）。
  - 预期结果：routes 不含 `SystemManagement`；admin 端点返回 403。
  - 证据预期：`test/app.e2e-spec.ts` - `"should forbid operator access to session admin endpoints and keep only authorized routes"`
- `[AC-CASE-7]` rd-operator consoleMode 与 workshopScope 语义
  - 对应验收标准：`[AC-3]`
  - 覆盖标签：`auth-rbac` `representative-accounts` `regression-critical`
  - 主要证据类型：单元测试
  - 验证目标：验证 rd-operator 用户 `consoleMode === "rd-subwarehouse"`，`workshopScope.mode === "FIXED"`，路由只含 `RdSubwarehouse`。
  - 前置条件：repository 已 seed 标准初始数据；用户 id 5 为 rd-operator。
  - 操作步骤：
    1. `rbacService.getRoutesForUser(5)`。
    2. `rbacService.getCurrentUser(5)`。
  - 预期结果：routes 长度 1，名称 `RdSubwarehouse`；`consoleMode === "rd-subwarehouse"`；workshopScope 包含 `RD` 车间。
  - 证据预期：`rbac.service.spec.ts` - `"should only return rd console routes for rd users"` + `"should keep fixed workshop scope for current user"`
- `[AC-CASE-8]` 会话失效后 auth/me 拒绝访问
  - 对应验收标准：`[AC-4]`
  - 覆盖标签：`session-invalidation` `regression-critical`
  - 主要证据类型：e2e API 测试
  - 验证目标：验证显式删除 session 后，原 accessToken 请求 `/api/auth/me` 返回 401；确认不存在 stale permission 残留。
  - 前置条件：后端 + 真实 Redis 已启动。
  - 操作步骤：
    1. `POST /api/auth/login` (admin)。
    2. `DELETE /api/sessions/:sessionId`。
    3. `GET /api/auth/me`（原 token）。
  - 预期结果：步骤 3 返回 HTTP 401。
  - 证据预期：`test/app.e2e-spec.ts` - `"should complete the admin auth/session/rbac acceptance flow"` 最后的 session delete -> 401 验证
- `[AC-CASE-9]` 权限动态变更后 Redis session 正确失效
  - 对应验收标准：`[AC-4]`
  - 覆盖标签：`session-invalidation` `high-risk`
  - 主要证据类型：e2e API 测试（真实 Redis）
  - 验证目标：验证带真实 Redis 连接的登录 / auth / session / 登出生命周期完整可行；Redis Key TTL 在登录后存在，登出后为空。
  - 前置条件：本地 Redis 已启动；`.env.dev` 中 Redis 配置有效。
  - 操作步骤：
    1. `POST /api/auth/login`；
    2. 通过 raw Redis client 验证 `login_tokens:<sessionId>` TTL > 0；
    3. `POST /api/auth/logout`；
    4. 验证 `login_tokens:<sessionId>` 为 null。
  - 预期结果：登录后 Key 存在且 TTL 有效；登出后 Key 消失。
  - 证据预期：`test/redis-real-integration.e2e-spec.ts` - `"boots the app against real Redis and persists the auth/session chain"`
- `[AC-CASE-10]` 代表账号浏览器冒烟（admin / operator / rd-operator / procurement）
  - 对应验收标准：`[AC-3]` `[AC-5]`
  - 覆盖标签：`regression-critical` `representative-accounts` `browser-smoke`
  - 主要证据类型：浏览器（`agent-browser`）
  - 验证目标：在真实 UI 中验证四个代表账号的登录成功、菜单可见性符合角色边界、系统管理页面仅 admin 可达。
  - 前置条件：frontend (`http://localhost:90/`) + backend (`.env.dev`) 均已启动健康；四个代表账号可登录。
  - 操作步骤：
    1. 用 `admin` 登录；验证系统管理菜单可见；进入系统管理 → 用户管理页面无报错。
    2. 用 `operator` 登录；验证系统管理菜单不可见。
    3. 用 `rd-operator` 登录；验证进入 rd-subwarehouse 控制台，系统管理不可见。
    4. 用 `procurement` 登录；验证只可见 AI、采购申请、供应商、入库相关路由。
  - 预期结果：每个账号菜单边界与后端 `auth/routes` 一致；无权限放宽或误裁剪。
  - 证据预期：agent-browser 截图 + 路由列表断言

## 最近一次验证

### 验证摘要

| 最近测试时间 | 关联任务 | 验证范围 | 环境 | 结果 |
| --- | --- | --- | --- | --- |
| `2026-04-02` | `docs/tasks/archive/retained-completed/task-20260402-0139-system-management-f4-real-persistence.md` | `[AC-CASE-1]` ~ `[AC-CASE-10]` 全量执行 | 本地 `.env.dev` + MySQL 8.0.40 + Redis 7.2.4 + 无头 Chrome（`http://127.0.0.1:90/`） | `通过（passed）` |

### 验收矩阵

| 验收标准 | 覆盖用例 | 执行面 | 关键证据 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `[AC-1]` 规范化表真源 | `[AC-CASE-1]` `[AC-CASE-2]` `[AC-CASE-3]` | `unit` + `db/schema` | repository 单测 + `prisma db push` | `满足（met）` | 已覆盖空表 seed、snapshot backfill、已有数据直接加载三条主路径 |
| `[AC-2]` 重启后状态保留 | `[AC-CASE-2]` `[AC-CASE-3]` `[AC-CASE-4]` | `unit` | repository 单测 | `满足（met）` | 混合状态保护已验证，不会因局部已有数据而 reseed |
| `[AC-3]` auth/me、auth/routes、角色边界一致 | `[AC-CASE-5]` `[AC-CASE-6]` `[AC-CASE-7]` `[AC-CASE-10]` | `e2e` + `unit` + `browser` | `test/app.e2e-spec.ts` + `rbac.service.spec.ts` + 无头 Chrome 冒烟 | `满足（met）` | admin 可达 `system/user`；operator 直达 `system/user` 为 404；rd-operator 默认进入 `rd/workbench`；procurement 浏览器可达采购需求、供应商、验收入库页面 |
| `[AC-4]` 会话失效策略 | `[AC-CASE-8]` `[AC-CASE-9]` | `e2e` | `test/app.e2e-spec.ts` + `test/redis-real-integration.e2e-spec.ts` | `满足（met）` | 覆盖 session delete -> 401 与真实 Redis TTL 生命周期 |
| `[AC-5]` 完整测试报告 | `[AC-CASE-1]` ~ `[AC-CASE-10]` | `spec` + 自动化证据 + 浏览器冒烟 | 本节“最近一次验证” | `满足（met）` | 自动化与浏览器证据均已收口到本规格 |

### 证据摘要

| 执行面 | 证据 | 结果 | 备注 |
| --- | --- | --- | --- |
| `static/schema` | `pnpm prisma:validate`、`pnpm prisma:generate`、`pnpm typecheck` | `通过（pass）` | schema、生成与类型面无阻塞 |
| `db/schema` | `set -a && source .env.dev && set +a && pnpm prisma db push --schema prisma/schema.prisma` | `通过（pass）` | 真实 MySQL schema 应用成功 |
| `unit` | `pnpm test -- src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts src/modules/rbac/application/rbac.service.spec.ts src/modules/rbac/controllers/system-config.controller.spec.ts` | `通过（pass）` | 覆盖 repository、RBAC、controller 定向回归 |
| `e2e` | `pnpm test:e2e -- test/app.e2e-spec.ts test/batch-d-slice.e2e-spec.ts test/redis-real-integration.e2e-spec.ts` | `通过（pass）` | 覆盖 auth/session/API 与真实 Redis 集成 |
| `browser` | 无头 Chrome 冒烟：`admin / operator / rd-operator / procurement`，覆盖 `system/user`、`/rd/workbench`、`/rd/procurement-requests`、`/base/supplier`、`/entry/order` | `通过（pass）` | UI 观察与 `/api/auth/routes` 路由集交叉一致；四代表账号均登录成功且菜单边界符合预期 |

### 残余风险 / 后续跟进

- 当前无阻塞性验收缺口；`procurement` 的 AI 子路由未单独点击，但 `/api/auth/routes` 已返回 `AiAssistant`，且其浏览器菜单边界与采购 / 供应商 / 入库相关页面访问一致。

## 备注

- 已知不覆盖项：`scheduler / ai-assistant` 菜单边界不在本 spec 覆盖范围内。
- 复用指引：本 spec 适用于所有未来涉及 `系统管理主数据真源切换` 的 task；新增对象时扩充 `[AC-CASE-1]` ~ `[AC-CASE-4]`。
- 完整 autonomous-delivery run 的最小用例子集：`[AC-CASE-1]` ~ `[AC-CASE-10]` 全量通过；当前基线已满足完整自动化 + 浏览器覆盖。
