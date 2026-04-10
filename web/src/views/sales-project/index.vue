<template>
  <div class="app-container sales-project-page">
    <el-alert
      title="销售项目页面用于维护项目主档、查看项目供货读模型，并按项目上下文生成销售出库草稿。"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <el-form
      ref="queryRef"
      :model="queryParams"
      :inline="true"
      v-show="showSearch"
      label-width="96px"
    >
      <el-form-item label="项目编码" prop="salesProjectCode">
        <el-input
          v-model="queryParams.salesProjectCode"
          placeholder="请输入项目编码"
          clearable
          style="width: 220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="项目名称" prop="salesProjectName">
        <el-input
          v-model="queryParams.salesProjectName"
          placeholder="请输入项目名称"
          clearable
          style="width: 220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="客户">
        <el-select
          v-model="queryParams.customerId"
          filterable
          remote
          reserve-keyword
          clearable
          placeholder="请输入客户名称搜索"
          style="width: 220px"
          :remote-method="searchCustomers"
          :loading="customerLoading"
        >
          <el-option
            v-for="item in customerOptions"
            :key="item.customerId"
            :label="item.customerName"
            :value="item.customerId"
          >
            <span style="float: left">{{ item.customerName }}</span>
            <span style="float: right; color: #909399">{{ item.customerCode }}</span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="车间">
        <el-select
          v-model="queryParams.workshopId"
          filterable
          remote
          reserve-keyword
          clearable
          placeholder="请输入车间名称搜索"
          style="width: 220px"
          :remote-method="searchWorkshops"
          :loading="workshopLoading"
        >
          <el-option
            v-for="item in workshopOptions"
            :key="item.workshopId"
            :label="item.workshopName"
            :value="item.workshopId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="业务日期">
        <el-date-picker
          v-model="daterangeBizDate"
          value-format="YYYY-MM-DD"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          v-hasPermi="['sales:project:create']"
          @click="handleAdd"
        >
          新增项目
        </el-button>
      </el-col>
      <right-toolbar
        v-model:showSearch="showSearch"
        :columns="columns"
        @queryTable="getList"
      />
    </el-row>

    <adaptive-table border stripe v-loading="loading" :data="rows">
      <el-table-column
        v-if="columns[0].visible"
        label="项目编码"
        prop="salesProjectCode"
        min-width="160"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            v-hasPermi="['sales:project:get']"
            @click="handleOpenDetail(row)"
          >
            {{ row.salesProjectCode }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column
        v-if="columns[1].visible"
        label="项目名称"
        prop="salesProjectName"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        v-if="columns[2].visible"
        label="业务日期"
        prop="bizDate"
        width="120"
      >
        <template #default="{ row }">
          {{ formatDate(row.bizDate) }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="columns[3].visible"
        label="客户"
        prop="customerName"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        v-if="columns[4].visible"
        label="负责人"
        prop="managerName"
        min-width="140"
        show-overflow-tooltip
      />
      <el-table-column
        v-if="columns[5].visible"
        label="车间"
        prop="workshopName"
        min-width="140"
        show-overflow-tooltip
      />
      <el-table-column
        v-if="columns[6].visible"
        label="目标数量"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          {{ formatNumber(row.summary?.totalTargetQty) }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="columns[7].visible"
        label="净发货"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          {{ formatNumber(row.summary?.totalNetShipmentQty) }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="columns[8].visible"
        label="待供货"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          {{ formatNumber(row.summary?.totalPendingSupplyQty) }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="columns[9].visible"
        label="备注"
        prop="remark"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column label="操作" width="260" align="center" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            v-hasPermi="['sales:project:get']"
            @click="handleOpenDetail(row)"
          >
            详情
          </el-button>
          <el-button
            link
            type="primary"
            v-hasPermi="['sales:project:update']"
            @click="handleEdit(row)"
          >
            修改
          </el-button>
          <el-button
            link
            type="danger"
            v-hasPermi="['sales:project:void']"
            @click="handleVoid(row)"
          >
            作废
          </el-button>
        </template>
      </el-table-column>
    </adaptive-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <el-dialog
      v-model="projectFormOpen"
      :title="projectForm.projectId ? '修改销售项目' : '新增销售项目'"
      width="1180px"
      append-to-body
      draggable
    >
      <div v-loading="projectFormLoading || projectFormSubmitting">
        <el-form
          ref="projectFormRef"
          :model="projectForm"
          :rules="projectFormRules"
          label-width="96px"
        >
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="项目编码" prop="salesProjectCode">
                <el-input
                  v-model="projectForm.salesProjectCode"
                  maxlength="64"
                  placeholder="请输入项目编码"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目名称" prop="salesProjectName">
                <el-input
                  v-model="projectForm.salesProjectName"
                  maxlength="128"
                  placeholder="请输入项目名称"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="业务日期" prop="bizDate">
                <el-date-picker
                  v-model="projectForm.bizDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="请选择业务日期"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="车间" prop="workshopId">
                <el-select
                  v-model="projectForm.workshopId"
                  filterable
                  remote
                  reserve-keyword
                  clearable
                  placeholder="请输入车间名称搜索"
                  style="width: 100%"
                  :remote-method="searchWorkshops"
                  :loading="workshopLoading"
                >
                  <el-option
                    v-for="item in workshopOptions"
                    :key="item.workshopId"
                    :label="item.workshopName"
                    :value="item.workshopId"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="客户">
                <el-select
                  v-model="projectForm.customerId"
                  filterable
                  remote
                  reserve-keyword
                  clearable
                  placeholder="请输入客户名称搜索"
                  style="width: 100%"
                  :remote-method="searchCustomers"
                  :loading="customerLoading"
                >
                  <el-option
                    v-for="item in customerOptions"
                    :key="item.customerId"
                    :label="item.customerName"
                    :value="item.customerId"
                  >
                    <span style="float: left">{{ item.customerName }}</span>
                    <span style="float: right; color: #909399">{{ item.customerCode }}</span>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="负责人">
                <el-select
                  v-model="projectForm.managerPersonnelId"
                  filterable
                  remote
                  reserve-keyword
                  clearable
                  placeholder="请输入人员姓名搜索"
                  style="width: 100%"
                  :remote-method="searchPersonnelOptions"
                  :loading="personnelLoading"
                >
                  <el-option
                    v-for="item in personnelOptions"
                    :key="item.personnelId"
                    :label="item.name"
                    :value="item.personnelId"
                  >
                    <span style="float: left">{{ item.name }}</span>
                    <span style="float: right; color: #909399">{{ item.code }}</span>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="备注">
            <el-input
              v-model="projectForm.remark"
              type="textarea"
              :rows="2"
              maxlength="500"
              show-word-limit
              placeholder="请输入备注"
            />
          </el-form-item>

          <el-divider content-position="left">项目物料</el-divider>

          <div class="detail-toolbar">
            <el-button type="primary" plain icon="Plus" @click="handleAddMaterialLine">
              新增物料
            </el-button>
            <span class="detail-tip">
              项目物料目标量是 Phase 1 的稳定上下文，用来解释待供货与项目统计。
            </span>
          </div>

          <el-table :data="projectForm.materialLines" border stripe max-height="360">
            <el-table-column type="index" width="56" align="center" />
            <el-table-column label="物料" min-width="260">
              <template #default="{ row }">
                <el-select
                  v-model="row.materialId"
                  filterable
                  remote
                  reserve-keyword
                  clearable
                  placeholder="请输入物料名称或编码"
                  style="width: 100%"
                  :remote-method="searchMaterials"
                  :loading="materialLoading"
                  @change="handleMaterialChange(row)"
                >
                  <el-option
                    v-for="item in materialOptions"
                    :key="item.materialId"
                    :label="`${item.materialCode} / ${item.materialName}`"
                    :value="item.materialId"
                  >
                    <span style="float: left; color: #ff7171">{{ item.materialCode }}</span>
                    <span style="float: left; margin-left: 10px">{{ item.materialName }}</span>
                    <span style="float: right; color: #909399">{{ item.specification }}</span>
                  </el-option>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="物料编码" min-width="120">
              <template #default="{ row }">
                {{ row.materialCode || "-" }}
              </template>
            </el-table-column>
            <el-table-column label="物料名称" min-width="160">
              <template #default="{ row }">
                {{ row.materialName || "-" }}
              </template>
            </el-table-column>
            <el-table-column label="规格型号" min-width="140">
              <template #default="{ row }">
                {{ row.specification || "-" }}
              </template>
            </el-table-column>
            <el-table-column label="目标数量" width="140">
              <template #default="{ row }">
                <el-input
                  v-model="row.quantity"
                  placeholder="数量"
                  @input="normalizeDecimalField(row, 'quantity', 6)"
                />
              </template>
            </el-table-column>
            <el-table-column label="参考单价" width="140">
              <template #default="{ row }">
                <el-input
                  v-model="row.unitPrice"
                  placeholder="单价"
                  @input="normalizeDecimalField(row, 'unitPrice', 2)"
                />
              </template>
            </el-table-column>
            <el-table-column label="目标金额" width="120" align="right">
              <template #default="{ row }">
                {{ formatAmount(computeLineAmount(row)) }}
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.remark" placeholder="备注" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="96" align="center" fixed="right">
              <template #default="{ $index }">
                <el-button
                  link
                  type="danger"
                  icon="Delete"
                  @click="handleRemoveMaterialLine($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="projectFormOpen = false">取 消</el-button>
          <el-button
            type="primary"
            :loading="projectFormSubmitting"
            @click="submitProjectForm"
          >
            保 存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer
      v-model="detailOpen"
      title="销售项目详情"
      size="1280px"
      append-to-body
      :destroy-on-close="false"
    >
      <div v-loading="detailLoading" class="detail-panel">
        <template v-if="detailProject">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="项目编码">
              {{ detailProject.salesProjectCode || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="项目名称">
              {{ detailProject.salesProjectName || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="业务日期">
              {{ formatDate(detailProject.bizDate) }}
            </el-descriptions-item>
            <el-descriptions-item label="客户">
              {{ detailProject.customerName || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="负责人">
              {{ detailProject.managerName || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="车间">
              {{ detailProject.workshopName || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="库存范围">
              {{ detailProject.stockScopeName || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="备注">
              {{ detailProject.remark || "-" }}
            </el-descriptions-item>
          </el-descriptions>

          <el-row :gutter="12" class="summary-grid">
            <el-col v-for="card in summaryCards" :key="card.label" :xs="12" :sm="8" :lg="4">
              <div class="summary-card">
                <div class="summary-label">{{ card.label }}</div>
                <div class="summary-value">{{ card.value }}</div>
              </div>
            </el-col>
          </el-row>

          <div class="detail-toolbar">
            <div class="detail-tip">
              读模型字段复用主仓库存与销售出库/退货事实；生成草稿后仍需在销售出库编辑器中正式提交。
            </div>
            <el-button
              type="primary"
              v-hasPermi="['sales:project:draft']"
              @click="handleGenerateDraft"
            >
              生成出库草稿
            </el-button>
          </div>

          <el-table
            ref="detailTableRef"
            :data="detailMaterials"
            border
            stripe
            max-height="520"
            @selection-change="handleDetailSelectionChange"
          >
            <el-table-column type="selection" width="48" align="center" />
            <el-table-column label="物料编码" prop="materialCode" min-width="120" />
            <el-table-column label="物料名称" prop="materialName" min-width="160" />
            <el-table-column label="规格型号" prop="specification" min-width="140" />
            <el-table-column label="单位" prop="unitCode" width="90" />
            <el-table-column label="目标数量" width="110" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.targetQty) }}
              </template>
            </el-table-column>
            <el-table-column label="当前库存" width="110" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.currentInventoryQty) }}
              </template>
            </el-table-column>
            <el-table-column label="累计出库" width="110" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.outboundQty) }}
              </template>
            </el-table-column>
            <el-table-column label="累计退货" width="110" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.returnQty) }}
              </template>
            </el-table-column>
            <el-table-column label="净发货" width="110" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.netShipmentQty) }}
              </template>
            </el-table-column>
            <el-table-column label="待供货" width="110" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.pendingSupplyQty) }}
              </template>
            </el-table-column>
            <el-table-column label="草稿数量" width="140">
              <template #default="{ row }">
                <el-input
                  v-model="row.draftQty"
                  placeholder="数量"
                  @input="normalizeDecimalField(row, 'draftQty', 6)"
                />
              </template>
            </el-table-column>
            <el-table-column label="参考单价" width="120" align="right">
              <template #default="{ row }">
                {{ formatAmount(row.targetUnitPrice) }}
              </template>
            </el-table-column>
            <el-table-column label="备注" prop="remark" min-width="160" show-overflow-tooltip />
          </el-table>
        </template>
      </div>
    </el-drawer>

    <sales-order-editor-dialog
      v-model="draftEditorOpen"
      mode="order"
      :draft-payload="draftPayload"
      @submitted="handleDraftSubmitted"
    />
  </div>
