# 入库（inbound）验收规格

## 元数据


| 字段   | 值                                                     |
| ---- | ----------------------------------------------------- |
| 模块   | inbound（含 `inventory-core` 共享写路径与四类下游消耗链）             |
| 需求源  | `docs/requirements/domain/inbound-business-module.md` |
| 最近更新 | 2026-04-04                                            |


## 能力覆盖


| 能力     | 说明                  | 状态                         |
| ------ | ------------------- | -------------------------- |
| F1     | 统一入库家族模型            | `已验收`（Phase 1）             |
| F2     | 主仓准入与库存范围约束         | `已验收`（Phase 1）             |
| F3     | 真实库存轴访问控制           | `已验收`（Phase 1）             |
| **F4** | **入库来源层与成本追溯**      | **已验收**（Phase 2，见本文件 F4 节） |
| **F5** | **默认 FIFO 与手动来源指定** | **已验收**（Phase 2，见本文件 F5 节） |
| F6     | 入库到车间双向快捷协同         | `未开始`（Phase 3）             |
| F7     | 后续扩展切片              | `未开始`（Phase 3）             |


## Phase 2（F4 / F5）总体验收摘要

- **关联任务**：`docs/tasks/archive/retained-completed/task-20260404-1315-inbound-phase2-fifo-costing.md`
- **验收模式**：`full`
- **结论**：`accepted`
- **理由摘要**：
  - **持久化与合同**：`prisma validate` / `prisma generate` 在注入 `.env.dev` 下通过；入库与消耗侧成本字段与 `inventory_source_usage` 合同与实现一致。
  - **写路径**：`inbound` 将来源成本以不可变快照写入 `inventory_log`（`unitCost`、`costAmount`）；已消耗来源层禁止被逆向静默破坏（与释放/回放语义一致）。
  - **规则收口**：`inventory-core` 集中默认 FIFO、手动来源校验、幂等重载、释放/恢复与恢复至零行为。
  - **下游四类链路**：`customer`、`workshop-material`、`project`、`rd-subwarehouse`（RD handoff）统一走集中结算与行级来源使用；RD handoff 按分配写入 RD_SUB 的 IN 流水，保留桥接层而非单条合成平均来源层。
  - **读路径证据**：可追溯关系由持久化的 `inventory_source_usage`、`inventory_log.unitCost` / `costAmount` 与消费行 `costUnitPrice` / `costAmount` 共同支撑；与 focused 单测断言一致。
  - **回归**：Phase 2 约定范围内的 6 个 service 单测套件、91 条用例通过（见本文件验证摘要与 `docs/acceptance-tests/runs/` 冻结 run）。
  - **非本任务归因**：全仓库 `pnpm test --no-coverage` 曾报告 `audit-log` 下无关套件失败（`auth-audit.listener.spec.ts`），**不归因于** inbound Phase 2；本 scope 以 focused 回归 + Prisma 门禁为准。

### 验证摘要（Phase 2）


| 时间         | 关联 task                                          | 环境                                                                                                            | 结果                    |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------- |
| 2026-04-04 | `task-20260404-1315-inbound-phase2-fifo-costing` | `.env.dev`；`pnpm prisma validate` / `pnpm prisma generate`；focused Phase 2 service specs（6 suites / 91 tests） | `passed` / `accepted` |


### 证据索引（Phase 2）


| 执行面           | 证据文件 / 命令                                                                     | 结果                                |
| ------------- | ----------------------------------------------------------------------------- | --------------------------------- |
| prisma        | `set -a && source .env.dev && set +a && pnpm prisma validate`                 | pass                              |
| prisma        | `set -a && source .env.dev && set +a && pnpm prisma generate`                 | pass                              |
| unit          | `src/modules/inventory-core/application/inventory.service.spec.ts`            | pass                              |
| unit          | `src/modules/inbound/application/inbound.service.spec.ts`                     | pass                              |
| unit          | `src/modules/customer/application/customer.service.spec.ts`                   | pass                              |
| unit          | `src/modules/workshop-material/application/workshop-material.service.spec.ts` | pass                              |
| unit          | `src/modules/project/application/project.service.spec.ts`                     | pass                              |
| unit          | `src/modules/rd-subwarehouse/application/rd-handoff.service.spec.ts`          | pass                              |
| repo-wide（参考） | `pnpm test --no-coverage`（全量）                                                 | 存在与本 scope 无关的失败套件；见 Phase 2 总览说明 |


### 任务级 AC 矩阵（`task-20260404-1315`）


