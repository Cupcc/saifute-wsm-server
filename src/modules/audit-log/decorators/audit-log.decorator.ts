import { SetMetadata } from "@nestjs/common";

export const AUDIT_LOG_METADATA_KEY = "auditLog";

export interface AuditLogOptions {
  title: string;
  action: string;
}

export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_METADATA_KEY, options);
