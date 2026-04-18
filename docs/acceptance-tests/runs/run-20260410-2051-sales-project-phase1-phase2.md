# 销售项目 Phase 1/2 验收报告

## 元数据

| 字段 | 值 |
|------|------|
| 关联 spec | `docs/acceptance-tests/specs/sales-project.md` |
| 关联 task | `docs/tasks/archive/retained-completed/task-20260410-1700-sales-project-phase1-phase2-delivery.md` |
| 创建原因 | 冻结销售项目 `Phase 1 / Phase 2` full acceptance 证据 |
| 状态 | `passed` |
| 环境 | `.env.dev`; backend `http://127.0.0.1:8112`; web `http://127.0.0.1:90`; agent-browser + live API + MySQL |
| 时间 | `2026-04-10 20:51 CST` |

## 执行记录

- 先执行 `set -a && source .env.dev && set +a && pnpm exec prisma db push --schema prisma/schema.prisma --accept-data-loss`，结果 `pass`，数据库已经与当前 Prisma schema 同步。
- 再执行 `set -a && source .env.dev && set +a && pnpm prisma:validate`，结果 `pass`。
- 自动化验证通过：
  - `pnpm test -- src/modules/sales/application/sales.service.spec.ts src/modules/sales-project/application/sales-project.service.spec.ts src/modules/rbac/application/workshop-scope.service.spec.ts src/modules/inventory-core/controllers/inventory.controller.spec.ts`
  - `pnpm typecheck`
  - `pnpm --dir web build:prod`
- live fixture 通过真实后端建立：
  - `POST /api/sales-projects` 创建项目 `SP-QA-20260410-01`，物料行为 `MAT-QA-20260406-003`，目标数量 `2`，目标金额 `40.00`。
  - 在项目详情中通过共享销售编辑器正式保存出库单，生成 `CK20260410195409732`，项目统计随即更新为 `累计出库 = 2 / 待供货 = 0`。
  - `POST /api/sales/sales-returns` 创建退货单 `XSTH20260410195443469`，数量 `1`，项目统计再次更新为 `累计出库 = 2 / 累计退货 = 1 / 净发货 = 1 / 待供货 = 1`。
- `agent-browser` walkthrough：
  - 登录 `admin / admin123` 后访问 `/sales/project`，列表存在项目 `SP-QA-20260410-01`，列值显示 `目标数量 = 2 / 净发货 = 1 / 待供货 = 1`。
  - 点击“详情”，详情抽屉显示 `当前库存 = 4 / 累计出库 = 2 / 累计退货 = 1 / 净发货 = 1 / 净发货金额 = 20.00 / 净发货成本 = 12.34 / 待供货 = 1`，物料行 `MAT-QA-20260406-003` 与摘要一致。
  - 在详情抽屉点击“生成出库草稿”，弹出“新增出库单”；表头预填客户 `sdfdsfsdf`、经手人 `刘中华`、车间 `装备车间`，明细行预填项目 `SP-QA-20260410-01 / 销售项目验收01`、数量 `1`、单价 `20.00`，并自动解析 `MAIN` 价格层 `12.34 / 可用 4`。
- QA 过程中 parent local review 额外发现并修复两处 live 问题：
  - 共享销售编辑器对 all-scope 用户缺少显式库存范围，导致 `/api/inventory/price-layers` 无法返回 `MAIN` 价格层。
  - 销售项目列表页未复用项目详情同源的衍生读模型，导致 `净发货 / 待供货` 与详情页不一致。

## 验收矩阵

| AC | 结论 | 关键证据 | 备注 |
|----|------|----------|------|
| AC-1 | `met` | live `POST /api/sales-projects` 创建 `SP-QA-20260410-01`；列表 / 详情可见独立销售项目主档；`sales-project.service.spec.ts` 覆盖 create / duplicate / void | 样本使用 API 创建 fixture，浏览器验证主档可见性与查询闭环 |
| AC-2 | `met` | 项目列表显示 `目标数量 2 / 净发货 1 / 待供货 1`；详情显示 `当前库存 4 / 累计出库 2 / 累计退货 1 / 净发货成本 12.34`；`sales-project.service.spec.ts` 覆盖读模型聚合 | 列表与详情现在共享同一读模型真源 |
| AC-3 | `met` | 项目详情“生成出库草稿”打开共享销售编辑器，明细行预填项目与 `MAIN` 价格层；live 保存产生 `CK20260410195409732`；DB 中 `sales_stock_order_line.salesProjectId = 1` | live QA 中修复了显式 `MAIN` 价格层查询缺口 |
| AC-4 | `met` | live `POST /api/sales/sales-returns` 创建 `XSTH20260410195443469` 后，详情刷新为 `累计出库 2 / 累计退货 1 / 净发货 1 / 待供货 1 / 净发货金额 20.00 / 净发货成本 12.34` | 统计继续复用 `sales` 与 `inventory-core` 真事实 |
| AC-5 | `met` | `agent-browser` 走通菜单入口、列表、详情与项目草稿弹窗；`pnpm --dir web build:prod` 通过 | 当前 run 的正式出库保存动作由 live browser/API 先完成，agent-browser负责冻结 UI 闭环证据 |
| AC-6 | `met` | db push / prisma validate / tests / typecheck / build / browser / spec / cases / run 证据齐全 | 独立 review subagent 因额度上限未返回，但 local review 已完成 fix loop |

## 总结

- 建议：`accept`
- 残余风险：
  - `F5` 项目分配 / 预留仍未开始，不在本次 Phase 1/2 签收范围内。
  - 独立 code-review subagent 本轮未返回；当前签收基于 parent local review、focused 自动化验证与 live browser/API evidence。
