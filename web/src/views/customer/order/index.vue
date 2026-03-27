<template>
  <CustomerOrderPage
    mode="order"
    alert-message="当前出库单页面已接到 NestJS /api/customer/orders，已开放查询、详情、新增、修改与作废联调入口。"
    detail-title="查看出库单详情"
    document-label="出库单号"
    document-placeholder="请输入出库单号"
  />
</template>

<script setup name="CustomerOrderPage">
import CustomerOrderPage from "../components/CustomerOrderPage.vue";

void CustomerOrderPage;
</script>
