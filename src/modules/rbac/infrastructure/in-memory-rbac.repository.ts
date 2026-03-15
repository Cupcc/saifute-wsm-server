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
        "inventory:balance:list",
      ],
      passwordHash: hashText("admin123"),
      status: "active",
      deleted: false,
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
