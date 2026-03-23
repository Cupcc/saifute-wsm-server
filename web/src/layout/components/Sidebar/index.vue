<template>
  <div :class="{ 'has-logo': showLogo }" class="sidebar-container">
    <logo v-if="showLogo" :collapse="isCollapse" />
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :background-color="getMenuBackground"
        :text-color="getMenuTextColor"
        :unique-opened="true"
        :active-text-color="theme"
        :collapse-transition="false"
        mode="vertical"
        :class="sideTheme"
      >
        <sidebar-item
          v-for="(route, index) in sidebarRouters"
          :key="route.path + index"
          :item="route"
          :base-path="route.path"
        />
      </el-menu>
	    <div class="sidebar-version">
		    <span>v{{ packageVersion }}</span>
	    </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import variables from "@/assets/styles/variables.module.scss";
import useAppStore from "@/store/modules/app";
import usePermissionStore from "@/store/modules/permission";
import useSettingsStore from "@/store/modules/settings";
import Logo from "./Logo";
import SidebarItem from "./SidebarItem";

const route = useRoute();
const appStore = useAppStore();
const settingsStore = useSettingsStore();
const permissionStore = usePermissionStore();

import packageJson from "@/../package.json";

const sidebarRouters = computed(() => permissionStore.sidebarRouters);
const showLogo = computed(() => settingsStore.sidebarLogo);
const sideTheme = computed(() => settingsStore.sideTheme);
const theme = computed(() => settingsStore.theme);
const isCollapse = computed(() => !appStore.sidebar.opened);

// 获取菜单背景色
const getMenuBackground = computed(() => {
  if (settingsStore.isDark) {
    return "var(--sidebar-bg)";
  }
  return sideTheme.value === "theme-dark"
    ? variables.menuBg
    : variables.menuLightBg;
});

// 获取菜单文字颜色
const getMenuTextColor = computed(() => {
  if (settingsStore.isDark) {
    return "var(--sidebar-text)";
  }
  return sideTheme.value === "theme-dark"
    ? variables.menuText
    : variables.menuLightText;
});

const activeMenu = computed(() => {
  const { meta, path } = route;
  if (meta.activeMenu) {
    return meta.activeMenu;
  }
  return path;
});

const packageVersion = computed(() => {
  return packageJson?.version || "v1.0.0";
});
</script>

<style lang="scss" scoped>
.sidebar-container {
  background-color: v-bind(getMenuBackground);
  
  .scrollbar-wrapper {
    background-color: v-bind(getMenuBackground);
  }

  .el-menu {
    border: none;
    height: 100%;
    width: 100% !important;
    
    .el-menu-item, .el-sub-menu__title {
      &:hover {
        background-color: var(--menu-hover, rgba(0, 0, 0, 0.06)) !important;
      }
    }

    .el-menu-item {
      color: v-bind(getMenuTextColor);
      
      &.is-active {
        color: var(--menu-active-text, #409eff);
        background-color: var(--menu-hover, rgba(0, 0, 0, 0.06)) !important;
      }
    }

    .el-sub-menu__title {
      color: v-bind(getMenuTextColor);
    }
  }
}
/* 新增版本号样式 */
.sidebar-version {
	position: absolute;
	bottom: 20px;
	left: 0;
	width: 100%;
	text-align: center;
	font-size: 12px;
	color: #999; /* 与菜单文字颜色适配 */
	/* 折叠状态下调整位置 */
	.el-menu--collapse & {
		bottom: 15px;
	}
}

/* 确保滚动容器相对定位，让版本号绝对定位生效 */
.scrollbar-wrapper {
	position: relative;
	height: 100%;
}
</style>
