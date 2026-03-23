<template>
  <div class="navbar">
    <hamburger id="hamburger-container" :is-active="appStore.sidebar.opened" class="hamburger-container" @toggleClick="toggleSideBar" />
    <breadcrumb v-if="!settingsStore.topNav" id="breadcrumb-container" class="breadcrumb-container" />
    <top-nav v-if="settingsStore.topNav" id="topmenu-container" class="topmenu-container" />

    <div class="right-menu">
      <template v-if="appStore.device !== 'mobile'">
        <header-search id="header-search" class="right-menu-item" />

        <screenfull id="screenfull" class="right-menu-item hover-effect" />

        <el-tooltip content="主题模式" effect="dark" placement="bottom">
          <div class="right-menu-item hover-effect theme-switch-wrapper" @click="toggleTheme">
            <svg-icon v-if="settingsStore.isDark" icon-class="sunny" />
            <svg-icon v-if="!settingsStore.isDark" icon-class="moon" />
          </div>
        </el-tooltip>

        <el-tooltip content="布局大小" effect="dark" placement="bottom">
          <size-select id="size-select" class="right-menu-item hover-effect" />
        </el-tooltip>
      </template>
	    <template v-if="appStore.device == 'mobile'">
		    <el-tooltip content="主题模式" effect="dark" placement="bottom">
			    <div class="right-menu-item hover-effect theme-switch-wrapper" @click="toggleTheme">
				    <svg-icon v-if="settingsStore.isDark" icon-class="sunny" />
				    <svg-icon v-if="!settingsStore.isDark" icon-class="moon" />
			    </div>
		    </el-tooltip>
	    </template>
	    
	    <el-tooltip content="通知" effect="dark" placement="bottom">
		    <div class="right-menu-item hover-effect" @click="handleNotificationClick">
			    <el-badge :is-dot="inventoryWarningDot" class="item notification-badge">
				    <el-icon><Bell /></el-icon>
			    </el-badge>
		    </div>
	    </el-tooltip>

      <el-dropdown @command="handleCommand" class="avatar-container right-menu-item hover-effect" trigger="hover">
        <div class="avatar-wrapper">
          <img :src="userStore.avatar" class="user-avatar" />
          <span class="user-nickname"> {{ userStore.nickName }} </span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <router-link to="/user/profile">
              <el-dropdown-item>个人中心</el-dropdown-item>
            </router-link>
            <el-dropdown-item divided command="logout">
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <div class="right-menu-item hover-effect setting" @click="setLayout" v-if="settingsStore.showSettings">
        <svg-icon icon-class="more-up" />
      </div>
    </div>
  </div>
  
  <!-- 库存预警弹出框 -->
  <el-dialog v-model="warningDialogVisible" title="库存预警" width="800px" append-to-body>
    <adaptive-table :data="warningList" v-loading="warningLoading" empty-text="暂无库存预警数据">
      <el-table-column prop="materialName" label="物料名称" />
      <el-table-column prop="specification" label="规格型号" />
      <el-table-column prop="stockMin" label="预警数量" />
      <el-table-column prop="currentQty" label="剩余数量" />
    </adaptive-table>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="warningDialogVisible = false">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { Bell } from "@element-plus/icons-vue";
import { ElMessageBox } from "element-plus";
import { listStockWarning } from "@/api/stock/warning"; // 添加库存预警API
import Breadcrumb from "@/components/Breadcrumb";
import Hamburger from "@/components/Hamburger";
import HeaderSearch from "@/components/HeaderSearch";
import Screenfull from "@/components/Screenfull";
import SizeSelect from "@/components/SizeSelect";
import TopNav from "@/components/TopNav";
import useAppStore from "@/store/modules/app";
import useSettingsStore from "@/store/modules/settings";
import useUserStore from "@/store/modules/user";

const { proxy } = getCurrentInstance();
const appStore = useAppStore();
const userStore = useUserStore();
const settingsStore = useSettingsStore();

// 库存预警红点状态
const inventoryWarningDot = ref(false);

// WebSocket连接
let websocket = null;

// 构建WebSocket URL
function buildWebsocketUrl() {
  // 获取基础API URL
  const baseApiUrl = import.meta.env.VITE_APP_BASE_API;

  // 如果是开发环境的代理路径，则使用固定的本地地址
  if (baseApiUrl === "/dev-api") {
    return "ws://localhost:8080/websocket/message";
  }

  // 如果是完整URL (生产环境)
  if (baseApiUrl.startsWith("http://") || baseApiUrl.startsWith("https://")) {
    // 替换协议
    let wsUrl = baseApiUrl
      .replace("http://", "ws://")
      .replace("https://", "wss://");
    // 将端口号从90替换为8080
    wsUrl = wsUrl.replace(":90", ":8080");
    // 移除可能存在的路径部分，只保留协议和主机信息
    try {
      const url = new URL(wsUrl);
      return `${url.protocol}//${url.hostname}:${url.port || (url.protocol === "ws:" ? "8080" : "443")}/websocket/message`;
    } catch (e) {
      // fallback处理
      return wsUrl.replace(/\/dev-api.*$/, "") + "/websocket/message";
    }
  }

  // 相对路径情况，使用当前域名
  const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  const host = window.location.host.replace(":90", ":8080");
  return `${protocol}${host}/websocket/message`;
}

const websocketUrl = buildWebsocketUrl();

