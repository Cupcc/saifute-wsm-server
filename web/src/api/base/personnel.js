import request from "@/utils/request";

// 查询人员信息列表
export function listPersonnel(query) {
  return request({
    url: "/base/personnel/list",
    method: "get",
    params: query,
  });
}

// 查询人员信息详细
export function getPersonnel(personnelId) {
  return request({
    url: "/base/personnel/" + personnelId,
    method: "get",
  });
}

// 新增人员信息
export function addPersonnel(data) {
  return request({
    url: "/base/personnel",
    method: "post",
    data: data,
  });
}

// 修改人员信息
export function updatePersonnel(data) {
  return request({
    url: "/base/personnel",
    method: "put",
    data: data,
  });
}

// 删除人员信息
export function delPersonnel(personnelId) {
  return request({
    url: "/base/personnel/" + personnelId,
    method: "delete",
  });
}
