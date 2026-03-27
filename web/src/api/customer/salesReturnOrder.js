import {
  getCustomerOrder,
  listCustomerOrders,
  submitCustomerOrder,
  voidCustomerOrder,
} from "./compat";

export function listSalesReturnOrder(query) {
  return listCustomerOrders(query, "salesReturn");
}

export function getSalesReturnOrder(orderId) {
  return getCustomerOrder(orderId, "salesReturn");
}

export function addSalesReturnOrder(data) {
  return submitCustomerOrder(data, "salesReturn");
}

export function updateSalesReturnOrder() {
  return Promise.reject(new Error("当前销售退货单暂不支持修改"));
}

export function voidSalesReturnOrder(data) {
  return voidCustomerOrder(data, "salesReturn");
}
