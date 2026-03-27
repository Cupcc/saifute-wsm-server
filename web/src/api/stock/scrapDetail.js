import {
  getWorkshopOrderDetail,
  listWorkshopOrderDetails,
  unsupportedWorkshopOrderAction,
} from "@/api/take/compat";

// 查询报废单明细列表
export function listScrapDetail(query) {
  return listWorkshopOrderDetails(query, "scrapOrder");
}

// 查询报废单明细详细
export function getScrapDetail(detailId) {
  return getWorkshopOrderDetail(detailId, "scrapOrder");
}

// 新增报废单明细
export function addScrapDetail() {
  return unsupportedWorkshopOrderAction("请通过报废单主页面维护明细");
}

// 修改报废单明细
export function updateScrapDetail() {
  return unsupportedWorkshopOrderAction("请通过报废单主页面维护明细");
}

// 删除报废单明细
export function delScrapDetail() {
  return unsupportedWorkshopOrderAction("请通过报废单主页面维护明细");
}