</template>

<script setup name="SalesProjectLedgerPage">
import { computed, getCurrentInstance, reactive, ref } from "vue";
import { listCustomerByKeyword } from "@/api/base/customer";
import { listMaterialByCodeOrName } from "@/api/base/material";
import { listPersonnel } from "@/api/base/personnel";
import { listByNameOrContact } from "@/api/base/workshop";
import {
  createSalesProject,
  createSalesProjectOutboundDraft,
  getSalesProject,
  getSalesProjectMaterials,
  listSalesProjects,
  updateSalesProject,
  voidSalesProject,
} from "@/api/sales-project";
import SalesOrderEditorDialog from "@/views/sales/components/SalesOrderEditorDialog.vue";
import { formatDateToYYYYMMDD } from "@/utils/orderNumber";

const { proxy } = getCurrentInstance();

const queryRef = ref();
const projectFormRef = ref();
const detailTableRef = ref();

const showSearch = ref(true);
const loading = ref(false);
const rows = ref([]);
const total = ref(0);
const daterangeBizDate = ref([]);

const customerOptions = ref([]);
const workshopOptions = ref([]);
const personnelOptions = ref([]);
const materialOptions = ref([]);

const customerLoading = ref(false);
const workshopLoading = ref(false);
const personnelLoading = ref(false);
const materialLoading = ref(false);

