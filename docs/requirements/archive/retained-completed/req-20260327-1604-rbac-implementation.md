# RBAC 权限与菜单实现

## Metadata

- ID: `req-20260327-1604-rbac-implementation`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260327-1721-rbac-system-management-closure.md`

## 用户需求

- [x] 补齐当前 NestJS + `web/` 前端的一体化 RBAC 能力，使角色、权限、菜单、路由与页面可见性保持一致。
- [x] 本轮包含 `系统管理` 全链路能力：`用户 / 角色 / 部门 / 菜单 / 字典 / 参数 / 通知 / 岗位` 的页面可见、接口承接与授权关系。
- [x] 系统管理员 `admin` 应恢复系统管理员应有的全量可见范围，至少包括 `系统管理` 菜单，以及 `研发小仓` 相关页面与入口。
- [x] 非系统管理员仍按角色与权限隔离菜单和页面，不能再出现后端有路由、前端被额外裁掉，或前端有页面、后端没有权限承接的断层。
- [x] 实施优先级先恢复系统管理员全量可见与核心 RBAC 骨架，再向非 `admin` 角色矩阵与系统管理全链路收口扩展。
- [x] 本轮以当前 NestJS 后端与仓库内 `web/` 前端为实施目标，只做新系统 RBAC 收口，不回退到旧项目的权限实现方式。

## 当前进展

- 阶段进度: 已完成 `task-20260327-1721-rbac-system-management-closure` 并通过 closing re-review，本轮 RBAC system management closure 已收口为归档完成态。
- 当前状态: 当前 NestJS + `web/` 已恢复 `admin` 的 `系统管理` 全量可见与 RD 入口可见性，并补齐 `用户 / 角色 / 部门 / 菜单 / 字典 / 参数 / 通知 / 岗位` 的 `system/*` 页面承接、权限注解与前端 `/api/system/*` 调用收口。浏览器冒烟已覆盖 `admin`、`operator`、`rd-operator`、`system-manager`：`admin` 可见 `系统管理` 与 8 个入口，`operator` 无系统管理，`rd-operator` 直达 `/rd/workbench`，`system-manager` 可正常进入 `系统管理 -> 用户管理` 且关键初始化接口返回 `200`。
- 阻塞项: None。
- 下一步: None（本需求已迁入 `docs/requirements/archive/retained-completed/`）。

## 待确认

- None。
