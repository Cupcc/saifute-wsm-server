import {
  getWorkshopOrderDetail,
  listWorkshopOrderDetails,
  unsupportedWorkshopOrderAction,
} from "./compat";

// 查询领料单明细列表
export function listPickDetail(query) {
  return listWorkshopOrderDetails(query, "pickOrder");
}

// 查询领料单明细列表
export async function listNoPage(query) {
  const response = await listWorkshopOrderDetails(query, "pickOrder");
  return {
    data: response.rows,
    total: response.total,
  };
}

// 查询领料单明细详细
export function getPickDetail(detailId) {
  return getWorkshopOrderDetail(detailId, "pickOrder");
}

// 新增领料单明细
export function addPickDetail() {
  return unsupportedWorkshopOrderAction("请通过领料单主页面维护明细");
}

// 修改领料单明细
export function updatePickDetail() {
  return unsupportedWorkshopOrderAction("请通过领料单主页面维护明细");
}

// 删除领料单明细
export function delPickDetail() {
  return unsupportedWorkshopOrderAction("请通过领料单主页面维护明细");
}
