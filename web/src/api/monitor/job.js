import request from "@/utils/request";
import {
  buildPageQuery,
  mapSchedulerJob,
  normalizePagedRows,
  toSchedulerPayload,
  toSchedulerStatus,
  unsupportedMonitorAction,
} from "./compat";

// 查询定时任务调度列表
export function listJob(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  return request({
    url: "/api/scheduler/jobs",
    method: "get",
    params: {
      keyword: query.jobName,
      status: toSchedulerStatus(query.status),
      limit,
      offset,
    },
  }).then((response) => normalizePagedRows(response.data, mapSchedulerJob));
}

// 查询定时任务调度详细
export function getJob(jobId) {
  return request({
    url: `/api/scheduler/jobs/${jobId}`,
    method: "get",
  }).then((response) => ({
    ...response,
    data: mapSchedulerJob(response.data),
  }));
}

// 新增定时任务调度
export function addJob(data) {
  return request({
    url: "/api/scheduler/jobs",
    method: "post",
    data: toSchedulerPayload(data),
  });
}

// 修改定时任务调度
export function updateJob(data) {
  return request({
    url: `/api/scheduler/jobs/${data.jobId}`,
    method: "patch",
    data: toSchedulerPayload(data),
  });
}

// 删除定时任务调度
export function delJob() {
  return unsupportedMonitorAction("当前 NestJS 后端未提供删除调度任务接口");
}

// 任务状态修改
export function changeJobStatus(jobId, status) {
  return request({
    url:
      status === "0" || status === 0
        ? `/api/scheduler/jobs/${jobId}/resume`
        : `/api/scheduler/jobs/${jobId}/pause`,
    method: "post",
  });
}

// 定时任务立即执行一次
export function runJob(jobId) {
  return request({
    url: `/api/scheduler/jobs/${jobId}/run`,
    method: "post",
  });
}
