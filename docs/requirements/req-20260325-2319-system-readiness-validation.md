# 系统运行与前后端联调验证

## Metadata

- ID: `req-20260325-2319-system-readiness-validation`
- Status: `confirmed`
- Lifecycle disposition: `active`
- Owner: `user`
- Related tasks:
  - None

## 用户需求

- [x] 暂不优先推进 `monthly-reporting`，先验证当前 NestJS 系统是否能在本机跑通。
- [x] 验证当前前端是否能与 NestJS 后端直接联调成功。
- [x] 若存在阻塞，先明确阻塞点属于运行环境问题、接口路径问题，还是前后端契约不兼容。

## 当前进展

- 阶段进度: 已完成本机 smoke 验证与浏览器实测，覆盖前端启动、登录、动态菜单，以及至少两个命中 NestJS 报表接口的页面。
- 当前状态: NestJS 后端继续以 `8080` 端口运行并稳定响应 `/api/auth/**`、`/api/reporting/**`；`web/` 已通过 `pnpm install` 恢复依赖，并完成 Vue/ElementPlus 初始化顺序修复、`/api` 前缀对接、认证响应适配、动态菜单映射与最小报表页补齐。浏览器实测已使用 `admin/admin123` + captcha 登录成功，并验证 `/index`、`/reporting/inventory-summary`、`/reporting/trends` 对后端请求返回 `200`。
- 阻塞项: None（针对“最小可用联调”范围）。残余风险: 旧 legacy 页面（如 `monitor/`、`base/` 等）尚未全量适配当前 NestJS API；导航栏仍会尝试连接 `ws://localhost:8080/websocket/message` 并出现关闭告警，但不影响当前登录与报表链路。
- 下一步: 等待用户决定是否继续扩大旧页面适配覆盖面，或回到 `monthly-reporting` 等后续需求。

## 待确认

- 是否继续把剩余旧业务页面逐步适配到当前 NestJS API，还是以当前“登录 + 首页 + 报表中心已打通”为止，先回到其他需求？
