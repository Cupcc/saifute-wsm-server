# 销售项目（sales-project）验收规格

## 元数据

| 字段 | 值 |
|------|------|
| 模块 | sales-project |
| 需求源 | docs/requirements/domain/sales-project-management.md |
| 最近更新 | 2026-04-10 |

## 能力覆盖

| 能力 | 说明 | 状态 |
|------|------|------|
| F1 | 销售项目主档轻量 CRUD | `已验收` |
| F2 | 项目维度库存 / 可供货视图 | `已验收` |
| F3 | 项目关联销售出库与一键生成草稿 | `已验收` |
| F4 | 项目维度发货 / 退货 / 净发货统计 | `已验收` |
| F5 | 项目分配 / 预留 | `未开始` |

## F1-F4 总体验收摘要

- 关联任务：`docs/tasks/archive/retained-completed/task-20260410-1700-sales-project-phase1-phase2-delivery.md`
- 验收模式：`full`
- 结论：`accepted`
- 理由摘要：
  - `sales-project` 已形成独立模块、Prisma 模型、权限 / 菜单 / 页面入口，项目主档 CRUD 与作废语义成立，且没有回退复用 `rd-project` 运行时。
  - 项目详情与项目列表现在都复用同一衍生读模型，能稳定回答 `当前库存 / 累计出库 / 累计退货 / 净发货 / 待供货 / 金额 / 成本`，且口径明确来自 `sales` 与 `inventory-core` 真事实。
  - 项目详情中的“生成出库草稿”已经能把项目上下文带入共享销售编辑器，并通过显式 `MAIN` 价格层查询恢复了 live `sales` 正式录单路径。
  - live fixture 验证了项目主档创建、销售出库保存、销售退货回冲与项目统计刷新；`F5` 继续保持未实现，不影响 `Phase 1 / Phase 2` 签收。

### 验证摘要

| 时间 | 关联 task | 环境 | 结果 |
|------|-----------|------|------|
| 2026-04-10 | `archive/retained-completed/task-20260410-1700-sales-project-phase1-phase2-delivery.md` | `.env.dev`; backend `http://127.0.0.1:8112`; web `http://127.0.0.1:90`; Prisma schema synced; agent-browser + live API + MySQL | `passed` |

### 证据索引

| 执行面 | 证据文件/命令 | 结果 |
|--------|-------------|------|
| prisma | `set -a && source .env.dev && set +a && pnpm exec prisma db push --schema prisma/schema.prisma --accept-data-loss` | pass |
| prisma | `set -a && source .env.dev && set +a && pnpm prisma:validate` | pass |
| typecheck | `pnpm typecheck` | pass |
| unit | `pnpm test -- src/modules/sales/application/sales.service.spec.ts src/modules/sales-project/application/sales-project.service.spec.ts src/modules/rbac/application/workshop-scope.service.spec.ts src/modules/inventory-core/controllers/inventory.controller.spec.ts` | pass |
| build | `pnpm --dir web build:prod` | pass |
| browser | `docs/acceptance-tests/cases/sales-project.json` | pass |
| acceptance run | `docs/acceptance-tests/runs/run-20260410-2051-sales-project-phase1-phase2.md` | pass |

## F1 销售项目主档轻量 CRUD

### 验收矩阵

| AC | 描述 | 结论 | 执行面 | 关键证据 | 备注 |
|----|------|------|--------|----------|------|
| AC-1 | 提供独立销售项目主档 `CRUD / 作废 / 历史保留`，且不引入项目状态机 | `met` | unit + browser + live API | `sales-project.service.spec.ts` 覆盖 create / duplicate / void；browser 列表和详情显示独立销售项目主档；live `POST /api/sales-projects` 成功创建 `SP-QA-20260410-01` | 当前验收样本未执行浏览器“修改/作废”按钮，但 API 与权限面已闭环 |

### 残余风险

- 无阻塞风险；`F5` 项目分配 / 预留仍未开始，但与主档验收无关。

