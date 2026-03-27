import request from "@/utils/request";

export function listRdMaterials(params = {}) {
  return request({
    url: "/api/master-data/materials",
    method: "get",
    params,
  });
}

export function listRdInventoryLogs(params = {}) {
  return request({
    url: "/api/inventory/logs",
    method: "get",
    params,
  });
}

export function listRdInboundResults(params = {}) {
  return request({
    url: "/api/inbound/into-orders",
    method: "get",
    params,
  });
}

export function listRdProjects(params = {}) {
  return request({
    url: "/api/projects",
    method: "get",
    params,
  });
}

export function getRdProject(projectId) {
  return request({
    url: `/api/projects/${projectId}`,
    method: "get",
  });
}

export function createRdProject(data) {
  return request({
    url: "/api/projects",
    method: "post",
    data,
  });
}

export function voidRdProject(projectId, data) {
  return request({
    url: `/api/projects/${projectId}/void`,
    method: "post",
    data,
  });
}

export function listRdScrapOrders(params = {}) {
  return request({
    url: "/api/workshop-material/scrap-orders",
    method: "get",
    params,
  });
}

export function getRdScrapOrder(orderId) {
  return request({
    url: `/api/workshop-material/scrap-orders/${orderId}`,
    method: "get",
  });
}

export function createRdScrapOrder(data) {
  return request({
    url: "/api/workshop-material/scrap-orders",
    method: "post",
    data,
  });
}

export function voidRdScrapOrder(orderId, data) {
  return request({
    url: `/api/workshop-material/scrap-orders/${orderId}/void`,
    method: "post",
    data,
  });
}
