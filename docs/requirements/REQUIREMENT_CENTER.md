# 需求中心

本文件只做索引看板。详细规则见 `docs/requirements/README.md`。

需求真源统一维护在 `domain/*.md`，不使用切片 `req-*.md`。

## 固定项目需求

| 需求文档 | 状态 | 说明 |
| --- | --- | --- |
| `PROJECT_REQUIREMENTS.md` | `confirmed` | 项目级业务总纲；定义项目目标与成功标准、业务边界、运营模型、全局业务规则、业务对象词典、主题地图与阶段策略，作为各 domain 的共同上位约束。 |

## 领域需求

| 需求文档 | 状态 | 说明 |
| --- | --- | --- |
| `domain/system-management-module.md` | `confirmed` | 系统管理模块领域真源；F4 `conditionally-accepted`（规范化落库完成，browser smoke 待补跑 `[ENV-GAP-1]`）；后续推进直接开 `task-*.md`。 |
| `domain/master-data-management.md` | `confirmed` | 基础数据管理领域真源；`Phase 1` 的 `F1`~`F8` 已完成并归档（`F4` 供应商 CRUD 保留为上游 accepted 基线，`task-20260402-1802` 完成 phase-level 收口）；后续仅剩 `F9/F10` 等后续阶段能力待推进。 |
| `domain/rd-subwarehouse.md` | `confirmed` | RD 小仓领域真源；Phase 1–5 能力已全部完成。 |
| `domain/inbound-business-module.md` | `needs-confirmation` | 入库业务模块领域真源；长期约束已沉淀，后续入库扩展从该 domain 开 task。 |
| `domain/monthly-reporting.md` | `confirmed` | 月度报表领域真源；口径已确认，实施路线图待开 task。 |
| `domain/frontend-old-style-adaptation.md` | `confirmed` | 前端旧风格回归领域真源；Phase 1-2 已完成，后续推进开新 task。 |

## 维护

- 新增领域时在表中添加行。
- 能力状态变更时更新 domain 文档与本表说明列。
- 历史溯源通过 `docs/tasks/archive/` 与 git log 查阅。
