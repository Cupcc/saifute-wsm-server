# Agent 编排完成态与归档协议修正

## Metadata

- ID: `req-20260325-1730-agent-orchestration-completion-state`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260325-1740-agent-orchestration-completion-state.md`

## 用户需求

- [x] 修正当前 AI 编排架构中“已完成工作仍被继续表述为待确认 / 待 cutover / 待签收”的问题。
- [x] 建立完成态的单一真源，避免 requirement / workspace / task / report 之间状态漂移。
- [x] 去掉或重构会制造假 blocker 的人工确认门，尤其是 `PROJECT_INVENTORY_REPLAY_CONFIRMED` 这类环境变量确认门。
- [x] 明确活跃与归档协议，避免 Dashboard 已归档但 requirement / task 仍停留在活跃区。
- [x] 增加结束前一致性约束，避免后续再次浪费对话机会在状态纠偏上。

## 当前进展

- 阶段进度: 已完成编排完成态、归档协议与 `project` validate 假确认门修复，并完成归档收口。
- 当前状态: `.cursor/rules/**`、`.cursor/skills/**`、`docs/requirements/**`、`docs/tasks/**`、`docs/workspace/**` 与 `scripts/migration/project/**` 已同步到同一完成态口径；旧 migration requirement/task/workspace 已迁入 `archive/retained-completed/`，`project` validate 现基于下游证据判断库存重放完成。
- 阻塞项: None
- 下一步: None。如后续需要新增编排协议修复，应新开 requirement / task。

## 待确认

- None
