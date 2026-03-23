import request from "@/utils/request";

// 查询退料单明细列表
export function listReturnDetail(query) {
  return request({
    url: "/take/returnDetail/list",
    method: "get",
    params: query,
  });
}
// 查询退料单明细列表
export function listNoPage(query) {
  return request({
    url: "/take/returnDetail/listNoPage",
    method: "get",
    params: query,
  });
}

// 查询退料单明细详细
export function getReturnDetail(detailId) {
  return request({
    url: "/take/returnDetail/" + detailId,
    method: "get",
  });
}

// 新增退料单明细
export function addReturnDetail(data) {
  return request({
    url: "/take/returnDetail",
    method: "post",
    data: data,
  });
}

// 修改退料单明细
export function updateReturnDetail(data) {
  return request({
    url: "/take/returnDetail",
    method: "put",
    data: data,
  });
}

// 删除退料单明细
export function delReturnDetail(detailId) {
  return request({
    url: "/take/returnDetail/" + detailId,
    method: "delete",
  });
}
