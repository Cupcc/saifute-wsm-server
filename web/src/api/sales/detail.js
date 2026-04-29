import {
  getSalesOrderDetail,
  listSalesOrderDetails,
  unsupportedSalesAction,
} from "./compat";

export function listDetail(query) {
  return listSalesOrderDetails(query, "order");
}

export async function listNoPage(query) {
  const response = await listSalesOrderDetails(query, "order");
  return {
    data: response.rows,
    total: response.total,
  };
}

export function getDetail(detailId) {
  return getSalesOrderDetail(detailId, "order");
}

export function addDetail() {
  return unsupportedSalesAction("请通过出库单主页面维护明细");
}

export function updateDetail() {
  return unsupportedSalesAction("请通过出库单主页面维护明细");
}

export function delDetail() {
  return unsupportedSalesAction("请通过出库单主页面维护明细");
}
