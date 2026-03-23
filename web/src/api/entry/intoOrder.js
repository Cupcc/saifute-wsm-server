import request from "@/utils/request";

// 查询入库单列表
export function listIntoOrder(query) {
  return request({
    url: "/entry/intoOrder/list",
    method: "get",
    params: query,
  });
}

// 查询入库单详细
export function getIntoOrder(inboundId) {
  return request({
    url: "/entry/intoOrder/" + inboundId,
    method: "get",
  });
}

// 新增入库单
export function addIntoOrder(data) {
  return request({
    url: "/entry/intoOrder",
    method: "post",
    data: data,
  });
}

// 修改入库单
export function updateIntoOrder(data) {
  return request({
    url: "/entry/intoOrder",
    method: "put",
    data: data,
  });
}

// 作废入库单
export function abandonIntoOrder(data) {
  return request({
    url: "/entry/intoOrder/abandoned",
    method: "post",
    data: data,
  });
}

// 删除入库单
export function delIntoOrder(inboundId) {
  return request({
    url: "/entry/intoOrder/" + inboundId,
    method: "delete",
  });
}