| AC   | 描述                                           | 结论    | 执行面           | 关键证据                                                 |
| ---- | -------------------------------------------- | ----- | ------------- | ---------------------------------------------------- |
| AC-1 | 入库来源成本快照稳定落库；已消费来源不因改单静默漂移                   | `met` | unit + schema | `inventory_log` 成本字段；`inbound` / `inventory-core` 单测 |
| AC-2 | 四类下游默认 FIFO，`inventory_source_usage` 与成本汇总落库 | `met` | unit          | 四类 `*.service.spec.ts` + `inventory.service.spec.ts` |
| AC-3 | 手动来源优先、留痕完整，`workshop-material` 无回归          | `met` | unit          | `workshop-material` + `inventory-core` 单测            |
| AC-4 | 逆向流程释放/回放原来源，不重跑新 FIFO                       | `met` | unit          | `inventory-core`、各域 reverse / release 相关用例           |
| AC-5 | 读路径可追溯：消费行 → 来源层 / 流水                        | `met` | unit（持久化断言）   | `inventory_source_usage` + log / line 成本字段在测试中断言     |


### 残余风险

- Phase 3 `F6`（入库页与车间页一键协同）未在本轮验收范围内。
- 历史起算时间前缺少来源分配的旧数据，仍适用 domain 合同：不承诺全自动补齐完全可信 FIFO（与 `inbound-business-module` 已确认补充口径一致）。

---

## F4 入库来源层与成本追溯

### 与 domain 合同 TC 对照


| TC   | 描述                         | 结论    | 备注                                  |
| ---- | -------------------------- | ----- | ----------------------------------- |
| TC-1 | 入库价格为后续消耗来源成本真源，不退化为主档静态单价 | `met` | 快照在 `inventory_log` / 行级成本          |
| TC-2 | 消费行 → 来源入库层 / 来源流水可追溯      | `met` | `inventory_source_usage` + log 成本字段 |
| TC-3 | 改单、作废、逆操作不破坏既有追溯语义         | `met` | 释放/阻断 consumed 层等由单测与实现覆盖           |


### 验收矩阵（F4）


| AC    | 描述                     | 结论    | 执行面  | 关键证据                                 | 备注                        |
| ----- | ---------------------- | ----- | ---- | ------------------------------------ | ------------------------- |
| F4-A1 | 入库侧写入不可变来源成本快照         | `met` | unit | `inbound` + `inventory` 单测；schema 字段 | 对应 task `[AC-1]`          |
| F4-A2 | 下游成本结转依赖快照与来源分配，非可变主档价 | `met` | unit | 消费域单测中断言成本与 usage                    | 对应 task `[AC-2]` `[AC-5]` |


### 验证摘要


| 时间         | 关联 task              | 环境           | 结果       |
| ---------- | -------------------- | ------------ | -------- |
| 2026-04-04 | `task-20260404-1315` | 同 Phase 2 总览 | `passed` |


---

## F5 默认 FIFO 与手动来源指定

### 与 domain 合同 TC 对照


| TC   | 描述                                                            | 结论    | 备注                          |
| ---- | ------------------------------------------------------------- | ----- | --------------------------- |
| TC-1 | 覆盖 customer、workshop-material、project、rd-subwarehouse；RD 承担桥接 | `met` | handoff 按分配建层               |
| TC-2 | 未指定来源时 FIFO；先入后出前提                                            | `met` | `inventory-core` 默认路径       |
| TC-3 | 手动指定后扣减/成本/逆操作以指定为准                                           | `met` | 与 workshop 手工来源一致           |
| TC-4 | FIFO 与手动均保留来源分配记录                                             | `met` | `inventory_source_usage`    |
| TC-5 | 不允许负库存；补录不重排已生效事实                                             | `met` | 由 core 约束与既有前提覆盖            |
| TC-6 | 起算时间前旧数据不作完全可信 FIFO 承诺                                        | `met` | 与 domain「已确认补充口径」一致；非本轮实现缺口 |


### 验收矩阵（F5）


| AC    | 描述                            | 结论    | 执行面  | 关键证据                         | 备注  |
| ----- | ----------------------------- | ----- | ---- | ---------------------------- | --- |
| F5-A1 | 默认 FIFO 在 `inventory-core` 收口 | `met` | unit | `inventory.service.spec.ts`  |     |
| F5-A2 | 手动 `sourceLogId`（及等价）校验与留痕    | `met` | unit | `workshop-material` + core   |     |
| F5-A3 | 幂等 reload、释放/恢复语义             | `met` | unit | `inventory.service.spec.ts`  |     |
| F5-A4 | RD handoff 桥接：按分配多层 IN，非单条合成  | `met` | unit | `rd-handoff.service.spec.ts` |     |


### 验证摘要


| 时间         | 关联 task              | 环境           | 结果       |
| ---------- | -------------------- | ------------ | -------- |
| 2026-04-04 | `task-20260404-1315` | 同 Phase 2 总览 | `passed` |


