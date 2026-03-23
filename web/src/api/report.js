import request from "@/utils/request";

// 获取库存分类明细报表
export function getInventoryCategoryDetail(data) {
  return request({
    url: "/report/inventory/category/detail",
    method: "get",
    params: data,
  });
}

// 获取材料统计报表
export function getMaterialStatistics(data) {
  return request({
    url: "/report/material/inventory/statistics",
    method: "get",
    params: data,
  });
}

// 获取物料分类库存统计
export function getMaterialCategoryInventoryStatistics(data) {
  return request({
    url: "/report/material/category/inventory/statistics",
    method: "get",
    params: data,
  });
}
