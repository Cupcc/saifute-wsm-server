import request from "@/utils/request";

// 查询库存列表
export function listInventory(query) {
  return request({
    url: "/stock/inventory/list",
    method: "get",
    params: query,
  });
}

export function listDetails(query) {
  return request({
    url: "/stock/inventory/listDetails",
    method: "get",
    params: query,
  });
}

// 查询库存列表
export function selectSaifuteInventoryListGroupByMaterial(query) {
  return request({
    url: "/stock/inventory/groupByMaterial",
    method: "get",
    params: query,
  });
}

// 查询库存详细
export function getInventory(inventoryId) {
  return request({
    url: "/stock/inventory/" + inventoryId,
    method: "get",
  });
}

// 新增库存
export function addInventory(data) {
  return request({
    url: "/stock/inventory",
    method: "post",
    data: data,
  });
}

// 修改库存
export function updateInventory(data) {
  return request({
    url: "/stock/inventory",
    method: "put",
    data: data,
  });
}

// 删除库存
export function delInventory(inventoryId) {
  return request({
    url: "/stock/inventory/" + inventoryId,
    method: "delete",
  });
}
