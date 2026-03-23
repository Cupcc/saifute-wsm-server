import request from "@/utils/request";

// 查询报废单列表
export function listScrapOrder(query) {
  return request({
    url: "/stock/scrapOrder/list",
    method: "get",
    params: query,
  });
}

// 查询报废单详细
export function getScrapOrder(scrapId) {
  return request({
    url: "/stock/scrapOrder/" + scrapId,
    method: "get",
  });
}

// 新增报废单
export function addScrapOrder(data) {
  return request({
    url: "/stock/scrapOrder",
    method: "post",
    data: data,
  });
}

// 修改报废单
export function updateScrapOrder(data) {
  return request({
    url: "/stock/scrapOrder",
    method: "put",
    data: data,
  });
}

// 删除报废单
export function delScrapOrder(scrapId) {
  return request({
    url: "/stock/scrapOrder/" + scrapId,
    method: "delete",
  });
}

// 作废报废单
export function voidScrapOrder(data) {
  return request({
    url: "/stock/scrapOrder/void",
    method: "post",
    data: data,
  });
}
