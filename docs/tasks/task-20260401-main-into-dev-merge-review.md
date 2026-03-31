# `origin/main` -> `dev` 合并处理表

## 背景

- `dev`: `19ff70f`
- `origin/main`: `55d43d7`
- merge base: `d5415ea`
- 当前用户工作区还有未提交文档改动，因此本次合并在独立工作树完成，避免把本地草稿混进正式 merge commit。

## 结论

- 真实 Git 冲突只有 `docs/workspace/DASHBOARD.md` 1 个文件。
- `package.json`、`test/app.e2e-spec.ts` 已自动合并，但属于必须人工确认语义的高风险文件。
- `origin/main` 里关于 `system-management` 持久化、会话刷新、前端权限分组的改动应整组接入，不建议挑文件或回退局部逻辑。
- 当前 `dev` 工作区未提交的 `docs/requirements/REQUIREMENT_CENTER.md`、`CLAUDE.md`、`docs/requirements/req-20260401-0031-system-management-persistence.md`、`docs/requirements/topics/system-management.md` 不应纳入这次 merge commit。

## 逐文件处理建议表

| 文件 | 类型 | 处理建议 | 本次决策 | 原因 |
| --- | --- | --- | --- | --- |
| `docs/workspace/DASHBOARD.md` | 真实冲突 | 同时保留两边有效信息 | 已手工合并 | 保留 `dev` 新增的 `fifo-costing-default-fifo` 活跃工作流，同时保留 `origin/main` 对 `system-management-module` 已归档、`monthly-reporting` 活跃、`stock-scope-phase2-cutover` 已归档的最新状态。 |
| `package.json` | 自动合并但需复核 | 保留自动合并结果 | 已保留 | 合并结果同时保住了 `dev` 的 Nest CLI Swagger 方案：`nest build --path tsconfig.build.json`、`nest start --watch --path tsconfig.app.json`，并补上了 `origin/main` 的 `migration:stock-scope-phase2:seed-rehearsal`。不应整块回退到任一单边版本。 |
| `test/app.e2e-spec.ts` | 自动合并但需复核 | 保留自动合并结果 | 已保留 | 合并结果同时包含两边正确事实：`admin` 的部门断言改为 `仓库`，`operator` 路由断言保留 `Dashboard` 与 `RdSubwarehouse`，同时明确不包含 `SystemManagement`。 |
| `nest-cli.json` | `dev` 独有链路 | 保留 `dev` | 已保留 | 这是 `dev` Swagger 构建链路切换到 Nest CLI plugin 的核心配置。`origin/main` 未对其提供替代更新。 |
| `tsconfig.app.json` | `dev` 独有链路 | 保留 `dev` | 已保留 | `dev` 的 `pnpm dev` 依赖该文件；与 `package.json` 中的启动脚本成对存在。 |
| `jest.config.js` | `dev` 链路关联文件 | 保留 `dev` | 已保留 | 与 Swagger plugin / e2e 编译链一致，`origin/main` 未引入新的冲突性需求。 |
| `test/jest-e2e.json` | `dev` 链路关联文件 | 保留 `dev` | 已保留 | 继续匹配 `dev` 当前 e2e 编译方式。 |
| `test/nest-swagger-ast-transformer.js` | `dev` 独有文件 | 保留 `dev` | 已保留 | 属于 `dev` 的测试编译辅助；`origin/main` 未修改该链路。 |
| `src/app.setup.ts` | `dev` 链路关联文件 | 保留 `dev` | 已保留 | 维持当前 Swagger 初始化方式，避免把 `dev` 的构建方案部分回退。 |
| `src/swagger-metadata.ts` | `dev` 删除 | 继续删除 | 已保留删除态 | `dev` 已从预生成 metadata 文件切换出去；本次不应把旧物料带回。 |
| `scripts/generate-swagger-metadata.ts` | `dev` 删除 | 继续删除 | 已保留删除态 | 同上，避免让 `package.json` 与构建链路重新出现双轨。 |
| `prisma/schema.prisma` | 运行时主链 | 接受 `origin/main` | 已接入 | `origin/main` 新增 `SystemManagementSnapshot` 持久化模型，这是系统管理状态落库的 schema 基线。 |
| `src/generated/prisma/**` | 生成物 | 接受 `origin/main` | 已接入 | 需要与 `prisma/schema.prisma` 中新增的 `SystemManagementSnapshot` 同步，不能只合 schema 不合生成结果。 |
| `src/modules/rbac/application/rbac.service.ts` | 运行时主链 | 接受 `origin/main` | 已接入 | `getCurrentUser` 后新增 `flushPersistence()`，保证系统管理快照持久化后的读取一致性。 |
| `src/modules/rbac/application/system-management.service.ts` | 运行时主链 | 接受 `origin/main` | 已接入 | 各类增删改操作统一走 `wrapPersistentMutation()`，避免只改内存不落库。 |
| `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts` | 运行时主链 | 接受 `origin/main` | 已接入 | 该文件承接默认角色矩阵、部门/岗位治理、Prisma snapshot 恢复与持久化队列，是本次权限运行时变更的核心真源。 |
| `src/modules/session/application/session.service.ts` | 运行时主链 | 接受 `origin/main` | 已接入 | 新增 `syncSessionUser()`，为权限变更后的会话刷新提供落点。 |
| `src/shared/guards/jwt-auth.guard.ts` | 运行时主链 | 接受 `origin/main` | 已接入 | 在鉴权通过后先拉取最新用户快照并同步回 session，避免旧权限长时间滞留。 |
| `src/shared/guards/jwt-auth.guard.spec.ts` | 回归测试 | 接受 `origin/main` | 已接入 | 新测试直接覆盖“session 权限快照过期时自动刷新”的关键行为。 |
| `web/src/store/modules/permission.js` | 前端运行时主链 | 接受 `origin/main` | 已接入 | 在线用户、登录日志、操作日志已被重新归组到 `system`，必须与后端系统管理菜单树保持一致。 |
| `web/src/utils/permissionCompat.js` | 前端兼容层 | 接受 `origin/main` | 已接入 | 新增 `workshop-material` 创建/作废权限别名，避免老前端权限判断漏放。 |
| `src/modules/inbound/**` | 业务修正 | 接受 `origin/main` | 已接入 | 这组是 `origin/main` 对入库与角色矩阵的联动修正，`dev` 未改同域逻辑，不建议回退。 |
| `test/batch-d-slice.e2e-spec.ts` | 测试修正 | 接受 `origin/main` | 已接入 | AI 聊天权限用例从 `ai-operator` 调整为 `procurement`，对齐最新角色职责。 |
| `docs/architecture/**` | 文档基线 | 接受 `origin/main` | 已接入 | 包括 `20-wms-business-flow-and-optimized-schema.md` 更名为 `20-wms-database-tables-and-schema.md`，以及 system-management 模块文档补齐。 |
| `docs/tasks/**` / `docs/requirements/archive/**` / `docs/workspace/archive/**` | 文档归档 | 接受 `origin/main` | 已接入 | 这些是主线文档中心整理与归档结果，应直接对齐主线，避免 `dev` 继续沿用旧索引。 |
| `docs/requirements/REQUIREMENT_CENTER.md` | 当前工作区未提交改动 | 不纳入本次 merge commit | 已排除 | 该文件在你当前 `dev` 工作区已被本地修改，若直接带入会混淆“主线同步”与“个人草稿”。建议后续单独整理。 |
| `CLAUDE.md` | 当前工作区未跟踪文件 | 不纳入本次 merge commit | 已排除 | 非主线合并范围。 |
| `docs/requirements/req-20260401-0031-system-management-persistence.md` | 当前工作区未跟踪文件 | 不纳入本次 merge commit | 已排除 | 属于你本地新草稿，不应混入这次主线同步提交。 |
| `docs/requirements/topics/system-management.md` | 当前工作区未跟踪文件 | 先排除，后续单独归并 | 已排除 | `origin/main` 已引入 `docs/requirements/topics/system-management-module.md`。这两份主题文档存在命名与内容重叠，需要后续单独做 topic 归并，不建议在本次 merge 中顺手硬合。 |

## 已执行验证

1. `pnpm typecheck`
2. `pnpm test:e2e -- test/app.e2e-spec.ts`
3. `pnpm test -- src/modules/rbac/application/rbac.service.spec.ts`
4. `pnpm test -- src/shared/guards/jwt-auth.guard.spec.ts`
5. `pnpm test -- test/batch-d-slice.e2e-spec.ts`

结果：

- 全部通过。
- `test/app.e2e-spec.ts` 需要走 `test:e2e`，因为当前 `dev` 的默认 `test` 配置会忽略该文件；这属于现有测试脚本设计，不是本次 merge 引入的新问题。

## 本次分支处理原则

- 不碰当前 `dev` 工作区的未提交草稿。
- 将 `origin/main` 的权限运行时与系统管理持久化改动整组接入。
- 仅对 `docs/workspace/DASHBOARD.md` 做最小人工冲突解决。
