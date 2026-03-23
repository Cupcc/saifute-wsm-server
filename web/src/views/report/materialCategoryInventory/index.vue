<script setup>
import { getCurrentInstance, onMounted, ref } from "vue";
import { getMaterialCategoryInventoryStatistics } from "@/api/report.js";
import { selectSaifuteInventoryListGroupByMaterial } from "@/api/stock/inventory.js"; // 导入库存物料API
import { formatDate } from "@/utils/index.js";

const { proxy } = getCurrentInstance();

const reportData = ref([]);
const loading = ref(false);
const dateRange = ref(["", ""]);
const materialId = ref("");
const materialType = ref([]);
const materialName = ref("");
const materialCode = ref("");
const specification = ref("");
const materialLoading = ref(false);
const materialOptions = ref([]);

const { saifute_material_category } = proxy.useDict(
  "saifute_material_category",
);

// 搜索物料选项
const searchMaterial = async (query) => {
  materialLoading.value = true;
  try {
    const params = {};
    if (query) {
      params.query = query; // 传递用户输入的查询词
    }
    if (materialType.value) {
      params.category = materialType.value;
    }
    const response = await selectSaifuteInventoryListGroupByMaterial(params);
    materialOptions.value = response.rows || [];
  } catch (error) {
    console.error("获取物料列表失败:", error);
    materialOptions.value = [];
  } finally {
    materialLoading.value = false;
  }
};

// 为数据添加唯一标识符
const addUniqueKeys = (data, parentKey = "") => {
  if (!data || !Array.isArray(data)) return [];

  return data.map((item, index) => {
    const uniqueKey =
      `${parentKey}-${item.categoryName}-${item.materialName}-${index}`.replace(
        /[^a-zA-Z0-9-_]/g,
        "_",
      );
    const newItem = { ...item, uniqueKey };

    if (item.children && Array.isArray(item.children)) {
      newItem.children = addUniqueKeys(item.children, uniqueKey);
    }

    return newItem;
  });
};

// 默认日期范围
const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return [
    formatDate(startDate, "YYYY-MM-DD"),
    formatDate(endDate, "YYYY-MM-DD"),
  ];
};

// 初始化日期范围
dateRange.value = getDefaultDateRange();

// 查询报表数据
const fetchReportData = async () => {
  if (!dateRange.value[0] || !dateRange.value[1]) {
    console.error("请选择完整的日期范围");
    return;
  }

  try {
    loading.value = true;
    const params = {
      beginDate: dateRange.value[0],
      endDate: dateRange.value[1],
    };

    // 添加可选参数
    if (materialId.value) {
      params.materialId = materialId.value;
    }
    if (materialType.value && materialType.value.length > 0) {
      params.materialType = materialType.value.join(",");
    }
    if (materialName.value) {
      params.materialName = materialName.value;
    }
    if (materialCode.value) {
      params.materialCode = materialCode.value;
    }
    if (specification.value) {
      params.specification = specification.value;
    }

    const response = await getMaterialCategoryInventoryStatistics(params);
    reportData.value = addUniqueKeys(response.data || []);
  } catch (error) {
    console.error("获取报表数据失败:", error);
    reportData.value = [];
  } finally {
    loading.value = false;
  }
};

// 重置查询条件
const resetQuery = () => {
  materialId.value = "";
  materialType.value = [];
  materialName.value = "";
  materialCode.value = "";
  specification.value = "";

  dateRange.value = getDefaultDateRange();

  fetchReportData();
};

// 导出Excel
const handleExport = () => {
  const params = {
    beginDate: dateRange.value[0],
    endDate: dateRange.value[1],
  };

  // 添加可选参数
  if (materialId.value) {
    params.materialId = materialId.value;
  }
  if (materialType.value && materialType.value.length > 0) {
    params.materialType = materialType.value.join(",");
  }
  if (materialName.value) {
    params.materialName = materialName.value;
  }
  if (materialCode.value) {
    params.materialCode = materialCode.value;
  }
  if (specification.value) {
    params.specification = specification.value;
  }

  proxy.download(
    "report/material/category/inventory/statistics/export",
    params,
    `物料分类库存统计表_${new Date().getTime()}.xlsx`,
  );
};

// 初始化加载数据
onMounted(() => {
  fetchReportData();
});
</script>

