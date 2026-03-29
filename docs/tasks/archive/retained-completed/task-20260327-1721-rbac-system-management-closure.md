# RBAC System Management Closure

## Metadata

- Scope: phase the current NestJS backend + repo-local `web/` frontend RBAC closure so `system/*` visibility, route/menu skeleton, API acceptance, and non-`admin` role isolation all align without rolling back to the legacy project permission implementation
- Related requirement: `docs/requirements/archive/retained-completed/req-20260327-1604-rbac-implementation.md`
- Status: `completed`
- Review status: `reviewed-no-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `planner`
- Coder: `coder`
- Reviewer: `code-reviewer`
- Last updated: `2026-03-27`
- Related checklist:
- Related files:
  - `docs/requirements/archive/retained-completed/req-20260327-1604-rbac-implementation.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/rbac.md`
  - `docs/architecture/modules/session.md`
  - `docs/architecture/30-java-to-nestjs-data-migration-reference.md`
  - `src/modules/rbac/**`
  - `src/modules/auth/**`
  - `src/modules/session/**`
  - `src/shared/guards/permissions.guard.ts`
  - `prisma/schema.prisma`
  - `web/src/store/modules/permission.js`
  - `web/src/store/modules/user.js`
  - `web/src/api/menu.js`
  - `web/src/api/system/**`
  - `web/src/views/system/**`
  - `web/src/views/home/index.vue`

## Requirement Alignment

- Requirement doc: `docs/requirements/archive/retained-completed/req-20260327-1604-rbac-implementation.md`
- User intent summary:
  - 本轮 scope 已明确锁定当前 NestJS 后端与仓库内 `web/` 前端，不回退旧项目权限实现。
  - 交付范围包含全部 `system/*` 系统管理能力：`用户 / 角色 / 部门 / 菜单 / 字典 / 参数 / 通知 / 岗位` 的页面可见、接口承接与授权关系。
  - 实施顺序必须先恢复系统管理员 `admin` 的全量可见与核心 RBAC 骨架，再扩展到非 `admin` 角色矩阵与系统管理全链路收口。
  - Phase 1 至少要解决三件事：`admin` 全量可见、`system/*` 核心权限/路由/菜单骨架、以及前端 `研发小仓` 因额外 `consoleMode` 过滤而被误裁的问题。
- Acceptance criteria carried into this task:
  - `admin` fresh login 后可见 `系统管理` 分组，以及当前应可见的业务分组与 `研发小仓` 相关入口，不再出现“后端有权限但前端额外裁掉”的断层。
  - `/api/auth/routes` 与前端动态菜单生成链路要形成 `system/*` 骨架真源，而不是靠仅前端写死菜单兜底。
  - `rd-operator` 仍保持 `rd-subwarehouse` 专属控制台语义；修复 `admin` 可见性不能破坏研发专属工作台跳转、标签与侧边栏行为。
  - Phase 2 交付后，`web/src/views/system/**` 中本轮纳入范围的页面，其主列表/详情/变更请求都由当前仓库内 NestJS 承接，并与页面按钮权限字符串一致。
  - 非 `admin` 角色的菜单、页面与按钮可见性只由当前后端权限结果驱动，不再出现额外前端裁切或前端放开但后端 `403/404` 的错位。
- Open questions requiring user confirmation:
  - None.

## Requirement Sync

- Req-facing phase progress: `task-20260327-1721-rbac-system-management-closure` 已完成 closing re-review，本轮 RBAC system management closure 已收口为归档完成态。
- Req-facing current state: `admin` 的 `系统管理` 与 RD 入口可见性已恢复，`system/*` 八类页面的前端 `/api/system/*` 调用与当前 NestJS 承接已对齐，`admin` / `operator` / `rd-operator` / `system-manager` 代表账号浏览器验证均已通过。
- Req-facing blockers: None.
- Req-facing next step: 归档。
- Requirement doc sync owner: `parent`

## Goal And Acceptance Criteria

- Goal: 在当前 NestJS + `web/` 体系内完成 RBAC 收口，让系统管理全链路的菜单、路由、按钮权限、接口承接与会话权限快照保持一致，并按 Phase 1/Phase 2 分阶段安全落地。
- Acceptance criteria:
  - Phase 1: `admin/admin123` fresh login 后，`/api/auth/me`、`/api/auth/routes`、前端侧边栏/顶栏与首页壳层一致呈现 `系统管理` 分组，并恢复系统管理员应有的全量可见范围。
  - Phase 1: `web/src/store/modules/permission.js` 显式承接 `system/*` 分组与 `用户 / 角色 / 部门 / 菜单 / 字典 / 参数 / 通知 / 岗位` 路由元数据，且这些页面的可见性由当前后端返回的 route/permission 真源驱动。
  - Phase 1: `admin` 不再因为 `consoleMode !== "rd-subwarehouse"` 被额外裁掉 `研发小仓` 相关页面；与此同时 `rd-operator` 仍只看到研发专属控制台，不回归普通首页壳层。
  - Phase 2: `web/src/api/system/**` 中由本轮页面实际使用的接口均由当前仓库 NestJS 承接，至少覆盖 `用户 / 角色 / 部门 / 菜单 / 字典 / 参数 / 通知 / 岗位` 的主列表与核心写接口。
  - Phase 2: 页面按钮级 `v-hasPermi` 字符串、后端 `@Permissions()`、路由树过滤和会话中的 `permissions` 快照保持一致；非 `admin` 角色不再出现前后端授权断层。
  - 如需新增持久化模型，必须通过新的 NestJS-owned Prisma/raw SQL 承载，不直接回退旧项目实现，也不把旧 `sys_user/sys_role/sys_menu/sys_dept/sys_post/sys_config/sys_notice/sys_dict_*` 当作现成业务真源原样搬回。
  - 最终门禁至少包含：后端类型/测试、前端构建、`admin` + 代表性非 `admin` + `rd-operator` 的浏览器冒烟。

## Scope And Ownership

- Allowed code paths:
  - `src/modules/rbac/**`
  - `src/modules/auth/**`
  - `src/modules/session/**`
  - `src/shared/guards/permissions.guard.ts`
  - `src/shared/decorators/**`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `web/src/store/modules/permission.js`
  - `web/src/store/modules/user.js`
  - `web/src/api/menu.js`
  - `web/src/api/login.js`
  - `web/src/api/system/**`
  - `web/src/views/system/**`
  - `web/src/views/home/index.vue`
  - `web/src/layout/components/TagsView/index.vue`
  - `web/src/router/index.js`
- Frozen or shared paths:
  - `docs/requirements/archive/retained-completed/req-20260327-1604-rbac-implementation.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/architecture/**`
  - `.cursor/**`
  - `src/modules/inventory-core/**`
  - `src/modules/workflow/**`
  - `src/modules/inbound/**`
  - `src/modules/customer/**`
  - `src/modules/project/**`
  - `src/modules/workshop-material/**`
  - `web/src/views/{base,entry,customer,stock,take,rd}/**`，除共享壳层导致的可见性回归修复外，不在本 task 中重构
- Task doc owner: `planner`
- Contracts that must not change silently:
  - `session` 仍采用 `JWT` 票据 + `Redis` 会话，JWT 不是完整用户状态真源。
  - `rbac` 继续作为权限字符串、路由树和数据权限的真源；业务模块不能各自私藏一套系统管理权限判定。
  - 超级管理员语义必须端到端一致：后端当前以 `userId === 1` 直接放行，前端当前以 `role === "admin"` 识别超级管理员；这两条链路只能收敛，不能彼此漂移。
  - `consoleMode === "rd-subwarehouse"` 只应用于研发小仓专属账号的壳层裁切，不能继续把 `admin` 的本应可见页面误判为不可见。
  - `inventory-core` 仍是库存写唯一入口；本 task 不得借系统管理收口之名改写库存、审核或业务单据语义。
  - 架构迁移参考已明确旧平台组织/权限/配置表不是当前正式业务落点；本 task 不得隐式回退为“旧表 + 旧实现直接复用”。

## Implementation Plan

- [ ] Step 1: 先建立 Phase 0 差距矩阵。对齐 `web/src/store/modules/permission.js`、`web/src/views/system/**`、`web/src/api/system/**`、`src/modules/rbac/**`、`src/modules/auth/**`、`src/modules/session/**` 与 `prisma/schema.prisma`，列出每个 `system/*` 页面对应的 route name、permission string、主接口、按钮权限与当前缺口。
- [ ] Step 2: Phase 1 后端骨架恢复。扩展当前 `/api/auth/routes` 背后的 RBAC route source，使其能返回 `系统管理` 分组及 `用户 / 角色 / 部门 / 菜单 / 字典 / 参数 / 通知 / 岗位` 的核心 route skeleton，并保持现有业务域 route name 不回归。
- [ ] Step 3: Phase 1 前端壳层恢复。在 `web/src/store/modules/permission.js` 中新增 `system` 分组与对应 route meta；同时收敛 `consoleMode` 可见性规则，让 `rd-operator` 继续走研发专属模式，但 `admin` 不再被额外过滤掉 `研发小仓` 页面。
- [ ] Step 4: Phase 1 会话与鉴权链路对齐。确认 `/api/auth/me`、`SessionUserSnapshot`、`PermissionsGuard`、前端 `userStore` / `auth.js` 对 `admin`、普通角色、`rd-operator` 的角色/权限/consoleMode 解释一致，并补足必要的测试或断言。
- [ ] Step 5: Phase 1 冒烟闭环。用 fresh 登录验证 `admin` 的 `系统管理` 菜单可见、`研发小仓` 可见性恢复，以及 `rd-operator` 专属控制台未被破坏；把仍缺 backend handler 的页面列入 Phase 2 子清单，而不是在 Phase 1 里混入全量 CRUD。
- [ ] Step 6: Phase 2 后端全链路承接。基于 Step 1 的矩阵，为 `用户 / 角色 / 部门 / 菜单 / 字典 / 参数 / 通知 / 岗位` 补齐当前仓库内的控制器、应用服务、DTO、repository/raw SQL 与权限注解；其中用户/角色/菜单/数据权限保持 `rbac` 主责，`dict/config/notice` 如需单独模块，必须保持 platform-focused，且权限真源仍归 `rbac`。
- [ ] Step 7: Phase 2 非 `admin` 角色矩阵收口。保证非 `admin` 角色的路由、菜单、按钮与接口授权一致；用户角色、角色菜单、角色部门等授权关系变更后，至少定义并落地最小会话刷新/强退策略，避免 Redis 会话中的权限快照长期滞后。
- [ ] Step 8: 完成最终验证。补充/更新 focused backend tests，必要时校验 Prisma schema 变更；运行前后端门禁并执行 `admin`、代表性非 `admin`、`rd-operator` 三类账号浏览器冒烟。

## Coder Handoff

- Execution brief:
  - 必须按 Phase 1 -> Phase 2 顺序推进，不要一上来并行补所有 `system/*` 页面，否则容易在共享 permission/route contract 上反复返工。
  - Phase 1 目标不是一次性写完所有系统管理 CRUD，而是先把 `admin` 全量可见、`system/*` 路由/菜单骨架、以及 `研发小仓` 误过滤收口到稳定状态。
  - Phase 2 才补 `用户 / 角色 / 部门 / 菜单 / 字典 / 参数 / 通知 / 岗位` 的接口承接与非 `admin` 角色矩阵，且必须以当前仓库为真源，不允许前端连旧项目接口或直接回退旧实现。
  - 任何新 persistence / schema 设计，都要先证明它符合当前架构边界；如果只是临时把旧 `sys_*` 平台表重新当真源，会直接违反 requirement 与迁移参考冻结线。
- Required source docs or files:
  - `docs/requirements/archive/retained-completed/req-20260327-1604-rbac-implementation.md`
  - `docs/tasks/archive/retained-completed/task-20260327-1721-rbac-system-management-closure.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/rbac.md`
  - `docs/architecture/modules/session.md`
  - `docs/architecture/30-java-to-nestjs-data-migration-reference.md`
  - `src/modules/rbac/application/rbac.service.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/auth/application/auth.service.ts`
  - `src/modules/session/domain/user-session.ts`
  - `src/shared/guards/permissions.guard.ts`
  - `web/src/store/modules/permission.js`
  - `web/src/store/modules/user.js`
  - `web/src/api/menu.js`
  - `web/src/api/system/**`
  - `web/src/views/system/**`
- Owned paths:
  - Phase 1 owned paths: `src/modules/rbac/**`, `src/modules/auth/**`, `src/modules/session/**`, `src/shared/guards/permissions.guard.ts`, `web/src/store/modules/permission.js`, `web/src/store/modules/user.js`, `web/src/api/menu.js`, `web/src/views/home/index.vue`, `web/src/layout/components/TagsView/index.vue`, `web/src/router/index.js`
  - Phase 2 owned paths: Phase 1 paths plus `web/src/api/system/**`, `web/src/views/system/**`, `prisma/schema.prisma`, `prisma/migrations/**`, 以及最终选定的系统管理后端承接模块路径
- Forbidden shared files:
  - `docs/requirements/**`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/architecture/**`
  - `.cursor/**`
  - `src/modules/inventory-core/**`
  - `src/modules/workflow/**`
  - `src/modules/inbound/**`
  - `src/modules/customer/**`
  - `src/modules/project/**`
  - `src/modules/workshop-material/**`
  - `web/src/views/{base,entry,customer,stock,take,rd}/**`，除非为修复共享壳层回归且 task 已明确需要
- Constraints and non-goals:
  - 不回退旧项目权限实现，不连接旧前端或旧后端接口。
  - 不把 frontend-only 菜单硬注入当成完成；可见页面必须有当前仓库后端承接计划。
  - 不切换为纯无状态 JWT，不绕过 Redis 会话快照。
  - 不放宽数据权限默认行为；未命中时仍应保持收紧。
  - 不借本 task 改写业务单据、库存、副作用或 workflow 语义。
  - 若 `dict/config/notice` 最终需要独立模块，保持模块聚焦，不让 `rbac` 演化成“系统大杂烩”。
- Validation command for this scope:
  - Iteration:
    - `pnpm typecheck`
    - `pnpm test -- src/modules/rbac/application/rbac.service.spec.ts`
    - `pnpm exec biome check src/modules/rbac src/modules/auth src/modules/session src/shared/guards/permissions.guard.ts`
    - `pnpm --dir web build:prod`
  - If schema changes:
    - `pnpm prisma:validate`
  - Final smoke:
    - browser smoke with `admin/admin123`
    - browser smoke with one representative non-`admin` role
    - browser smoke with `rd-operator/rd123456`

## Reviewer Handoff

- Review focus:
  - Phase 1 是否真正恢复了 `admin` 的系统管理与 `研发小仓` 可见性，而不是只在某个前端分支里临时放开。
  - `system/*` 菜单/路由是否由当前后端 route truth 驱动，而非前端单方面写死。
  - `admin`、普通角色、`rd-operator` 的 `roles / permissions / consoleMode` 解释是否在 `auth`、`session`、`rbac`、前端 `auth.js` / `permission.js` 之间保持一致。
  - Phase 2 的 `用户 / 角色 / 部门 / 菜单 / 字典 / 参数 / 通知 / 岗位` 页面是否都由当前仓库后端接口承接，且按钮权限字符串与后端注解一致。
  - 若新增 schema 或 repository，是否遵守 NestJS 分层、事务边界、DTO 校验与 repository/raw SQL 分工，而没有把 `rbac` 变成无法维护的 god service。
- Requirement alignment check:
  - 复核交付是否完整覆盖 requirement 指定的系统管理八类能力，并确认实施目标始终锁定当前 NestJS + `web/`，没有出现旧项目回退实现。
- Final validation gate:
  - `pnpm typecheck`
  - `pnpm test -- src/modules/rbac/application/rbac.service.spec.ts`
  - `pnpm --dir web build:prod`
  - 若触及 schema：`pnpm prisma:validate`
  - browser smoke for `admin`, representative non-`admin`, and `rd-operator`
- Required doc updates:
  - 在 task 内回填 Phase 1/2 实际完成度、验证结果与残余风险。
  - 给 `parent` 提供 requirement 可直接同步的 `阶段进度 / 当前状态 / 阻塞项 / 下一步` 简短行。

## Parallelization Safety

- Status: `not safe`
- If safe, list the exact disjoint writable scopes:
- If not safe, list the shared files or contracts that require a single writer:
  - `web/src/store/modules/permission.js` 是前端动态路由分组、`consoleMode` 可见性和 `system/*` 菜单骨架的单一收口点。
  - `src/modules/rbac/**`、`src/modules/auth/**`、`src/modules/session/**` 共同定义会话快照、超级管理员语义、route filtering 与接口授权；拆开并行极易造成 contract 漂移。
  - `prisma/schema.prisma` 与任何新的系统管理持久化模型都是全局共享面；若 Phase 1 contract 未先稳定，Phase 2 的 writer 会不断重写相同边界。
  - 本 task 的正确执行顺序本身就是 Phase 1 先收敛共享 contract，再进入 Phase 2 全链路补齐；在当前 active task 粒度下不适合多 writer 并行。

## Review Log

- Validation results:
  - Re-read `docs/tasks/archive/retained-completed/task-20260327-1721-rbac-system-management-closure.md`、`docs/requirements/archive/retained-completed/req-20260327-1604-rbac-implementation.md`、`docs/architecture/00-architecture-overview.md`、`docs/architecture/modules/rbac.md`、`docs/architecture/modules/session.md`，并按 reviewer baseline 复核当前 RBAC / session 边界。
  - Closing re-review 继续聚焦上一轮收口面：`src/modules/rbac/controllers/system-config.controller.ts`、`src/modules/rbac/controllers/system-config.controller.spec.ts`、`src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`、`src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`、`src/modules/rbac/application/system-management.service.ts`、`web/src/views/system/user/index.vue`、`web/src/api/system/**`、`web/src/views/system/{config,dict,data,post,role,user}/**`。
  - 结合本轮新增证据复核最终门禁：`pnpm typecheck` 通过；`pnpm test -- src/modules/rbac/application/rbac.service.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts src/modules/rbac/controllers/system-config.controller.spec.ts` 通过；`pnpm exec biome check src/modules/rbac src/modules/auth src/modules/session src/shared/guards/permissions.guard.ts` 通过；`pnpm --dir web build:prod` 通过。
  - Browser smoke 现已覆盖 `admin`、`operator`、`rd-operator`、`system-manager`；其中 `system-manager/system123` fresh login 可成功进入 `http://127.0.0.1:90/system/user`，`deptTree` / `list` / `configKey` / 字典接口返回 `200`，页面无 `404` / 白屏，且可见重置密码钥匙图标入口。
  - 代码级确认上一轮三条修复持续有效：`getConfigByKey` 仍挂 `system:user:resetPwd`；`deleteDictTypes()` 会倒序删除命中的全部 `dictData`；`updateDept()` 会同步重写后代 `ancestors`；相关 spec 仍覆盖这些回归点。
  - 额外核对前端路径收口：`web/src/api/system/**` 请求地址与系统页直连下载路径均已统一为 `/api/system/*`，未再发现旧 `/system/*` 直连残留。
- Findings:
  - No findings.
- Follow-up action:
  - `parent` 已同步 requirement 并完成迁入 `docs/requirements/archive/retained-completed/`；后续 RBAC 新切片另开 requirement / task。

## Final Status

- Outcome: closing re-review 已确认上一轮代码修复、前端 `/api/system/*` 收口以及代表性非 `admin` 系统管理路径验证均已闭环；当前可做 sign-off。
- Requirement alignment: 当前实现仍保持在 `NestJS + web/` 新系统真源内收口，未回退旧项目权限实现；`system/*`、`session` 与 `rbac` 的职责边界在本轮修复中未出现新增漂移。
- Residual risks or testing gaps:
  - `getConfigByKey` 仍是一个通用 `configKey` 读取入口，只是当前前端只在重置密码初始化时读取 `sys.user.initPassword`；若后续 `system/config` 承载更敏感的运行期配置，建议再收敛为专用 endpoint 或 key allowlist，避免读权限语义继续外扩。
  - 角色菜单、角色部门、用户角色变更后的 Redis 会话一致性仍依赖现有强退/刷新策略；本轮已看到应用层会在用户/角色/菜单授权变更后主动失效相关会话，但尚无单独的端到端自动化用例覆盖中途变更场景。
  - 最终浏览器验证以代表性页面与入口为主，`system/*` 其余 CRUD 深水区仍主要依赖当前 focused tests、构建成功与手工冒烟，而非全量自动化回归。
- Directory disposition after completion: 本 task 与关联 requirement 已迁入 `docs/tasks/archive/retained-completed/` 与 `docs/requirements/archive/retained-completed/`，`TASK_CENTER.md` / `REQUIREMENT_CENTER.md` 已对齐。
- Next action: None（本轮 closure）；新需求另开 scope。
