# 月报研发项目交接重构验收报告

## 元数据

| 字段 | 值 |
|------|------|
| 关联 spec | `docs/acceptance-tests/specs/monthly-reporting.md` |
| 关联 task | `docs/tasks/task-20260414-1418-rd-sub-project-attribution-and-reporting-alignment.md` |
| 创建原因 | 冻结“研发项目总入接管 handoff、删除历史 rdHandoffItems 桶”的 QA 证据 |
| 状态 | `passed` |
| 环境 | `.env.dev`; backend `http://127.0.0.1:8112`; web build artifact; live API + focused automated evidence |
| 时间 | `2026-04-15 10:48 CST` |

## 执行记录

- 自动化验证：
  - `bun run typecheck`
  - `bun run test -- src/modules/reporting/application/monthly-reporting.service.spec.ts src/modules/reporting/infrastructure/reporting.repository.spec.ts`
  - `pnpm --dir web build:prod`
  - `set -a; source .env.dev; set +a; CAPTCHA_ENABLED=true bun run test:e2e -- test/batch-d-slice.e2e-spec.ts`
- live API 验证：
  - `POST /api/auth/login` 使用 `admin/admin123` 成功。
  - `GET /api/reporting/monthly-reporting?yearMonth=2026-04` 返回：
    - `summary.totalInAmount = 16250.00`
    - `domains` 中 `RD_PROJECT.totalInAmount = 900.00`
    - `topics` 中 `RD_HANDOFF` 已归属 `domainKey = RD_PROJECT`，且 `totalInAmount = 900.00`
    - `rdProjectItems[0].handoffInAmount = 900.00`
    - 响应中已不存在 `rdHandoffItems`
- 结果解释：
  - 研发项目总入不再为 `0`
  - handoff 不再走单独历史桶
  - 月报页面与导出契约已切成“研发项目正式入账”模型

## 结论

- 建议：`accept`
- 备注：
  - 本轮未新增独立 browser walkthrough，但 `web build`、`batch-d-slice.e2e` 与 live API 已覆盖新的响应合同。
  - 旧的 `docs/acceptance-tests/runs/run-20260414-1620-rd-sub-project-attribution-and-reporting-alignment.md` 作为历史 run 保留，不再代表当前月报读模型合同。
