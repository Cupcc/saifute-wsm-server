import {
  getCustomerOrder,
  listCustomerOrders,
  submitCustomerOrder,
  voidCustomerOrder,
} from "./compat";

export function listOrder(query) {
  return listCustomerOrders(query, "order");
}

export function getOrder(orderId) {
  return getCustomerOrder(orderId, "order");
}

export function addOrder(data) {
  return submitCustomerOrder(data, "order");
}

export function updateOrder(data) {
  return submitCustomerOrder(data, "order");
}

export function voidOrder(data) {
  return voidCustomerOrder(data, "order");
}
