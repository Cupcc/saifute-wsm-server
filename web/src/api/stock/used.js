import request from "@/utils/request";

// 查询库存使用情况列表
export function listUsed(query) {
  return request({
    url: "/stock/used/list",
    method: "get",
    params: query,
  });
}

// 查询库存使用情况详细信息
export function getUsed(usedId) {
  return request({
    url: "/stock/used/" + usedId,
    method: "get",
  });
}

// 新增库存使用情况
export function addUsed(data) {
  return request({
    url: "/stock/used",
    method: "post",
    data: data,
  });
}

// 修改库存使用情况
export function updateUsed(data) {
  return request({
    url: "/stock/used",
    method: "put",
    data: data,
  });
}

// 删除库存使用情况
export function delUsed(usedId) {
  return request({
    url: "/stock/used/" + usedId,
    method: "delete",
  });
}

// 根据物料ID和数量查询库存使用情况
export function getUsedByMaterialIdAndQuantity(materialId, quantity) {
  return request({
    url: "/stock/used/byMaterialIdAndQuantity",
    method: "get",
    params: {
      materialId: materialId,
      quantity: quantity,
    },
  });
}