const projectFormOpen = ref(false);
const projectFormLoading = ref(false);
const projectFormSubmitting = ref(false);

const detailOpen = ref(false);
const detailLoading = ref(false);
const detailProject = ref(null);
const detailMaterials = ref([]);
const selectedDetailRows = ref([]);

const draftEditorOpen = ref(false);
const draftPayload = ref(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 30,
  salesProjectCode: "",
  salesProjectName: "",
  customerId: undefined,
  workshopId: undefined,
});

const columns = ref([
  { key: 0, label: "项目编码", visible: true },
  { key: 1, label: "项目名称", visible: true },
  { key: 2, label: "业务日期", visible: true },
  { key: 3, label: "客户", visible: true },
  { key: 4, label: "负责人", visible: true },
  { key: 5, label: "车间", visible: true },
  { key: 6, label: "目标数量", visible: true },
  { key: 7, label: "净发货", visible: true },
  { key: 8, label: "待供货", visible: true },
  { key: 9, label: "备注", visible: true },
]);

const projectForm = reactive(buildEmptyProjectForm());

const projectFormRules = {
  salesProjectCode: [
    { required: true, message: "项目编码不能为空", trigger: "blur" },
  ],
  salesProjectName: [
    { required: true, message: "项目名称不能为空", trigger: "blur" },
  ],
  bizDate: [{ required: true, message: "业务日期不能为空", trigger: "change" }],
  workshopId: [{ required: true, message: "车间不能为空", trigger: "change" }],
};

