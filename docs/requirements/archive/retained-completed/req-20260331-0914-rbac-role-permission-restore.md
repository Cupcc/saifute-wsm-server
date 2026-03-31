# RBAC 角色权限恢复

## Metadata

- ID: `req-20260331-0914-rbac-role-permission-restore`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Topic requirement:
  - `docs/requirements/topics/system-management-module.md`
  - `docs/requirements/topics/rd-subwarehouse.md`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260331-0914-rbac-role-permission-restore.md`

## 用户需求

- [x] 按已确认的 `V1` 角色矩阵恢复当前用户权限，避免 `仓库管理员` 被误收窄到只剩研发协同相关入口。
- [x] 保持 `研发小仓管理员` 的 `rd-subwarehouse` 专属视角与固定小仓范围不被破坏。
- [x] 让恢复后的权限真正驱动前端界面可见性与受支持操作按钮，而不是只修一处后端样例判断。

## 当前进展

- 阶段进度: 已完成权限恢复与验证：业务权限已按角色预设重新收口，受影响的前端按钮权限兼容也已同步补齐。
- 当前状态: `warehouse-manager` 现已重新获得主仓业务组与必要 RD 协同入口；`rd-operator` 仍保持 RD 专属壳层；focused RBAC tests 与 `web` 生产构建已通过。
- 阻塞项: None
- 下一步: 归档；若后续继续细化“大仓管理员在研发协同中应看到哪些 RD 详情页”，另开新切片承接。

## 待确认

- None
