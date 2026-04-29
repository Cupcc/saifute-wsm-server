import {
  type INestApplication,
  RequestMethod,
  type Type,
} from "@nestjs/common";
import {
  METHOD_METADATA,
  MODULE_PATH,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { ModulesContainer } from "@nestjs/core";
import type { OpenAPIObject } from "@nestjs/swagger";
import type {
  OperationObject,
  ReferenceObject,
  ResponseObject,
  SchemaObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { SKIP_RESPONSE_ENVELOPE_KEY } from "../../common/interceptors/skip-response-envelope.decorator";
import { IS_PUBLIC_KEY } from "../../decorators/public.decorator";

type SwaggerOperationMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "head";

type RoutePolicy = {
  isPublic: boolean;
  skipResponseEnvelope: boolean;
};

const SWAGGER_OPERATION_METHODS: ReadonlyArray<SwaggerOperationMethod> = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
];

const REQUEST_METHOD_TO_SWAGGER_METHOD: Partial<
  Record<RequestMethod, SwaggerOperationMethod>
> = {
  [RequestMethod.GET]: "get",
  [RequestMethod.POST]: "post",
  [RequestMethod.PUT]: "put",
  [RequestMethod.PATCH]: "patch",
  [RequestMethod.DELETE]: "delete",
  [RequestMethod.OPTIONS]: "options",
  [RequestMethod.HEAD]: "head",
};

const ERROR_RESPONSE_DESCRIPTIONS: Record<number, string> = {
  400: "请求参数或请求体校验失败",
  401: "未认证或访问令牌无效",
  403: "已认证但缺少所需权限",
  500: "服务器内部错误",
};

export function applyOpenApiContractPolicies(
  app: INestApplication,
  swaggerDocument: OpenAPIObject,
  apiGlobalPrefix: string,
): void {
  ensureSharedSchemas(swaggerDocument);
  swaggerDocument.security ??= [{ bearer: [] }];

  const routePolicies = collectRoutePolicies(app, apiGlobalPrefix);

  for (const [routePath, pathItem] of Object.entries(swaggerDocument.paths)) {
    for (const method of SWAGGER_OPERATION_METHODS) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      const routePolicy = routePolicies.get(
        buildOperationKey(method, routePath),
      );
      if (routePolicy?.isPublic) {
        operation.security = [];
      }

      if (!routePolicy?.skipResponseEnvelope) {
        wrapSuccessResponses(operation);
      }

      addUnifiedErrorResponses(operation);
    }
  }
}

function collectRoutePolicies(
  app: INestApplication,
  apiGlobalPrefix: string,
): Map<string, RoutePolicy> {
  const routePolicies = new Map<string, RoutePolicy>();
  const modulesContainer = app.get(ModulesContainer, { strict: false });

  for (const moduleRef of modulesContainer.values()) {
    const modulePaths = normalizePathMetadata(
      Reflect.getMetadata(MODULE_PATH, moduleRef.metatype),
    );

    for (const controllerWrapper of moduleRef.controllers.values()) {
      const controllerType = controllerWrapper.metatype as
        | Type<unknown>
        | undefined;
      if (!controllerType?.prototype) {
        continue;
      }

      const controllerPaths = normalizePathMetadata(
        Reflect.getMetadata(PATH_METADATA, controllerType),
      );
      const controllerPrototype = controllerType.prototype as Record<
        string,
        unknown
      >;

      for (const methodName of Object.getOwnPropertyNames(
        controllerPrototype,
      )) {
        if (methodName === "constructor") {
          continue;
        }

        const handler = controllerPrototype[methodName];
        if (typeof handler !== "function") {
          continue;
        }

        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
          | RequestMethod
          | undefined;
        const swaggerMethod =
          requestMethod === undefined
            ? undefined
            : REQUEST_METHOD_TO_SWAGGER_METHOD[requestMethod];
        if (!swaggerMethod) {
          continue;
        }

        const methodPaths = normalizePathMetadata(
          Reflect.getMetadata(PATH_METADATA, handler),
        );
        const routePolicy = {
          isPublic: getMergedBooleanMetadata(
            IS_PUBLIC_KEY,
            handler,
            controllerType,
          ),
          skipResponseEnvelope: getMergedBooleanMetadata(
            SKIP_RESPONSE_ENVELOPE_KEY,
            handler,
            controllerType,
          ),
        };

        for (const routePath of expandRoutePaths(
          modulePaths,
          controllerPaths,
          methodPaths,
        )) {
          for (const swaggerPath of resolveSwaggerPathCandidates(
            routePath,
            apiGlobalPrefix,
          )) {
            routePolicies.set(
              buildOperationKey(swaggerMethod, swaggerPath),
              routePolicy,
            );
          }
        }
      }
    }
  }

  return routePolicies;
}

