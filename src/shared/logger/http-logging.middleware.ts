import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();

    response.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const path = request.originalUrl || request.url;
      const ip = this.resolveClientIp(request);
      const userAgent = this.resolveUserAgent(request);
      const contentLength = response.getHeader("content-length");
      const level = this.resolveLogLevel(response.statusCode);

      this.logger.log(
        level,
        `${request.method} ${path} ${response.statusCode} ${durationMs}ms`,
        {
          context: "HTTP",
          method: request.method,
          path,
          statusCode: response.statusCode,
          durationMs,
          ip,
          userAgent,
          contentLength:
            typeof contentLength === "number" ||
            typeof contentLength === "string"
              ? contentLength
              : null,
        },
      );
    });

    next();
  }

  private resolveClientIp(request: Request): string {
    const forwardedFor = request.headers["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const candidate =
      forwardedIp?.split(",")[0]?.trim() ||
      request.ip ||
      request.socket.remoteAddress ||
      "unknown";

    return candidate === "::1"
      ? "127.0.0.1"
      : candidate.replace(/^::ffff:/, "");
  }

  private resolveUserAgent(request: Request): string {
    const userAgent = request.headers["user-agent"];
    if (Array.isArray(userAgent)) {
      return userAgent[0] ?? "unknown";
    }

    return userAgent ?? "unknown";
  }

  private resolveLogLevel(statusCode: number): "info" | "warn" | "error" {
    if (statusCode >= 500) {
      return "error";
    }
    if (statusCode >= 400) {
      return "warn";
    }
    return "info";
  }
}
