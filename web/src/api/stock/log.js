import request from "@/utils/request";

// 查询库存变动日志列表
export function listLog(query) {
  return request({
    url: "/stock/log/list",
    method: "get",
    params: query,
  });
}

// 查询库存变动日志列表（包含物料、库位、仓库信息）
export function listLogVo(query) {
  return request({
    url: "/stock/log/listVo",
    method: "get",
    params: query,
  });
}

// 查询库存变动日志详细
export function getLog(logId) {
  return request({
    url: "/stock/log/" + logId,
    method: "get",
  });
}

// 新增库存变动日志
export function addLog(data) {
  return request({
    url: "/stock/log",
    method: "post",
    data: data,
  });
}

// 修改库存变动日志
export function updateLog(data) {
  return request({
    url: "/stock/log",
    method: "put",
    data: data,
  });
}

// 删除库存变动日志
export function delLog(logId) {
  return request({
    url: "/stock/log/" + logId,
    method: "delete",
  });
}