<template>
  <div class="app-container">
    <h2>物料分类统计表</h2>

    <!-- 搜索区域 -->
    <el-form :inline="true" label-width="100px" class="search-form">
      <el-form-item label="类型：" prop="materialType">
        <el-select
          v-model="materialType"
          placeholder="请选择类型"
          clearable
          multiple
          collapse-tags
          collapse-tags-tooltip
          style="width: 200px"
        >
          <el-option
            v-for="dict in saifute_material_category"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="物料：">
        <el-select
          v-model="materialId"
          filterable
          remote
          reserve-keyword
          placeholder="请输入物料名称或规格型号搜索"
          :remote-method="searchMaterial"
          :loading="materialLoading"
          clearable
          style="width: 240px"
        >
          <el-option
            v-for="item in materialOptions"
            :key="item.materialId"
            :label="item.materialName + ' ' + item.specification"
            :value="item.materialId"
          >
            <span style="float: left">{{ item.materialCode }}</span>
            <span style="float: left; margin-left: 10px">{{
              item.materialName
            }}</span>
            <span
              style="
                float: right;
                color: #8492a6;
                font-size: 13px;
                margin-left: 20px;
              "
              >{{ item.specification }}</span
            >
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="物料编码：">
        <el-input
          v-model="materialCode"
          placeholder="请输入物料编码"
          clearable
          style="width: 200px"
          @keyup.enter="fetchReportData"
        />
      </el-form-item>

      <el-form-item label="物料名称：">
        <el-input
          v-model="materialName"
          placeholder="请输入物料名称"
          clearable
          style="width: 200px"
          @keyup.enter="fetchReportData"
        />
      </el-form-item>

      <el-form-item label="规格型号：">
        <el-input
          v-model="specification"
          placeholder="请输入规格型号"
          clearable
          style="width: 200px"
          @keyup.enter="fetchReportData"
        />
      </el-form-item>

      <el-form-item label="日期区间：">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 240px"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="fetchReportData" :loading="loading"
          >搜索</el-button
        >
        <el-button @click="resetQuery">重置</el-button>
        <el-button type="warning" @click="handleExport">导出Excel</el-button>
      </el-form-item>
    </el-form>

    <!-- 数据表格 -->
    <adaptive-table
      :data="reportData"
      v-loading="loading"
      border
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      row-key="uniqueKey"
      style="width: 100%; margin-top: 20px"
    >
      <el-table-column prop="categoryName" label="分类名称" align="left" />
      <el-table-column prop="materialName" label="名称" align="center" />
      <el-table-column prop="specification" label="规格型号" align="center" />

      <!-- 期初库存 -->
      <el-table-column label="期初结存" align="center">
        <el-table-column prop="initialQuantity" label="数量" align="center" />
        <el-table-column prop="initialValue" label="金额" align="center" />
      </el-table-column>

      <!-- 本期入库 -->
      <el-table-column label="本期入库" align="center">
        <el-table-column
          prop="inboundPeriodQuantity"
          label="数量"
          align="center"
        />
        <el-table-column
          prop="inboundPeriodValue"
          label="金额"
          align="center"
        />
      </el-table-column>

      <!-- 本期出库 -->
      <el-table-column label="本期出库" align="center">
        <el-table-column
          prop="outboundPeriodQuantity"
          label="数量"
          align="center"
        />
        <el-table-column
          prop="outboundPeriodValue"
          label="金额"
          align="center"
        />
      </el-table-column>

      <!-- 本期退货 -->
      <el-table-column label="本期退货" align="center">
        <el-table-column
          prop="returnPeriodQuantity"
          label="数量"
          align="center"
        />
        <el-table-column prop="returnPeriodValue" label="金额" align="center" />
      </el-table-column>

      <!-- 期末结存 -->
      <el-table-column label="期末结存" align="center">
        <el-table-column prop="endingQuantity" label="数量" align="center" />
        <el-table-column prop="endingValue" label="金额" align="center" />
      </el-table-column>
    </adaptive-table>

    <!-- 空数据提示 -->
    <el-empty
      v-if="!loading && reportData.length === 0"
      description="暂无数据"
    />
  </div>
</template>

<style scoped lang="scss">
.app-container {
  padding: 20px;
}

.search-form {
  padding: 20px 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 20px;
}

.el-table {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
