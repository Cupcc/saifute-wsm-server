import request from "@/utils/request";
import {
  buildPageQuery,
  mapLoginLog,
  normalizePagedRows,
  toAuditResult,
  unsupportedMonitorAction,
} from "./compat";

// 查询登录日志列表
export function list(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  return request({
    url: "/api/audit/login-logs",
    method: "get",
    params: {
      username: query.userName,
      result: toAuditResult(query.status),
      ip: query.ipaddr,
      beginTime: query.params?.beginTime,
      endTime: query.params?.endTime,
      limit,
      offset,
    },
  }).then((response) => normalizePagedRows(response.data, mapLoginLog));
}

// 删除登录日志
export function delLogininfor(infoId) {
  return request({
    url: `/api/audit/login-logs/${infoId}`,
    method: "delete",
  });
}

// 解锁用户登录状态
export function unlockLogininfor() {
  return unsupportedMonitorAction("当前 NestJS 后端未提供登录日志解锁接口");
}

// 清空登录日志
export function cleanLogininfor() {
  return request({
    url: "/api/audit/login-logs",
    method: "delete",
  });
}
