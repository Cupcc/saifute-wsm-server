# 数据迁移：当前活跃切片

## Metadata

- ID: `req-20260320-1830-migration-active-slices`
- Status: `confirmed`
- Lifecycle disposition: `active`
- Owner: `user`

## 用户需求

- 继续推进旧 Java 业务库向 NestJS 目标库的迁移。
- 当前仍开放的执行面包括：`outbound` 基础切片、销售退货「正式准入」切片、车间退料「正式准入」切片；验收口径与范围以各自 task 文档为准。

## 关联 task（根目录）

- `docs/tasks/task-20260317-1416-migration-outbound-base.md`
- `docs/tasks/task-20260319-1035-migration-outbound-sales-return-formal-admission.md`
- `docs/tasks/task-20260319-1045-migration-workshop-return-formal-admission.md`

## 当前进展

- 阶段进度: 需求用于收口「根目录 task 必须绑定仍存在的 requirement」的编排约束。
- 当前状态: 上述三条迁移线仍按各自 task 处于规划/待实施阶段时，由本需求提供统一人机交互锚点。
- 阻塞项: None
- 下一步: 按各 task brief 继续编码与验证；若某条切片关闭，请同步更新本文件「用户需求/关联 task」；整份需求闭环后迁入 `docs/requirements/archive/retained-completed/` 并更新各 task 的 `Related requirement` 全路径（见 `docs/requirements/README.md`）。

## 待确认

- None
