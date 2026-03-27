import {
  getInventorySummaryItem,
  listInventoryGroupByMaterial,
  listInventorySummary,
  unsupportedStockAction,
} from "./compat";

// 查询库存列表
export function listInventory(query) {
  return listInventorySummary(query);
}

export function listDetails(query) {
  return listInventoryGroupByMaterial(query);
}

// 查询库存列表
export function selectSaifuteInventoryListGroupByMaterial(query) {
  return listInventoryGroupByMaterial(query);
}

// 查询库存详细
export function getInventory(inventoryId) {
  return getInventorySummaryItem(inventoryId);
}

// 新增库存
export function addInventory() {
  return unsupportedStockAction("当前 NestJS 后端未提供库存手工新增接口");
}

// 修改库存
export function updateInventory() {
  return unsupportedStockAction("当前 NestJS 后端未提供库存手工修改接口");
}

// 删除库存
export function delInventory() {
  return unsupportedStockAction("当前 NestJS 后端未提供库存删除接口");
}
