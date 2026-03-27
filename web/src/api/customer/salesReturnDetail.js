import {
  getCustomerOrderDetail,
  listCustomerOrderDetails,
  unsupportedCustomerAction,
} from "./compat";

export function listSalesReturnDetail(query) {
  return listCustomerOrderDetails(query, "salesReturn");
}

export async function listNoPage(query) {
  const response = await listCustomerOrderDetails(
    {
      ...query,
      pageNum: 1,
      pageSize: 100,
    },
    "salesReturn",
  );
  return {
    data: response.rows,
  };
}

export function getSalesReturnDetail(detailId) {
  return getCustomerOrderDetail(detailId, "salesReturn");
}

export function addSalesReturnDetail() {
  return unsupportedCustomerAction("请通过销售退货单主页面维护明细");
}

export function updateSalesReturnDetail() {
  return unsupportedCustomerAction("请通过销售退货单主页面维护明细");
}

export function delSalesReturnDetail() {
  return unsupportedCustomerAction("请通过销售退货单主页面维护明细");
}