## F2 项目维度库存 / 可供货视图

### 验收矩阵

| AC | 描述 | 结论 | 执行面 | 关键证据 | 备注 |
|----|------|------|--------|----------|------|
| AC-2 | 项目详情可回答当前库存、已发货、已退货、净发货、待供货，且口径来自真实库存 / 销售事实 | `met` | unit + browser + live API | `sales-project.service.spec.ts` 覆盖 inventory / outbound / return / pending 聚合；agent-browser 在 `/sales/project` 列表和详情都看到 `目标数量 2 / 净发货 1 / 待供货 1` 与详情卡片 `当前库存 4 / 累计出库 2 / 累计退货 1 / 净发货成本 12.34` | 本轮 fix loop 额外修复了列表页未复用衍生读模型的问题 |

### 残余风险

- 无；列表与详情现在共用同一读模型真源。

## F3 项目关联销售出库与一键生成草稿

### 验收矩阵

| AC | 描述 | 结论 | 执行面 | 关键证据 | 备注 |
|----|------|------|--------|----------|------|
| AC-3 | 项目页可生成 `sales` 出库草稿，正式出库行显式保存 `salesProjectId` 与项目快照 | `met` | unit + browser + live API + DB | agent-browser 点击“生成出库草稿”后看到共享销售编辑器已预填项目、客户、负责人、数量 `1`、价格层 `12.34 / 可用 4`；browser live 保存出库单成功；MySQL 中 `sales_stock_order_line.salesProjectId = 1`；`sales.service.spec.ts` 覆盖出库 / 退货的项目绑定与 `projectTargetId` 传播 | live QA 中额外修复了 all-scope 用户无法解析 `MAIN` 价格层的问题 |

### 残余风险

- 无阻塞风险；当前 browser 样本已证明草稿进入共享销售编辑器，live DB 证明正式单据行已携带项目维度。

## F4 项目维度发货 / 退货 / 净发货统计

### 验收矩阵

| AC | 描述 | 结论 | 执行面 | 关键证据 | 备注 |
|----|------|------|--------|----------|------|
| AC-4 | 系统可按项目、按物料查看出库 / 退货 / 净发货数量、金额与成本，且统计复用 `sales` 真事实 | `met` | unit + browser + live API | live `POST /api/sales/sales-returns` 创建 `XSTH20260410195443469` 后，agent-browser 在项目详情看到 `累计出库 2 / 累计退货 1 / 净发货 1 / 净发货金额 20.00 / 净发货成本 12.34 / 待供货 1`；`sales-project.service.spec.ts` 覆盖 net shipment / pending 聚合 | 当前 browser 样本为单物料单项目，但数量 / 金额 / 成本链路已闭合 |

### 残余风险

- 当前 live browser 仅覆盖单项目单物料样本；多物料聚合仍主要依赖 service tests。

## 前端闭环与完整证据

### 验收矩阵

| AC | 描述 | 结论 | 执行面 | 关键证据 | 备注 |
|----|------|------|--------|----------|------|
| AC-5 | 前端入口、列表、详情与项目草稿链路形成可达闭环 | `met` | browser + build | agent-browser 在菜单、列表、详情、草稿弹窗都能访问销售项目 UI；`pnpm --dir web build:prod` 通过 | 当前 live run 没有再次用 agent-browser 提交正式出库保存，但此前 live browser 已完成真实保存并由项目统计回写证明 |
| AC-6 | Prisma / tests / typecheck / build / browser evidence 组成完整 full acceptance 包 | `met` | prisma + unit + typecheck + build + browser | 本 spec、`cases/sales-project.json`、`runs/run-20260410-2051-sales-project-phase1-phase2.md` 与验证命令结果齐全 | 独立 code-review subagent 因额度上限未返回，最终 sign-off 基于 parent local review + acceptance evidence |

### 残余风险

- `F5` 仍为后续阶段能力，需要独立 task 承接。
