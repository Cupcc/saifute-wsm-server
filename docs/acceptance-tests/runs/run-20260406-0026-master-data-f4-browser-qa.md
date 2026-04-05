# 验收执行报告：Master Data F4 供应商 Browser QA

## 元数据

| 字段 | 值 |
|------|------|
| 关联 spec | `docs/acceptance-tests/specs/master-data.md` |
| 关联 task | `docs/tasks/archive/retained-completed/task-20260402-1758-master-data-f4-supplier-crud.md` |
| 创建原因 | 用户要求补齐 `master-data` browser QA 并冻结 2026-04-06 复验结果 |
| 状态 | `passed` |
| 环境 | 仓库根目录 `.env.dev`；backend `http://127.0.0.1:8112`；web `http://localhost:90`；`agent-browser` |
| 被测提交 | `d7480162048afa82bbe08484e93084a847ef5617`（short: `d748016`） |
| 时间 | 2026-04-06 |

## 执行范围

- 用例：`docs/acceptance-tests/cases/master-data.json` 中 `F4-BROWSER-1`
- 覆盖 AC：`AC-1`、`AC-2`、`AC-3`、`AC-6`
- 账号：`admin / admin123`
- 浏览器路径：
  - 登录 `http://localhost:90/login`
  - 访问 `http://localhost:90/base/supplier`
  - 访问 `http://localhost:90/entry/order`

## 执行面与原始证据

### Browser 步骤结果

| 步骤 | 结果 | 证据 |
|------|------|------|
| 登录后台并进入 `供应商管理` 页面 | pass | 页面快照与后续受保护接口请求均成功 |
| 新增供应商 `SUP-QA-20260406-001 / 浏览器验收供应商20260406` | pass | `POST /api/master-data/suppliers` → `201` |
| 列表回显新增供应商，并显示 `修改 / 停用` 操作 | pass | browser snapshot 中出现新增行 |
| 停用该供应商 | pass | `PATCH /api/master-data/suppliers/2/deactivate` → `200` |
| 供应商管理页按编码搜索该供应商，默认 active-only 列表为空 | pass | `GET /api/master-data/suppliers?keyword=SUP-QA-20260406-001&limit=30&offset=0` → `200`；页面表格无结果 |
| `验收单` 页面供应商下拉搜索同编码，不再返回停用供应商 | pass | `GET /api/master-data/suppliers?keyword=SUP-QA-20260406-001&limit=100&offset=0` → `{"items":[],"total":0}` |

### 关键网络证据

| requestId | 请求 | 结果 |
|------|------|------|
| `48972.471` | `POST http://localhost:90/dev-api/api/master-data/suppliers` | `201` |
| `48972.473` | `PATCH http://localhost:90/dev-api/api/master-data/suppliers/2/deactivate` | `200` |
| `48972.635` | `GET http://localhost:90/dev-api/api/master-data/suppliers?keyword=SUP-QA-20260406-001&limit=100&offset=0` | `200`，响应体 `{"success":true,"code":200,"data":{"items":[],"total":0}}` |

### 截图产物

| 文件 | 说明 |
|------|------|
| `docs/acceptance-tests/artifacts/master-data/20260406-f4-browser-qa/supplier-after-deactivate.png` | 供应商管理页按编码搜索后无结果 |
| `docs/acceptance-tests/artifacts/master-data/20260406-f4-browser-qa/entry-order-supplier-filter.png` | `验收单` 页面供应商下拉输入停用编码后的状态 |

## 验收矩阵

| AC | 结论 | 关键证据 | 备注 |
|----|------|----------|------|
| AC-1 | `met` | browser create + `48972.471` `POST 201` | 浏览器面验证新增通路可用 |
| AC-2 | `met` | 新增后列表成功回显；页面操作链路正常 | 本次 browser 未单独走 edit，但 UI CRUD 通路可进入且 spec 仍由 unit/e2e 覆盖修改合同 |
| AC-3 | `met` | 停用 `PATCH 200`；供应商页与 `验收单` 下拉搜索均为空 | active-only 过滤成立 |
| AC-6 | `met` | 前端真实请求命中 `/api/master-data/suppliers*`；页面可操作 | 兼容层与真实接口联通成立 |

## 总结

- 建议：`accept`
- Acceptance QA 判断：`passed`
- 残余风险：本次 browser QA 仍是 F4 冒烟，不替代 `ensureSupplier()` 的真实调用方集成验证；修改流程的合同仍主要由 unit/e2e 证据承担。
