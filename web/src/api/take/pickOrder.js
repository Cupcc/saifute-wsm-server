import {
  getWorkshopOrder,
  listWorkshopOrders,
  unsupportedWorkshopOrderAction,
} from "./compat";

// 查询领料单列表
export function listPickOrder(query) {
  return listWorkshopOrders(query, "pickOrder");
}

// 查询领料单详细
export function getPickOrder(pickId) {
  return getWorkshopOrder(pickId, "pickOrder");
}

// 新增领料单
export function addPickOrder() {
  return unsupportedWorkshopOrderAction("当前领料单写操作仍在适配中");
}

// 修改领料单
export function updatePickOrder() {
  return unsupportedWorkshopOrderAction("当前领料单修改仍在适配中");
}

// 作废领料单
export function voidPickOrder() {
  return unsupportedWorkshopOrderAction("当前领料单作废仍在适配中");
}

// 删除领料单
export function delPickOrder() {
  return unsupportedWorkshopOrderAction("当前领料单删除仍在适配中");
}