const summaryCards = computed(() => {
  const summary = detailProject.value?.summary ?? {};
  return [
    { label: "目标数量", value: formatNumber(summary.totalTargetQty) },
    {
      label: "目标金额",
      value: formatAmount(summary.totalTargetAmount),
    },
    {
      label: "当前库存",
      value: formatNumber(summary.totalCurrentInventoryQty),
    },
    { label: "累计出库", value: formatNumber(summary.totalOutboundQty) },
    { label: "累计退货", value: formatNumber(summary.totalReturnQty) },
    {
      label: "净发货",
      value: formatNumber(summary.totalNetShipmentQty),
    },
    {
      label: "净发货金额",
      value: formatAmount(summary.totalNetShipmentAmount),
    },
    {
      label: "净发货成本",
      value: formatAmount(summary.totalNetShipmentCostAmount),
    },
    {
      label: "待供货",
      value: formatNumber(summary.totalPendingSupplyQty),
    },
  ];
});

function buildEmptyMaterialLine() {
  return {
    lineId: undefined,
    materialId: undefined,
    materialCode: "",
    materialName: "",
    specification: "",
    unitCode: "",
    quantity: "",
    unitPrice: "",
    remark: "",
  };
}

function buildEmptyProjectForm() {
  return {
    projectId: undefined,
    salesProjectCode: "",
    salesProjectName: "",
    bizDate: formatDateToYYYYMMDD(new Date()),
    customerId: undefined,
    customerName: "",
    managerPersonnelId: undefined,
    managerName: "",
    workshopId: undefined,
    workshopName: "",
    remark: "",
    materialLines: [buildEmptyMaterialLine()],
  };
}

