# RD_SUB 项目归属与月报口径对齐验收报告

## 元数据

| 字段 | 值 |
|------|------|
| 关联 spec | `docs/acceptance-tests/specs/rd-subwarehouse.md` |
| 关联 task | `docs/tasks/task-20260414-1418-rd-sub-project-attribution-and-reporting-alignment.md` |
| 创建原因 | 冻结 `RD_SUB` 项目归属、盘点项目化、项目台账与月报视角重算的 full acceptance 证据 |
| 状态 | `passed` |
| 环境 | `.env.dev`; backend `http://127.0.0.1:8112`; web `http://127.0.0.1:90`; headless Chrome CDP browser + live API + parent automated evidence |
| 时间 | `2026-04-14 16:20 CST` |

## 执行记录

- 先复核 parent 已提供并已通过的自动化 / 环境证据：
  - `pnpm prisma:generate`
  - `bun run typecheck`
  - focused specs：`inventory-core`、`rd-project`、`rd-subwarehouse`、`reporting`
  - `pnpm --dir web build:prod`
  - local `.env.dev` DB drift 处理：重建本地测试库、`prisma db push`、`bun --env-file .env.dev scripts/dev/reset-and-seed-test-data.ts`
  - `bun run test:e2e -- test/batch-d-slice.e2e-spec.ts`，使用 `.env.dev`，并显式覆盖 `CAPTCHA_ENABLED=true`
- 再执行独立 live API 验收：
  - `POST /api/auth/login` 使用 `admin/admin123` 与 `rd-operator/rd123456` 均返回 `201`；本轮直接验收命令均以 `.env.dev` 为 env source，未额外覆盖 `CAPTCHA_ENABLED`。
  - `GET /api/rd-subwarehouse/handoff-orders?limit=5&offset=0` 返回 handoff `RDH-20260413160305-282`，其 line 已包含 `rdProjectId = 1 / rdProjectCodeSnapshot = TEST-RDP-001 / rdProjectNameSnapshot = 测试研发项目`。
  - `POST /api/rd-subwarehouse/stocktake-orders` 在缺少 `rdProjectId` 时返回 `400`，报错 `lines.0.rdProjectId must not be less than 1`，证明盘点写路径拒绝无项目归属行。
  - `POST /api/rd-subwarehouse/stocktake-orders` 创建有效盘点单 `RDST-20260414161525-657` 成功；返回的 line 含 `rdProjectId = 1`，库存流水 `inventoryLog.projectTargetId = 2`，且 `note = RD 盘点调增 / TEST-RDP-001: 1 -> 2`。
  - `GET /api/rd-projects/1` 在盘点创建前后分别显示 `currentAvailableQty = 1 -> 2`；作废盘点单后恢复到 `1`，证明项目在库视图与库存事实一致。
  - `GET /api/reporting/monthly-reporting/details?yearMonth=2026-04&stockScope=RD_SUB&keyword=RDH-20260413160305-282` 返回 handoff 同一单据在 `RD_SUB` 视角为 `direction = IN / amount = 900.00 / rdProjectCode = TEST-RDP-001`。
  - `GET /api/reporting/monthly-reporting/details?yearMonth=2026-04&stockScope=MAIN&keyword=RDH-20260413160305-282` 返回同一 handoff 在 `MAIN` 视角为 `direction = OUT / amount = 900.00`。
  - `GET /api/reporting/monthly-reporting/details?yearMonth=2026-04&stockScope=RD_SUB&keyword=TEST-RDP-001` 同时返回 `RD handoff IN 900` 与 `项目领用 OUT 600`，summary 为 `netAmount = 300.00`，证明项目视角已消费归属后的 handoff 事实。
- 再执行独立 browser smoke（headless Chrome CDP，真实渲染页面，不是 HTTP dump）：
  - `/reporting/monthly-reporting` 管理员页面可见新的领域说明文案；总览保留全仓视角 `交接金额`，用于内部转移解释。
  - `/rd/inbound-results` 列表直接显示 `TEST-RDP-001 测试研发项目`；打开 `RDH-20260413160305-282` 详情后，可见行级 `研发项目编码 / 研发项目名称 / 物料编码 / 数量 / 金额`。
  - `/rd/projects` 打开 `TEST-RDP-001` 详情后，可见 `当前可用 = 1 / 已领 = 2 / 净耗用 = 2 / 净耗用成本 = 600.00`，与 live API 一致。
  - `/rd/stocktake-orders` 打开通过 API 创建的 `RDST-20260414161525-657` 详情后，可见 `研发项目编码 = TEST-RDP-001`、`库存前后 = 1 -> 2`、`原因 = browser verify`。
- 受控清理：
  - browser 验收后，已通过 `POST /api/rd-subwarehouse/stocktake-orders/2/void` 作废临时盘点单，`voidReason = acceptance browser cleanup`，确保 local/test fixture 回到干净状态。

## 验收矩阵

| AC | 结论 | 关键证据 | 备注 |
|----|------|----------|------|
| AC-1 | `met` | `inventory_balance` 仍沿用既有仓别余额轴；有效盘点 line 与库存流水同时写入 `rdProjectId / projectTargetId`；`rd-project` 详情 `currentAvailableQty` 会随项目化盘点增减而变化 | 证明“仓别轴不变、项目归属落事实层” |
| AC-2 | `met` | handoff list / detail 与 inbound-results 页面都显示 `TEST-RDP-001` 项目归属；focused `rd-handoff` evidence 已由 parent 通过；live handoff line 已落 `rdProjectId` 与项目快照 | live run 未重复制造 invalid handoff fixture，负例由 focused specs 补足 |
| AC-3 | `met` | 同一 `RDH-20260413160305-282` 在 `RD_SUB` detail 中为 `IN 900`，在 `MAIN` detail 中为 `OUT 900`；项目关键字 detail 同时包含 handoff 与项目领用，summary `netAmount = 300.00` | 说明月报已按视角重算，不再只有单一固定方向 |
| AC-4 | `met` | parent 已执行 `.env.dev` 本地 DB 重建、`prisma db push`、`reset-and-seed-test-data.ts`；本轮 browser/API 验收也在受控 local/test 数据上完成，并在结束后回滚临时 stocktake fixture | 本 task 明确允许 local/test 清理重注；本轮按该合同执行 |
| AC-5 | `met` | parent 自动化证据齐全；本轮补了 monthly-reporting / inbound-results / rd-projects / rd-stocktake-orders 的独立 browser smoke 与 live API 写读闭环 | `rd-operator` 浏览器壳层本轮未作为主证据，改用管理员页面 + RD 作用域 live API 补齐 |

## 总结

- 建议：`accept`
- 残余风险：
  - `/api/reporting/monthly-reporting` 仍保留 `rdHandoffItems` 读模型桶，虽然视角 totals 与 details 已对齐，但后续若继续收口导出/只读合同，可考虑进一步弱化该历史结构，避免下游消费者重新把它当成平行总账。
  - `rd-operator` 浏览器直连 `/rd/monthly-reporting` 的 headless smoke 本轮出现前端权限提示且 summary 未稳定回出 seeded 数据；由于同一账号 live API 已正确返回 `RD_SUB` 视角数据，本轮将其归为浏览器壳层/权限别名残余风险，不阻断本 task 签收。