// 初始化WebSocket连接
function initWebSocket() {
  if ("WebSocket" in window) {
    websocket = new WebSocket(websocketUrl);

    websocket.onopen = () => {
      console.log("WebSocket连接已建立");
      // 连接成功时请求库存预警列表
      fetchStockWarningList();
    };

    websocket.onmessage = (event) => {
      console.log("收到WebSocket消息:", event.data);
      // 处理接收到的消息
      handleMessage(event.data);
    };

    websocket.onclose = () => {
      console.log("WebSocket连接已关闭");
    };

    websocket.onerror = (error) => {
      console.error("WebSocket发生错误:", error);
    };
  } else {
    console.error("浏览器不支持WebSocket");
  }
}

// 处理WebSocket消息
function handleMessage(data) {
  // 可以根据业务需求处理不同类型的消息
  try {
    const message = JSON.parse(data);
    // 在这里处理具体的消息逻辑
    console.log("处理消息:", message);

    // 如果收到库存预警消息，更新红点状态
    if (Object.hasOwn(message, "inventoryWarning")) {
      if (message.inventoryWarning === 1) {
        // 显示红点
        inventoryWarningDot.value = true;
      } else if (message.inventoryWarning === 0) {
        // 隐藏红点
        inventoryWarningDot.value = false;
      }
    }
  } catch (e) {
    //console.warn('无法解析WebSocket消息:', data)
  }
}

// 库存预警弹出框相关数据
const warningDialogVisible = ref(false);
const warningList = ref([]);
const warningLoading = ref(false);

// 处理通知图标点击事件
function handleNotificationClick() {
  // 显示弹出框
  warningDialogVisible.value = true;
  // 请求库存预警数据
  fetchStockWarningList();
}

// 获取库存预警列表
function fetchStockWarningList() {
  warningLoading.value = true;
  listStockWarning()
    .then((response) => {
      warningList.value = response.rows || [];
      // 如果有预警数据，显示红点
      if (response.rows && response.rows.length > 0) {
        inventoryWarningDot.value = true;
      } else {
        inventoryWarningDot.value = false;
      }
      warningLoading.value = false;
    })
    .catch((error) => {
      console.error("获取库存预警列表失败:", error);
      warningLoading.value = false;
      proxy.$modal.msgError("获取库存预警数据失败");
    });
}

// 发送WebSocket消息
function sendWebSocketMessage(message) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(message));
  } else {
    console.warn("WebSocket未连接或未准备好");
  }
}

// 关闭WebSocket连接
function closeWebSocket() {
  if (websocket) {
    websocket.close();
  }
}

// 切换库存预警红点状态（用于测试）
function toggleInventoryWarning() {
  //inventoryWarningDot.value = !inventoryWarningDot.value
}

// 组件挂载时初始化WebSocket
initWebSocket();

// 组件卸载前关闭WebSocket
window.addEventListener("beforeunload", () => {
  closeWebSocket();
});

function toggleSideBar() {
  appStore.toggleSideBar();
}

function handleCommand(command) {
  switch (command) {
    case "setLayout":
      setLayout();
      break;
    case "logout":
      logout();
      break;
    default:
      break;
  }
}

function logout() {
  ElMessageBox.confirm("确定注销并退出系统吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      userStore.logOut().then(() => {
        location.href = "/index";
      });
    })
    .catch(() => {});
}

const emits = defineEmits(["setLayout"]);
function setLayout() {
  emits("setLayout");
}

function toggleTheme() {
  settingsStore.toggleTheme();
}
</script>

<style lang='scss' scoped>
.navbar {
	height: 50px;
	overflow: hidden;
	position: relative;
	background: var(--navbar-bg);
	box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
	
	.hamburger-container {
		line-height: 46px;
		height: 100%;
		float: left;
		cursor: pointer;
		transition: background 0.3s;
		-webkit-tap-highlight-color: transparent;
		
		&:hover {
			background: rgba(0, 0, 0, 0.025);
		}
	}
	
	.breadcrumb-container {
		float: left;
	}
	
	.topmenu-container {
		position: absolute;
		left: 50px;
	}
	
	.errLog-container {
		display: inline-block;
		vertical-align: top;
	}
	
	.right-menu {
		float: right;
		height: 100%;
		line-height: 50px;
		display: flex;
		
		&:focus {
			outline: none;
		}
		
		.right-menu-item {
			display: inline-block;
			padding: 0 8px;
			height: 100%;
			font-size: 18px;
			color: #5a5e66;
			vertical-align: text-bottom;
			
			&.hover-effect {
				cursor: pointer;
				transition: background 0.3s;
				
				&:hover {
					background: rgba(0, 0, 0, 0.025);
				}
			}
			
			&.theme-switch-wrapper {
				display: flex;
				align-items: center;
				
				svg {
					transition: transform 0.3s;
					
					&:hover {
						transform: scale(1.15);
					}
				}
			}
		}
		
		.avatar-container {
			margin-right: 0px;
			padding-right: 0px;
			
			.avatar-wrapper {
				margin-top: 10px;
				right: 5px;
				position: relative;
				
				.user-avatar {
					cursor: pointer;
					width: 30px;
					height: 30px;
					border-radius: 50%;
				}
				
				.user-nickname {
					position: relative;
					left: 5px;
					bottom: 10px;
					font-size: 14px;
					font-weight: bold;
				}
				
				i {
					cursor: pointer;
					position: absolute;
					right: -20px;
					top: 25px;
					font-size: 12px;
				}
			}
		}
	}
}
// 通知红点样式调整
.notification-badge {
  :deep(.el-badge__content) {
    top: 12px; // 调整红点的垂直位置，向下移动
  }
}
</style>
