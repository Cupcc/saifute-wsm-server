import request from "@/utils/request";

// 查询库存预警列表
export function listStockWarning(query) {
  return request({
    url: "/stock/warning/list",
    method: "get",
    params: query,
  });
}
