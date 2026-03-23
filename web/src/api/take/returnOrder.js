import request from "@/utils/request";

// 查询退料单列表
export function listReturnOrder(query) {
  return request({
    url: "/take/returnOrder/list",
    method: "get",
    params: query,
  });
}

// 查询退料单详细
export function getReturnOrder(returnId) {
  return request({
    url: "/take/returnOrder/" + returnId,
    method: "get",
  });
}

// 新增退料单
export function addReturnOrder(data) {
  return request({
    url: "/take/returnOrder",
    method: "post",
    data: data,
  });
}

// 修改退料单
export function updateReturnOrder(data) {
  return request({
    url: "/take/returnOrder",
    method: "put",
    data: data,
  });
}

// 删除退料单（作废）
export function delReturnOrder(data) {
  return request({
    url: "/take/returnOrder/abandoned",
    method: "post",
    data: data,
  });
}
