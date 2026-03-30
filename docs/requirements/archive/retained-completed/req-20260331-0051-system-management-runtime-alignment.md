# 系统管理运行态口径对齐

## Metadata

- ID: `req-20260331-0051-system-management-runtime-alignment`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260331-0051-system-management-runtime-alignment.md`

## 用户需求

- [x] 在完成 `system-management` 主题 `F2 / F3` 文档对齐后，继续执行开发任务，落地代码实现。
- [x] 将当前 `rbac` 的样例部门 / 角色 / 账号矩阵从旧口径对齐到已确认的 `V1` 基线。
- [x] 将 `在线用户 / 登录日志 / 操作日志` 的前端导航归组与主题口径对齐到 `系统管理`。
- [x] 保持现有登录、权限、RD 专属视角、审计与代表性 e2e 路径可用。
- [x] 完成后自动 commit，且不混入与本切片无关的已有改动。

## 当前进展

- 阶段进度: 已完成 `system-management` 运行态对齐切片，并通过 focused tests 与前端构建验证。
- 当前状态: `InMemoryRbacRepository` 的样例部门已收敛为 `研发部 / 采购部 / 仓库` 三个一级部门；当前主角色样例已收敛为 `系统管理员 / 仓库管理员 / 研发小仓管理员 / 采购人员`，并移除了旧的 `ai-operator / system-manager` 主口径；采购侧代表账号调整为 `procurement / procurement123`。前端动态菜单已将 `在线用户 / 登录日志 / 操作日志` 归入 `系统管理`，AI 助手页面上下文映射也已同步更新。相关代码与测试已通过 `pnpm test -- src/modules/rbac/application/rbac.service.spec.ts src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts src/modules/rd-subwarehouse/controllers/rd-procurement-request.controller.spec.ts src/modules/rbac/application/workshop-scope.service.spec.ts test/app.e2e-spec.ts test/batch-d-slice.e2e-spec.ts` 和 `pnpm --dir web build:prod`。
- 阻塞项: None。
- 下一步: None（本需求已迁入 `docs/requirements/archive/retained-completed/`；若后续继续推进 `F4 / F5`，需另开新的切片 requirement）。

## 待确认

- None。
