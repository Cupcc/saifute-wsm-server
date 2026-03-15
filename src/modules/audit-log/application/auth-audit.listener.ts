import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  AUTH_AUDIT_EVENT,
  type AuthAuditEvent,
} from "../../../shared/events/auth-audit.event";
import { AuditLogService } from "./audit-log.service";

@Injectable()
export class AuthAuditListener {
  constructor(private readonly auditLogService: AuditLogService) {}

  @OnEvent(AUTH_AUDIT_EVENT, { async: true, suppressErrors: true })
  async handleAuthAuditEvent(event: AuthAuditEvent): Promise<void> {
    await this.auditLogService.recordAuthEvent(event);
  }
}
