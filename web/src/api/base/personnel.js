import request from "@/utils/request";
import {
  buildDataResponse,
  buildPageQuery,
  buildRowsResponse,
  mapPersonnel,
  pickKeyword,
  unsupportedBaseAction,
} from "./compat";

// 查询人员信息列表
export function listPersonnel(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  return request({
    url: "/api/master-data/personnel",
    method: "get",
    params: {
      keyword: pickKeyword(query, ["code", "name", "contactPhone"]),
      limit,
      offset,
    },
  }).then((response) =>
    buildRowsResponse(response.data, (item) => mapPersonnel(item, query)),
  );
}

// 查询人员信息详细
export async function getPersonnel(personnelId) {
  const response = await request({
    url: `/api/master-data/personnel/${personnelId}`,
    method: "get",
  });
  return buildDataResponse(response.data, (item) => mapPersonnel(item));
}

// 新增人员信息
export function addPersonnel() {
  return unsupportedBaseAction("当前 NestJS 后端未提供人员新增接口");
}

// 修改人员信息
export function updatePersonnel() {
  return unsupportedBaseAction("当前 NestJS 后端未提供人员修改接口");
}

// 删除人员信息
export function delPersonnel() {
  return unsupportedBaseAction("当前 NestJS 后端未提供人员删除接口");
}
