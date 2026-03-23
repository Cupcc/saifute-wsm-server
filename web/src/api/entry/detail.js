import request from "@/utils/request";

// 查询明细列表
export function listDetail(query) {
  return request({
    url: "/entry/detail/list",
    method: "get",
    params: query,
  });
}
// 查询明细列表
export function listNoPage(query) {
  return request({
    url: "/entry/detail/listNoPage",
    method: "get",
    params: query,
  });
}

// 查询明细详细
export function getDetail(detailId) {
  return request({
    url: "/entry/detail/" + detailId,
    method: "get",
  });
}

// 根据物料ID获取最新的验收单明细
export function getLatestDetailByMaterialId(materialId) {
  return request({
    url: "/entry/detail/latestByMaterialId/" + materialId,
    method: "get",
  });
}

// 新增明细
export function addDetail(data) {
  return request({
    url: "/entry/detail",
    method: "post",
    data: data,
  });
}

// 修改明细
export function updateDetail(data) {
  return request({
    url: "/entry/detail",
    method: "put",
    data: data,
  });
}

// 删除明细
export function delDetail(detailId) {
  return request({
    url: "/entry/detail/" + detailId,
    method: "delete",
  });
}
