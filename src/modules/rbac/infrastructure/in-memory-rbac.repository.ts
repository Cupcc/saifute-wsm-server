import { Injectable } from "@nestjs/common";
import {
  compareHash,
  hashText,
} from "../../../shared/common/security/hash.util";
import type { RbacUserRecord, RouteNode } from "../domain/rbac.types";

@Injectable()
export class InMemoryRbacRepository {
  private readonly users: RbacUserRecord[] = [
    {
      userId: 1,
      username: "admin",
      displayName: "系统管理员",
      avatarUrl: null,
      roles: ["admin"],
      department: {
        departmentId: 100,
        departmentName: "系统管理部",
      },
      permissions: [
        "dashboard:view",
        "monitor:online:list",
        "monitor:online:forceLogout",
        "audit:login-log:list",
        "audit:login-log:delete",
        "audit:oper-log:list",
        "audit:oper-log:delete",
        "workflow:audit:status",
        "workflow:audit:list",
        "workflow:audit:create",
        "workflow:audit:approve",
        "workflow:audit:reject",
        "workflow:audit:reset",
        "reporting:home:view",
        "reporting:inventory-summary:view",
        "reporting:material-category-summary:view",
        "reporting:trends:view",
        "reporting:export",
        "scheduler:job:list",
        "scheduler:job:create",
        "scheduler:job:update",
        "scheduler:job:run",
        "scheduler:job:pause",
        "scheduler:job:log:list",
        "ai:chat",
        "ai:tools:list",
        "master:material:list",
        "master:material:create",
        "master:material:update",
        "master:customer:list",
        "master:supplier:list",
        "master:personnel:list",
        "master:workshop:list",
        "inbound:order:list",
        "inbound:order:create",
        "inbound:order:update",
        "inbound:order:void",
        "inbound:into-order:list",
        "inbound:into-order:create",
        "inbound:into-order:update",
        "inbound:into-order:void",
        "workshop-material:pick-order:list",
        "workshop-material:pick-order:create",
        "workshop-material:pick-order:void",
        "workshop-material:return-order:list",
        "workshop-material:return-order:create",
        "workshop-material:return-order:void",
        "workshop-material:scrap-order:list",
        "workshop-material:scrap-order:create",
        "workshop-material:scrap-order:void",
        "project:list",
        "project:get",
        "project:create",
        "project:update",
        "project:void",
        "inventory:balance:list",
        "inventory:factory-number:list",
        "inventory:log:list",
        "inventory:source-usage:list",
        "customer:order:list",
        "customer:order:create",
        "customer:order:update",
        "customer:order:void",
        "customer:sales-return:list",
        "customer:sales-return:create",
        "customer:sales-return:void",
      ],
      passwordHash: hashText("admin123"),
      status: "active",
      deleted: false,
      consoleMode: "default",
      workshopScope: {
        mode: "ALL",
        workshopId: null,
        workshopCode: null,
        workshopName: null,
      },
    },
    {
      userId: 2,
      username: "operator",
      displayName: "仓库操作员",
      avatarUrl: null,
      roles: ["operator"],
      department: {
        departmentId: 200,
        departmentName: "仓储作业部",
      },
      permissions: ["dashboard:view"],
      passwordHash: hashText("operator123"),
      status: "active",
      deleted: false,
      consoleMode: "default",
      workshopScope: {
        mode: "ALL",
        workshopId: null,
        workshopCode: null,
        workshopName: null,
      },
    },
    {
      userId: 4,
      username: "ai-operator",
      displayName: "AI 试用用户",
      avatarUrl: null,
      roles: ["operator"],
      department: {
        departmentId: 300,
        departmentName: "数字化支持部",
      },
      permissions: ["dashboard:view", "ai:chat", "ai:tools:list"],
      passwordHash: hashText("aioperator123"),
      status: "active",
      deleted: false,
      consoleMode: "default",
      workshopScope: {
        mode: "ALL",
        workshopId: null,
        workshopCode: null,
        workshopName: null,
      },
    },
    {
      userId: 5,
      username: "rd-operator",
      displayName: "研发小仓管理员",
      avatarUrl: null,
      roles: ["rd-operator"],
      department: {
        departmentId: 400,
        departmentName: "研发小仓",
      },
      permissions: [
        "dashboard:view",
        "rd:workbench:view",
        "reporting:home:view",
        "reporting:inventory-summary:view",
        "reporting:material-category-summary:view",
        "inventory:balance:list",
        "inventory:log:list",
        "inbound:into-order:list",
        "project:list",
        "project:get",
        "project:create",
        "project:void",
        "workshop-material:scrap-order:list",
        "workshop-material:scrap-order:create",
        "workshop-material:scrap-order:void",
        "master:material:list",
      ],
      passwordHash: hashText("rd123456"),
      status: "active",
      deleted: false,
      consoleMode: "rd-subwarehouse",
      workshopScope: {
        mode: "FIXED",
        workshopId: 6,
        workshopCode: "RD",
        workshopName: "研发小仓",
      },
    },
    {
      userId: 3,
      username: "disabled-user",
      displayName: "停用用户",
      avatarUrl: null,
      roles: ["operator"],
      department: {
        departmentId: 200,
        departmentName: "仓储作业部",
      },
      permissions: ["dashboard:view"],
      passwordHash: hashText("disabled123"),
      status: "disabled",
      deleted: false,
      consoleMode: "default",
      workshopScope: {
        mode: "ALL",
        workshopId: null,
        workshopCode: null,
        workshopName: null,
      },
    },
  ];