function resetProjectFormState() {
  Object.assign(projectForm, buildEmptyProjectForm());
  projectFormRef.value?.clearValidate();
}

function toInputString(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  return String(value);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return String(value).slice(0, 10);
}

function formatNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

function computeLineAmount(line) {
  return Number(line.quantity || 0) * Number(line.unitPrice || 0);
}

function normalizeDecimalField(row, key, scale) {
  const rawValue = row[key];
  if (typeof rawValue !== "string") {
    return;
  }

  row[key] = rawValue
    .replace(/[^\d.]/g, "")
    .replace(/^\./, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^(\d+\.\d{0,})(\..*)$/, "$1")
    .replace(
      new RegExp(`^(\\d+)(\\.\\d{0,${scale}}).*?$`),
      (_match, integerPart, decimalPart) => `${integerPart}${decimalPart}`,
    );
}

function ensureCustomerOption(item) {
  if (!item?.customerId) {
    return;
  }
  if (customerOptions.value.some((option) => option.customerId === item.customerId)) {
    return;
  }
  customerOptions.value.unshift({
    customerId: item.customerId,
    customerName: item.customerName || `客户 ${item.customerId}`,
    customerCode: item.customerCode || "",
  });
}

function ensureWorkshopOption(item) {
  if (!item?.workshopId) {
    return;
  }
  if (workshopOptions.value.some((option) => option.workshopId === item.workshopId)) {
    return;
  }
  workshopOptions.value.unshift({
    workshopId: item.workshopId,
    workshopName: item.workshopName || `车间 ${item.workshopId}`,
  });
}

function ensurePersonnelOption(item) {
  if (!item?.personnelId && !item?.name) {
    return;
  }
  if (
    item.personnelId &&
    personnelOptions.value.some((option) => option.personnelId === item.personnelId)
  ) {
    return;
  }
  personnelOptions.value.unshift({
    personnelId: item.personnelId,
    name: item.name || "未命名人员",
    code: item.code || "",
  });
}

function ensureMaterialOption(item) {
  if (!item?.materialId) {
    return;
  }
  if (materialOptions.value.some((option) => option.materialId === item.materialId)) {
    return;
  }
  materialOptions.value.unshift({
    materialId: item.materialId,
    materialCode: item.materialCode || "",
    materialName: item.materialName || "",
    specification: item.specification || "",
  });
}

async function searchCustomers(keyword) {
  customerLoading.value = true;
  try {
    const response = await listCustomerByKeyword(keyword);
    customerOptions.value = response.rows || [];
  } finally {
    customerLoading.value = false;
  }
}

async function searchWorkshops(keyword) {
  workshopLoading.value = true;
  try {
    const response = await listByNameOrContact({
      workshopName: keyword,
    });
    workshopOptions.value = response.rows || [];
  } finally {
    workshopLoading.value = false;
  }
}

async function searchPersonnelOptions(keyword) {
  personnelLoading.value = true;
  try {
    const response = await listPersonnel({
      name: keyword,
      pageNum: 1,
      pageSize: 100,
    });
    personnelOptions.value = response.rows || [];
  } finally {
    personnelLoading.value = false;
  }
}

