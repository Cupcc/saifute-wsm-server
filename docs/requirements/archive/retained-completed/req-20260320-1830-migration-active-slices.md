# 数据迁移：Java 源库 → NestJS 目标库（活跃切片）

## Metadata

- ID: `req-20260320-1830-migration-active-slices`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260317-1416-migration-outbound-base.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1045-migration-workshop-return-formal-admission.md`
  - `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`（准入后共享阶段已收口，验收口径见下节）

## 用户需求

- 继续推进旧 Java 业务库向 NestJS 目标库的迁移。
- 本需求覆盖的执行面包括：`outbound` 基础切片、销售退货「正式准入」切片、车间退料「正式准入」切片；验收口径与范围以各自 task 文档为准，现均已收口。

## 退货家族：准入后共享迁移（已收口，口径仍有效）

以下为用户已确认的验收口径，适用于退货族相关迁移与校验；执行工作已由 `task-20260319-1100` 收口并完成复审，若后续 validate / cutover 仍涉及同族逻辑，继续按此理解执行。

- 退货单和退料单可以没有上游关系。
- 允许存在历史负库存；由于操作员常按纸质单补录系统，系统录入顺序可能与实际业务操作顺序不一致，不能仅因回放后出现负库存就判定迁移失败。

## 当前进展

- 阶段进度: `outbound-base`、销售退货 formal admission、车间退料 formal admission，以及退货家族 shared post-admission 均已完成并收口。
- 当前状态: `batch2c-outbound-base` 已在当前基线上完成复审收口；fresh `dry-run` 仍保持 `108/4` 头单与 `137/4` 行的既有分区，当前 `execute` 非零是后续切片落地后的预期 rerun guard，当前 `validate` 非零是沿用旧 immediate-post-batch2c 校验口径导致的陈旧结果，不构成该 slice 未完成。历史负库存继续按已确认口径视为非阻断告警，仅 `accepted-historical-negative-balance` 可继续 cutover，其它 warning 仍需人工复核并保持 `cutoverReady = false`。
- 阻塞项: None
- 下一步: 将本需求迁入 `docs/requirements/archive/retained-completed/`，并同步更新各归档 task 的 `Related requirement` 全路径与两个 center 看板；若后续 validate 出现非负库存类 warning，继续按人工复核和非 cutover-ready 处理。

## 待确认

- None
