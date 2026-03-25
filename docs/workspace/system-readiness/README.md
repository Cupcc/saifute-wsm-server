# 系统运行与联调 readiness

关联需求: `docs/requirements/req-20260325-2319-system-readiness-validation.md`
关联任务: 无
阶段: 已完成最小联调
创建: 2026-03-25
最后更新: 2026-03-25

## 当前状况

本机 smoke 验证与浏览器实测均已完成。NestJS 后端可正常启动并响应 `/api/auth/**`、`/api/reporting/**`；前端 `web/` 已恢复依赖并完成最小适配，当前已可在浏览器中真实登录并访问首页、库存汇总、趋势分析等页面。

## 待决策项

1. 是否继续扩大旧 `web/` 页面适配范围，把 `monitor/`、`base/` 等 legacy 页面逐步接到当前 NestJS API？
2. 还是以当前“登录 + 首页 + 报表中心已打通”为止，优先切回 `monthly-reporting` 或其他业务需求？

## 背景与上下文

- 前端实际目录在 `web/`，Vite 配置把 `/dev-api` 代理到 `http://localhost:8080`。
- 本次执行中，NestJS 已在 `8080` 启动成功，并验证通过 `/api/health`、`/api/auth/captcha`、`/api/auth/login`、`/api/reporting/home`、`/api/reporting/inventory-summary`、`/api/reporting/trends`。
- 前端适配策略采用“直接改接当前 NestJS 契约”而不是补后端旧接口兼容层：修复了 `web` 依赖、Vue/ElementPlus 初始化顺序、`/api` 前缀对接、认证响应解包、动态菜单映射，以及最小报表页组件。
- 当前残余问题主要有两类：一是 `Navbar` 仍会尝试连接 `ws://localhost:8080/websocket/message` 并打印关闭告警；二是大量 legacy 业务页尚未纳入本次最小适配范围。

## 关键里程碑

| 时间 | 事件 |
|------|------|
| 2026-03-25 | 用户要求暂缓 `monthly-reporting`，先验证系统运行与联调 readiness |
| 2026-03-25 | 本机后端 smoke 验证完成，确认 NestJS 可启动并命中业务数据 |
| 2026-03-25 | 确认 `web` 当前无法直接联调：前端 dev 依赖异常 + API 契约不兼容 |
| 2026-03-25 | 完成 `web` 最小适配并通过浏览器实测登录，验证 `/index`、`/reporting/inventory-summary`、`/reporting/trends` 联调成功 |

## 本文件夹资产索引

| 文件 | 用途 |
|------|------|
| `README.md` | 汇总本次 readiness 验证结论与后续待决策项 |
