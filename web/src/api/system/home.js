import request from "@/utils/request";

// 获取首页统计数据
export function getHomeStatistics() {
  return request({
    url: "/home/statistics",
    method: "get",
  });
}

// 获取库存分类统计数据
export function getInventoryCategoryStatistics() {
  return request({
    url: "/home/statistics/inventory/category",
    method: "get",
  });
}

// 获取单据日期统计数据
export function getDocumentDateStatistics() {
  return request({
    url: "/home/statistics/document/date",
    method: "get",
  });
}
