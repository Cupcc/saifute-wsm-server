import request from "@/utils/request";

// 查询复合产品物料关联列表
export function listMaterial(query) {
  return request({
    url: "/article/material/list",
    method: "get",
    params: query,
  });
}

// 查询复合产品物料关联详细
export function getMaterial(id) {
  return request({
    url: "/article/material/" + id,
    method: "get",
  });
}

// 新增复合产品物料关联
export function addMaterial(data) {
  return request({
    url: "/article/material",
    method: "post",
    data: data,
  });
}

// 修改复合产品物料关联
export function updateMaterial(data) {
  return request({
    url: "/article/material",
    method: "put",
    data: data,
  });
}

// 删除复合产品物料关联
export function delMaterial(id) {
  return request({
    url: "/article/material/" + id,
    method: "delete",
  });
}
