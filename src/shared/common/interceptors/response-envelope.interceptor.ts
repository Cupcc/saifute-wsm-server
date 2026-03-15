import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { SKIP_RESPONSE_ENVELOPE_KEY } from "./skip-response-envelope.decorator";

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_ENVELOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (shouldSkip || context.getType() !== "http") {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<{
      getHeader?: (name: string) => unknown;
      headersSent?: boolean;
    }>();

    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile || response?.headersSent) {
          return data;
        }

        const contentDisposition = response?.getHeader?.("content-disposition");
        const contentType = response?.getHeader?.("content-type");
        if (
          contentDisposition ||
          (typeof contentType === "string" &&
            !contentType.includes("application/json"))
        ) {
          return data;
        }

        return {
          success: true,
          code: 200,
          data,
        };
      }),
    );
  }
}
