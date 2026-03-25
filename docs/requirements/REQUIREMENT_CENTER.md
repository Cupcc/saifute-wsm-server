# 需求中心

本文件只做索引看板，不重复需求正文、流程说明或归档规则。

看板口径：

- `PROJECT_REQUIREMENTS.md`：固定项目级需求真源。
- 根目录 `req-*.md`：当前活跃需求。
- `archive/retained-completed/`：已闭环但保留溯源的需求。
- `archive/cleanup-candidate/`：待用户确认后可删除的需求。

详细规则见 `docs/requirements/README.md`。

## 固定项目需求

| 需求文档                      | 状态          | 说明                                                                                                                                                                                               |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PROJECT_REQUIREMENTS.md` | `confirmed` | 固定项目需求真源；当前核心需求已收敛为“清晰易维护的 NestJS WMS、贴合小型仓库场景、按业务域迁移、保证库存与追溯语义正确”，并已补充真实环境、流程与统计口径：约 `3` 人、单仓、无码物料、`Excel + 手工记账`、职责未分化、审核不阻塞落库、实时库存 + 月盘；同时已按模块分组整理平台、业务、分析与辅助模块的项目级默认需求，明确第一阶段 `项目/研发` 模块范围，并新增“系统自动生成月度报表、覆盖整体/车间/销售域/研发项目”的项目级报表诉求。 |

## 活跃需求

| 需求文档                                                 | 状态                   | 说明                                                                                          |
| ---------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `req-20260325-2319-system-readiness-validation.md` | `confirmed`          | 已完成最小联调打通：浏览器实测可登录 NestJS，并已验证首页、库存汇总、趋势分析命中 `/api/reporting/**` 成功；剩余 legacy 页面尚未全量验证。 |
| `req-20260323-0910-monthly-reporting.md`            | `needs-confirmation` | 系统自动生成月度报表需求；当前待确认月报指标口径、销售域统计范围、自动生成方式，以及页面/导出/推送等交付形式。 |
| `req-20260322-1354-outbound-customer-rename.md`      | `confirmed`          | 将 NestJS 中命名错误的 `outbound` 域统一更正为 `customer`，同步覆盖代码、测试、迁移脚本、Swagger 元数据与架构文档，但不扩大为新的业务语义改造。 |
| `req-20260321-1109-architecture-review-clarity.md`   | `confirmed`          | 已按确认口径完成基于 `PROJECT_REQUIREMENTS.md` 的业务域与 shared core 架构 review；详细 findings 与 follow-up 收口见 `docs/tasks/archive/retained-completed/task-20260323-1100-architecture-review-clarity.md` 及同批归档 task。 |

## 已归档（`archive/retained-completed/`）

| 需求文档 | 保留原因 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `archive/retained-completed/req-20260319-1300-return-post-admission.md`   | 需求 ID 溯源；正文已合并至 `archive/retained-completed/req-20260320-1830-migration-active-slices.md`                                          |
| `archive/retained-completed/req-20260320-1830-migration-active-slices.md` | 覆盖 `outbound-base`、销售退货 formal admission、车间退料 formal admission 与退货族 shared post-admission 的统一交互锚点；当前切片均已收口，保留为本轮迁移 requirement 真源。 |
| `archive/retained-completed/req-20260321-1100-java-to-nestjs-data-migration.md` | Java 源库到 NestJS 目标库的全量业务域数据迁移需求已闭环；全域数据搬家 + 库存重放已完成（733 logs / 428 balances / 验证 0 blocker），现保留为迁移结果与切换说明真源。 |
| `archive/retained-completed/req-20260325-1730-agent-orchestration-completion-state.md` | 已完成 AI 编排完成态、归档协议、resume 真源与 `project` validate 假确认门修复；保留为本轮治理修正的 requirement 真源。 |
| `archive/retained-completed/req-20260322-1452-frontend-web-path.md`       | 前端工程统一为仓库内 `web/`；工作区与文档路径引用已同步；保留为路径口径溯源。                                                                                         |

## 清理候选（`archive/cleanup-candidate/`）

当前无条目。删除前须用户明确确认，并对仓库内引用做全文检索。

## 维护

- 新增或调整 `PROJECT_REQUIREMENTS.md` 的项目级主题时，同步更新“固定项目需求”说明。
- 新增、归档、迁移或删除需求时，同步更新对应看板行。
- task 绑定、归档与命名等规则统一以 `docs/requirements/README.md` 为准。
