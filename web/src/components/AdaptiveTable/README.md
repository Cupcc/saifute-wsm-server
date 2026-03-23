# AdaptiveTable 自适应表格组件

## 简介

AdaptiveTable 是一个基于 Element Plus 的 el-table 组件封装，具有自动计算表格高度并保持表头固定的功能。

## 特性

- 自动计算表格高度，适应不同屏幕尺寸
- 表头固定，方便查看列名
- 支持所有 el-table 的属性和事件
- 响应式设计，窗口大小变化时自动调整

## 使用方法

### 1. 替换 el-table

将原来的 `<el-table>` 替换为 `<adaptive-table>`：

```vue
<template>
  <adaptive-table
    ref="tableRef"
    border
    stripe
    v-loading="loading"
    :data="tableData"
  >
    <el-table-column type="index" width="60" align="center" />
    <el-table-column label="名称" prop="name" />
    <!-- 其他列 -->
  </adaptive-table>
</template>
```

### 3. 完整示例

```vue
<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <!-- 搜索表单 -->
    </el-form>

    <el-row :gutter="10" class="mb8">
      <!-- 按钮行 -->
    </el-row>

    <adaptive-table
      ref="tableRef"
      border
      stripe
      v-loading="loading"
      :data="tableList"
    >
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column type="index" width="60" align="center" />
      <el-table-column label="名称" prop="name" />
      <!-- 其他列 -->
    </adaptive-table>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { listData } from '@/api/your-api'

const tableRef = ref(null)
const tableList = ref([])
const loading = ref(true)

function getList() {
  loading.value = true
  listData().then(response => {
    tableList.value = response.data
    loading.value = false
  })
}

getList()
</script>
```

## 注意事项

1. 组件会自动计算表格高度，不需要手动设置 `height` 属性
2. 组件要求父容器具有 `.app-container` 类名
3. 搜索表单和按钮行会自动被识别并计算高度
4. 如果页面布局特殊，可能需要调整组件中的 `offsetHeight` 值

## API

### Props

支持所有 el-table 的 props，详见 [Element Plus Table 文档](https://element-plus.org/zh-CN/component/table.html#table-attributes)

### Events

支持所有 el-table 的事件，详见 [Element Plus Table 文档](https://element-plus.org/zh-CN/component/table.html#table-events)

### Methods

通过 ref 可以访问所有 el-table 的方法，详见 [Element Plus Table 文档](https://element-plus.org/zh-CN/component/table.html#table-methods)

```vue
<template>
  <adaptive-table ref="tableRef" :data="tableData">
    <!-- 列定义 -->
  </adaptive-table>
</template>

<script setup>
import { ref } from 'vue'

const tableRef = ref(null)

// 使用表格方法
function clearSelection() {
  tableRef.value.tableRef.clearSelection()
}
</script>
```
