# Workspace Dashboard

> 最后更新: 2026-03-25

## 当前状态

**等待人工确认** — `system-readiness` 已完成最小联调打通：浏览器实测已可登录并访问首页与报表中心；是否继续扩大 legacy 页面适配范围，仍待你决定。`monthly-reporting` 仍处于需求确认阶段。

## 需要你确认的

| #   | 来源                                               | 问题                            |
| --- | ------------------------------------------------ | ----------------------------- |
| 1   | [system-readiness](system-readiness/README.md)   | 是否继续把 `monitor/`、`base/` 等剩余旧页面逐步适配到当前 NestJS API？ |
| 2   | [monthly-reporting](monthly-reporting/README.md) | 月报指标范围：仅数量，还是含金额/成本/报废/退料？    |
| 3   | [monthly-reporting](monthly-reporting/README.md) | 销售域口径：仅客户收发，还是含金额/退货/毛利/回款？   |
| 4   | [monthly-reporting](monthly-reporting/README.md) | 生成方式：定时快照，还是实时可重算？            |
| 5   | [monthly-reporting](monthly-reporting/README.md) | 交付形式：页面/Excel/PDF/推送/邮件——要哪些？ |
| 6   | [monthly-reporting](monthly-reporting/README.md) | 补录处理：月末后补录是否允许重算覆盖已生成月报？      |

## AI 待办

| 优先级 | 任务                             | 状态       | 说明                                                                                                   |
| --- | ------------------------------ | -------- | ---------------------------------------------------------------------------------------------------- |
| 1   | system-readiness               | 已完成最小联调，待决策 | 浏览器实测已打通登录、首页与报表中心；剩余 legacy 页面是否继续适配待确认；[详情](system-readiness/README.md) |
| 2   | outbound-customer-rename 兼容层清理 | 就绪，未排期   | 内部重命名已完成，旧路由/权限码/命令别名兼容层待清理；[详情](outbound-customer-rename/README.md)                         |
| —   | monthly-reporting              | 阻塞于上方确认项 | 需你确认口径后 AI 才能进入设计                                                                                    |

## 活跃工作流

| 工作流                                                            | 阶段   | 健康度    | 简述                |
| -------------------------------------------------------------- | ---- | ------ | ----------------- |
| [system-readiness](system-readiness/README.md)                 | 联调完成 | ● 稳定   | 已完成最小适配并通过浏览器实测登录与报表页验证 |
| [monthly-reporting](monthly-reporting/README.md)               | 需求确认 | ○ 等待输入 | 月报指标口径、交付方式待确认    |
| [outbound-customer-rename](outbound-customer-rename/README.md) | 已确认  | ● 就绪   | 内部已完成重命名，兼容层待后续清理 |

## 已归档

| 工作流                                                                                       | 完成时间       | 简述                      |
| ----------------------------------------------------------------------------------------- | ---------- | ----------------------- |
| [migration-java-to-nestjs](archive/retained-completed/migration-java-to-nestjs/README.md) | 2026-03-25 | 全域数据搬家 + 库存重放已完成；工作流已归档 |
