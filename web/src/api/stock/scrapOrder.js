import {
  getWorkshopOrder,
  listWorkshopOrders,
  unsupportedWorkshopOrderAction,
} from "@/api/take/compat";

// 查询报废单列表
export function listScrapOrder(query) {
  return listWorkshopOrders(query, "scrapOrder");
}

// 查询报废单详细
export function getScrapOrder(scrapId) {
  return getWorkshopOrder(scrapId, "scrapOrder");
}

// 新增报废单
export function addScrapOrder() {
  return unsupportedWorkshopOrderAction("当前报废单写操作仍在适配中");
}

// 修改报废单
export function updateScrapOrder() {
  return unsupportedWorkshopOrderAction("当前报废单修改仍在适配中");
}

// 删除报废单
export function delScrapOrder() {
  return unsupportedWorkshopOrderAction("当前报废单删除仍在适配中");
}

// 作废报废单
export function voidScrapOrder() {
  return unsupportedWorkshopOrderAction("当前报废单作废仍在适配中");
}
