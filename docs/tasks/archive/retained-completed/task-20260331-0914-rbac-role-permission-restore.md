# RBAC 角色权限恢复

## Metadata

- Scope: 按当前已确认的 `V1` 角色矩阵恢复代表性用户的运行态业务权限，使 `warehouse-manager` 不再只剩研发协同入口，同时保持 `rd-operator` 的 RD 专属壳层与固定小仓范围不变。
- Related requirement: `docs/requirements/archive/retained-completed/req-20260331-0914-rbac-role-permission-restore.md`
- Status: `completed`
- Review status: `validated-no-independent-review`
- Lifecycle disposition: `retained-completed`
- Planner: `assistant`
- Coder: `assistant`
- Reviewer: `assistant`
- Last updated: `2026-03-31`
- Related checklist: `None`
- Related files:
  - `docs/requirements/archive/retained-completed/req-20260331-0914-rbac-role-permission-restore.md`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/application/rbac.service.spec.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/utils/permissionCompat.js`

## Requirement Alignment

- Requirement doc:
  - `docs/requirements/archive/retained-completed/req-20260331-0914-rbac-role-permission-restore.md`
- User intent summary:
  - 恢复当前用户权限到设计口径，特别是 `仓库管理员` 不能再只看到研发相关入口。
  - 修复后必须还能看到对应界面，并保持 RD 专属账号边界不回归。
- Acceptance criteria carried into this task:
  - `warehouse-manager` 重新获得主仓业务组与必要 RD 协同入口。
  - `rd-operator` 仍只保留 `rd-subwarehouse` 专属壳层与固定小仓范围。
  - 受影响界面对应的前端按钮权限兼容与后端权限快照保持一致。
- Open questions requiring user confirmation:
  - None.

## Requirement Sync

- Req-facing phase progress:
  - 已完成当前运行态角色权限恢复，并补齐回归断言。
- Req-facing current state:
  - 业务权限已改为按角色预设发放，`warehouse-manager` 不再被误裁成只剩 RD 入口；`rd-operator` 专属视角保持不变。
- Req-facing blockers:
  - None.
- Req-facing next step:
  - 归档；若后续继续扩展 `研发协同` 的页面边界，再新开切片。
- Requirement doc sync owner:
  - `assistant`

## Goal And Acceptance Criteria

- Goal:
  - 让当前代表性账号的运行态权限重新符合已确认设计，并以可验证方式防止再次回归。
- Acceptance criteria:
  - `InMemoryRbacRepository` 不再把业务域权限零散硬编码在代表账号上，而是按角色预设恢复 `warehouse-manager / rd-operator / procurement` 的业务权限。
  - `warehouse-manager` 的 route truth 恢复主仓业务组与必要 RD 协同入口，且不获得 `SystemManagement` 与 `RdWorkbench` 这类越权页面。
  - `workshop-material` 受支持的创建 / 作废按钮权限在前端兼容层与后端权限字符串重新对齐。
  - Focused RBAC tests 与 `web` 生产构建通过。

## Scope And Ownership

- Allowed code paths:
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
  - `src/modules/rbac/application/rbac.service.spec.ts`
  - `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts`
  - `web/src/utils/permissionCompat.js`
  - `docs/requirements/archive/retained-completed/req-20260331-0914-rbac-role-permission-restore.md`
  - `docs/tasks/archive/retained-completed/task-20260331-0914-rbac-role-permission-restore.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `docs/tasks/TASK_CENTER.md`
- Frozen or shared paths:
  - `src/modules/session/**`
  - `src/modules/auth/**`
  - `src/modules/rd-subwarehouse/**`
  - `web/src/store/modules/permission.js`
  - 已存在的活跃 workspace 草稿
- Task doc owner:
  - `assistant`
- Contracts that must not change silently:
  - `consoleMode === "rd-subwarehouse"` 仍只用于 RD 专属账号。
  - 真实库存范围与固定小仓范围解析逻辑不在本切片放宽。
  - 当前系统管理菜单树仍由 `menus` 样例承接；本轮只恢复业务域运行态权限，不重写整套角色菜单建模。

## Implementation Plan

- [x] Step 1: 定位当前权限漂移真源，确认问题出在 RBAC 样例业务权限被误收窄，而不是 `consoleMode` 本身。
- [x] Step 2: 将 `warehouse-manager / rd-operator / procurement` 的业务权限收敛为按角色预设发放，并清理代表账号上的重复散落权限。
- [x] Step 3: 补齐受影响的前端按钮权限兼容与 focused tests，跑回归验证。

## Review Log

- Validation results:
  - 已确认当前 `仓库管理员` 设计口径来自 `system-management` 与 `rd-subwarehouse` 主题真源，不是临时 UI 偏好。
  - `InMemoryRbacRepository` 已新增角色级业务权限预设：`warehouse-manager` 恢复主仓业务组与必要 RD 协同入口，`rd-operator` 与 `procurement` 也回收到角色预设，不再依赖零散账号级权限拼凑。
  - `web/src/utils/permissionCompat.js` 已补齐 `workshop-material` 创建 / 作废按钮所需的旧权限别名映射，确保恢复后的后端权限能真正点亮前端受支持操作。
  - 验证通过：
    - `pnpm test -- src/modules/rbac/application/rbac.service.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts src/modules/rbac/application/workshop-scope.service.spec.ts`
    - `pnpm --dir web build:prod`
    - `ReadLints` 检查本轮改动文件，无新增诊断错误。
- Findings:
  - No findings.
- Follow-up action:
  - None.

## Final Status

- Outcome:
  - 当前 RBAC 运行态角色权限已恢复到已确认设计：`warehouse-manager` 不再只剩 RD 入口，`rd-operator` 仍保持 RD 专属视角。
- Requirement alignment:
  - 已覆盖用户要求的权限恢复目标，并用 focused tests + 前端构建验证了“能看到对应界面”的核心链路。
- Residual risks or testing gaps:
  - 当前系统管理菜单树 `menus` 仍主要承接 `system/*` 页面；业务域权限虽然已在 `rbac` 内按角色预设统一，但尚未沉到可在角色菜单树中直接编辑的通用模型。
  - 本轮未执行浏览器冒烟；界面可见性主要由 route truth、前端构建和权限兼容映射共同证明。
- Directory disposition after completion: `retained-completed`
- Next action:
  - None.
