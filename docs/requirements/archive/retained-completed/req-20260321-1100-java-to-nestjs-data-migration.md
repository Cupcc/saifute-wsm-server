# 数据迁移：Java 源库 → NestJS 目标库（全量业务域迁移已完成）

## Metadata

- ID: `req-20260321-1100-java-to-nestjs-data-migration`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260321-1140-architecture-migration-reference.md`
  - `docs/tasks/archive/retained-completed/task-20260323-1530-migration-project-material-resolution-readiness.md`
- Related requirement:
  - `docs/requirements/archive/retained-completed/req-20260320-1830-migration-active-slices.md`（已完成切片的交互真源）

## 用户需求

- 本文档用于承接"Java 源库 `saifute` → NestJS 目标库 `saifute-wsm`"的整体验证、迁移结果与切换说明，不再只讨论"剩余域"。
- 迁移目标不是把旧库 `58` 张表逐表照搬到新库 `25` 张表，而是按业务域保留仍有经营、库存、追溯价值的业务事实，并在新库找到正确落点。
- 需要明确每个业务域在上线后的处理方式：正式迁入、业务排除并签收、仅保留旧库归档查询，或明确不迁。

### 当前全量迁移基线

| 类别 | 业务域 | 状态 |
| --- | --- | --- |
| 已完成 | 主数据、入库、基础出库、预留、车间领料、销售退货、车间退料、退货 post-admission | 有验证证据 |
| 已完成 | `project`（5 项目 / 138 行 / 126 条自动补建物料） | 全部准入 live |
| 已完成 | `scrap`（报废，源数据 0 行） | 迁移能力已补齐 |
| 已完成 | 库存重放 | 733 logs / 428 balances / 验证 0 blocker |
| 不迁 | 平台账号 / 权限 / 菜单 / 日志 / 调度 | NestJS 侧重建 |

## 当前进展

- 阶段: 全域数据搬家 + 库存重放已完成，需求闭环并归档。
- 当前状态: 迁移工作流不再保留活跃锚点；本需求转入 `retained-completed`，作为最终范围、结果与切换说明的溯源真源。
- 阻塞项: None
- 下一步: None。如后续出现新的迁移补录、切换演练或库存初始化需求，应新开 requirement / task。

## 待确认

- None
