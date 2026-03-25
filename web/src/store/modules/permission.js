import { getRouters } from "@/api/menu";
import ParentView from "@/components/ParentView";
import InnerLink from "@/layout/components/InnerLink";
import Layout from "@/layout/index";
import auth from "@/plugins/auth";
import router, { constantRoutes, dynamicRoutes } from "@/router";

// 匹配views里面所有的.vue文件
const modules = import.meta.glob("./../../views/**/*.vue");

const SUPPORTED_BACKEND_ROUTE_META = {
  ReportingHome: {
    path: "home",
    component: "reporting/home/index",
    title: "报表首页",
    icon: "dashboard",
  },
  InventorySummary: {
    path: "inventory-summary",
    component: "reporting/inventory-summary/index",
    title: "库存汇总",
    icon: "table",
  },
  MaterialCategorySummary: {
    path: "material-category-summary",
    component: "reporting/material-category-summary/index",
    title: "分类分布",
    icon: "tree-table",
  },
  ReportingTrends: {
    path: "trends",
    component: "reporting/trends/index",
    title: "趋势分析",
    icon: "time",
  },
};

function collectBackendRouteNames(routes, routeNames = new Set()) {
  routes.forEach((route) => {
    if (!route || typeof route !== "object") {
      return;
    }

    if (route.name) {
      routeNames.add(route.name);
    }

    if (Array.isArray(route.children) && route.children.length > 0) {
      collectBackendRouteNames(route.children, routeNames);
    }
  });

  return routeNames;
}

function buildFrontendRoutes(backendRoutes) {
  const routeNames = collectBackendRouteNames(backendRoutes);
  const reportingChildren = Object.entries(SUPPORTED_BACKEND_ROUTE_META)
    .filter(([routeName]) => routeNames.has(routeName))
    .map(([routeName, routeMeta]) => ({
      path: routeMeta.path,
      component: routeMeta.component,
      name: routeName,
      meta: {
        title: routeMeta.title,
        icon: routeMeta.icon,
      },
    }));

  if (reportingChildren.length === 0) {
    return [];
  }

  return [
    {
      path: "/reporting",
      component: "Layout",
      redirect: `/reporting/${reportingChildren[0].path}`,
      alwaysShow: true,
      name: "Reporting",
      meta: {
        title: "报表中心",
        icon: "chart",
      },
      children: reportingChildren,
    },
  ];
}

const usePermissionStore = defineStore("permission", {
  state: () => ({
    routes: [],
    addRoutes: [],
    defaultRoutes: [],
    topbarRouters: [],
    sidebarRouters: [],
  }),
  actions: {
    setRoutes(routes) {
      this.addRoutes = routes;
      this.routes = constantRoutes.concat(routes);
    },
    setDefaultRoutes(routes) {
      this.defaultRoutes = constantRoutes.concat(routes);
    },
    setTopbarRoutes(routes) {
      this.topbarRouters = routes;
    },
    setSidebarRouters(routes) {
      this.sidebarRouters = routes;
    },
    generateRoutes(roles) {
      return new Promise((resolve) => {
        // 向后端请求路由数据
        getRouters().then((res) => {
          const backendRoutes = Array.isArray(res.data) ? res.data : [];
          const frontendRoutes = buildFrontendRoutes(backendRoutes);
          const sdata = JSON.parse(JSON.stringify(frontendRoutes));
          const rdata = JSON.parse(JSON.stringify(frontendRoutes));
          const defaultData = JSON.parse(JSON.stringify(frontendRoutes));
          const sidebarRoutes = filterAsyncRouter(sdata);
          const rewriteRoutes = filterAsyncRouter(rdata, false, true);
          const defaultRoutes = filterAsyncRouter(defaultData);
          const asyncRoutes = filterDynamicRoutes(dynamicRoutes);
          asyncRoutes.forEach((route) => {
            router.addRoute(route);
          });
          this.setRoutes(rewriteRoutes);
          this.setSidebarRouters(constantRoutes.concat(sidebarRoutes));
          this.setDefaultRoutes(sidebarRoutes);
          this.setTopbarRoutes(defaultRoutes);
          resolve(rewriteRoutes);
        });
      });
    },
  },
});

// 遍历后台传来的路由字符串，转换为组件对象
function filterAsyncRouter(asyncRouterMap, lastRouter = false, type = false) {
  return asyncRouterMap.filter((route) => {
    if (type && route.children) {
      route.children = filterChildren(route.children);
    }
    if (route.component) {
      // Layout ParentView 组件特殊处理
      if (route.component === "Layout") {
        route.component = Layout;
      } else if (route.component === "ParentView") {
        route.component = ParentView;
      } else if (route.component === "InnerLink") {
        route.component = InnerLink;
      } else {
        route.component = loadView(route.component);
      }
    }
    if (route.children != null && route.children && route.children.length) {
      route.children = filterAsyncRouter(route.children, route, type);
    } else {
      delete route["children"];
      delete route["redirect"];
    }
    return true;
  });
}

function filterChildren(childrenMap, lastRouter = false) {
  var children = [];
  childrenMap.forEach((el) => {
    el.path = lastRouter ? lastRouter.path + "/" + el.path : el.path;
    if (el.children && el.children.length && el.component === "ParentView") {
      children = children.concat(filterChildren(el.children, el));
    } else {
      children.push(el);
    }
  });
  return children;
}

// 动态路由遍历，验证是否具备权限
export function filterDynamicRoutes(routes) {
  const res = [];
  routes.forEach((route) => {
    if (route.permissions) {
      if (auth.hasPermiOr(route.permissions)) {
        res.push(route);
      }
    } else if (route.roles) {
      if (auth.hasRoleOr(route.roles)) {
        res.push(route);
      }
    }
  });
  return res;
}

export const loadView = (view) => {
  let res;
  for (const path in modules) {
    const dir = path.split("views/")[1].split(".vue")[0];
    if (dir === view) {
      res = () => modules[path]();
    }
  }
  return res;
};

export default usePermissionStore;
