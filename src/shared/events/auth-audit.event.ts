export const AUTH_AUDIT_EVENT = "auth.audit";

export const AUTH_AUDIT_ACTION = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
} as const;

export const AUTH_AUDIT_RESULT = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
} as const;

export type AuthAuditAction =
  (typeof AUTH_AUDIT_ACTION)[keyof typeof AUTH_AUDIT_ACTION];

export type AuthAuditResult =
  (typeof AUTH_AUDIT_RESULT)[keyof typeof AUTH_AUDIT_RESULT];

export interface AuthAuditEvent {
  occurredAt: string;
  action: AuthAuditAction;
  result: AuthAuditResult;
  username: string;
  userId?: number;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
}

export function createAuthAuditEvent(
  input: Omit<AuthAuditEvent, "occurredAt"> & {
    occurredAt?: string;
  },
): AuthAuditEvent {
  return {
    ...input,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}
