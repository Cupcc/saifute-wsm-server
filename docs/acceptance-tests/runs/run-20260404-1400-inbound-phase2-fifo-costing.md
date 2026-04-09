# 验收执行报告：Inbound Phase 2（F4/F5）FIFO 与来源成本

## 元数据

| 字段 | 值 |
|------|------|
| 关联 spec | `docs/acceptance-tests/specs/inbound.md` |
| 关联 task | `docs/tasks/archive/retained-completed/task-20260404-1315-inbound-phase2-fifo-costing.md` |
| 创建原因 | full-mode 跨模块交付冻结；Prisma + focused 回归证据固化 |
| 状态 | `passed` |
| 环境 | 仓库根目录 `.env.dev`（显式 `set -a && source .env.dev && set +a` 注入） |
| 被测提交 | `224bf3ecf61edcf1ab9cc084e7222bc12a791e9a`（short: `224bf3e`） |
| 时间 | 2026-04-04 |

## 执行面与原始证据

### Prisma 门禁

| 命令 | 结果 |
|------|------|
| `set -a && source .env.dev && set +a && pnpm prisma validate` | pass |
| `set -a && source .env.dev && set +a && pnpm prisma generate` | pass |

### Phase 2 focused 回归（本任务约定范围）

| 命令 | 结果 |
|------|------|
| `pnpm test --no-coverage -- src/modules/inventory-core/application/inventory.service.spec.ts src/modules/inbound/application/inbound.service.spec.ts src/modules/sales/application/sales.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts src/modules/rd-project/application/rd-project.service.spec.ts src/modules/rd-subwarehouse/application/rd-handoff.service.spec.ts` | **6 suites passed，91 tests passed** |

### 全量测试（参考，非本任务门禁）

| 说明 | 结果 |
|------|------|
| `pnpm test --no-coverage`（全仓库） | 存在 **1** 个失败套件：`src/modules/audit-log/application/auth-audit.listener.spec.ts`（**与 inbound Phase 2 范围无关**；验收不据此拒绝本 task） |

## 验收矩阵（task `[AC-1]` ~ `[AC-5]`）

| AC | 结论 | 关键证据 | 备注 |
|----|------|----------|------|
| AC-1 | `met` | Prisma 通过；`inbound` / `inventory-core` 单测；不可变成本快照与 consumed 层约束 | |
| AC-2 | `met` | 四类 service 单测 + core FIFO | |
| AC-3 | `met` | `workshop-material` + core 手动来源 | |
| AC-4 | `met` | core 与各域 reverse / release 用例 | |
| AC-5 | `met` | usage + log/line 成本字段在单测中断言 | |

## 实现要点（冻结摘要）

- **Inbound**：生效入库写入 `inventory_log` 的 `unitCost` / `costAmount`；阻止对已消耗来源层的危险回滚。
- **Inventory-core**：默认 FIFO、手动来源校验、幂等 reload、释放/恢复与归零行为统一。
- **Customer / workshop-material / project / rd-handoff**：集中结算与行级 `inventory_source_usage`；RD handoff 按分配写入 RD_SUB 的 IN 日志（多层桥接，非单条平均层）。
- **读路径**：`inventory_source_usage` + `inventory_log` 成本字段 + 消费行 `costUnitPrice` / `costAmount`。

## 总结

- **建议**：`accept`
- **Acceptance QA 判断**：`accepted`（full mode）
- **残余风险**：Phase 3 `F6` 未交付；全量单测中非本 scope 的 `audit-log` 失败需独立修复，不阻塞本 task 签收。
