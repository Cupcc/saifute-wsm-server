import request from "@/utils/request";

// 查询物料列表
export function listMaterial(query) {
  return request({
    url: "/base/material/list",
    method: "get",
    params: query,
  });
}

// 查询物料列表（支持按编码或名称模糊搜索）
export function listMaterialByCodeOrName(query) {
  return request({
    url: "/base/material/listByCodeOrName",
    method: "get",
    params: query,
  });
}

// 查询物料详细
export function getMaterial(materialId) {
  return request({
    url: "/base/material/" + materialId,
    method: "get",
  });
}

// 新增物料
export function addMaterial(data) {
  return request({
    url: "/base/material",
    method: "post",
    data: data,
  });
}

// 修改物料
export function updateMaterial(data) {
  return request({
    url: "/base/material",
    method: "put",
    data: data,
  });
}

// 删除物料
export function delMaterial(data) {
  return request({
    url: "/base/material/abandoned",
    method: "post",
    data: data,
  });
}
