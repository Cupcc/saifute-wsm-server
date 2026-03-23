import request from "@/utils/request";

// 查询报废单明细列表
export function listScrapDetail(query) {
  return request({
    url: "/stock/scrapDetail/list",
    method: "get",
    params: query,
  });
}

// 查询报废单明细详细
export function getScrapDetail(detailId) {
  return request({
    url: "/stock/scrapDetail/" + detailId,
    method: "get",
  });
}

// 新增报废单明细
export function addScrapDetail(data) {
  return request({
    url: "/stock/scrapDetail",
    method: "post",
    data: data,
  });
}

// 修改报废单明细
export function updateScrapDetail(data) {
  return request({
    url: "/stock/scrapDetail",
    method: "put",
    data: data,
  });
}

// 删除报废单明细
export function delScrapDetail(detailId) {
  return request({
    url: "/stock/scrapDetail/" + detailId,
    method: "delete",
  });
}
