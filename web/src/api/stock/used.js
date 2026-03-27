import { listInventorySourceUsages, unsupportedStockAction } from "./compat";

// 查询库存使用情况列表
export function listUsed(query) {
  return listInventorySourceUsages(query);
}

// 查询库存使用情况详细信息
export async function getUsed(usedId) {
  const response = await listInventorySourceUsages({
    pageNum: 1,
    pageSize: 100,
  });
  return {
    data: response.rows.find((item) => item.usedId === usedId) ?? null,
  };
}

// 新增库存使用情况
export function addUsed() {
  return unsupportedStockAction("当前 NestJS 后端未提供库存使用情况新增接口");
}

// 修改库存使用情况
export function updateUsed() {
  return unsupportedStockAction("当前 NestJS 后端未提供库存使用情况修改接口");
}

// 删除库存使用情况
export function delUsed() {
  return unsupportedStockAction("当前 NestJS 后端未提供库存使用情况删除接口");
}

// 根据物料ID和数量查询库存使用情况
export async function getUsedByMaterialIdAndQuantity(materialId, quantity) {
  const response = await listInventorySourceUsages({
    materialId,
    pageNum: 1,
    pageSize: 100,
  });
  const targetQty = Number(quantity || 0);
  const selected = [];
  let accumulated = 0;

  for (const item of response.rows) {
    if (accumulated >= targetQty) {
      break;
    }

    const remaining = targetQty - accumulated;
    const useQty = Math.min(Number(item.allocatedQty || 0), remaining);
    if (useQty <= 0) {
      continue;
    }

    selected.push({
      ...item,
      useQty,
    });
    accumulated += useQty;
  }

  return {
    data: selected,
  };
}
