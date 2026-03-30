# Runbook Outline

> 当前是 planning 版 outline，不是最终执行脚本。

## 0. Window 前准备

- 冻结本次纳入范围与执行 slice owner
- 确认 DB 快照、恢复命令与预计耗时
- 确认 cutover 前必须为绿的测试与对账报告
- 确认维护窗公告、停写入口与只读降级方式

## 1. Schema Expand

- 应用 `StockScope` 主档 migration
- 应用首波表 `stockScopeId` expand migration
- 生成并校验 Prisma client
- 跑 schema smoke

## 2. Backfill / Replay

- 导入 `workshop -> stockScope` 映射
- 重建 `inventory_balance`
- 回填 `inventory_log`
- 回填并校验 `inventory_source_usage`
- 回填并校验 `factory_number_reservation`
- 产出第一轮 reconciliation 报告

## 3. Shadow Validation

- 跑 reporting 汇总/导出核对
- 跑单据 smoke：`inbound` / `customer` / `workshop-material` / `project`
- 跑 reverse / void smoke
- 跑 focused tests + e2e / stub

## 4. Maintenance Window Flip

- 冻结库存写入
- 执行最终 delta backfill / replay
- 切换 read/write truth 到 `stockScopeId`
- 跑 cutover gate：
  - schema gate
  - reconciliation gate
  - runtime smoke gate
  - test gate

## 5. Failure Branch

- 任一关键 gate 失败：
  - 停止继续前推
  - 启动快照恢复
  - 回退应用版本
  - 输出失败报告与 divergence 说明

## 6. Success Branch

- 记录 cutover 成功报告
- 标记旧 `workshopId` 库存轴为兼容/待清理
- 单开 post-cutover cleanup slice
