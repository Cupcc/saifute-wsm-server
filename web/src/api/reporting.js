import request from "@/utils/request";

export function getReportingHome() {
  return request({
    url: "/api/reporting/home",
    method: "get",
  });
}

export function getInventorySummary(params = {}) {
  return request({
    url: "/api/reporting/inventory-summary",
    method: "get",
    params,
  });
}

export function getMaterialCategorySummary(params = {}) {
  return request({
    url: "/api/reporting/material-category-summary",
    method: "get",
    params,
  });
}

export function getTrendSeries(params = {}) {
  return request({
    url: "/api/reporting/trends",
    method: "get",
    params,
  });
}
