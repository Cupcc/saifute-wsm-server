<template>
  <CustomerDetailPage
    mode="order"
    alert-message="当前出库明细页面已接到 NestJS /api/customer/orders，先开放查询与详情查看。"
    detail-title="查看出库单详情"
    document-label="出库单号"
    document-placeholder="请输入出库单号"
  />
</template>

<script setup name="CustomerDetailPage">
import CustomerDetailPage from "../components/CustomerDetailPage.vue";

void CustomerDetailPage;
</script>
