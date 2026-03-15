import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { AuditLogService } from "../application/audit-log.service";
import { AuditLog } from "../decorators/audit-log.decorator";
import { QueryLoginLogsDto } from "../dto/query-login-logs.dto";
import { QueryOperLogsDto } from "../dto/query-oper-logs.dto";

@Controller("audit")
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Permissions("audit:login-log:list")
  @Get("login-logs")
  async listLoginLogs(@Query() query: QueryLoginLogsDto) {
    return this.auditLogService.listLoginLogs(query);
  }

  @Permissions("audit:login-log:delete")
  @AuditLog({ title: "删除登录日志", action: "DELETE_LOGIN_LOG" })
  @Delete("login-logs/:id")
  async deleteLoginLog(@Param("id", ParseIntPipe) id: number) {
    return this.auditLogService.deleteLoginLog(id);
  }

  @Permissions("audit:login-log:delete")
  @AuditLog({ title: "清空登录日志", action: "CLEAR_LOGIN_LOG" })
  @Delete("login-logs")
  async clearLoginLogs() {
    return this.auditLogService.clearLoginLogs();
  }

  @Permissions("audit:oper-log:list")
  @Get("oper-logs")
  async listOperLogs(@Query() query: QueryOperLogsDto) {
    return this.auditLogService.listOperLogs(query);
  }

  @Permissions("audit:oper-log:delete")
  @AuditLog({ title: "删除操作日志", action: "DELETE_OPER_LOG" })
  @Delete("oper-logs/:id")
  async deleteOperLog(@Param("id", ParseIntPipe) id: number) {
    return this.auditLogService.deleteOperLog(id);
  }

  @Permissions("audit:oper-log:delete")
  @AuditLog({ title: "清空操作日志", action: "CLEAR_OPER_LOG" })
  @Delete("oper-logs")
  async clearOperLogs() {
    return this.auditLogService.clearOperLogs();
  }
}
