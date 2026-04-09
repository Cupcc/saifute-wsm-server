import { Injectable, Logger } from "@nestjs/common";
import {
  type LoginLog,
  LoginLogAction,
  LoginLogResult,
  type OperLog,
  OperLogStatus,
} from "../../../../generated/prisma/client";
import type { AuthAuditEvent } from "../../../shared/events/auth-audit.event";
import { AuditLogRepository } from "../infrastructure/audit-log.repository";

const SENSITIVE_KEY_PATTERN = /(password|token|authorization|secret|cookie)/i;
const MAX_STRING_LENGTH = 500;
const MAX_OBJECT_DEPTH = 3;
const MAX_OBJECT_KEYS = 20;
const MAX_ARRAY_ITEMS = 20;
const MAX_SERIALIZED_LENGTH = 4000;

export interface RecordOperationLogCommand {
  title: string;
  action: string;
  method: string;
  path: string;
  operatorId?: number;
  operatorName?: string;
  ip?: string;
  userAgent?: string;
  result: OperLogStatus;
  requestData?: unknown;
  responseData?: unknown;
  errorMessage?: string;
  durationMs: number;
  occurredAt?: Date;
}

export class ListLoginLogsQuery {
  username?: string;
  ip?: string;
  action?: LoginLogAction;
  result?: LoginLogResult;
  limit?: number;
  offset?: number;
  beginTime?: string;
  endTime?: string;
}

