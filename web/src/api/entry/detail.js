import {
  getLatestInboundDetailByMaterialId,
  listInboundDetails,
  unsupportedInboundDetailAction,
} from "./compat";

// 查询明细列表
export function listDetail(query) {
  return listInboundDetails(query, "order");
}
// 查询明细列表
export async function listNoPage(query) {
  const response = await listInboundDetails(query, "order");
  return {
    data: response.rows,
    total: response.total,
  };
}

// 查询明细详细
export async function getDetail(detailId) {
  const response = await listInboundDetails(
    { pageNum: 1, pageSize: 1000 },
    "order",
  );
  return {
    data: response.rows.find((item) => item.detailId === detailId) ?? null,
  };
}

// 根据物料ID获取最新的验收单明细
export function getLatestDetailByMaterialId(materialId) {
  return getLatestInboundDetailByMaterialId(materialId, "order");
}

// 新增明细
export function addDetail() {
  return unsupportedInboundDetailAction("请通过验收单主页面维护明细");
}

// 修改明细
export function updateDetail() {
  return unsupportedInboundDetailAction("请通过验收单主页面维护明细");
}

// 删除明细
export function delDetail() {
  return unsupportedInboundDetailAction("请通过验收单主页面维护明细");
}
