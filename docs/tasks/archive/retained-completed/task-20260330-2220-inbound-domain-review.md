# 入库模块完成度审查

## Metadata

- Scope: 审查 `inbound` 模块是否已按当前需求与架构真源完成，重点识别 bug、风险、行为回归、遗漏测试和需求未对齐点；本 task 不直接修复代码。
- Related requirement: `docs/requirements/archive/retained-completed/req-20260330-2220-inbound-domain-review.md`
- Status: `completed`
- Review status: `reviewed-with-findings`
- Lifecycle disposition: `retained-completed`
- Planner: `parent`
- Coder: `None`
- Reviewer: `parent`
- Last updated: `2026-03-30`
- Related checklist: `None`

## Review Scope

- `docs/architecture/modules/inbound.md`
- `docs/architecture/20-wms-database-tables-and-schema.md`
- `src/modules/inbound/**`
- 相关依赖面：`inventory-core`、`workflow`、`rd-subwarehouse` 交互点、`master-data`

## Goal

- 输出按严重度排序的 review findings
- 明确当前 `inbound` 是否可视为“已按需求完成”
- 若存在缺口，为后续修复切片提供依据

## Review Findings

### 1. 🔴 [blocking] 未关联 RD 采购需求的普通入库/生产入库，仍可带入非主仓 `workshopId`

- 现状：
  - `createOrder()` 一开始只读取 `dto.workshopId`，但无论普通验收单还是生产入库单，后续都固定把库存写到 `stockScope = MAIN`
  - `resolveRdProcurementLink()` 只有在存在 `rdProcurementRequestId` 时才校验“必须先入主仓”；如果没有关联 RD 采购需求，会提前返回，不做主仓约束
- 结果：
  - 单据头可能记录为 RD/其他 workshop
  - 实际库存却入主仓
  - 单据归属、权限判断和真实库存副作用会出现分裂
- 代码证据：

```97:115:src/modules/inbound/application/inbound.service.ts
const workshop = await this.masterDataService.getWorkshopById(
  dto.workshopId,
);
const rdProcurementLink = await this.resolveRdProcurementLink(
  dto.orderType,
  workshop,
  dto.rdProcurementRequestId,
  dto.supplierId,
);
// ...
const stockScopeRecord =
  await this.masterDataService.getStockScopeByCode("MAIN");
```

```773:786:src/modules/inbound/application/inbound.service.ts
if (!rdProcurementRequestId) {
  return {
    request: null,
    supplierId,
    lineMap: null,
  };
}

if (orderType !== StockInOrderType.ACCEPTANCE) {
  throw new BadRequestException("只有验收单可以关联 RD 采购需求");
}
if (workshop.workshopCode !== MAIN_WAREHOUSE_CODE) {
  throw new BadRequestException("关联 RD 采购需求的验收单必须先入主仓");
}
```

### 2. 🟡 [important] `inbound` 的查询和详情/修改/作废访问控制仍按 `workshopId`，不是按真实库存轴判断

- 现状：
  - controller 仍用 `WorkshopScopeService.resolveQueryWorkshopId()`、`assertWorkshopAccess()`、`applyFixedWorkshopScope()` 约束 `workshopId`
  - 这和当前 `stock_in_order.stockScopeId` 已成为真实库存持久化轴的事实不一致
- 风险：
  - 一旦单据头 `workshopId` 与真实库存轴分离，查询结果和权限判断会沿旧轴漂移
  - 这在 finding 1 的场景下会被直接放大
- 代码证据：

```34:41:src/modules/inbound/controllers/inbound.controller.ts
const workshopId = await this.workshopScopeService.resolveQueryWorkshopId(
  user,
  query.workshopId,
);
return this.inboundService.listOrders({
  ...query,
  workshopId,
});
```

```50:55:src/modules/inbound/controllers/inbound.controller.ts
const order = await this.inboundService.getOrderById(id);
await this.workshopScopeService.assertWorkshopAccess(
  user,
  order.workshopId,
);
return order;
```

### 3. 🟡 [important] 缺少“普通入库/生产入库必须归主仓”与“权限沿真实库存轴判断”的测试

- 当前测试已覆盖：
  - 关联 RD 采购需求的验收单必须入主仓
  - 累计验收量保护
  - 明细重算/作废路径
- 但没有覆盖：
  - 未关联 RD 采购需求的普通验收单、生产入库单传入非主仓 `workshopId` 时应被拒绝
  - 当单据头兼容 `workshopId` 与真实库存轴分离时，查询/详情/修改/作废应该如何受限

## Current Notes

- 当前是 review-only，不直接改业务代码。
- 若后续要修复 findings，再另开实现切片。

## Final Status

- Outcome: `completed - reviewed with findings`
- Next action: `None`
