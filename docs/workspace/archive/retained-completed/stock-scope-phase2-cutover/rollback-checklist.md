# Rollback Checklist

## 目标

明确 `Option A` 下的回滚前提、触发条件与最小执行动作，避免维护窗里临时争论“现在该回退还是继续补救”。

## 1. Cutover 前必须具备

- [ ] 可用的整库快照
- [ ] 已验证的恢复命令
- [ ] 可回退的应用版本制品
- [ ] 最小 smoke 清单
- [ ] 维护窗联系人与执行 owner

## 2. 触发回滚的推荐条件

- [ ] schema migration 无法完整落地
- [ ] `inventory_balance` 重建结果出现无法快速解释的重复或大面积缺失
- [ ] `inventory_log.reversalOfLogId` / `idempotencyKey` 完整性被破坏
- [ ] `inventory_source_usage` 与 source log / consumer line 关系出现系统性断裂
- [ ] 首波 runtime smoke 有 blocker，且无法在维护窗内稳定修复
- [ ] reconciliation 报告显示主仓口径或来源层成本链出现不可接受偏差

## 3. 推荐回滚顺序

1. 停止继续前推 cutover 步骤
2. 锁定维护窗内新增操作记录
3. 回退应用版本
4. 执行整库快照恢复
5. 跑最小 smoke：
   - 认证
   - `inventory-core` 查询
   - reporting 首页/导出
   - 首波单据最小读写链路
6. 输出失败与回滚报告

## 4. 不建议的做法

- 不要在维护窗里现场手写大量补丁 SQL 作为主回滚路径
- 不要在 cutover 已部分失败时继续扩散到更多表/模块
- 不要把“还能勉强前进”误判成“比回滚更便宜”

## 5. 待补到可执行级别

- 每一步的实际命令
- 快照恢复预计耗时
- 回滚后必须通过的 smoke 脚本
- 失败报告模板
