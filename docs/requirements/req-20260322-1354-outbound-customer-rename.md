# outbound 域重命名为 customer

## Metadata

- ID: `req-20260322-1354-outbound-customer-rename`
- Status: `confirmed`
- Lifecycle disposition: `active`
- Owner: `user`
- Related tasks:
  - None

## 用户需求

- [x] `outbound` 域在 NestJS 中属于客户收发家族，当前命名不准确，应统一改为 `customer`。
- [x] 同步修改所有相关代码、测试、脚本、Swagger 元数据、模块命名与架构文档，避免残留旧命名。
- [x] 本轮目标是修正命名，不扩大为新的业务语义调整或流程改造。
- [ ] 保持当前“内部 `customer` + 外部兼容 `outbound`”状态，并在后续单独清理兼容层。

## 当前进展

- 阶段进度: 已识别到该命名问题影响 `docs/architecture/**`、`src/modules/**`、`scripts/migration/**`、`test/migration/**`、`src/swagger-metadata.ts`、`src/app.module.ts` 等多处路径与标识。
- 当前状态: 内部模块命名已保持为 `customer`；兼容层仅保留旧前端依赖的 `outbound` 路由前缀、权限码与迁移命令别名，避免把后端内部标识重新改回 `outbound`。
- 阻塞项: None.
- 下一步: 保持当前“内部 `customer` + 外部兼容 `outbound`”状态，并在后续单独清理兼容层。

## 待确认

- 后续需要清理的工作（仅记录，暂不执行）：
- 1. 评估是否为 `customer` 增加正式对外路由，并确定何时移除旧 `outbound` 路由兼容层。
- 1. 评估何时把权限码从 `outbound:*` 迁移到 `customer:*`，并同步 RBAC 数据与前端权限引用。
- 1. 评估何时移除 `package.json` 中保留的 `migration:outbound*` 兼容命令别名，仅保留 `migration:customer*`。
- 1. 复核历史文档与归档 task 中关于 `outbound` 的叙述，区分“历史业务语义”与“已过时模块命名”，决定后续是否继续清理。
