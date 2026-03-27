import {
  getInboundOrder,
  listInboundOrders,
  submitInboundOrder,
  voidInboundOrder,
} from "./compat";

// 查询入库单列表
export function listIntoOrder(query) {
  return listInboundOrders(query, "intoOrder");
}

// 查询入库单详细
export function getIntoOrder(inboundId) {
  return getInboundOrder(inboundId, "intoOrder");
}

// 新增入库单
export function addIntoOrder(data) {
  return submitInboundOrder(data, "intoOrder");
}

// 修改入库单
export function updateIntoOrder(data) {
  return submitInboundOrder(data, "intoOrder");
}

// 作废入库单
export function abandonIntoOrder(data) {
  return voidInboundOrder(data, "intoOrder");
}

// 删除入库单
export function delIntoOrder(data) {
  return voidInboundOrder(data, "intoOrder");
}
