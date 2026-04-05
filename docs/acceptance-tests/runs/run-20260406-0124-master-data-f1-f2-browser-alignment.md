# 验收执行报告：Master Data F1/F2 Browser Alignment

## 元数据

| 字段 | 值 |
|------|------|
| 关联 spec | `docs/acceptance-tests/specs/master-data.md` |
| 关联 task | `docs/tasks/archive/retained-completed/task-20260406-0106-master-data-material-category-alignment.md` |
| 创建原因 | 收口 `material-category` 前后端真源对齐、F1 页面补齐与 F2 浏览器失败修复后的真实 UI 复验 |
| 状态 | `passed` |
| 环境 | 仓库根目录 `.env.dev`；backend `http://127.0.0.1:8112`；web `http://localhost:90`；`agent-browser` |
| 时间 | 2026-04-06 |

## 执行范围

- F1：验证 `/base/material-category` 页面可访问并完成最小新增闭环
- F2：验证 `/base/material` 页面使用真实物料分类列表；验证“无分类选择”与“有效分类选择”新增物料都不再命中旧的 `500` 失败面
- 错误语义：验证非法 `categoryId` 已收敛为明确 `400`

## 执行结果

| 步骤 | 结果 | 证据 |
|------|------|------|
| 登录后台 | pass | 使用本地 dev 账号 `admin / admin123` 登录成功 |
| 打开 `物料分类管理` 页面 | pass | `/base/material-category` 可访问，无运行时错误 |
| 新增分类 `CAT-QA-20260406-002` | pass | `POST /api/master-data/material-categories` → `201` |
| 分类列表回显新增分类 | pass | 新增记录立即出现在页面表格 |
| 打开 `物料管理` 页面并检查分类下拉 | pass | 下拉展示真实分类选项，不依赖硬编码默认分类 |
| 不选分类新增物料 | pass | `POST /api/master-data/materials` → `201` |
| 选择有效分类新增物料 | pass | `POST /api/master-data/materials` → `201` |
| 直接提交非法 `categoryId=999999` | pass | backend 返回 `400`，错误消息 `物料分类不存在或已停用: 999999` |

## 关键结论

- F1 前端管理入口已补齐，真实页面链路可用。
- F2 已不再依赖“环境中先有一条 ACTIVE 分类 + 前端默认写死 `categoryId=1`”这一旧隐式前置。
- 非法分类输入已从历史 `500` 收敛为明确 `400` 业务错误。
- 本次复验未观察到 JS/runtime error。

## 建议

- 建议：`accept`
- Acceptance QA 判断：`passed`
- 残余风险：本次是 targeted browser alignment run，未重复覆盖物料停用后的消费者过滤链路；该部分仍以既有 `run-20260406-0043-master-data-f2-browser-qa.md` 为准。
