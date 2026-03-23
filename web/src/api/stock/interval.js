import request from "@/utils/request";

// 查询成品出厂编号区间列表
export function listInterval(query) {
  return request({
    url: "/stock/interval/list",
    method: "get",
    params: query,
  });
}

// 查询成品出厂编号区间详细
export function getInterval(intervalId) {
  return request({
    url: "/stock/interval/" + intervalId,
    method: "get",
  });
}

// 新增成品出厂编号区间
export function addInterval(data) {
  return request({
    url: "/stock/interval",
    method: "post",
    data: data,
  });
}

// 修改成品出厂编号区间
export function updateInterval(data) {
  return request({
    url: "/stock/interval",
    method: "put",
    data: data,
  });
}

// 删除成品出厂编号区间
export function delInterval(intervalId) {
  return request({
    url: "/stock/interval/" + intervalId,
    method: "delete",
  });
}
