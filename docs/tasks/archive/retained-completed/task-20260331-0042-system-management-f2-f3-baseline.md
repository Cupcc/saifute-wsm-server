# System Management F2 F3 Baseline Closure

## Metadata

- Scope: 将 `system-management` 主题中已确认的 `F2` 组织与角色矩阵、`F3` 平台审计与在线治理边界从探索草稿提升为正式长期基线，并同步到 requirement / architecture / workspace 真源
- Related requirement: `docs/requirements/archive/retained-completed/req-20260331-0042-system-management-f2-f3-baseline.md`
- Status: `completed`
- Review status: `reviewed-clean`
- Lifecycle disposition: `retained-completed`
- Planner: `assistant`
- Coder: `assistant`
- Reviewer: `assistant`
- Last updated: `2026-03-31`
- Related checklist:
- Related files:
  - `docs/requirements/archive/retained-completed/req-20260331-0042-system-management-f2-f3-baseline.md`
  - `docs/requirements/PROJECT_REQUIREMENTS.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `docs/requirements/topics/system-management-module.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/workspace/DASHBOARD.md`
  - `docs/workspace/archive/retained-completed/system-management-module/README.md`
  - `docs/workspace/archive/retained-completed/system-management-module/draft.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/rbac.md`
  - `docs/architecture/modules/system-management.md`

## Requirement Alignment

- Requirement doc:
  - `docs/requirements/archive/retained-completed/req-20260331-0042-system-management-f2-f3-baseline.md`
- User intent summary:
  - 完成 `system-management` 主题 `F2 / F3`
  - 允许 agent 自主决策收口方式并自动 commit
  - 把已经确认的组织、角色与平台治理边界沉淀成后续切片可复用的长期真源
- Acceptance criteria carried into this task:
  - `topics/system-management-module.md` 中 `F2 / F3` 标记为 `已完成`，并挂到可追溯的归档 requirement
  - `PROJECT_REQUIREMENTS.md`、架构总览与模块文档体现相同长期口径
  - `REQUIREMENT_CENTER.md`、`TASK_CENTER.md`、`workspace/DASHBOARD.md` 不再把该主题显示为“等待用户确认”
  - workspace 归档后，后续 `F4 / F5` 明确要求另开新切片继续推进
- Open questions requiring user confirmation:
  - None

## Requirement Sync

- Req-facing phase progress:
  - 已完成 `F2 / F3` 的 topic 收口、项目级口径同步、架构同步与 workspace 归档。
- Req-facing current state:
  - `system-management` 第一版长期边界已确认：真实组织为 `研发部 / 采购部 / 仓库` 三部门；主角色为 `系统管理员 / 仓库管理员 / 研发小仓管理员 / 采购人员`；`老板 / 财务` 为预留查看角色；岗位当前不单独维护；`在线用户 / 登录日志 / 操作日志` 归入本主题，而 `调度 / AI 支持` 维持 topic 外邻接关系。
- Req-facing blockers:
  - None
- Req-facing next step:
  - 归档；若后续推进 `F4 / F5`，需新开 requirement / task / workspace
- Requirement doc sync owner:
  - `assistant`

## Goal And Acceptance Criteria

- Goal:
  - 将 `system-management` 的主题探索结果升级为稳定长期基线，消除“topic 已写明但索引和 workspace 仍显示待确认”的状态漂移
- Acceptance criteria:
  - `docs/requirements/topics/system-management-module.md` 的能力表、阶段状态与文档关系反映 `F2 / F3` 已完成
  - `docs/requirements/PROJECT_REQUIREMENTS.md` 与 `docs/architecture/00-architecture-overview.md` 明确 `system-management` 的组织、角色与治理边界
  - `docs/architecture/modules/rbac.md` 与 `docs/architecture/modules/system-management.md` 对授权真源、组织边界、审计/在线治理归属保持一致
  - `docs/workspace/DASHBOARD.md` 与归档 workspace 不再保留“等待用户确认 `V1`”的过期状态
  - 本轮只做 docs 与索引收口，不扩写新的代码实现或持久化设计

## Scope And Ownership

- Allowed code paths:
  - `docs/requirements/archive/retained-completed/req-20260331-0042-system-management-f2-f3-baseline.md`
  - `docs/tasks/archive/retained-completed/task-20260331-0042-system-management-f2-f3-baseline.md`
  - `docs/requirements/PROJECT_REQUIREMENTS.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `docs/requirements/topics/system-management-module.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/workspace/DASHBOARD.md`
  - `docs/workspace/archive/retained-completed/system-management-module/README.md`
  - `docs/workspace/archive/retained-completed/system-management-module/draft.md`
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/rbac.md`
  - `docs/architecture/modules/system-management.md`
- Frozen or shared paths:
  - `src/**`
  - `prisma/**`
  - `scripts/**`
  - 其他与本 topic 无关的活跃 requirement / task / workspace
- Task doc owner:
  - `assistant`
- Contracts that must not change silently:
  - `rbac` 仍是权限字符串、路由树、角色菜单关系与数据权限策略的统一真源
  - `session` 仍是在线用户与 Redis 会话真源
  - `audit-log` 仍是登录日志与操作日志的记录真源
  - `consoleMode` 只负责视角体验，不替代授权
  - 组织树不能直接替代 `stockScope / workshopScope`

## Implementation Plan

- [x] Step 1: 复核 `topic`、workspace 草稿、项目级需求与架构文档，确认 `F2 / F3` 的长期口径已经足够清晰。
- [x] Step 2: 更新 `docs/requirements/topics/system-management-module.md`，将 `F2 / F3` 标记为 `已完成`，并把 Phase 2 状态改为 `进行中`。
- [x] Step 3: 新增归档 requirement / task，作为本轮 `F2 / F3` 收口的切片锚点。
- [x] Step 4: 更新 `REQUIREMENT_CENTER.md`、`TASK_CENTER.md` 与 `docs/workspace/DASHBOARD.md`，移除过期的“等待确认”状态。
- [x] Step 5: 将 `system-management-module` workspace 迁入归档路径，并保留 `draft.md` 作为探索溯源。
- [x] Step 6: 运行最小验证并做语义复核，确保本轮 diff 只覆盖文档与索引层。

## Review Log

- Validation results:
- 复读 `docs/requirements/topics/system-management-module.md`、`docs/workspace/archive/retained-completed/system-management-module/{README,draft}.md`、`docs/architecture/modules/system-management.md`、`docs/architecture/modules/rbac.md` 与 `docs/requirements/PROJECT_REQUIREMENTS.md`，确认 `F2 / F3` 的目标口径已明确且不需要额外用户确认。
  - 本轮新增归档 requirement / task，并同步更新 `REQUIREMENT_CENTER.md`、`TASK_CENTER.md`、`docs/workspace/DASHBOARD.md` 与 topic 文档，消除状态漂移。
  - 归档 workspace 保留 `draft.md` 作为探索期事实快照；后续若推进 `F4 / F5`，已明确要求新开切片而不是复用旧探索流。
  - 最终通过 scoped `git diff` 复核本轮仅涉及 `system-management` 相关文档与索引文件，不触碰代码、schema 或脚本。
- Findings:
  - `No findings.`
- Follow-up action:
  - parent 负责按用户要求创建最终 commit。

## Final Status

- Outcome:
  - `system-management` 主题 `F2 / F3` 已完成 docs 收口；长期组织与角色基线、平台审计与在线治理边界已从探索态升级为正式真源
- Requirement alignment:
  - 已满足用户“实现 `F2 / F3` 并自动 commit”的 docs 收口范围；topic、project-level、architecture、workspace 与索引看板现已一致
- Residual risks or testing gaps:
  - 本轮为 docs-only 收口，不包含 `F4 / F5` 的持久化与邻接能力实现；这些仍需后续切片
  - 仓库中存在与本轮无关的其他脏变更，commit 时需按路径精确暂存，避免混入
- Directory disposition after completion:
  - requirement、task 与 workspace 均已进入 `archive/retained-completed/` 语义
- Next action:
  - 自动 commit 本轮相关文档变更
