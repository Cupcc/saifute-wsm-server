import {
  getSalesOrder,
  listSalesOrders,
  submitSalesOrder,
  voidSalesOrder,
} from "./compat";

export function listSalesReturnOrder(query) {
  return listSalesOrders(query, "salesReturn");
}

export function getSalesReturnOrder(orderId) {
  return getSalesOrder(orderId, "salesReturn");
}

export function addSalesReturnOrder(data) {
  return submitSalesOrder(data, "salesReturn");
}

export function updateSalesReturnOrder() {
  return Promise.reject(new Error("当前销售退货单暂不支持修改"));
}

export function voidSalesReturnOrder(data) {
  return voidSalesOrder(data, "salesReturn");
}
