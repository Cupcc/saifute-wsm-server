<template>
  <CustomerOrderPage
    mode="salesReturn"
    alert-message="当前销售退货单页面已接到 NestJS /api/customer/sales-returns，已开放查询、详情、新增与作废联调入口。"
    detail-title="查看销售退货单详情"
    document-label="销售退货单号"
    document-placeholder="请输入销售退货单号"
    :show-source-outbound="true"
  />
</template>

<script setup name="CustomerSalesReturnOrderPage">
import CustomerOrderPage from "../components/CustomerOrderPage.vue";

void CustomerOrderPage;
</script>
