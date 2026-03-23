import request from "@/utils/request";

// 查询部门列表
export function listWorkshop(query) {
  return request({
    url: "/base/workshop/list",
    method: "get",
    params: query,
  });
}
export function listByNameOrContact(query) {
  return request({
    url: "/base/workshop/listByNameOrContact",
    method: "get",
    params: query,
  });
}

// 查询部门详细
export function getWorkshop(workshopId) {
  return request({
    url: "/base/workshop/" + workshopId,
    method: "get",
  });
}

// 新增部门
export function addWorkshop(data) {
  return request({
    url: "/base/workshop",
    method: "post",
    data: data,
  });
}

// 修改部门
export function updateWorkshop(data) {
  return request({
    url: "/base/workshop",
    method: "put",
    data: data,
  });
}

// 删除部门
export function delWorkshop(data) {
  return request({
    url: "/base/workshop/abandoned",
    method: "post",
    data: data,
  });
}
