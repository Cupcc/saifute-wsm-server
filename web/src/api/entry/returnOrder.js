import {
  getSupplierReturnOrder,
  listSupplierReturnOrders,
  voidSupplierReturnOrder,
} from "./compat";

// 查询退货单列表
export function listReturnOrder(query) {
  return listSupplierReturnOrders(query);
}

// 查询退货单详细
export function getReturnOrder(id) {
  return getSupplierReturnOrder(id);
}

// 作废退货单
export function abandonReturnOrder(id, voidReason) {
  return voidSupplierReturnOrder(id, voidReason);
}
