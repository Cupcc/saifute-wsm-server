export interface SessionDepartmentSnapshot {
  departmentId: number;
  departmentName: string;
}

export type SessionConsoleMode = "default" | "rd-subwarehouse";

export interface SessionWorkshopScopeSnapshot {
  mode: "ALL" | "FIXED";
  workshopId: number | null;
  workshopCode: string | null;
  workshopName: string | null;
}

export interface SessionUserSnapshot {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  roles: string[];
  permissions: string[];
  department: SessionDepartmentSnapshot | null;
  consoleMode: SessionConsoleMode;
  workshopScope: SessionWorkshopScopeSnapshot;
}

export interface SessionClaims {
  sub: string;
  sid: string;
  username: string;
}

export interface UserSession {
  version: number;
  sessionId: string;
  user: SessionUserSnapshot;
  loginTime: string;
  lastActiveAt: string;
  expiresAt: string;
  maxExpiresAt: string;
  ip: string;
  device: string;
}

export interface CreateSessionInput {
  user: SessionUserSnapshot;
  ip?: string;
  device?: string;
}
