import request from "@/utils/request";

// 查询入库单列表
export function listOrder(query) {
  return request({
    url: "/entry/order/list",
    method: "get",
    params: query,
  });
}

// 查询入库单详细
export function getOrder(inboundId) {
  return request({
    url: "/entry/order/" + inboundId,
    method: "get",
  });
}

// 新增入库单
export function addOrder(data) {
  return request({
    url: "/entry/order",
    method: "post",
    data: data,
  });
}

// 修改入库单
export function updateOrder(data) {
  return request({
    url: "/entry/order",
    method: "put",
    data: data,
  });
}

// 作废入库单
export function abandonOrder(data) {
  return request({
    url: "/entry/order/abandoned",
    method: "post",
    data: data,
  });
}

// 删除入库单
export function delOrder(inboundId) {
  return request({
    url: "/entry/order/" + inboundId,
    method: "delete",
  });
}

// 审核单据
export function auditOrder(data) {
  return request({
    url: "/audit/document",
    method: "post",
    data: data,
  });
}
