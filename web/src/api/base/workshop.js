import request from "@/utils/request";
import {
  buildDataResponse,
  buildPageQuery,
  buildRowsResponse,
  mapWorkshop,
  pickKeyword,
  unsupportedBaseAction,
} from "./compat";

// 查询部门列表
export function listWorkshop(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  return request({
    url: "/api/master-data/workshops",
    method: "get",
    params: {
      keyword: pickKeyword(query, [
        "workshopName",
        "contactPerson",
        "chargeBy",
      ]),
      limit,
      offset,
    },
  }).then((response) => buildRowsResponse(response.data, mapWorkshop));
}
export function listByNameOrContact(query) {
  return listWorkshop({ ...query, pageNum: 1, pageSize: 100 });
}

// 查询部门详细
export async function getWorkshop(workshopId) {
  const response = await request({
    url: `/api/master-data/workshops/${workshopId}`,
    method: "get",
  });
  return buildDataResponse(response.data, mapWorkshop);
}

// 新增部门
export function addWorkshop() {
  return unsupportedBaseAction("当前 NestJS 后端未提供车间新增接口");
}

// 修改部门
export function updateWorkshop() {
  return unsupportedBaseAction("当前 NestJS 后端未提供车间修改接口");
}

// 删除部门
export function delWorkshop() {
  return unsupportedBaseAction("当前 NestJS 后端未提供车间作废接口");
}