async function searchMaterials(keyword) {
  materialLoading.value = true;
  try {
    const response = await listMaterialByCodeOrName({
      materialCode: keyword,
      pageNum: 1,
      pageSize: 100,
    });
    materialOptions.value = response.rows || [];
  } finally {
    materialLoading.value = false;
  }
}

function buildQuery() {
  return {
    ...queryParams,
    params:
      daterangeBizDate.value.length === 2
        ? {
            beginTime: daterangeBizDate.value[0],
            endTime: daterangeBizDate.value[1],
          }
        : undefined,
  };
}

async function getList() {
  loading.value = true;
  try {
    const response = await listSalesProjects(buildQuery());
    rows.value = response.rows || [];
    total.value = response.total || 0;
  } finally {
    loading.value = false;
  }
}

function handleQuery() {
  queryParams.pageNum = 1;
  getList();
}

function resetQuery() {
  daterangeBizDate.value = [];
  proxy.resetForm("queryRef");
  queryParams.pageNum = 1;
  queryParams.pageSize = 30;
  handleQuery();
}

function handleAdd() {
  resetProjectFormState();
  projectFormOpen.value = true;
}

async function handleEdit(row) {
  projectFormOpen.value = true;
  projectFormLoading.value = true;
  try {
    resetProjectFormState();
    const response = await getSalesProject(row.projectId);
    const data = response.data || {};
    projectForm.projectId = data.projectId;
    projectForm.salesProjectCode = data.salesProjectCode || "";
    projectForm.salesProjectName = data.salesProjectName || "";
    projectForm.bizDate = formatDate(data.bizDate) || projectForm.bizDate;
    projectForm.customerId = data.customerId ?? undefined;
    projectForm.customerName = data.customerName || "";
    projectForm.managerPersonnelId = data.managerPersonnelId ?? undefined;
    projectForm.managerName = data.managerName || "";
    projectForm.workshopId = data.workshopId ?? undefined;
    projectForm.workshopName = data.workshopName || "";
    projectForm.remark = data.remark || "";
    projectForm.materialLines =
      Array.isArray(data.materialLines) && data.materialLines.length > 0
        ? data.materialLines.map((line) => ({
            lineId: line.lineId,
            materialId: line.materialId,
            materialCode: line.materialCode || "",
            materialName: line.materialName || "",
            specification: line.specification || "",
            unitCode: line.unitCode || "",
            quantity: toInputString(line.quantity),
            unitPrice: toInputString(line.unitPrice),
            remark: line.remark || "",
          }))
        : [buildEmptyMaterialLine()];

    ensureCustomerOption({
      customerId: projectForm.customerId,
      customerName: projectForm.customerName,
      customerCode: data.customerCode,
    });
    ensureWorkshopOption({
      workshopId: projectForm.workshopId,
      workshopName: projectForm.workshopName,
    });
    ensurePersonnelOption({
      personnelId: projectForm.managerPersonnelId,
      name: projectForm.managerName,
      code: "",
    });
    for (const line of projectForm.materialLines) {
      ensureMaterialOption(line);
    }
  } finally {
    projectFormLoading.value = false;
  }
}

async function handleVoid(row) {
  try {
    const { value } = await proxy.$modal.prompt("请输入作废说明（可选）");
    await voidSalesProject(row.projectId, {
      voidReason: value,
    });
    proxy.$modal.msgSuccess("销售项目作废成功");
    getList();
  } catch {}
}

async function handleOpenDetail(row) {
  detailOpen.value = true;
  detailLoading.value = true;
  detailProject.value = null;
  detailMaterials.value = [];
  selectedDetailRows.value = [];
  try {
    const [projectResponse, materialsResponse] = await Promise.all([
      getSalesProject(row.projectId),
      getSalesProjectMaterials(row.projectId),
    ]);
    const project = projectResponse.data || {};
    const materials = Array.isArray(materialsResponse.data?.materials)
      ? materialsResponse.data.materials
      : [];
    detailProject.value = {
      ...project,
      summary: materialsResponse.data?.summary ?? null,
    };
    detailMaterials.value = materials.map((item) => ({
      ...item,
      draftQty: item.pendingSupplyQty > 0 ? toInputString(item.pendingSupplyQty) : "",
    }));
  } finally {
    detailLoading.value = false;
  }
}