export class ListOperLogsQuery {
  title?: string;
  ip?: string;
  operatorName?: string;
  result?: OperLogStatus;
  limit?: number;
  offset?: number;
  beginTime?: string;
  endTime?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly repository: AuditLogRepository) {}

  async recordAuthEvent(event: AuthAuditEvent): Promise<void> {
    try {
      await this.repository.createLoginLog({
        action: event.action as LoginLogAction,
        result: event.result as LoginLogResult,
        username: event.username,
        userId: event.userId,
        sessionId: event.sessionId,
        ip: event.ip,
        userAgent: event.userAgent,
        reason: event.reason,
        occurredAt: this.toDate(event.occurredAt),
      });
    } catch (error) {
      this.logWriteFailure("login", error);
    }
  }

  async recordOperationLog(command: RecordOperationLogCommand): Promise<void> {
    try {
      await this.repository.createOperLog({
        title: command.title,
        action: command.action,
        method: command.method,
        path: command.path,
        operatorId: command.operatorId,
        operatorName: command.operatorName,
        ip: command.ip,
        userAgent: command.userAgent,
        status: command.result,
        requestData: this.serializePayload(command.requestData),
        responseData: this.serializePayload(command.responseData),
        errorMessage: this.limitString(command.errorMessage),
        durationMs: command.durationMs,
        occurredAt: command.occurredAt ?? new Date(),
      });
    } catch (error) {
      this.logWriteFailure("operation", error);
    }
  }

  async listLoginLogs(query: ListLoginLogsQuery): Promise<{
    items: Array<LoginLog & { message: string }>;
    total: number;
  }> {
    const result = await this.repository.findLoginLogs({
      username: query.username,
      ip: query.ip,
      action: query.action,
      result: query.result,
      beginTime: query.beginTime,
      endTime: query.endTime,
      limit: Math.min(query.limit ?? 50, 100),
      offset: query.offset ?? 0,
    });

    return {
      total: result.total,
      items: result.items.map((item) => ({
        ...item,
        message: this.buildLoginLogMessage(item),
      })),
    };
  }

  async listOperLogs(query: ListOperLogsQuery): Promise<{
    items: Array<
      OperLog & {
        businessType: string;
        requestMethod: string;
        requestUrl: string;
        operatorIp: string | null;
        requestParams: string | null;
        responseBody: string | null;
      }
    >;
    total: number;
  }> {
    const result = await this.repository.findOperLogs({
      title: query.title,
      ip: query.ip,
      operatorName: query.operatorName,
      result: query.result,
      beginTime: query.beginTime,
      endTime: query.endTime,
      limit: Math.min(query.limit ?? 50, 100),
      offset: query.offset ?? 0,
    });

    return {
      total: result.total,
      items: result.items.map((item) => ({
        ...item,
        businessType: item.action,
        requestMethod: item.method,
        requestUrl: item.path,
        operatorIp: item.ip,
        requestParams: item.requestData,
        responseBody: item.responseData,
      })),
    };
  }

  async deleteLoginLog(id: number): Promise<{ deleted: number }> {
    const result = await this.repository.deleteLoginLog(id);
    return { deleted: result.count };
  }

  async clearLoginLogs(): Promise<{ cleared: number }> {
    const result = await this.repository.clearLoginLogs();
    return { cleared: result.count };
  }

  async deleteOperLog(id: number): Promise<{ deleted: number }> {
    const result = await this.repository.deleteOperLog(id);
    return { deleted: result.count };
  }

  async clearOperLogs(): Promise<{ cleared: number }> {
    const result = await this.repository.clearOperLogs();
    return { cleared: result.count };
  }

  private toDate(value: string): Date {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private serializePayload(value: unknown): string | null {
    if (typeof value === "undefined") {
      return null;
    }

    const normalized = this.sanitizeValue(value, 0, new WeakSet<object>());
    const serialized = JSON.stringify(normalized);
    if (!serialized) {
      return null;
    }

    return serialized.length > MAX_SERIALIZED_LENGTH
      ? `${serialized.slice(0, MAX_SERIALIZED_LENGTH)}...[TRUNCATED]`
      : serialized;
  }

  private sanitizeValue(
    value: unknown,
    depth: number,
    seen: WeakSet<object>,
  ): unknown {
    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "number"
    ) {
      return value;
    }

    if (typeof value === "string") {
      return this.limitString(value) ?? "";
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Buffer.isBuffer(value)) {
      return `[BUFFER:${value.byteLength}]`;
    }

    if (typeof value !== "object") {
      return String(value);
    }

    if (this.isFileLike(value)) {
      return {
        file: "[FILE]",
        name: this.limitString(String(value.originalname)) ?? "",
        mimeType: this.limitString(String(value.mimetype)) ?? "",
        size: Number(value.size) || 0,
      };
    }

    if (Array.isArray(value)) {
      return value
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) => this.sanitizeValue(item, depth + 1, seen));
    }

    if (depth >= MAX_OBJECT_DEPTH) {
      return "[TRUNCATED_OBJECT]";
    }

    if (seen.has(value)) {
      return "[CIRCULAR]";
    }
    seen.add(value);

    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
    const sanitized: Record<string, unknown> = {};
    for (const [key, rawValue] of entries) {
      sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : this.sanitizeValue(rawValue, depth + 1, seen);
    }

    if (Object.keys(value).length > MAX_OBJECT_KEYS) {
      sanitized._truncatedKeys = true;
    }

    return sanitized;
  }

  private isFileLike(value: object): value is {
    originalname: unknown;
    mimetype: unknown;
    size: unknown;
  } {
    return (
      "originalname" in value &&
      "mimetype" in value &&
      "size" in value &&
      "buffer" in value
    );
  }

  private limitString(value?: string): string | null {
    if (!value) {
      return null;
    }

    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`
      : value;
  }

  private logWriteFailure(kind: string, error: unknown): void {
    const message =
      error instanceof Error ? error.message : "unknown persistence error";
    this.logger.warn(`Failed to persist ${kind} audit log: ${message}`);
  }

  private buildLoginLogMessage(item: LoginLog): string {
    if (item.result === LoginLogResult.SUCCESS) {
      return item.action === LoginLogAction.LOGOUT ? "退出成功" : "登录成功";
    }

    switch (item.reason) {
      case "captcha_invalid":
        return "验证码错误";
      case "ip_blocked":
        return "登录请求已被拒绝";
      case "account_locked":
        return "账号已被临时锁定";
      case "password_invalid":
      case "user_invalid":
        return "用户名或密码错误";
      default:
        return "登录失败";
    }
  }
}
