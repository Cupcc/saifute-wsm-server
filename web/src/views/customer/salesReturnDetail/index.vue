<template>
  <CustomerDetailPage
    mode="salesReturn"
    alert-message="当前销售退货明细页面已接到 NestJS /api/customer/sales-returns，先开放查询与详情查看。"
    detail-title="查看销售退货单详情"
    document-label="销售退货单号"
    document-placeholder="请输入销售退货单号"
    :show-source-outbound="true"
  />
</template>

<script setup name="CustomerSalesReturnDetailPage">
import CustomerDetailPage from "../components/CustomerDetailPage.vue";

void CustomerDetailPage;
</script>
