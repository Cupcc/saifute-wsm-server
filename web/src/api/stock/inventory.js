import {
  getInventorySummaryItem,
  listInventoryGroupByMaterial,
  listInventorySummary,
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
