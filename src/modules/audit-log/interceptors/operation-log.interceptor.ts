import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from "@nestjs/common";
import { Injectable, StreamableFile } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Observable } from "rxjs";
import { throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { OperLogStatus } from "../../../../generated/prisma/client";
import { resolveRequestIp } from "../../../shared/common/request-ip.util";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { AuditLogService } from "../application/audit-log.service";
import {
  AUDIT_LOG_METADATA_KEY,
  type AuditLogOptions,
} from "../decorators/audit-log.decorator";

type AuditRequest = Request & {
  user?: SessionUserSnapshot;
  file?: unknown;
  files?: unknown;
};

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const auditLogOptions = this.reflector.getAllAndOverride<AuditLogOptions>(
      AUDIT_LOG_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!auditLogOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditRequest>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap((responseData) => {
        this.enqueueOperationLog(
          auditLogOptions,
          request,
          OperLogStatus.SUCCESS,
          startedAt,
          this.normalizeResponseData(responseData),
        );
      }),
      catchError((error: unknown) => {
        this.enqueueOperationLog(
          auditLogOptions,
          request,
          OperLogStatus.FAILURE,
          startedAt,
          undefined,
          this.extractErrorMessage(error),
        );
        return throwError(() => error);
      }),
    );
  }

  private enqueueOperationLog(
    options: AuditLogOptions,
    request: AuditRequest,
    result: OperLogStatus,
    startedAt: number,
    responseData?: unknown,
    errorMessage?: string,
  ): void {
    void this.auditLogService.recordOperationLog({
      title: options.title,
      action: options.action,
      method: request.method,
      path: request.originalUrl || request.url,
      operatorId: request.user?.userId,
      operatorName: request.user?.username,
      ip: resolveRequestIp(request),
      userAgent: this.resolveUserAgent(request),
      result,
      durationMs: Date.now() - startedAt,
      requestData: {
        params: request.params,
        query: request.query,
        body: request.body,
        headers: {
          authorization: request.headers.authorization,
          cookie: request.headers.cookie,
        },
        file: request.file,
        files: request.files,
      },
      responseData,
      errorMessage,
      occurredAt: new Date(startedAt),
    });
  }
  private resolveUserAgent(request: Request): string {
    const userAgent = request.headers["user-agent"];
    if (Array.isArray(userAgent)) {
      return userAgent[0] ?? "unknown";
    }

    return userAgent ?? "unknown";
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return "unexpected error";
  }

  private normalizeResponseData(value: unknown): unknown {
    if (value instanceof StreamableFile) {
      return {
        file: "[STREAMABLE_FILE]",
      };
    }

    return value;
  }
}
