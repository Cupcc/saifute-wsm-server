# 架构 Review 与澄清

## Metadata

- ID: `req-20260321-1109-architecture-review-clarity`
- Status: `confirmed`
- Lifecycle disposition: `active`
- Owner: `user`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`
  - `docs/tasks/archive/retained-completed/task-20260323-1310-customer-workshop-return-invariants.md`
  - `docs/tasks/archive/retained-completed/task-20260323-1320-architecture-doc-clarity-followups.md`
- Related requirement:
  - None

## 用户需求

- [ ] 让系统架构、模块架构更加清晰明了。
- [ ] Review NestJS 项目架构，重点确认以下问题：
  - 是否符合现代 WMS 开发规范。
  - 是否符合目前 `10` 人以下仓库管理体系，避免过于复杂。
  - 是否符合用户真实需求，帮助用户剖析需求并确认是否匹配。
  - 架构设计是否恰当、是否符合业务逻辑。
- [ ] 本轮已确认口径：
  - 交付物采用“文档澄清 + 当前文档与代码结构的差距清单”。
  - review 以“目标迁移架构 / 理想设计”为主口径。
  - 范围先聚焦业务域与 shared core：`master-data`、`inventory-core`、`workflow`、`customer`、`workshop-material`、`project`、`reporting`。
  - 本轮只指出问题，不改 `docs/architecture/00-architecture-overview.md` 与 `docs/architecture/20-wms-business-flow-and-optimized-schema.md` 的冻结正文。
  - 优先澄清模块职责、模块依赖 / 跨模块访问、shared 与业务层边界、当前实现与目标架构关系、文档组织与阅读路径。

## 用户已经确定的当前架构存在的问题

- 详细 review findings 已写入 `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md`，requirement 只保留面向用户的简洁进展。

## 当前进展

- 阶段进度: 已完成 scoped architecture review，并完成两条 follow-up 切片：`customer` / `workshop-material` return invariant 修复，以及 `README` / `project` / `reporting` / `master-data` 文档澄清；相关 task 均已 reviewer sign-off。
- 当前状态: 已确认 `inventory-core` 唯一库存写入口、`workflow` 审核归口、`reporting` 只读边界总体成立；`customer` / `workshop-material` 的 return invariant 已修复并通过定向测试，`project` / `reporting` / `master-data` 的 current-vs-target 文档缺口与阅读路径问题已在限定文档中收口。
- 阻塞项: None.
- 下一步: 当前 requirement 范围已收口；如继续推进，可另开后续需求处理其他模块 current-vs-target 澄清，或推进 `project` / `reporting` 的更大范围实现切片。

## 待确认

- None