function handleAddMaterialLine() {
  projectForm.materialLines.push(buildEmptyMaterialLine());
}

function handleRemoveMaterialLine(index) {
  projectForm.materialLines.splice(index, 1);
  if (projectForm.materialLines.length === 0) {
    projectForm.materialLines.push(buildEmptyMaterialLine());
  }
}

function handleMaterialChange(row) {
  const material = materialOptions.value.find((item) => item.materialId === row.materialId);
  if (!material) {
    return;
  }
  row.materialCode = material.materialCode || "";
  row.materialName = material.materialName || "";
  row.specification = material.specification || "";
}

async function validateProjectForm() {
  const valid = await projectFormRef.value?.validate().catch(() => false);
  if (!valid) {
    return false;
  }

  if (
    !Array.isArray(projectForm.materialLines) ||
    projectForm.materialLines.length === 0
  ) {
    proxy.$modal.msgError("至少需要一条项目物料");
    return false;
  }

  for (let index = 0; index < projectForm.materialLines.length; index++) {
    const line = projectForm.materialLines[index];
    if (!line.materialId) {
      proxy.$modal.msgError(`第 ${index + 1} 行物料不能为空`);
      return false;
    }
    if (!line.quantity) {
      proxy.$modal.msgError(`第 ${index + 1} 行目标数量不能为空`);
      return false;
    }
  }
  return true;
}

function buildProjectPayload() {
  return {
    salesProjectCode: projectForm.salesProjectCode,
    salesProjectName: projectForm.salesProjectName,
    bizDate: projectForm.bizDate,
    customerId: projectForm.customerId,
    managerPersonnelId: projectForm.managerPersonnelId,
    workshopId: projectForm.workshopId,
    remark: projectForm.remark,
    materialLines: projectForm.materialLines.map((line) => ({
      ...(line.lineId ? { lineId: line.lineId } : {}),
      materialId: line.materialId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      remark: line.remark,
    })),
  };
}

async function submitProjectForm() {
  if (!(await validateProjectForm())) {
    return;
  }

  projectFormSubmitting.value = true;
  try {
    const payload = buildProjectPayload();
    if (projectForm.projectId) {
      await updateSalesProject(projectForm.projectId, payload);
      proxy.$modal.msgSuccess("销售项目修改成功");
    } else {
      await createSalesProject(payload);
      proxy.$modal.msgSuccess("销售项目新增成功");
    }
    projectFormOpen.value = false;
    getList();
  } finally {
    projectFormSubmitting.value = false;
  }
}

function handleDetailSelectionChange(selection) {
  selectedDetailRows.value = selection;
}

function normalizeDraftPayload(draft, project, lines) {
  const normalizedLines = Array.isArray(draft?.lines)
    ? draft.lines.map((line, index) => {
        const sourceLine = lines[index] ?? {};
        return {
          materialId: line.materialId ?? sourceLine.materialId,
          materialCode: line.materialCode ?? sourceLine.materialCode ?? "",
          materialName: line.materialName ?? sourceLine.materialName ?? "",
          specification: line.specification ?? sourceLine.specification ?? "",
          quantity: line.quantity ?? sourceLine.quantity,
          selectedUnitCost: line.selectedUnitCost,
          unitPrice: line.unitPrice ?? sourceLine.unitPrice,
          salesProjectId:
            line.salesProjectId ?? draft.salesProjectId ?? project.projectId,
          salesProjectCode:
            line.salesProjectCode ??
            draft.salesProjectCode ??
            project.salesProjectCode,
          salesProjectName:
            line.salesProjectName ??
            draft.salesProjectName ??
            project.salesProjectName,
          remark: line.remark ?? sourceLine.remark ?? "",
        };
      })
    : lines.map((line) => ({
        materialId: line.materialId,
        materialCode: line.materialCode,
        materialName: line.materialName,
        specification: line.specification,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        salesProjectId: project.projectId,
        salesProjectCode: project.salesProjectCode,
        salesProjectName: project.salesProjectName,
        remark: line.remark || "",
      }));

  return {
    ...draft,
    bizDate: draft?.bizDate || formatDateToYYYYMMDD(new Date()),
    customerId: draft?.customerId ?? project.customerId,
    customerCode: draft?.customerCode ?? project.customerCode,
    customerName: draft?.customerName ?? project.customerName,
    handlerPersonnelId: draft?.handlerPersonnelId ?? project.managerPersonnelId,
    handlerName: draft?.handlerName ?? project.managerName,
    workshopId: draft?.workshopId ?? project.workshopId,
    workshopName: draft?.workshopName ?? project.workshopName,
    salesProjectId: draft?.salesProjectId ?? project.projectId,
    salesProjectCode:
      draft?.salesProjectCode ?? project.salesProjectCode ?? "",
    salesProjectName:
      draft?.salesProjectName ?? project.salesProjectName ?? "",
    remark: draft?.remark ?? project.remark ?? "",
    lines: normalizedLines,
  };
}

