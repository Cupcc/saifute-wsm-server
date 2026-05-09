import { listSupplierReturnDetails, unsupportedInboundDetailAction } from "./compat";

// 查询退货单明细列表
export function listReturnDetail(query) {
  return listSupplierReturnDetails(query);
}

// 退货明细由退货单写入，不支持在明细页直接维护
export function addReturnDetail() {
  return unsupportedInboundDetailAction("请通过验收单发起退给厂家");
}

export function updateReturnDetail() {
  return unsupportedInboundDetailAction("请通过退货单维护明细");
}

export function delReturnDetail() {
  return unsupportedInboundDetailAction("退货明细不支持直接删除");
}