  private readonly routes: RouteNode[] = [
    {
      name: "Dashboard",
      path: "/dashboard",
      component: "dashboard/index",
      permissions: ["dashboard:view"],
    },
    {
      name: "System",
      path: "/system",
      component: "layout/index",
      permissions: [],
      children: [
        {
          name: "OnlineUsers",
          path: "/system/online",
          component: "monitor/online/index",
          permissions: ["monitor:online:list"],
        },
        {
          name: "LoginLogs",
          path: "/system/audit/login",
          component: "monitor/logininfor/index",
          permissions: ["audit:login-log:list"],
        },
        {
          name: "OperLogs",
          path: "/system/audit/oper",
          component: "monitor/operlog/index",
          permissions: ["audit:oper-log:list"],
        },
        {
          name: "ReportingHome",
          path: "/system/reporting/home",
          component: "reporting/home/index",
          permissions: ["reporting:home:view"],
        },
        {
          name: "InventorySummary",
          path: "/system/reporting/inventory-summary",
          component: "reporting/inventory-summary/index",
          permissions: ["reporting:inventory-summary:view"],
        },
        {
          name: "MaterialCategorySummary",
          path: "/system/reporting/material-category-summary",
          component: "reporting/material-category-summary/index",
          permissions: ["reporting:material-category-summary:view"],
        },
        {
          name: "ReportingTrends",
          path: "/system/reporting/trends",
          component: "reporting/trends/index",
          permissions: ["reporting:trends:view"],
        },
        {
          name: "SchedulerJobs",
          path: "/system/scheduler/jobs",
          component: "scheduler/jobs/index",
          permissions: ["scheduler:job:list"],
        },
        {
          name: "SchedulerLogs",
          path: "/system/scheduler/job-logs",
          component: "scheduler/job-logs/index",
          permissions: ["scheduler:job:log:list"],
        },
        {
          name: "AiAssistant",
          path: "/system/ai-assistant",
          component: "ai/assistant/index",
          permissions: ["ai:chat"],
        },
      ],
    },
    {
      name: "MasterData",
      path: "/base",
      component: "layout/index",
      permissions: [],
      children: [
        {
          name: "BaseMaterial",
          path: "/base/material",
          component: "base/material/index",
          permissions: ["master:material:list"],
        },
        {
          name: "BaseCustomer",
          path: "/base/customer",
          component: "base/customer/index",
          permissions: ["master:customer:list"],
        },
        {
          name: "BaseSupplier",
          path: "/base/supplier",
          component: "base/supplier/index",
          permissions: ["master:supplier:list"],
        },
        {
          name: "BasePersonnel",
          path: "/base/personnel",
          component: "base/personnel/index",
          permissions: ["master:personnel:list"],
        },
        {
          name: "BaseWorkshop",
          path: "/base/workshop",
          component: "base/workshop/index",
          permissions: ["master:workshop:list"],
        },
      ],
    },
    {
      name: "InboundBusiness",
      path: "/entry",
      component: "layout/index",
      permissions: [],
      children: [
        {
          name: "EntryOrder",
          path: "/entry/order",
          component: "entry/order/index",
          permissions: ["inbound:order:list"],
        },
        {
          name: "EntryDetail",
          path: "/entry/detail",
          component: "entry/detail/index",
          permissions: ["inbound:order:list"],
        },
        {
          name: "EntryIntoOrder",
          path: "/entry/intoOrder",
          component: "entry/intoOrder/index",
          permissions: ["inbound:into-order:list"],
        },
        {
          name: "EntryIntoDetail",
          path: "/entry/intoDetail",
          component: "entry/intoDetail/index",
          permissions: ["inbound:into-order:list"],
        },
      ],
    },
    {
      name: "WorkshopMaterialBusiness",
      path: "/take",
      component: "layout/index",
      permissions: [],
      children: [
        {
          name: "TakePickOrder",
          path: "/take/pickOrder",
          component: "take/pickOrder/index",
          permissions: ["workshop-material:pick-order:list"],
        },
        {
          name: "TakePickDetail",
          path: "/take/pickDetail",
          component: "take/pickDetail/index",
          permissions: ["workshop-material:pick-order:list"],
        },
        {
          name: "TakeReturnOrder",
          path: "/take/returnOrder",
          component: "take/returnOrder/index",
          permissions: ["workshop-material:return-order:list"],
        },
        {
          name: "TakeReturnDetail",
          path: "/take/returnDetail",
          component: "take/returnDetail/index",
          permissions: ["workshop-material:return-order:list"],
        },
      ],
    },
    {
      name: "InventoryBusiness",
      path: "/stock",
      component: "layout/index",
      permissions: [],
      children: [
        {
          name: "StockInventory",
          path: "/stock/inventory",
          component: "stock/inventory/index",
          permissions: ["inventory:balance:list"],
        },
        {
          name: "StockLog",
          path: "/stock/log",
          component: "stock/log/index",
          permissions: ["inventory:log:list"],
        },
        {
          name: "StockUsed",
          path: "/stock/used",
          component: "stock/used/index",
          permissions: ["inventory:source-usage:list"],
        },
        {
          name: "StockScrapOrder",
          path: "/stock/scrapOrder",
          component: "stock/scrapOrder/index",
          permissions: ["workshop-material:scrap-order:list"],
        },
        {
          name: "StockScrapDetail",
          path: "/stock/scrapDetail",
          component: "stock/scrapDetail/index",
          permissions: ["workshop-material:scrap-order:list"],
        },
        {
          name: "StockInterval",
          path: "/stock/interval",
          component: "stock/interval/index",
          permissions: ["inventory:factory-number:list"],
        },
      ],
    },
    {
      name: "CustomerBusiness",
      path: "/customer",
      component: "layout/index",
      permissions: [],
      children: [
        {
          name: "CustomerOrder",
          path: "/customer/order",
          component: "customer/order/index",
          permissions: ["customer:order:list"],
        },
        {
          name: "CustomerDetail",
          path: "/customer/detail",
          component: "customer/detail/index",
          permissions: ["customer:order:list"],
        },
        {
          name: "CustomerSalesReturnOrder",
          path: "/customer/salesReturnOrder",
          component: "customer/salesReturnOrder/index",
          permissions: ["customer:sales-return:list"],
        },
        {
          name: "CustomerSalesReturnDetail",
          path: "/customer/salesReturnDetail",
          component: "customer/salesReturnDetail/index",
          permissions: ["customer:sales-return:list"],
        },
      ],
    },
    {
      name: "RdSubwarehouse",
      path: "/rd",
      component: "layout/index",
      permissions: [],
      children: [
        {
          name: "RdWorkbench",
          path: "/rd/workbench",
          component: "rd/workbench/index",
          permissions: ["rd:workbench:view"],
        },
        {
          name: "RdInventorySummary",
          path: "/rd/inventory-summary",
          component: "reporting/inventory-summary/index",
          permissions: ["reporting:inventory-summary:view"],
        },
        {
          name: "RdInventoryLogs",
          path: "/rd/inventory-logs",
          component: "rd/inventory-logs/index",
          permissions: ["inventory:log:list"],
        },
        {
          name: "RdInboundResults",
          path: "/rd/inbound-results",
          component: "rd/inbound-results/index",
          permissions: ["inbound:into-order:list"],
        },
        {
          name: "RdProjectConsumption",
          path: "/rd/project-consumption",
          component: "rd/project-consumption/index",
          permissions: ["project:list"],
        },
        {
          name: "RdScrapOrders",
          path: "/rd/scrap-orders",
          component: "rd/scrap-orders/index",
          permissions: ["workshop-material:scrap-order:list"],
        },
        {
          name: "RdMaterialCategorySummary",
          path: "/rd/material-category-summary",
          component: "reporting/material-category-summary/index",
          permissions: ["reporting:material-category-summary:view"],
        },
      ],
    },
  ];

  async findUserByUsername(username: string): Promise<RbacUserRecord | null> {
    return this.users.find((user) => user.username === username) ?? null;
  }

  async findUserById(userId: number): Promise<RbacUserRecord | null> {
    return this.users.find((user) => user.userId === userId) ?? null;
  }

  async getRoutes(): Promise<RouteNode[]> {
    return structuredClone(this.routes);
  }

  async updateUserAvatar(
    userId: number,
    avatarUrl: string | null,
  ): Promise<{
    user: RbacUserRecord;
    previousAvatarUrl: string | null;
  }> {
    const user = this.users.find((item) => item.userId === userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const previousAvatarUrl = user.avatarUrl ?? null;
    user.avatarUrl = avatarUrl;

    return {
      user,
      previousAvatarUrl,
    };
  }

  verifyPassword(rawPassword: string, passwordHash: string): boolean {
    return compareHash(rawPassword, passwordHash);
  }
}