async function handleGenerateDraft() {
  if (!detailProject.value) {
    return;
  }

  const selectedRows =
    selectedDetailRows.value.length > 0
      ? selectedDetailRows.value
      : detailMaterials.value.filter((item) => Number(item.draftQty || 0) > 0);

  if (selectedRows.length === 0) {
    proxy.$modal.msgWarning("请先选择至少一条待生成草稿的物料");
    return;
  }

  const lines = selectedRows
    .map((row) => ({
      materialId: row.materialId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      specification: row.specification,
      quantity: row.draftQty || row.pendingSupplyQty,
      unitPrice: row.targetUnitPrice,
      remark: row.remark,
    }))
    .filter((item) => Number(item.quantity || 0) > 0);

  if (lines.length === 0) {
    proxy.$modal.msgWarning("草稿数量必须大于 0");
    return;
  }

  const response = await createSalesProjectOutboundDraft(
    detailProject.value.projectId,
    {
      lines: lines.map((line) => ({
        materialId: line.materialId,
        quantity: toInputString(line.quantity),
        unitPrice: toInputString(line.unitPrice),
        remark: line.remark,
      })),
    },
  );

  draftPayload.value = normalizeDraftPayload(
    response.data ?? {},
    detailProject.value,
    lines,
  );
  draftEditorOpen.value = true;
}

function handleDraftSubmitted() {
  draftEditorOpen.value = false;
  draftPayload.value = null;
  getList();
  if (detailProject.value?.projectId) {
    handleOpenDetail({ projectId: detailProject.value.projectId });
  }
}

void [
  queryRef,
  projectFormRef,
  detailTableRef,
  showSearch,
  loading,
  rows,
  total,
  daterangeBizDate,
  customerOptions,
  workshopOptions,
  personnelOptions,
  materialOptions,
  customerLoading,
  workshopLoading,
  personnelLoading,
  materialLoading,
  projectFormOpen,
  projectFormLoading,
  projectFormSubmitting,
  detailOpen,
  detailLoading,
  detailProject,
  detailMaterials,
  selectedDetailRows,
  draftEditorOpen,
  draftPayload,
  queryParams,
  columns,
  projectForm,
  projectFormRules,
  summaryCards,
  searchCustomers,
  searchWorkshops,
  searchPersonnelOptions,
  searchMaterials,
  handleQuery,
  resetQuery,
  handleAdd,
  handleEdit,
  handleVoid,
  handleOpenDetail,
  handleAddMaterialLine,
  handleRemoveMaterialLine,
  handleMaterialChange,
  submitProjectForm,
  handleDetailSelectionChange,
  handleGenerateDraft,
  handleDraftSubmitted,
  normalizeDecimalField,
  formatDate,
  formatNumber,
  formatAmount,
  computeLineAmount,
];

getList();
</script>

<style scoped lang="scss">
.sales-project-page {
  .detail-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 12px 0;
  }

  .detail-tip {
    color: #909399;
    font-size: 13px;
  }

  .summary-grid {
    margin: 16px 0;
  }

  .summary-card {
    height: 100%;
    padding: 14px 16px;
    border: 1px solid #ebeef5;
    border-radius: 10px;
    background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
  }

  .summary-label {
    color: #909399;
    font-size: 13px;
  }

  .summary-value {
    margin-top: 8px;
    font-size: 22px;
    font-weight: 600;
    color: #303133;
  }

  .detail-panel {
    padding-right: 8px;
  }
}
</style>
