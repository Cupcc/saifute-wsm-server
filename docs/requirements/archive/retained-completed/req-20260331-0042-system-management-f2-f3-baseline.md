# 系统管理主题 F2 / F3 基线收口

## Metadata

- ID: `req-20260331-0042-system-management-f2-f3-baseline`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260331-0042-system-management-f2-f3-baseline.md`

## 用户需求

- [x] 将 `system-management` 主题下 `F2` 组织与角色矩阵澄清正式收口为长期基线。
- [x] 将 `system-management` 主题下 `F3` 平台审计与在线治理边界正式收口为长期基线。
- [x] 把已确认口径同步到 `topic`、项目级需求、架构文档与 workspace 索引，不再停留在探索草稿状态。
- [x] 为后续 `F4 / F5` 持久化与邻接边界切片留下稳定起点，且不把 `调度 / AI 支持` 混入当前第一版长期范围。

## 当前进展

- 阶段进度: 已完成 `system-management` 主题 `F2 / F3` 收口，并同步生成归档 task / workspace 溯源。
- 当前状态: 已确认真实部门按 `研发部 / 采购部 / 仓库` 三个一级部门建模；当前主角色按 `系统管理员 / 仓库管理员 / 研发小仓管理员 / 采购人员` 设计，`老板 / 财务` 仅保留预留查看角色；当前阶段岗位不单独维护；`在线用户 / 登录日志 / 操作日志` 已纳入 `system-management` 第一版长期主题，`调度 / AI 支持` 维持 topic 外邻接关系。上述口径已同步到 `docs/requirements/topics/system-management-module.md`、`docs/requirements/PROJECT_REQUIREMENTS.md`、`docs/architecture/00-architecture-overview.md`、`docs/architecture/modules/{rbac,system-management}.md` 与归档 workspace。
- 阻塞项: None。
- 下一步: None（本需求已迁入 `docs/requirements/archive/retained-completed/`；后续若推进 `F4 / F5`，需另开新的切片 requirement）。

## 待确认

- None。
