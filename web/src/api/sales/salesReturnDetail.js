import {
  getSalesOrderDetail,
  listSalesOrderDetails,
  unsupportedSalesAction,
} from "./compat";

export function listSalesReturnDetail(query) {
  return listSalesOrderDetails(query, "salesReturn");
}

export async function listNoPage(query) {
  const response = await listSalesOrderDetails(query, "salesReturn");
  return {
    data: response.rows,
    total: response.total,
  };
}

export function getSalesReturnDetail(detailId) {
  return getSalesOrderDetail(detailId, "salesReturn");
}

export function addSalesReturnDetail() {
  return unsupportedSalesAction("请通过销售退货单主页面维护明细");
}

export function updateSalesReturnDetail() {
  return unsupportedSalesAction("请通过销售退货单主页面维护明细");
}

export function delSalesReturnDetail() {
  return unsupportedSalesAction("请通过销售退货单主页面维护明细");
}
