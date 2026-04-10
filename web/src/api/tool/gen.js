import request from "@/utils/request";

function mapGenOrderByColumn(orderByColumn) {
  if (orderByColumn === "createdAt") {
    return "createTime";
  }
  if (orderByColumn === "updatedAt") {
    return "updateTime";
  }
  return orderByColumn;
}

function normalizeGenTableRow(row) {
  if (!row) {
    return row;
  }
  return {
    ...row,
    createdAt: row.createdAt ?? row.createTime ?? null,
    updatedAt: row.updatedAt ?? row.updateTime ?? null,
  };
}

function normalizeGenTableListResponse(response) {
  if (!response || !Array.isArray(response.rows)) {
    return response;
  }
  return {
    ...response,
    rows: response.rows.map(normalizeGenTableRow),
  };
}

// 查询生成表数据
export function listTable(query) {
  const params = {
    ...query,
    orderByColumn: mapGenOrderByColumn(query?.orderByColumn),
  };
  return request({
    url: "/tool/gen/list",
    method: "get",
    params,
  }).then(normalizeGenTableListResponse);
}
// 查询db数据库列表
export function listDbTable(query) {
  return request({
    url: "/tool/gen/db/list",
    method: "get",
    params: query,
  }).then(normalizeGenTableListResponse);
}

// 查询表详细信息
export function getGenTable(tableId) {
  return request({
    url: "/tool/gen/" + tableId,
    method: "get",
  });
}

// 修改代码生成信息
export function updateGenTable(data) {
  return request({
    url: "/tool/gen",
    method: "put",
    data: data,
  });
}

// 导入表
export function importTable(data) {
  return request({
    url: "/tool/gen/importTable",
    method: "post",
    params: data,
  });
}

// 创建表
export function createTable(data) {
  return request({
    url: "/tool/gen/createTable",
    method: "post",
    params: data,
  });
}

// 预览生成代码
export function previewTable(tableId) {
  return request({
    url: "/tool/gen/preview/" + tableId,
    method: "get",
  });
}

// 删除表数据
export function delTable(tableId) {
  return request({
    url: "/tool/gen/" + tableId,
    method: "delete",
  });
}

// 生成代码（自定义路径）
export function genCode(tableName) {
  return request({
    url: "/tool/gen/genCode/" + tableName,
    method: "get",
  });
}

// 同步数据库
export function synchDb(tableName) {
  return request({
    url: "/tool/gen/synchDb/" + tableName,
    method: "get",
  });
}
