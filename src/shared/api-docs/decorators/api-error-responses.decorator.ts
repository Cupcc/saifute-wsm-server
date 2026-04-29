import { applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";
import { ApiErrorResponseDto } from "../dto/api-error-response.dto";

const ERROR_RESPONSE_DESCRIPTIONS: Record<number, string> = {
  400: "请求参数或请求体校验失败",
  401: "未认证或访问令牌无效",
  403: "已认证但缺少所需权限",
  500: "服务器内部错误",
};

export function ApiErrorResponses(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(ApiErrorResponseDto),
    ...Object.entries(ERROR_RESPONSE_DESCRIPTIONS).map(
      ([statusCode, description]) =>
        ApiResponse({
          status: Number(statusCode),
          description,
          schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
        }),
    ),
  );
}
