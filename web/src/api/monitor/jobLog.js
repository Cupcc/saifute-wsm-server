import request from "@/utils/request";
import {
  buildPageQuery,
  mapSchedulerJobLog,
  normalizePagedRows,
  toAuditResult,
  unsupportedMonitorAction,
} from "./compat";

// 查询调度日志列表
export function listJobLog(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  return request({
    url: "/api/scheduler/job-logs",
    method: "get",
    params: {
      jobName: query.jobName,
      status: toAuditResult(query.status),
      limit,
      offset,
    },
  }).then((response) => normalizePagedRows(response.data, mapSchedulerJobLog));
}

// 删除调度日志
export function delJobLog() {
  return unsupportedMonitorAction("当前 NestJS 后端未提供删除调度日志接口");
}

// 清空调度日志
export function cleanJobLog() {
  return unsupportedMonitorAction("当前 NestJS 后端未提供清空调度日志接口");
}
