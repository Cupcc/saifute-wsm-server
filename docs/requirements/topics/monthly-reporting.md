# 月度报表主题需求

## Metadata

- ID: `topic-monthly-reporting`
- Status: `confirmed`
- Scope: `topic-level`
- Owner: `user`

## 主题定义

- 月度报表是长期分析主题，解决“系统如何自动且稳定地产出可核对、可追溯、可导出的管理月报”。
- 月度报表同时服务管理核对与经营分析，不只是做简单导出。
- 当前范围覆盖公司整体、生产车间、销售域、研发项目四类月度汇总与明细视角。

## 长期约束

- `C1` 正式月报语义：采用“每月固定正式月报 + 人工触发重算 + 可选日期范围报表”的并存模式。状态：`生效中`
- `C2` 追溯要求：补录后重算必须可追溯，不能把正式月报、重算结果和自定义日期范围结果混成一份不可区分的数据。状态：`生效中`
- `C3` 统计范围：整体、车间、销售域、研发项目四类月报口径必须统一纳入。状态：`生效中`
- `C4` 交付形式：默认支持系统内查看和 `Excel` 导出。状态：`生效中`
- `C5` 报表层次：四类月报均应同时支持汇总与明细两类视角，不能只保留汇总结果。状态：`生效中`
- `C6` 使用目标：月报输出必须能够支撑管理核对、经营分析和补录后复盘，指标口径需清晰可解释。状态：`生效中`

## 长期业务口径

### 生成与追溯口径

- 系统需要自动生成月度报表，至少持续提供公司整体月度汇总。
- 正式月报、人工重算结果和自定义日期范围报表必须区分来源与语义，避免后续核对时混淆。
- 补录后的重算结果必须可追溯，能够说明与正式月报的关系。

### 统计范围口径

- 公司整体月报需要提供月度汇总视角，作为最基础的管理报表输出。
- 生产车间、销售域、研发项目三类月报需要同时提供汇总与明细报表。
- 四类月报应共享统一统计口径，但允许按各自业务维度组织展示。

## 能力清单

| 编号 | 能力 | 验收口径 | 阶段 | 状态 | 关联需求 |
| --- | --- | --- | --- | --- | --- |
| `F1` | 月报指标口径模型 | 明确数量、金额、成本、结存、损耗、回补等核心指标定义，并能支撑管理核对与经营分析 | Phase 1 | `未开始` | `docs/requirements/archive/retained-completed/req-20260323-0910-monthly-reporting.md` |
| `F2` | 正式月报生成与重算 | 支持系统自动生成固定正式月报和人工重算，并能区分结果来源 | Phase 1 | `未开始` | `docs/requirements/archive/retained-completed/req-20260323-0910-monthly-reporting.md` |
| `F3` | 多维月报视图 | 支持公司整体、车间、销售域、研发项目四类月报的汇总与明细查看 | Phase 2 | `未开始` | `docs/requirements/archive/retained-completed/req-20260323-0910-monthly-reporting.md` |
| `F4` | 系统查看与导出 | 支持系统内查看与 `Excel` 导出，便于管理核对与经营分析复用 | Phase 3 | `未开始` | `docs/requirements/archive/retained-completed/req-20260323-0910-monthly-reporting.md` |
| `F5` | 日期范围报表与追溯区分 | 支持按用户选择日期范围生成报表，并与正式月报 / 重算结果明确区分且可追溯 | Phase 3 | `未开始` | `docs/requirements/archive/retained-completed/req-20260323-0910-monthly-reporting.md` |

## 阶段路线图

| 阶段 | 目标 | 当前状态 |
| --- | --- | --- |
| Phase 1 | 收敛指标定义、自动生成语义与重算口径 | `待规划` |
| Phase 2 | 落地四类月报的汇总与明细视图 | `待规划` |
| Phase 3 | 落地导出、日期范围报表与结果追溯区分 | `待规划` |

## 待确认（可选）

- None

## 文档关系（可选）

- 项目级长期背景：`docs/requirements/PROJECT_REQUIREMENTS.md`
- 已归档口径确认：`docs/requirements/archive/retained-completed/req-20260323-0910-monthly-reporting.md`
- 归档 workspace：`docs/workspace/archive/retained-completed/monthly-reporting/README.md`
- 执行与验证：后续新增 `docs/tasks/*.md`
