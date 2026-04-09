import {
  getSalesOrder,
  listSalesOrders,
  submitSalesOrder,
  voidSalesOrder,
} from "./compat";

export function listOrder(query) {
  return listSalesOrders(query, "order");
}

export function getOrder(orderId) {
  return getSalesOrder(orderId, "order");
}

export function addOrder(data) {
  return submitSalesOrder(data, "order");
}

export function updateOrder(data) {
  return submitSalesOrder(data, "order");
}

export function voidOrder(data) {
  return voidSalesOrder(data, "order");
}
