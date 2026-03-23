import request from "@/utils/request";

// 查询复合产品列表
export function listProduct(query) {
  return request({
    url: "/article/product/list",
    method: "get",
    params: query,
  });
}

// 查询复合产品详细
export function getProduct(productId) {
  return request({
    url: "/article/product/" + productId,
    method: "get",
  });
}

// 新增复合产品
export function addProduct(data) {
  return request({
    url: "/article/product",
    method: "post",
    data: data,
  });
}

// 修改复合产品
export function updateProduct(data) {
  return request({
    url: "/article/product",
    method: "put",
    data: data,
  });
}

// 删除复合产品
export function delProduct(productId) {
  return request({
    url: "/article/product/" + productId,
    method: "delete",
  });
}

// 废弃复合产品
export function abandonProduct(productId) {
  const data = {
    productId: productId,
    delFlag: 2,
  };
  return request({
    url: "/article/product/abandoned",
    method: "post",
    data: data,
  });
}

// 查询产品分类列表
export function listClassifications() {
  return request({
    url: "/article/product/classifications",
    method: "get",
  });
}

// 查询项目物料明细列表（按供应商）
export function listProductMaterial(query) {
  return request({
    url: "/article/product/material/list",
    method: "get",
    params: query,
  });
}
