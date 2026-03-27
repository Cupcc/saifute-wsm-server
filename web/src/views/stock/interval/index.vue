<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="关联单据类型" prop="orderType">
        <el-select
          v-model="queryParams.orderType"
          placeholder="请选择关联单据类型"
          clearable
          style="width: 240px">
          <el-option
            v-for="dict in supportedRelatedOrderTypes"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="明细id" prop="detailId">
        <el-input
          v-model="queryParams.detailId"
          placeholder="请输入明细id"
          clearable
          style="width: 240px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="区间起始编号" prop="startNum">
        <el-input
          v-model="queryParams.startNum"
          placeholder="请输入区间起始编号"
          clearable
          style="width: 240px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="区间结束编号" prop="endNum">
        <el-input
          v-model="queryParams.endNum"
          placeholder="请输入区间结束编号"
          clearable
          style="width: 240px"
          @keyup.enter="handleQuery"
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
          @click="handleAdd"
          v-hasPermi="['stock:interval:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['stock:interval:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['stock:interval:remove']"
        >作废</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" :columns="columns"></right-toolbar>
    </el-row>

    <adaptive-table border stripe v-loading="loading" :data="intervalList">
      <el-table-column type="index" width="50" align="center" />
      <el-table-column sortable show-overflow-tooltip label="主键" align="center" prop="intervalId" key="intervalId" v-if="columns[0].visible"/>
      <el-table-column sortable show-overflow-tooltip label="关联单据类型" align="center" prop="orderType" v-if="columns[1].visible">
        <template #default="scope">
          <dict-tag :options="supportedRelatedOrderTypes" :value="scope.row.orderType"/>
        </template>
      </el-table-column>
      <el-table-column sortable show-overflow-tooltip label="明细id" align="center" prop="detailId" v-if="columns[2].visible" />
      <el-table-column sortable show-overflow-tooltip label="区间起始编号" align="center" prop="startNum" v-if="columns[3].visible" />
      <el-table-column sortable show-overflow-tooltip label="区间结束编号" align="center" prop="endNum" v-if="columns[4].visible" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['stock:interval:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['stock:interval:remove']">作废</el-button>
        </template>
      </el-table-column>
    </adaptive-table>
    
    <pagination
      v-show="total>0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 添加或修改成品出厂编号区间对话框 -->
    <el-dialog :title="title" v-model="open" width="500px" append-to-body draggable>
      <el-form ref="intervalRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="关联单据类型" prop="orderType">
          <el-select v-model="form.orderType" placeholder="请选择关联单据类型">
            <el-option
              v-for="dict in supportedRelatedOrderTypes"
              :key="dict.value"
              :label="dict.label"
              :value="parseInt(dict.value)"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="明细id" prop="detailId">
          <el-input v-model="form.detailId" placeholder="请输入明细id" />
        </el-form-item>
        <el-form-item label="区间起始编号" prop="startNum">
          <el-input v-model="form.startNum" placeholder="请输入区间起始编号" />
        </el-form-item>
        <el-form-item label="区间结束编号" prop="endNum">
          <el-input v-model="form.endNum" placeholder="请输入区间结束编号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Interval">
import {
  addInterval,
  delInterval,
  getInterval,
  listInterval,
  updateInterval,
} from "@/api/stock/interval";

const { proxy } = getCurrentInstance();
const { related_order_type } = proxy.useDict("related_order_type");
const supportedRelatedOrderTypes = computed(() =>
  related_order_type.value.filter((dict) => String(dict.value) === "4"),
);

const intervalList = ref([]);
const open = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 30,
    orderType: null,
    detailId: null,
    startNum: null,
    endNum: null,
  },
  rules: {},
});

const { queryParams, form, rules } = toRefs(data);

// 添加columns数组定义
const columns = ref([
  { key: 0, label: `主键`, visible: true },
  { key: 1, label: `关联单据类型`, visible: true },
  { key: 2, label: `明细id`, visible: true },
  { key: 3, label: `区间起始编号`, visible: true },
  { key: 4, label: `区间结束编号`, visible: true },
]);

/** 查询成品出厂编号区间列表 */
function getList() {
  loading.value = true;
  listInterval(queryParams.value).then((response) => {
    intervalList.value = response.rows;
    total.value = response.total;
    loading.value = false;
  });
}

// 取消按钮
function cancel() {
  open.value = false;
  reset();
}

// 表单重置
function reset() {
  form.value = {
    intervalId: null,
    orderType: null,
    detailId: null,
    startNum: null,
    endNum: null,
  };
  proxy.resetForm("intervalRef");
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1;
  getList();
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef");
  handleQuery();
}

// 多选框选中数据
function handleSelectionChange(selection) {
  ids.value = selection.map((item) => item.intervalId);
  single.value = selection.length !== 1;
  multiple.value = !selection.length;
}

/** 新增按钮操作 */
function handleAdd() {
  reset();
  open.value = true;
  title.value = "添加成品出厂编号区间";
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset();
  const _intervalId = row.intervalId || ids.value;
  getInterval(_intervalId).then((response) => {
    form.value = response.data;
    open.value = true;
    title.value = "修改成品出厂编号区间";
  });
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs.intervalRef.validate((valid) => {
    if (valid) {
      if (form.value.intervalId != null) {
        updateInterval(form.value).then((response) => {
          proxy.$modal.msgSuccess("修改成功");
          open.value = false;
          getList();
        });
      } else {
        addInterval(form.value).then((response) => {
          proxy.$modal.msgSuccess("新增成功");
          open.value = false;
          getList();
        });
      }
    }
  });
}

/** 作废按钮操作 */
function handleDelete(row) {
  const _intervalIds = row.intervalId || ids.value;
  proxy.$modal
    .confirm("是否确认作废成品出厂编号区间？")
    .then(() => delInterval(_intervalIds))
    .then(() => {
      getList();
      proxy.$modal.msgSuccess("作废成功");
    })
    .catch(() => {});
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download(
    "stock/interval/export",
    {
      ...queryParams.value,
    },
    `interval_${Date.now()}.xlsx`,
  );
}

getList();
</script>
