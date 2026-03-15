import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditLogService } from "./application/audit-log.service";
import { AuthAuditListener } from "./application/auth-audit.listener";
import { AuditLogController } from "./controllers/audit-log.controller";
import { AuditLogRepository } from "./infrastructure/audit-log.repository";
import { OperationLogInterceptor } from "./interceptors/operation-log.interceptor";

@Module({
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditLogRepository,
    AuthAuditListener,
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
  ],
  exports: [AuditLogService],
})
export class AuditLogModule {}
