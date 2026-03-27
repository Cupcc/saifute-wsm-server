<template>
  <div class="ai-assistant">
    <!-- 聊天面板 -->
    <AiChatPanel
      :visible="panelVisible"
      :page-context="pageContext"
      @close="panelVisible = false"
    />

    <!-- 浮动按钮 -->
    <transition name="scale">
      <button
        v-show="!panelVisible"
        class="ai-fab"
        :class="{ 'is-dark': isDark }"
        title="AI 助手"
        @click="panelVisible = true"
      >
        <div class="fab-icon">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v-2h-2v2zm1-12C9.79 4 8 5.79 8 8h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
          </svg>
        </div>
        <div class="fab-pulse"></div>
      </button>
    </transition>
  </div>
</template>

<script setup>
import { useRoute } from "vue-router";
import useSettingsStore from "@/store/modules/settings";
import AiChatPanel from "./AiChatPanel.vue";

const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.isDark);
const route = useRoute();

// 面板可见状态
const panelVisible = ref(false);

// 页面上下文映射
const contextMap = {
  "/index": "首页 - 仪表盘",
  "/entry/order": "入库管理 - 验收单",
  "/entry/detail": "入库管理 - 验收明细",
  "/entry/intoOrder": "入库管理 - 入库单",
  "/entry/intoDetail": "入库管理 - 入库明细",
  "/stock/inventory": "库存管理 - 库存查询",
  "/stock/log": "库存管理 - 库存日志",
  "/stock/warning": "库存管理 - 库存预警",
  "/stock/interval": "库存管理 - 库存区间",
  "/stock/used": "库存管理 - 已使用物料",
  "/take/pickOrder": "生产车间 - 领料单",
  "/take/pickDetail": "生产车间 - 领料明细",
  "/take/returnOrder": "生产车间 - 退料单",
  "/take/returnDetail": "生产车间 - 退料明细",
  "/take/scrapOrder": "生产车间 - 报废单",
  "/take/scrapDetail": "生产车间 - 报废明细",
  "/rd/workbench": "研发小仓 - 研发工作台",
  "/rd/inbound-results": "研发协同 - 自动入库结果",
  "/rd/project-consumption": "研发协同 - 项目领用",
  "/rd/inventory-logs": "研发协同 - 库存流水",
  "/base/customer": "基础数据 - 客户管理",
  "/base/material": "基础数据 - 物料管理",
  "/base/personnel": "基础数据 - 人员管理",
  "/base/supplier": "基础数据 - 供应商管理",
  "/base/workshop": "基础数据 - 车间管理",
  "/article/material": "物料管理 - 物料信息",
  "/article/product": "物料管理 - 产品信息",
  "/report/inventoryCategory": "报表中心 - 库存分类",
  "/report/inventoryMaterial": "报表中心 - 物料库存",
  "/report/materialCategoryInventory": "报表中心 - 物料分类库存",
  "/report/supplierStatement": "报表中心 - 供应商对账",
  "/audit/audit": "审计管理",
  "/system/user": "系统管理 - 用户管理",
  "/system/role": "系统管理 - 角色管理",
  "/system/dept": "系统管理 - 部门管理",
  "/system/menu": "系统管理 - 菜单管理",
  "/system/dict": "系统管理 - 字典管理",
  "/system/config": "系统管理 - 参数设置",
  "/system/notice": "系统管理 - 通知公告",
  "/system/post": "系统管理 - 岗位管理",
  "/monitor/operlog": "系统监控 - 操作日志",
  "/monitor/logininfor": "系统监控 - 登录日志",
  "/monitor/online": "系统监控 - 在线用户",
  "/monitor/job": "系统监控 - 定时任务",
  "/monitor/server": "系统监控 - 服务监控",
  "/monitor/cache": "系统监控 - 缓存监控",
};

// 当前页面上下文
const pageContext = computed(() => {
  const path = route.path;
  // 精确匹配
  if (contextMap[path]) return contextMap[path];
  // 前缀匹配
  for (const [key, value] of Object.entries(contextMap)) {
    if (path.startsWith(key)) return value;
  }
  // 根据路径推断
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 0) {
    return `当前页面：${route.meta?.title || segments.join(" > ")}`;
  }
  return "";
});

// 键盘快捷键：Ctrl + /  或 Ctrl + .
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === "/" || e.key === ".")) {
    e.preventDefault();
    panelVisible.value = !panelVisible.value;
  }
  // ESC 关闭
  if (e.key === "Escape" && panelVisible.value) {
    panelVisible.value = false;
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<style lang="scss" scoped>
/* 浮动按钮 */
.ai-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35), 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2000;
  overflow: visible;

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 24px rgba(37, 99, 235, 0.45), 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: scale(0.95);
  }

  &.is-dark {
    background: linear-gradient(135deg, #1d4ed8, #2563eb);
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

.fab-icon {
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

/* 脉冲动画 */
.fab-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: inherit;
  animation: pulse 2s infinite;
  z-index: 0;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  70% {
    transform: scale(1.3);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* 缩放动画 */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* 移动端 */
@media screen and (max-width: 480px) {
  .ai-fab {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;

    .fab-icon svg {
      width: 22px;
      height: 22px;
    }
  }
}
</style>
