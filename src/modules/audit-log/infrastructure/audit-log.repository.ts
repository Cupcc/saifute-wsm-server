import { Injectable } from "@nestjs/common";
import {
  LoginLogAction,
  LoginLogResult,
  OperLogStatus,
  type Prisma,
} from "../../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createLoginLog(data: Prisma.LoginLogUncheckedCreateInput) {
    return this.prisma.loginLog.create({ data });
  }

  async createOperLog(data: Prisma.OperLogUncheckedCreateInput) {
    return this.prisma.operLog.create({ data });
  }

  async findLoginLogs(params: {
    username?: string;
    ip?: string;
    action?: LoginLogAction;
    result?: LoginLogResult;
    beginTime?: string;
    endTime?: string;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.LoginLogWhereInput = {};
    if (params.username) {
      where.username = {
        contains: params.username,
      };
    }
    if (params.action) {
      where.action = params.action;
    }
    if (params.result) {
      where.result = params.result;
    }
    if (params.ip) {
      where.ip = {
        contains: params.ip,
      };
    }
    const loginOccurredAt = resolveDateRange(params.beginTime, params.endTime);
    if (loginOccurredAt) {
      where.occurredAt = loginOccurredAt;
    }

    const [items, total] = await Promise.all([
      this.prisma.loginLog.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { occurredAt: "desc" },
      }),
      this.prisma.loginLog.count({ where }),
    ]);

    return { items, total };
  }

  async findOperLogs(params: {
    title?: string;
    ip?: string;
    operatorName?: string;
    result?: OperLogStatus;
    beginTime?: string;
    endTime?: string;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.OperLogWhereInput = {};
    if (params.title) {
      where.title = {
        contains: params.title,
      };
    }
    if (params.operatorName) {
      where.operatorName = {
        contains: params.operatorName,
      };
    }
    if (params.result) {
      where.status = params.result;
    }
    if (params.ip) {
      where.ip = {
        contains: params.ip,
      };
    }
    const operOccurredAt = resolveDateRange(params.beginTime, params.endTime);
    if (operOccurredAt) {
      where.occurredAt = operOccurredAt;
    }

    const [items, total] = await Promise.all([
      this.prisma.operLog.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { occurredAt: "desc" },
      }),
      this.prisma.operLog.count({ where }),
    ]);

    return { items, total };
  }

  async deleteLoginLog(id: number) {
    return this.prisma.loginLog.deleteMany({
      where: { id },
    });
  }

  async clearLoginLogs() {
    return this.prisma.loginLog.deleteMany();
  }

  async deleteOperLog(id: number) {
    return this.prisma.operLog.deleteMany({
      where: { id },
    });
  }

  async clearOperLogs() {
    return this.prisma.operLog.deleteMany();
  }
}

function resolveDateRange(beginTime?: string, endTime?: string) {
  const gte = parseDateValue(beginTime);
  const lte = parseDateValue(endTime);

  if (!gte && !lte) {
    return undefined;
  }

  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {}),
  };
}

function parseDateValue(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
