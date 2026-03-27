import {
  getWorkshopOrder,
  listWorkshopOrders,
  unsupportedWorkshopOrderAction,
} from "./compat";

// 查询退料单列表
export function listReturnOrder(query) {
  return listWorkshopOrders(query, "returnOrder");
}

// 查询退料单详细
export function getReturnOrder(returnId) {
  return getWorkshopOrder(returnId, "returnOrder");
}

// 新增退料单
export function addReturnOrder() {
  return unsupportedWorkshopOrderAction("当前退料单写操作仍在适配中");
}

// 修改退料单
export function updateReturnOrder() {
  return unsupportedWorkshopOrderAction("当前退料单修改仍在适配中");
}

// 删除退料单（作废）
export function delReturnOrder() {
  return unsupportedWorkshopOrderAction("当前退料单作废仍在适配中");
}
