# 月报物料分类视角验收报告

## 元数据

| 字段 | 值 |
|------|------|
| 关联 spec | `docs/acceptance-tests/specs/monthly-reporting.md` |
| 关联 task | `docs/tasks/archive/retained-completed/task-20260416-1017-monthly-reporting-material-category-view.md` |
| 创建原因 | 冻结“月度对账新增物料分类视角”的 schema/backfill、live API、browser 与导出证据 |
| 状态 | `passed` |
| 环境 | `.env.dev`; backend `http://127.0.0.1:8112`; web `http://127.0.0.1:5173`; local target DB `saifute-wsm` |
| 时间 | `2026-04-16 12:13 CST` |

## 执行记录

- 自动化验证：
  - `bun run test -- src/modules/reporting/application/monthly-reporting.shared.spec.ts src/modules/reporting/application/monthly-reporting.service.spec.ts src/modules/reporting/infrastructure/reporting.repository.spec.ts src/modules/inbound/application/inbound.service.spec.ts src/modules/sales/application/sales.service.spec.ts`
  - `bun run test:e2e -- test/batch-d-slice.e2e-spec.ts`
  - `bun run typecheck`
  - `pnpm --dir web build:prod`
  - `bun run migration:typecheck`
- migration / backfill：
  - `bun run migration:monthly-reporting-material-category-snapshot:dry-run`
    - report: `scripts/migration/reports/monthly-reporting-material-category-snapshot-dry-run-report.json`
    - 结果：`stock_in_order_line` 与 `sales_stock_order_line` 都缺少 `4` 个快照字段；待补齐行分别为 `3` 和 `2`
  - `bun run migration:monthly-reporting-material-category-snapshot:execute`
    - report: `scripts/migration/reports/monthly-reporting-material-category-snapshot-execute-report.json`
    - 结果：两个行表都已新增 `materialCategoryIdSnapshot / materialCategoryCodeSnapshot / materialCategoryNameSnapshot / materialCategoryPathSnapshot`
    - backfill：`stock_in_order_line = 3` 行，`sales_stock_order_line = 2` 行，剩余缺口均为 `0`
- live API 验证：
  - `POST /api/auth/login` 使用 `admin/admin123` 成功
  - `GET /api/reporting/monthly-reporting?yearMonth=2026-04&viewMode=MATERIAL_CATEGORY` 返回：
    - `viewMode = MATERIAL_CATEGORY`
    - `summary.acceptanceInboundAmount = 13600.00`
    - `summary.productionReceiptAmount = 600.00`
    - `summary.salesOutboundAmount = 1950.00`
    - `summary.salesReturnAmount = 650.00`
    - `summary.netAmount = 12900.00`
    - `categories[0].categoryName = 测试装配件`
  - `GET /api/reporting/monthly-reporting/details?yearMonth=2026-04&viewMode=MATERIAL_CATEGORY&topicKey=SALES_RETURN` 返回分类行明细，包含：
    - `documentNo = XSTH20260412162909422`
    - `salesProjectCode = TEST-SP-001`
    - `sourceBizMonth = 2026-04`
    - `sourceDocumentNo = CK20260411162909557`
  - `POST /api/reporting/monthly-reporting/export` 在 `viewMode=MATERIAL_CATEGORY` 下返回 Excel workbook，包含 `分类汇总` 与 `单据行明细` 工作表
- browser walkthrough：
  - 启动 web：`pnpm --dir web dev --host 127.0.0.1 --port 5173`
  - 使用 `agent-browser` 登录 `admin/admin123`
  - 打开 `/reporting/monthly-reporting`
    - 默认仍落在 `领域视角`
    - 页面显示原有领域汇总、业务操作汇总、业务汇总与单据头明细
  - 切换到 `物料分类视角`
    - 页面显示新的金额总览卡片、`分类汇总` 树表、`单据行明细`
    - `测试装配件` 分类汇总显示：
      - `验收入库金额 = 13600.00`
      - `生产入库金额 = 600.00`
      - `销售出库金额 = 1950.00`
      - `销售退货金额 = 650.00`
      - `净发生金额 = 12900.00`
  - 在分类视角把 `操作` 过滤到 `销售退货`
    - 页面分类汇总收敛到 `1` 行、`650.00`
    - 单据行明细只保留 `XSTH20260412162909422`
  - UI 导出成功：
    - `agent-browser download @e11 /tmp/monthly-reporting-material-category-ui.xls`
    - 下载文件：`/tmp/monthly-reporting-material-category-ui.xls`
  - 浏览器截图：
    - `/tmp/monthly-reporting-material-category-view.png`

## 结论

- 建议：`accept`
- 备注：
  - 本轮验收已覆盖 task doc 要求的 schema/backfill、写侧快照、读模型、前端切换、筛选、导出与 browser acceptance 闭环。
  - `2026-04-16 12:51 CST` closeout 复核已追加通过：focused tests、`batch-d` e2e、`typecheck`、`migration:typecheck`、web build、migration dry-run/execute 均重新通过；migration execute 报告显示两张行表 `updatedRows = 0`、`batchCount = 0`，幂等性成立。
  - `2026-04-16 12:58 CST` 轻量 browser smoke 复核：重新打开 `/reporting/monthly-reporting` 并切换到 `物料分类视角` 后，分类汇总与单据行明细仍正常渲染。
  - live API 复核已验证 `categoryNodeKey` 精确下钻合同生效；负样本 node key 返回 `0` 行，说明分类 drilldown 不再回退为 `categoryId` 合并。
  - 当前证据冻结在本地 `.env.dev` 环境；后续若扩范围到 `workshop-material / rd-project / rd-subwarehouse`，需单独新建 acceptance run。
