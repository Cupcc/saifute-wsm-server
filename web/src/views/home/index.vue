<template>
  <div v-if="!isRdConsole" class="app-container home-index">
    <LegacyHomeDashboard v-if="showRichDashboard" />

    <el-card v-else shadow="never" class="summary-card">
      <template #header>
        <div class="summary-header">
          <div>
            <div class="summary-title">首页概览</div>
            <div class="summary-subtitle">
              欢迎回来，{{ userStore.nickName || userStore.name || "用户" }}。
            </div>
          </div>
          <el-tag>{{ todayLabel }}</el-tag>
        </div>
      </template>

      <el-row :gutter="16" class="summary-row">
        <el-col :xs="24" :sm="12" :lg="8">
          <div class="summary-block">
            <div class="block-label">当前模式</div>
            <div class="block-value">{{ consoleLabel }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="8">
          <div class="summary-block">
            <div class="block-label">所属部门</div>
            <div class="block-value">{{ departmentLabel }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="8">
          <div class="summary-block">
            <div class="block-label">角色数量</div>
            <div class="block-value">{{ userStore.roles.length }}</div>
          </div>
        </el-col>
      </el-row>

      <el-alert
        title="当前账号未开通完整报表概览权限，首页已切换为基础概览视图。"
        type="info"
        :closable="false"
        class="summary-alert"
      />
    </el-card>
  </div>
</template>

<script setup name="HomeIndexPage">
import { computed, watchEffect } from "vue";
import useUserStore from "@/store/modules/user";
import LegacyHomeDashboard from "@/views/index.vue";

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

const REQUIRED_DASHBOARD_PERMISSIONS = [
  "reporting:home:view",
  "reporting:trends:view",
  "reporting:material-category-summary:view",
];

const isRdConsole = computed(() => userStore.consoleMode === "rd-subwarehouse");
const hasDashboardRoleFallback = computed(() =>
  ["warehouse-manager"].some((role) => userStore.roles.includes(role)),
);
const showRichDashboard = computed(
  () =>
    hasDashboardRoleFallback.value ||
    REQUIRED_DASHBOARD_PERMISSIONS.every((permission) =>
      userStore.permissions.includes(permission),
    ),
);
const consoleLabel = computed(() =>
  userStore.consoleMode === "rd-subwarehouse" ? "研发小仓" : "默认工作台",
);
const departmentLabel = computed(
  () => userStore.department?.departmentName || "未绑定部门",
);
const todayLabel = computed(() =>
  new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
);

watchEffect(() => {
  if (isRdConsole.value && route.path === "/index") {
    void router.replace("/rd/workbench");
  }
});
</script>

<style scoped lang="scss">
.home-index {
  .summary-card {
    min-height: 320px;
  }
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.summary-subtitle {
  margin-top: 6px;
  color: #606266;
}

.summary-row {
  margin-bottom: 16px;
}

.summary-block {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 16px;
  background: #fff;
}

.block-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.block-value {
  color: #303133;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
}

.summary-alert {
  margin-top: 8px;
}
</style>
