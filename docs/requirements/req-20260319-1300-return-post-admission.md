# 旧java项目数据库向nestjs后端数据库迁移

## Metadata

- ID: `req-20260319-1300-return-post-admission`
- Status: `confirmed`
- Lifecycle disposition: `active`（执行已收口；若不再作为活跃编排锚点，可改为 `retained-completed` 并迁入 `archive/retained-completed/`，同步更新关联 task 内需求路径）
- Owner: `user`
- Related tasks: `docs/tasks/archive/retained-completed/task-20260319-1100-migration-return-family-shared-post-admission.md`

## 用户需求

- 继续推进退货家族在正式准入之后的共享迁移。
- 退货单和退料单可以没有上游关系。
- 允许存在历史负库存；由于操作员常按纸质单补录系统，系统录入顺序可能与实际业务操作顺序不一致，不能仅因回放后出现负库存就判定迁移失败。

## 当前进展

- 阶段进度: 退货家族准入后共享迁移及其 readiness-policy 跟进修复已完成，并已通过复审。
- 当前状态: 历史负库存已按确认需求改为非阻断告警；仅 `accepted-historical-negative-balance` 会被允许继续 cutover，其它 warning 仍会触发人工复核并使 `cutoverReady = false`。
- 阻塞项: None
- 下一步: 按当前已签收口径继续后续编排；若后续 validate 出现非负库存类 warning，继续按人工复核和非 cutover-ready 处理。

## 待确认

- None
