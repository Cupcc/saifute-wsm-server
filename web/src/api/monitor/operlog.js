import request from "@/utils/request";
import {
  buildPageQuery,
  mapOperLog,
  normalizePagedRows,
  toAuditResult,
} from "./compat";

// 查询操作日志列表
export function list(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  return request({
    url: "/api/audit/oper-logs",
    method: "get",
    params: {
      title: query.title,
      operatorName: query.operName,
      result: toAuditResult(query.status),
      ip: query.operIp,
      beginTime: query.params?.beginTime,
      endTime: query.params?.endTime,
      limit,
      offset,
    },
  }).then((response) => normalizePagedRows(response.data, mapOperLog));
}

// 删除操作日志
export function delOperlog(operId) {
  return request({
    url: `/api/audit/oper-logs/${operId}`,
    method: "delete",
  });
}

// 清空操作日志
export function cleanOperlog() {
  return request({
    url: "/api/audit/oper-logs",
    method: "delete",
  });
}
