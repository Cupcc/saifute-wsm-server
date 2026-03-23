import request from "@/utils/request";

// 查询领料单明细列表
export function listPickDetail(query) {
  return request({
    url: "/take/pickDetail/list",
    method: "get",
    params: query,
  });
}

// 查询领料单明细列表
export function listNoPage(query) {
  return request({
    url: "/take/pickDetail/listNoPage",
    method: "get",
    params: query,
  });
}

// 查询领料单明细详细
export function getPickDetail(detailId) {
  return request({
    url: "/take/pickDetail/" + detailId,
    method: "get",
  });
}

// 新增领料单明细
export function addPickDetail(data) {
  return request({
    url: "/take/pickDetail",
    method: "post",
    data: data,
  });
}

// 修改领料单明细
export function updatePickDetail(data) {
  return request({
    url: "/take/pickDetail",
    method: "put",
    data: data,
  });
}

// 删除领料单明细
export function delPickDetail(detailId) {
  return request({
    url: "/take/pickDetail/" + detailId,
    method: "delete",
  });
}