function wrapSuccessResponses(operation: OperationObject): void {
  for (const [statusCode, response] of Object.entries(operation.responses)) {
    const numericStatusCode = resolveStatusCode(statusCode);
    if (
      !isResponseObject(response) ||
      numericStatusCode === null ||
      numericStatusCode < 200 ||
      numericStatusCode >= 300
    ) {
      continue;
    }

    if (response.content && !response.content["application/json"]) {
      continue;
    }

    response.content ??= {};
    const jsonContent = response.content["application/json"] ?? {};
    const currentSchema = jsonContent.schema;
    if (isEnvelopeSchema(currentSchema)) {
      continue;
    }

    response.content["application/json"] = {
      ...jsonContent,
      schema: buildEnvelopeSchema(currentSchema),
    };
  }
}

function addUnifiedErrorResponses(operation: OperationObject): void {
  for (const [statusCode, description] of Object.entries(
    ERROR_RESPONSE_DESCRIPTIONS,
  )) {
    operation.responses[statusCode] ??= buildErrorResponse(description);
  }
}

function ensureSharedSchemas(swaggerDocument: OpenAPIObject): void {
  swaggerDocument.components ??= {};
  swaggerDocument.components.schemas ??= {};
  swaggerDocument.components.schemas.ApiErrorResponseDto ??= {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: false,
      },
      code: {
        type: "integer",
        example: 400,
      },
      message: {
        type: "string",
        example: "请求失败",
      },
    },
    required: ["success", "code", "message"],
  };
  swaggerDocument.components.schemas.ResponseEnvelopeDto ??= {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      code: {
        type: "integer",
        example: 200,
      },
      data: {
        type: "object",
      },
    },
    required: ["success", "code", "data"],
  };
}

function buildErrorResponse(description: string): ResponseObject {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiErrorResponseDto" },
      },
    },
  };
}

function buildEnvelopeSchema(
  dataSchema: SchemaObject | ReferenceObject | undefined,
): SchemaObject {
  return {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      code: {
        type: "integer",
        example: 200,
      },
      data: dataSchema ?? {
        type: "object",
      },
    },
    required: ["success", "code", "data"],
  };
}

function buildOperationKey(
  method: SwaggerOperationMethod,
  routePath: string,
): string {
  return `${method.toUpperCase()} ${normalizeSwaggerPath(routePath)}`;
}

function expandRoutePaths(
  modulePaths: string[],
  controllerPaths: string[],
  methodPaths: string[],
): string[] {
  const routePaths = new Set<string>();

  for (const modulePath of modulePaths) {
    for (const controllerPath of controllerPaths) {
      for (const methodPath of methodPaths) {
        routePaths.add(
          joinRouteSegments(modulePath, controllerPath, methodPath),
        );
      }
    }
  }

  return [...routePaths];
}

function resolveSwaggerPathCandidates(
  routePath: string,
  apiGlobalPrefix: string,
): string[] {
  const candidates = new Set<string>();
  candidates.add(toOpenApiPath(routePath));
  candidates.add(toOpenApiPath(joinRouteSegments(apiGlobalPrefix, routePath)));

  return [...candidates];
}

function normalizePathMetadata(pathMetadata: unknown): string[] {
  if (pathMetadata === undefined || pathMetadata === null) {
    return [""];
  }

  if (Array.isArray(pathMetadata)) {
    return pathMetadata.flatMap((path) => normalizePathMetadata(path));
  }

  if (typeof pathMetadata === "string") {
    return [pathMetadata];
  }

  return [String(pathMetadata)];
}

function getMergedBooleanMetadata(
  metadataKey: string,
  handler: object,
  controllerType: Type<unknown>,
): boolean {
  const handlerValue = Reflect.getMetadata(metadataKey, handler);
  if (handlerValue !== undefined) {
    return handlerValue === true;
  }

  return Reflect.getMetadata(metadataKey, controllerType) === true;
}

function joinRouteSegments(...segments: string[]): string {
  return segments
    .map((segment) => segment.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function toOpenApiPath(routePath: string): string {
  return normalizeSwaggerPath(convertNestPathParameters(routePath));
}

function normalizeSwaggerPath(routePath: string): string {
  const normalizedPath = routePath.trim().replace(/^\/+|\/+$/g, "");
  return normalizedPath ? `/${normalizedPath}` : "/";
}

function convertNestPathParameters(routePath: string): string {
  return routePath
    .split("/")
    .map((segment) => {
      if (!segment.startsWith(":")) {
        return segment;
      }

      const parameterName = segment.slice(1).replace(/\(.+\)$/, "");
      return parameterName ? `{${parameterName}}` : segment;
    })
    .join("/");
}

function resolveStatusCode(statusCode: string): number | null {
  if (!/^\d+$/.test(statusCode)) {
    return null;
  }

  return Number(statusCode);
}

function isEnvelopeSchema(
  schema: SchemaObject | ReferenceObject | undefined,
): boolean {
  if (!schema || "$ref" in schema) {
    return false;
  }

  const properties = schema.properties;
  if (properties?.success && properties.code && properties.data) {
    return true;
  }

  return (
    Array.isArray(schema.allOf) &&
    schema.allOf.some(
      (nestedSchema: SchemaObject | ReferenceObject) =>
        "$ref" in nestedSchema &&
        nestedSchema.$ref === "#/components/schemas/ResponseEnvelopeDto",
    )
  );
}

function isResponseObject(
  response: OperationObject["responses"][string],
): response is ResponseObject {
  return Boolean(response && !("$ref" in response));
}
