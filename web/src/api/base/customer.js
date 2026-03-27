import request from "@/utils/request";
import {
  buildDataResponse,
  buildPageQuery,
  buildRowsResponse,
  mapCustomer,
  pickKeyword,
  unsupportedBaseAction,
} from "./compat";

function applyCustomerTypeFilter(rows, customerType) {
  if (!customerType || customerType === 11111 || customerType === "11111") {
    return rows;
  }

  return rows.filter(
    (item) => Number(item.customerType) === Number(customerType),
  );
}

// 查询客户列表
export function listCustomer(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  return request({
    url: "/api/master-data/customers",
    method: "get",
    params: {
      keyword: pickKeyword(query, [
        "customerCode",
        "customerName",
        "customerShortName",
        "contactPerson",
        "contactPhone",
        "address",
      ]),
      limit,
      offset,
    },
  }).then((response) => {
    const result = buildRowsResponse(response.data, mapCustomer);
    result.rows = applyCustomerTypeFilter(result.rows, query.customerType);
    result.total = result.rows.length;
    return result;
  });
}
// 查询客户列表
export function listTree(query = {}) {
  return listCustomer({ ...query, pageNum: 1, pageSize: 100 });
}

// 根据关键字查询客户列表（用于下拉搜索）
export function listCustomerByKeyword(keyword) {
  return listCustomer({ keyword, pageNum: 1, pageSize: 100 });
}

// 查询客户详细
export async function getCustomer(customerId) {
  const response = await request({
    url: `/api/master-data/customers/${customerId}`,
    method: "get",
  });
  return buildDataResponse(response.data, mapCustomer);
}

// 新增客户
export function addCustomer() {
  return unsupportedBaseAction("当前 NestJS 后端未提供客户新增接口");
}

// 修改客户
export function updateCustomer() {
  return unsupportedBaseAction("当前 NestJS 后端未提供客户修改接口");
}

// 删除客户
export function delCustomer() {
  return unsupportedBaseAction("当前 NestJS 后端未提供客户作废接口");
}
