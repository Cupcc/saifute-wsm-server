<template>
  <div class="app-container reporting-home">
    <div class="page-header">
      <div>
        <h2>首页概览</h2>
        <p>欢迎回来，{{ userStore.nickName || userStore.name || "用户" }}。</p>
      </div>
      <el-button :loading="loading" type="primary" @click="loadDashboardData">
        刷新数据
      </el-button>
    </div>

    <el-row :gutter="16" class="section-row">
      <el-col v-for="card in metricCards" :key="card.label" :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">{{ card.label }}</div>
          <div class="metric-value">{{ card.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="section-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-title">今日单据</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="入库单据">
              {{ dashboard.todayDocuments.inboundCount }}
            </el-descriptions-item>
            <el-descriptions-item label="出库单据">
              {{ dashboard.todayDocuments.outboundCount }}
            </el-descriptions-item>
            <el-descriptions-item label="领退料单据">
              {{ dashboard.todayDocuments.workshopMaterialCount }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-title">累计数量</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="累计入库数量">
              {{ dashboard.cumulativeDocuments.inbound.totalQty }}
            </el-descriptions-item>
            <el-descriptions-item label="累计出库数量">
              {{ dashboard.cumulativeDocuments.outbound.totalQty }}
            </el-descriptions-item>
            <el-descriptions-item label="累计领退料数量">
              {{ dashboard.cumulativeDocuments.workshopMaterial.totalQty }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="section-row">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-title">最近趋势</div>
          </template>
          <el-table :data="trendRows" stripe height="360" v-loading="loading">
            <el-table-column prop="date" label="日期" min-width="120" />
            <el-table-column prop="trendType" label="类型" min-width="140">
              <template #default="{ row }">
                {{ formatTrendType(row.trendType) }}
              </template>
            </el-table-column>
            <el-table-column prop="documentCount" label="单据数" min-width="90" />
            <el-table-column prop="totalQty" label="总数量" min-width="120" />
            <el-table-column prop="totalAmount" label="总金额" min-width="120" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card shadow="never">
          <template #header>
            <div class="card-title">库存分类 Top 5</div>
          </template>
          <el-table :data="categoryRows" stripe height="360" v-loading="loading">
            <el-table-column prop="categoryName" label="分类" min-width="140" />
            <el-table-column prop="materialCount" label="物料数" min-width="90" />
            <el-table-column prop="balanceCount" label="库存记录" min-width="110" />
            <el-table-column prop="totalQuantityOnHand" label="库存总量" min-width="120" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="ReportingHome">
import { computed, onMounted, ref } from "vue";
import {
  getMaterialCategorySummary,
  getReportingHome,
  getTrendSeries,
} from "@/api/reporting";
import useUserStore from "@/store/modules/user";

const userStore = useUserStore();
const loading = ref(false);

const dashboard = ref({
  inventory: {
    activeMaterialCount: 0,
    activeWorkshopCount: 0,
    totalQuantityOnHand: "0.000000",
    lowStockCount: 0,
  },
  todayDocuments: {
    inboundCount: 0,
    outboundCount: 0,
    workshopMaterialCount: 0,
  },
  cumulativeDocuments: {
    inbound: { totalQty: "0.000000" },
    outbound: { totalQty: "0.000000" },
    workshopMaterial: { totalQty: "0.000000" },
  },
});

const trendRows = ref([]);
const categoryRows = ref([]);

const metricCards = computed(() => [
  {
    label: "在库物料数",
    value: dashboard.value.inventory.activeMaterialCount,
  },
  {
    label: "活跃车间数",
    value: dashboard.value.inventory.activeWorkshopCount,
  },
  {
    label: "库存总量",
    value: dashboard.value.inventory.totalQuantityOnHand,
  },
  {
    label: "低库存项",
    value: dashboard.value.inventory.lowStockCount,
  },
]);

function getRecentDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

function formatTrendType(value) {
  const labelMap = {
    ALL: "全部",
    INBOUND: "入库",
    OUTBOUND: "出库",
    WORKSHOP_MATERIAL: "领退料",
  };
  return labelMap[value] || value;
}

async function loadDashboardData() {
  loading.value = true;
  try {
    const { dateFrom, dateTo } = getRecentDateRange();
    const [homeResponse, trendResponse, categoryResponse] = await Promise.all([
      getReportingHome(),
      getTrendSeries({ dateFrom, dateTo }),
      getMaterialCategorySummary({ limit: 5, offset: 0 }),
    ]);

    dashboard.value = homeResponse.data || dashboard.value;
    trendRows.value = trendResponse.data?.items || [];
    categoryRows.value = categoryResponse.data?.items || [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadDashboardData();
});
</script>

<style scoped lang="scss">
.reporting-home {
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    h2 {
      margin: 0 0 4px;
      font-size: 24px;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: #606266;
    }
  }

  .section-row {
    margin-bottom: 16px;
  }

  .metric-card {
    .metric-label {
      color: #909399;
      font-size: 14px;
      margin-bottom: 8px;
    }

    .metric-value {
      color: #303133;
      font-size: 28px;
      font-weight: 600;
      line-height: 1.2;
      word-break: break-word;
    }
  }

  .card-title {
    font-weight: 600;
    color: #303133;
  }
}
</style>
