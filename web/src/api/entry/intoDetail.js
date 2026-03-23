import request from "@/utils/request";

// 查询明细列表
export function listIntoDetail(query) {
  return request({
    url: "/entry/intoDetail/list",
    method: "get",
    params: query,
  });
}
// 查询明细列表
export function listNoPage(query) {
  return request({
    url: "/entry/intoDetail/listNoPage",
    method: "get",
    params: query,
  });
}

// 查询明细详细
export function getIntoDetail(detailId) {
  return request({
    url: "/entry/intoDetail/" + detailId,
    method: "get",
  });
}

// 根据物料ID获取最新的验收单明细
export function getLatestIntoDetailByMaterialId(materialId) {
  return request({
    url: "/entry/intoDetail/latestByMaterialId/" + materialId,
    method: "get",
  });
}

// 新增明细
export function addIntoDetail(data) {
  return request({
    url: "/entry/intoDetail",
    method: "post",
    data: data,
  });
}

// 修改明细
export function updateIntoDetail(data) {
  return request({
    url: "/entry/intoDetail",
    method: "put",
    data: data,
  });
}

// 删除明细
export function delIntoDetail(detailId) {
  return request({
    url: "/entry/intoDetail/" + detailId,
    method: "delete",
  });
}
