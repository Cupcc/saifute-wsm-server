# System Management Runtime Alignment

## Metadata

- Scope: 在不扩张到持久化方案或新业务模块设计的前提下，将 `system-management` 主题 `F2 / F3` 的已确认长期口径落到当前运行态样例数据、前端动态菜单归组与相关测试
- Related requirement: `docs/requirements/archive/retained-completed/req-20260331-0051-system-management-runtime-alignment.md`
- Status: `completed`
- Review status: `reviewed-clean`
- Lifecycle disposition: `retained-completed`
- Planner: `assistant`
- Coder: `assistant`
- Reviewer: `assistant`
- Last updated: `2026-03-31`
- Related checklist:
- Related files:
  - `docs/requirements/archive/retained-completed/req-20260331-0051-system-management-runtime-alignment.md`
  - `docs/requirements/topics/system-management-module.md`
  - `docs/architecture/modules/system-management.md`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `src/modules/rd-subwarehouse/controllers/rd-procurement-request.controller.spec.ts`
  - `web/src/store/modules/permission.js`
  - `web/src/components/AiAssistant/index.vue`
  - `test/app.e2e-spec.ts`
  - `test/batch-d-slice.e2e-spec.ts`

## Requirement Alignment

- Requirement doc:
  - `docs/requirements/archive/retained-completed/req-20260331-0051-system-management-runtime-alignment.md`
- User intent summary:
  - 文档对齐后继续做代码实现
  - 让当前运行态样例数据与导航行为真正贴近 `F2 / F3`
  - 自动提交，但不能混入无关改动
- Acceptance criteria carried into this task:
  - 运行态部门树收敛为 `研发部 / 采购部 / 仓库`
  - 当前主角色样例收敛为 `系统管理员 / 仓库管理员 / 研发小仓管理员 / 采购人员`
  - `在线用户 / 登录日志 / 操作日志` 在前端动态菜单中归入 `系统管理`
  - 现有登录、授权、RD 专属视角与审计相关测试仍通过
- Open questions requiring user confirmation:
  - None

## Requirement Sync

- Req-facing phase progress:
  - 已完成运行态样例与前端导航对齐，并补齐相关测试更新。
- Req-facing current state:
  - 运行态部门 / 岗位 / 角色 / 账号矩阵已切到 `V1` 基线；采购侧代表账号由 `procurement` 承接；`在线用户 / 登录日志 / 操作日志` 已在前端导航中归入 `系统管理`。
- Req-facing blockers:
  - None
- Req-facing next step:
  - 归档；若继续推进 `F4 / F5`，另开切片
- Requirement doc sync owner:
  - `assistant`

## Goal And Acceptance Criteria

- Goal:
  - 让 `system-management` 的长期口径不只停留在文档，而是体现在当前内存样例真源与用户可见的导航结构中
- Acceptance criteria:
  - `InMemoryRbacRepository` 的部门 / 角色 / 账号 / 岗位样例与 `V1` 基线一致，且不再保留 `系统管理部 / 数字化支持部 / ai-operator / system-manager` 这套旧主口径
  - `admin`、仓库侧代表账号、RD 账号、采购侧代表账号仍可登录并保留预期权限边界
  - 前端 `OnlineUsers / LoginLogs / OperLogs` 分组改为 `system`
  - 相关 Jest / e2e / 前端构建验证通过

## Scope And Ownership

- Allowed code paths:
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `src/modules/rd-subwarehouse/controllers/rd-procurement-request.controller.spec.ts`
  - `web/src/store/modules/permission.js`
  - `web/src/components/AiAssistant/index.vue`
  - `test/app.e2e-spec.ts`
  - `test/batch-d-slice.e2e-spec.ts`
  - `docs/architecture/modules/system-management.md`
- Frozen or shared paths:
  - `src/modules/inbound/**`
  - `src/modules/customer/**`
  - `src/modules/project/**`
  - `scripts/**`
  - `prisma/**`
  - 与当前切片无关的活跃 / 归档 docs
- Contracts that must not change silently:
  - `admin` 仍保留全量兜底能力
  - `rd-operator` 仍固定 `rd-subwarehouse` 视角与固定仓别范围
  - `session` / `audit-log` 接口前缀与权限点不因菜单归组调整而变化
  - `调度 / AI 支持` 不纳入本切片的 `system-management` 导航收口

## Implementation Plan

- [x] Step 1: 对齐 `InMemoryRbacRepository` 的部门、岗位、角色、用户样例。
- [x] Step 2: 让前端动态菜单将 `在线用户 / 登录日志 / 操作日志` 归入 `system` 分组，并同步修正相关页面文案映射。
- [x] Step 3: 更新受影响的 unit / e2e 断言与登录样例账号。
- [x] Step 4: 跑 focused tests + 前端构建，自检后进入提交。

## Review Log

- Validation results:
  - 复读 `docs/requirements/topics/system-management-module.md` 与 `docs/architecture/modules/system-management.md`，确认本轮只实现运行态口径对齐，不扩写 `F4 / F5`。
  - 更新 `InMemoryRbacRepository`：部门收敛为 `研发部 / 采购部 / 仓库`；岗位收敛为 `系统管理员 / 仓库管理员 / 采购人员 / 研发小仓管理员`；角色收敛为 `admin / warehouse-manager / rd-operator / procurement`；移除旧 `system-manager` 样例，并将 `ai-operator` 替换为 `procurement` 代表账号。
  - 更新前端动态路由与 AI 助手页面上下文：`OnlineUsers / LoginLogs / OperLogs` 已从 `monitor` 分组移到 `system` 分组，AI 助手上下文映射同步改为 `/system/{online,logininfor,operlog}`。
  - 初次 focused tests 失败于 `batch-d-slice` 的 AI 失败审计用例；根因是新采购账号缺少 `ai:chat` 基础权限，导致请求在进入 AI 控制器前即被守卫拦截。已为采购账号补最小 `ai:chat / ai:tools:list` 权限，但仍不授予 `reporting:home:view`，从而保留“可进入 AI 对话但无权调用指定工具”的原测试语义。
  - 最终验证通过：
    - `pnpm test -- src/modules/rbac/application/rbac.service.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts src/modules/rd-subwarehouse/controllers/rd-procurement-request.controller.spec.ts src/modules/rbac/application/workshop-scope.service.spec.ts test/app.e2e-spec.ts test/batch-d-slice.e2e-spec.ts`
    - `pnpm --dir web build:prod`
    - `ReadLints` 对本轮改动文件返回无错误
- Findings:
  - `No findings.`
- Follow-up action:
  - parent 仅需按路径精确暂存本切片相关改动并创建 commit。

## Final Status

- Outcome:
  - `system-management` 运行态口径已与 `F2 / F3` 长期基线对齐：样例组织 / 角色 / 账号矩阵与三类治理页面分组都已更新
- Requirement alignment:
  - 已满足用户“对齐文档后，执行开发任务，实现代码”的当前可安全落地区域，并保持现有登录、RD 视角、AI 失败审计与系统治理能力可验证
- Residual risks or testing gaps:
  - 当前仍是 in-memory / sample-data 级别的运行态对齐，不等于 `F4` 的正式持久化与初始化方案
  - 仓库中存在与本切片无关的其它脏变更，提交时必须按路径精确暂存
- Directory disposition after completion:
  - requirement / task 已迁入 `archive/retained-completed/`
- Next action:
  - 创建本切片 commit
