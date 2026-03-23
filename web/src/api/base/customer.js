import request from "@/utils/request";

// 查询客户列表
export function listCustomer(query) {
  return request({
    url: "/base/customer/list",
    method: "get",
    params: query,
  });
}
// 查询客户列表
export function listTree(query) {
  return request({
    url: "/base/customer/listTree",
    method: "get",
    params: query,
  });
}

// 根据关键字查询客户列表（用于下拉搜索）
export function listCustomerByKeyword(keyword) {
  return request({
    url: "/base/customer/listByKeyword",
    method: "get",
    params: { keyword },
  });
}

// 查询客户详细
export function getCustomer(customerId) {
  return request({
    url: "/base/customer/" + customerId,
    method: "get",
  });
}

// 新增客户
export function addCustomer(data) {
  return request({
    url: "/base/customer",
    method: "post",
    data: data,
  });
}

// 修改客户
export function updateCustomer(data) {
  return request({
    url: "/base/customer",
    method: "put",
    data: data,
  });
}

// 删除客户
export function delCustomer(customerId) {
  return request({
    url: "/base/customer/" + customerId,
    method: "delete",
  });
}
