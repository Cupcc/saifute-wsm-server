# outbound → customer 域重命名

关联需求: `docs/requirements/req-20260322-1354-outbound-customer-rename.md`
关联任务: 无
阶段: 已确认
创建: 2026-03-22
最后更新: 2026-03-25

## 当前状况

NestJS 内部模块命名已统一为 `customer`，完成了核心重命名。当前保留了面向旧前端的 `outbound` 兼容层（路由前缀、权限码、迁移命令别名），等待后续单独清理。无阻塞项，可随时在需要时推进兼容层清理。

## 后续清理项（记录，暂不执行）

1. 评估是否为 `customer` 增加正式对外路由，确定何时移除旧 `outbound` 路由兼容层
2. 评估何时把权限码从 `outbound:*` 迁移到 `customer:*`，同步 RBAC 数据与前端权限引用
3. 评估何时移除 `package.json` 中的 `migration:outbound*` 兼容命令别名
4. 复核历史文档中 `outbound` 叙述，区分"历史业务语义"与"已过时模块命名"

