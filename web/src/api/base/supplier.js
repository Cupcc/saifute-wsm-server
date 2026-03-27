import request from "@/utils/request";
import {
  buildDataResponse,
  buildPageQuery,
  buildRowsResponse,
  mapSupplier,
  pickKeyword,
  unsupportedBaseAction,
} from "./compat";

// 查询供应商列表
export function listSupplier(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  return request({
    url: "/api/master-data/suppliers",
    method: "get",
    params: {
      keyword: pickKeyword(query, [
        "supplierCode",
        "supplierName",
        "supplierShortName",
        "contactPerson",
        "contactPhone",
        "address",
      ]),
      limit,
      offset,
    },
  }).then((response) => buildRowsResponse(response.data, mapSupplier));
}

// 根据关键字查询供应商列表（根据编号、名称或简称搜索）
export function listSupplierByKeyword(keyword) {
  return listSupplier({ keyword, pageNum: 1, pageSize: 100 });
}

// 查询供应商详细
export async function getSupplier(supplierId) {
  const response = await request({
    url: `/api/master-data/suppliers/${supplierId}`,
    method: "get",
  });
  return buildDataResponse(response.data, mapSupplier);
}

// 新增供应商
export function addSupplier() {
  return unsupportedBaseAction("当前 NestJS 后端未提供供应商新增接口");
}

// 修改供应商
export function updateSupplier() {
  return unsupportedBaseAction("当前 NestJS 后端未提供供应商修改接口");
}

// 删除供应商
export function delSupplier() {
  return unsupportedBaseAction("当前 NestJS 后端未提供供应商删除接口");
}

// 作废供应商
export function abandonSupplier() {
  return unsupportedBaseAction("当前 NestJS 后端未提供供应商作废接口");
}
