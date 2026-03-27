import {
  getCustomerOrderDetail,
  listCustomerOrderDetails,
  unsupportedCustomerAction,
} from "./compat";

export function listDetail(query) {
  return listCustomerOrderDetails(query, "order");
}

export async function listNoPage(query) {
  const response = await listCustomerOrderDetails(
    {
      ...query,
      pageNum: 1,
      pageSize: 100,
    },
    "order",
  );
  return {
    data: response.rows,
  };
}

export function getDetail(detailId) {
  return getCustomerOrderDetail(detailId, "order");
}

export function addDetail() {
  return unsupportedCustomerAction("请通过出库单主页面维护明细");
}

export function updateDetail() {
  return unsupportedCustomerAction("请通过出库单主页面维护明细");
}

export function delDetail() {
  return unsupportedCustomerAction("请通过出库单主页面维护明细");
}
