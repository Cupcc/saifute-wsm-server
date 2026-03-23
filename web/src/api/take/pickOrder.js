import request from "@/utils/request";

// 查询领料单列表
export function listPickOrder(query) {
  return request({
    url: "/take/pickOrder/list",
    method: "get",
    params: query,
  });
}

// 查询领料单详细
export function getPickOrder(pickId) {
  return request({
    url: "/take/pickOrder/" + pickId,
    method: "get",
  });
}

// 新增领料单
export function addPickOrder(data) {
  return request({
    url: "/take/pickOrder",
    method: "post",
    data: data,
  });
}

// 修改领料单
export function updatePickOrder(data) {
  return request({
    url: "/take/pickOrder",
    method: "put",
    data: data,
  });
}

// 作废领料单
export function voidPickOrder(pickId, data) {
  return request({
    url: "/take/pickOrder/void/" + pickId,
    method: "delete",
    data: data,
  });
}

// 删除领料单
export function delPickOrder(pickId) {
  return request({
    url: "/take/pickOrder/" + pickId,
    method: "delete",
  });
}
