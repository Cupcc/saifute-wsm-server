import request from "@/utils/request";

// 查询供应商列表
export function listSupplier(query) {
  return request({
    url: "/base/supplier/list",
    method: "get",
    params: query,
  });
}

// 根据关键字查询供应商列表（根据编号、名称或简称搜索）
export function listSupplierByKeyword(keyword) {
  return request({
    url: "/base/supplier/listByKeyword",
    method: "get",
    params: {
      keyword: keyword,
    },
  });
}

// 查询供应商详细
export function getSupplier(supplierId) {
  return request({
    url: "/base/supplier/" + supplierId,
    method: "get",
  });
}

// 新增供应商
export function addSupplier(data) {
  return request({
    url: "/base/supplier",
    method: "post",
    data: data,
  });
}

// 修改供应商
export function updateSupplier(data) {
  return request({
    url: "/base/supplier",
    method: "put",
    data: data,
  });
}

// 删除供应商
export function delSupplier(supplierId) {
  return request({
    url: "/base/supplier/" + supplierId,
    method: "delete",
  });
}

// 作废供应商
export function abandonSupplier(data) {
  return request({
    url: "/base/supplier/abandoned",
    method: "post",
    data: data,
  });
}
