const DEFAULT_PAGE_NUM = 1;
const DEFAULT_PAGE_SIZE = 30;

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildPageQuery(query = {}) {
  const pageNum = toPositiveNumber(query.pageNum, DEFAULT_PAGE_NUM);
  const pageSize = toPositiveNumber(query.pageSize, DEFAULT_PAGE_SIZE);

  return {
    pageNum,
    pageSize,
    limit: pageSize,
    offset: (pageNum - 1) * pageSize,
  };
}

export function normalizePagedRows(data, mapper) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    rows: items.map((item) => mapper(item)),
    total: Number(data?.total || 0),
  };
}

export function toAuditResult(status) {
  if (status === "0" || status === 0) {
    return "SUCCESS";
  }
  if (status === "1" || status === 1) {
    return "FAILURE";
  }
  return undefined;
}

export function toSchedulerStatus(status) {
  if (status === "0" || status === 0) {
    return "ACTIVE";
  }
  if (status === "1" || status === 1) {
    return "PAUSED";
  }
  return undefined;
}

export function parseUserAgent(userAgent) {
  const source = typeof userAgent === "string" ? userAgent : "";
  const lower = source.toLowerCase();

  let browser = "未知";
  if (lower.includes("edg/")) {
    browser = "Edge";
  } else if (lower.includes("chrome/")) {
    browser = "Chrome";
  } else if (lower.includes("firefox/")) {
    browser = "Firefox";
  } else if (lower.includes("safari/") && !lower.includes("chrome/")) {
    browser = "Safari";
  }

  let os = "未知";
  if (lower.includes("windows")) {
    os = "Windows";
  } else if (lower.includes("android")) {
    os = "Android";
  } else if (lower.includes("iphone") || lower.includes("ipad")) {
    os = "iOS";
  } else if (lower.includes("mac os")) {
    os = "macOS";
  } else if (lower.includes("linux")) {
    os = "Linux";
  }

  return { browser, os };
}

export function mapLoginLog(item) {
  const device = parseUserAgent(item.userAgent);
  return {
    infoId: item.id,
    userName: item.username,
    ipaddr: item.ip,
    loginLocation: "",
    os: device.os,
    browser: device.browser,
    status: item.result === "SUCCESS" ? "0" : "1",
    msg: item.message ?? "",
    loginTime: item.occurredAt,
  };
}

export function mapOperLog(item) {
  return {
    operId: item.id,
    title: item.title,
    businessType: item.businessType ?? item.action ?? "",
    operName: item.operatorName ?? "",
    operIp: item.operatorIp ?? item.ip ?? "",
    operLocation: "",
    status: item.status === "SUCCESS" ? "0" : "1",
    operTime: item.occurredAt,
    costTime: item.durationMs ?? 0,
    operUrl: item.requestUrl ?? item.path ?? "",
    requestMethod: item.requestMethod ?? item.method ?? "",
    method: item.title,
    operParam: item.requestParams ?? item.requestData ?? "",
    jsonResult: item.responseBody ?? item.responseData ?? "",
    errorMsg: item.errorMessage ?? "",
  };
}

export function mapOnlineSession(item) {
  const device = parseUserAgent(item.device);
  return {
    tokenId: item.sessionId,
    userName: item.username,
    deptName: item.department?.departmentName ?? "",
    ipaddr: item.ip,
    loginLocation: "",
    os: device.os,
    browser: device.browser,
    loginTime: item.lastActiveAt,
  };
}

export function mapSchedulerJob(item) {
  return {
    jobId: item.id,
    jobName: item.jobName,
    jobGroup: "DEFAULT",
    invokeTarget: item.invokeTarget,
    cronExpression: item.cronExpression,
    status: item.status === "ACTIVE" ? "0" : "1",
    concurrent: item.concurrencyPolicy === "ALLOW" ? "0" : "1",
    misfirePolicy: item.misfirePolicy === "SKIP" ? "3" : "1",
    remark: item.remark ?? "",
    createdAt: item.createdAt,
    nextValidTime: null,
  };
}

export function mapSchedulerJobLog(item) {
  return {
    jobLogId: item.id,
    jobName: item.jobName,
    jobGroup: "DEFAULT",
    invokeTarget: item.invokeTarget,
    jobMessage: item.message ?? "",
    status: item.status === "SUCCESS" ? "0" : "1",
    startedAt: item.startedAt,
    exceptionInfo: item.errorMessage ?? "",
  };
}

export function toSchedulerPayload(payload = {}) {
  return {
    jobName: payload.jobName,
    invokeTarget: payload.invokeTarget,
    cronExpression: payload.cronExpression,
    concurrencyPolicy: payload.concurrent === "0" ? "ALLOW" : "FORBID",
    misfirePolicy: payload.misfirePolicy === "3" ? "SKIP" : "FIRE_AND_PROCEED",
    remark: payload.remark,
  };
}

export function unsupportedMonitorAction(message) {
  return Promise.reject(new Error(message));
}
