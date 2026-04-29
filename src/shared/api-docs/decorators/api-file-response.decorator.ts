import { applyDecorators } from "@nestjs/common";
import { ApiProduces, ApiResponse } from "@nestjs/swagger";
import { SkipResponseEnvelope } from "../../common/interceptors/skip-response-envelope.decorator";

type ApiFileResponseOptions = {
  contentType?: string;
  description?: string;
  status?: number;
};

export function ApiFileResponse(
  options: ApiFileResponseOptions = {},
): MethodDecorator & ClassDecorator {
  const contentType = options.contentType ?? "application/octet-stream";

  return applyDecorators(
    SkipResponseEnvelope(),
    ApiProduces(contentType),
    ApiResponse({
      status: options.status ?? 200,
      description: options.description ?? "文件流响应",
      headers: {
        "Content-Disposition": {
          description: "下载文件名提示。",
          schema: { type: "string" },
        },
      },
      content: {
        [contentType]: {
          schema: {
            type: "string",
            format: "binary",
          },
        },
      },
    }),
  );
}
