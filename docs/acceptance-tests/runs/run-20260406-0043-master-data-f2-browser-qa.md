# 验收执行报告：Master Data F2 物料 Browser QA

## 元数据

| 字段 | 值 |
|------|------|
| 关联 spec | `docs/acceptance-tests/specs/master-data.md` |
| 关联 task | `docs/tasks/archive/retained-completed/task-20260402-1802-master-data-phase1-completion.md` |
| 创建原因 | 用户要求补齐 `master-data` F2 browser QA 并冻结 2026-04-06 复验结果 |
| 状态 | `passed` |
| 环境 | 仓库根目录 `.env.dev`；backend `http://127.0.0.1:8112`；web `http://localhost:90`；`agent-browser` |
| 被测提交 | `d7480162048afa82bbe08484e93084a847ef5617`（short: `d748016`） |
| 时间 | 2026-04-06 |

## 执行范围

- 用例：`docs/acceptance-tests/cases/master-data.json` 中 `F2-BROWSER-1`
- 浏览器路径：
  - 登录 `http://localhost:90/login`
  - 访问 `http://localhost:90/base/material`
  - 访问 `http://localhost:90/entry/intoOrder`
- 测试数据：
  - 分类 fixture：`CAT-QA-20260406-001 / 浏览器验收分类20260406`
  - 物料：`MAT-QA-20260406-001 / 浏览器验收物料20260406 / QA-SPEC-001`

## 环境观察

- 当前环境开始执行时，`GET /api/master-data/material-categories?limit=50&offset=0` 返回 `items=[]`。
- 在该前置为空的情况下，物料页默认带 `categoryId=1` 提交新增，首次请求 `POST /api/master-data/materials` 返回 `500`（服务端统一错误包装为“服务器内部错误”）。
- 为完成 F2 browser QA，本次先通过 API 补入最小 ACTIVE 分类 fixture，再复跑浏览器主链路。
- 该现象应视为环境前置缺口，不是本次浏览器操作错误。

## 执行面与原始证据

### 前置准备

| 步骤 | 结果 | 证据 |
|------|------|------|
| 检查物料分类列表 | pass | `GET /api/master-data/material-categories?limit=50&offset=0` → 空 |
| 创建最小分类 fixture | pass | `POST /api/master-data/material-categories` → `200`，返回 `id=1` |

### Browser 步骤结果

| 步骤 | 结果 | 证据 |
|------|------|------|
| 登录后台并进入 `物料管理` 页面 | pass | 页面快照与后续受保护接口请求均成功 |
| 首次在无分类前置下提交新增 | observed | `POST /api/master-data/materials` → `500` |
| 补前置后新增物料 `MAT-QA-20260406-001` | pass | `POST /api/master-data/materials` → `201` |
| 列表回显新增物料，并显示 `修改 / 作废` 操作 | pass | browser snapshot 中出现新增行 |
| 作废该物料 | pass | `PATCH /api/master-data/materials/6/deactivate` → `200` |
| 物料管理页按编码搜索该物料，默认 active-only 列表为空 | pass | 页面表格无结果 |
| `入库单` 页面物料下拉搜索同编码，不再返回已作废物料 | pass | `GET /api/master-data/materials?keyword=MAT-QA-20260406-001&limit=30&offset=0` → `{"items":[],"total":0}` |

### 关键网络证据

| requestId | 请求 | 结果 |
|------|------|------|
| `65574.475` | `POST http://localhost:90/dev-api/api/master-data/materials` | `500`，发生于无分类前置时 |
| `65574.628` | `POST http://localhost:90/dev-api/api/master-data/materials` | `201` |
| `65574.630` | `PATCH http://localhost:90/dev-api/api/master-data/materials/6/deactivate` | `200` |
| `65574.790` | `GET http://localhost:90/dev-api/api/master-data/materials?keyword=MAT-QA-20260406-001&limit=30&offset=0` | `200`，响应体 `{"success":true,"code":200,"data":{"items":[],"total":0}}` |

### 截图产物

| 文件 | 说明 |
|------|------|
| `docs/acceptance-tests/artifacts/master-data/20260406-f2-browser-qa/material-after-deactivate.png` | 物料管理页按编码搜索后无结果 |
| `docs/acceptance-tests/artifacts/master-data/20260406-f2-browser-qa/into-order-material-filter.png` | `入库单` 页面物料下拉输入已作废编码后的状态 |

## 验收矩阵

| AC | 结论 | 关键证据 | 备注 |
|----|------|----------|------|
| F2-B1 | `met` | 真实 UI create path；`65574.628` `POST 201` | 浏览器面验证物料页新增链路可用 |
| F2-B2 | `met` | `65574.630` `PATCH 200`；列表页与 `入库单` 下拉查询均为空 | active-only 过滤成立 |
| ENV-1 | `observed` | `65574.475` `POST 500` | 当前环境若无 ACTIVE 物料分类，F2 浏览器新增不可直接执行 |

## 总结

- 建议：`accept`
- Acceptance QA 判断：`passed`
- 残余风险：`TC-2` 正余额停用拦截与 `TC-3` 生效单据引用拦截未在浏览器层模拟，仍以单测/服务层证据为准；当前环境仍依赖至少一条 ACTIVE 物料分类作为 F2 页面前置。
