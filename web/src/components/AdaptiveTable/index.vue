<template>
  <el-table
    ref="tableRef"
    v-bind="$attrs"
    :height="tableHeight"
  >
    <slot></slot>
  </el-table>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const tableRef = ref(null);
const tableHeight = ref(400);
const minHeight = 150; // 最小高度，确保至少显示表头和一行数据

/** 计算表格高度 */
function calculateTableHeight() {
  // 获取视口高度
  const windowHeight = window.innerHeight;
  // 获取表格上方的元素高度（搜索表单 + 按钮行）
  const searchForm = document.querySelector(".app-container > .el-form");
  const buttonRow = document.querySelector(".app-container > .el-row");

  let offsetHeight = 150; // 基础偏移量（包括页面边距等）

  if (searchForm) {
    offsetHeight += searchForm.offsetHeight;
  }
  if (buttonRow) {
    offsetHeight += buttonRow.offsetHeight;
  }

  // 计算表格高度，留出一些额外空间
  const calculatedHeight = windowHeight - offsetHeight - 20;
  // 确保表格高度不小于最小值
  tableHeight.value = Math.max(calculatedHeight, minHeight);
}

// 组件挂载后计算表格高度
onMounted(() => {
  // 等待 DOM 渲染完成
  setTimeout(() => {
    calculateTableHeight();
  }, 100);
  // 监听窗口大小变化
  window.addEventListener("resize", calculateTableHeight);
});

// 组件卸载前移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener("resize", calculateTableHeight);
});

// 暴露 tableRef 以便父组件访问
defineExpose({
  tableRef,
});
</script>
