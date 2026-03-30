# Execution Slice Outline

> 仅为后续执行切片草案，不等于当前已批准实施。

## Slice 1. Schema expand foundation

- 目标:
  - 引入 `StockScope` 主档 / canonical seed
  - 在首波目标表补 `stockScopeId`
  - 补索引 / 外键 / unique-key
- 不做:
  - 不切生产读写真源
  - 不删除旧 `workshopId`

## Slice 2. Backfill / replay tooling

- 目标:
  - 产出 `workshop -> stockScope` 映射矩阵
  - 产出 `inventory_balance` 重建脚本
  - 产出日志 / 来源 / 编号区间回填与校验脚本
- 不做:
  - 不在本 slice 内完成正式 cutover

## Slice 3. Shadow validation / rehearsal

- 目标:
  - 在 DB clone 或 rehearsal 环境跑对账
  - 收敛 e2e / stub / fixture
  - 固化 cutover gate 与 rollback gate
- 不做:
  - 不在真实环境切换

## Slice 4. Maintenance-window flip

- 目标:
  - 冻结写流量
  - 执行最终 delta backfill / replay
  - 切换 read/write truth 到 `stockScopeId`
  - 跑 cutover gate
- 失败处理:
  - 直接进入快照恢复 + 版本回退

## Slice 5. Post-cutover cleanup

- 目标:
  - 删除已无业务意义的 workshop-shaped 库存兼容列 / 查询 / alias
  - 收口遗留测试与文档
- 前提:
  - 主切换稳定运行一段观察期后再做
