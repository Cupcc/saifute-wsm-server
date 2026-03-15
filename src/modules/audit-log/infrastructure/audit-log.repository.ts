import { Injectable } from "@nestjs/common";
import {
  LoginLogAction,
  LoginLogResult,
  OperLogStatus,
  type Prisma,
} from "../../../generated/prisma/client";
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
    action?: LoginLogAction;
    result?: LoginLogResult;
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
    operatorName?: string;
    result?: OperLogStatus;
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
