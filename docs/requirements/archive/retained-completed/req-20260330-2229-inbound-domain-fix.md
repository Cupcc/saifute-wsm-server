# 入库模块 review findings 修复

## Metadata

- ID: `req-20260330-2229-inbound-domain-fix`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Topic requirement:
  - `docs/requirements/topics/inbound-business-module.md`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260330-2229-inbound-domain-fix.md`

## 用户需求

- [x] 基于刚完成的 `inbound` review findings，直接修复入库模块未完成的需求对齐点。
- [x] 修复范围至少包括：普通验收单/生产入库单必须归主仓、访问/查询沿真实库存轴判断、补齐对应测试。
- [x] 修复完成后需要重新验证并给出最终结论。

## 当前进展

- 阶段进度: `inbound` review findings 修复已完成。
- 当前状态: 普通验收单/生产入库单的主仓强约束、按真实库存轴判断访问控制、对应测试补齐都已落地；`pnpm swagger:metadata && pnpm typecheck && pnpm migration:typecheck && pnpm test` 已通过。
- 阻塞项: None
- 下一步: 归档；若后续还要继续审查其他核心业务模块，另开新的 review 切片。

## 待确认

- None
