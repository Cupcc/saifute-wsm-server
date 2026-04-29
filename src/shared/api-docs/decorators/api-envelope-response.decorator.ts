import { applyDecorators, type Type } from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from "@nestjs/swagger";
import type {
  ReferenceObject,
  SchemaObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { ResponseEnvelopeDto } from "../dto/response-envelope.dto";

type ApiResponseModel = Type<unknown>;

type EnvelopeResponseOptions = {
  description?: string;
};

type EnvelopeResponseDecoratorFactory = (options: {
  description?: string;
  schema: SchemaObject;
}) => MethodDecorator & ClassDecorator;

export function ApiEnvelopeOkResponse(
  model?: ApiResponseModel,
  options: EnvelopeResponseOptions = {},
): MethodDecorator & ClassDecorator {
  return buildEnvelopeResponseDecorator(ApiOkResponse, model, options);
}

export function ApiEnvelopeCreatedResponse(
  model?: ApiResponseModel,
  options: EnvelopeResponseOptions = {},
): MethodDecorator & ClassDecorator {
  return buildEnvelopeResponseDecorator(ApiCreatedResponse, model, options);
}

export function ApiEnvelopeArrayResponse(
  model: ApiResponseModel,
  options: EnvelopeResponseOptions = {},
): MethodDecorator & ClassDecorator {
  return buildEnvelopeResponseDecorator(ApiOkResponse, model, {
    ...options,
    dataSchema: {
      type: "array",
      items: { $ref: getSchemaPath(model) },
    },
  });
}

export function ApiPaginatedEnvelopeResponse(
  model: ApiResponseModel,
  options: EnvelopeResponseOptions = {},
): MethodDecorator & ClassDecorator {
  return buildEnvelopeResponseDecorator(ApiOkResponse, model, {
    ...options,
    dataSchema: {
      type: "object",
      properties: {
        list: {
          type: "array",
          items: { $ref: getSchemaPath(model) },
        },
        total: {
          type: "integer",
          example: 0,
        },
        page: {
          type: "integer",
          example: 1,
        },
        pageSize: {
          type: "integer",
          example: 10,
        },
      },
      required: ["list", "total"],
    },
  });
}

function buildEnvelopeResponseDecorator(
  responseDecorator: EnvelopeResponseDecoratorFactory,
  model: ApiResponseModel | undefined,
  options: EnvelopeResponseOptions & { dataSchema?: SchemaObject },
): MethodDecorator & ClassDecorator {
  const extraModels = model
    ? ApiExtraModels(ResponseEnvelopeDto, model)
    : ApiExtraModels(ResponseEnvelopeDto);

  return applyDecorators(
    extraModels,
    responseDecorator({
      description: options.description ?? "请求成功",
      schema: buildEnvelopeSchema(options.dataSchema ?? buildDataSchema(model)),
    }),
  );
}

function buildDataSchema(
  model: ApiResponseModel | undefined,
): SchemaObject | ReferenceObject {
  if (!model) {
    return { type: "object" };
  }

  return { $ref: getSchemaPath(model) };
}

function buildEnvelopeSchema(
  dataSchema: SchemaObject | ReferenceObject,
): SchemaObject {
  return {
    allOf: [
      { $ref: getSchemaPath(ResponseEnvelopeDto) },
      {
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
          data: dataSchema,
        },
        required: ["success", "code", "data"],
      },
    ],
  };
}
