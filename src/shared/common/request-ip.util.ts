import type { Request } from "express";

export function resolveRequestIp(request: Request): string {
  const candidate = request.ip || request.socket.remoteAddress || "unknown";
  return normalizeIpAddress(candidate);
}

export function normalizeIpAddress(ip: string): string {
  if (ip === "::1") {
    return "127.0.0.1";
  }

  return ip.replace(/^::ffff:/, "");
}
