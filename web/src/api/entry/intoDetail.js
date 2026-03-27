import {
  getLatestInboundDetailByMaterialId,
  listInboundDetails,
  unsupportedInboundDetailAction,
} from "./compat";

// 查询明细列表
export function listIntoDetail(query) {
  return listInboundDetails(query, "intoOrder");
}
// 查询明细列表
export async function listNoPage(query) {
  const response = await listInboundDetails(query, "intoOrder");
  return {
    data: response.rows,
  };
}

// 查询明细详细
export async function getIntoDetail(detailId) {
  const response = await listInboundDetails({}, "intoOrder");
  return {
    data: response.rows.find((item) => item.detailId === detailId) ?? null,
  };
}

// 根据物料ID获取最新的验收单明细
export function getLatestIntoDetailByMaterialId(materialId) {
  return getLatestInboundDetailByMaterialId(materialId, "intoOrder");
}

// 新增明细
export function addIntoDetail() {
  return unsupportedInboundDetailAction("请通过入库单主页面维护明细");
}

// 修改明细
export function updateIntoDetail() {
  return unsupportedInboundDetailAction("请通过入库单主页面维护明细");
}

// 删除明细
export function delIntoDetail() {
  return unsupportedInboundDetailAction("请通过入库单主页面维护明细");
}
