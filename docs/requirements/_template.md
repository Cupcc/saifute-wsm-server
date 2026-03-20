# [需求标题]

## Metadata

- ID:
- Status: `draft` | `confirmed` | `needs-confirmation`
- Lifecycle disposition: `active` | `retained-completed` | `cleanup-candidate`（非 `active` 时文件应在 `docs/requirements/archive/<bucket>/`）
- Owner:
- Related tasks:（列出 `docs/tasks/**/*.md`，归档需求或归档 task 时同步更新路径）

## 用户需求

- 用简洁中文描述用户需求。

## 当前进展

- 阶段进度:
- 当前状态:
- 阻塞项:
- 下一步:

## 待确认

- 记录 AI 的疑问、需要用户确认的问题、以及需要用户做决定的事项
- 如果没有待确定项，写 `None`

`当前进展` 面向用户保持简洁，只写关键阶段状态，不展开详细执行日志。  
`待确认` 用于承载尚未定稿的需求边界与决策点；一旦用户已明确答复，应及时并回 `用户需求` 或 `当前进展`。  
如果这是新建或刚修改且准备发给用户确认的需求文档，默认将 `Status` 设为 `needs-confirmation`；只有用户明确同意后，才能改为 `confirmed` 并进入规划或编码。  
如果只是同步 `当前进展`，且没有改写用户需求理解，可继续保持 `confirmed`。  
新建需求默认 `Lifecycle disposition` 为 `active`；闭环归档时改为 `retained-completed` 或 `cleanup-candidate` 并移动文件到 `docs/requirements/archive/<bucket>/`，同时更新关联 task 与 `REQUIREMENT_CENTER.md`。
