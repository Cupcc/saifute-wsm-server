# stockScope 非空历史数据 rehearsal

## Metadata

- ID: `req-20260330-2235-stock-scope-nonempty-rehearsal`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Topic requirement:
  - `docs/requirements/topics/rd-subwarehouse.md`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260330-2235-stock-scope-nonempty-rehearsal.md`

## 用户需求

- [x] 在代码、schema 和空目标库路径都已通过后，继续验证 `stockScope` 对齐在“非空历史数据”场景下也能成立。
- [x] 采用目标库上的最小代表性 rehearsal 数据，而不是停在纯空库验证。
- [x] 若 rehearsal 通过，才视为当前轮需求真正完成。

## 当前进展

- 阶段进度: 非空历史数据 rehearsal 已完成：目标库已灌入最小代表性数据，并重新跑通 `stock-scope-phase2` 的 `dry-run / execute / validate`。
- 当前状态: 非空样本下的 `stockScope` 回填、执行与校验均通过；当前不再只依赖空库路径结论。
- 阻塞项: None
- 下一步: 归档；若后续需要更大规模或真实业务快照级 rehearsal，再另开新 scope。

## 待确认

- None
