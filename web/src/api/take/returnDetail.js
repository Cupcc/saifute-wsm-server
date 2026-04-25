import {
  getWorkshopOrderDetail,
  listWorkshopOrderDetails,
  unsupportedWorkshopOrderAction,
} from "./compat";

// 查询退料单明细列表
export function listReturnDetail(query) {
  return listWorkshopOrderDetails(query, "returnOrder");
}
// 查询退料单明细列表
export async function listNoPage(query) {
  const response = await listWorkshopOrderDetails(query, "returnOrder");
  return {
    data: response.rows,
    total: response.total,
  };
}

// 查询退料单明细详细
export function getReturnDetail(detailId) {
  return getWorkshopOrderDetail(detailId, "returnOrder");
}

// 新增退料单明细
export function addReturnDetail() {
  return unsupportedWorkshopOrderAction("请通过退料单主页面维护明细");
}

// 修改退料单明细
export function updateReturnDetail() {
  return unsupportedWorkshopOrderAction("请通过退料单主页面维护明细");
}

// 删除退料单明细
export function delReturnDetail() {
  return unsupportedWorkshopOrderAction("请通过退料单主页面维护明细");
}
