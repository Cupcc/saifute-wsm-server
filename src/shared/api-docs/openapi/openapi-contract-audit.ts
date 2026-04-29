import type { OpenAPIObject } from "@nestjs/swagger";
import type {
  OperationObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

type SwaggerOperationMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "head";

export type OpenApiContractAudit = {
  operationCount: number;
  publicOperationCount: number;
  envelopeSuccessResponseCount: number;
  genericEnvelopeDataCount: number;
  multipartOperationCount: number;
  fileResponseCount: number;
  operationsMissingErrorResponses: string[];
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

const REQUIRED_ERROR_STATUSES = ["400", "401", "403", "500"] as const;

export function auditOpenApiContract(
  swaggerDocument: OpenAPIObject,
): OpenApiContractAudit {
  const audit: OpenApiContractAudit = {
    operationCount: 0,
    publicOperationCount: 0,
    envelopeSuccessResponseCount: 0,
    genericEnvelopeDataCount: 0,
    multipartOperationCount: 0,
    fileResponseCount: 0,
    operationsMissingErrorResponses: [],
  };

  for (const [routePath, pathItem] of Object.entries(swaggerDocument.paths)) {
    for (const method of SWAGGER_OPERATION_METHODS) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      audit.operationCount += 1;
      if (operation.security?.length === 0) {
        audit.publicOperationCount += 1;
      }
      if (hasMultipartRequestBody(operation)) {
        audit.multipartOperationCount += 1;
      }
      if (hasFileResponse(operation)) {
        audit.fileResponseCount += 1;
      }
      if (hasEnvelopeSuccessResponse(operation)) {
        audit.envelopeSuccessResponseCount += 1;
      }
      if (hasGenericEnvelopeData(operation)) {
        audit.genericEnvelopeDataCount += 1;
      }
      if (hasMissingErrorResponses(operation)) {
        audit.operationsMissingErrorResponses.push(
          `${method.toUpperCase()} ${routePath}`,
        );
      }
    }
  }

  return audit;
}

function hasMultipartRequestBody(operation: OperationObject): boolean {
  const requestBody = operation.requestBody;
  return Boolean(
    requestBody &&
      isRequestBodyObject(requestBody) &&
      requestBody.content["multipart/form-data"],
  );
}

function hasFileResponse(operation: OperationObject): boolean {
  return Object.values(operation.responses).some((response) => {
    if (!isResponseObject(response) || !response.content) {
      return false;
    }

    return Object.values(response.content).some(
      (mediaType) =>
        mediaType.schema &&
        isSchemaObject(mediaType.schema) &&
        mediaType.schema.format === "binary",
    );
  });
}

function hasEnvelopeSuccessResponse(operation: OperationObject): boolean {
  return Object.entries(operation.responses).some(([statusCode, response]) => {
    if (!/^2\d\d$/.test(statusCode) || !isResponseObject(response)) {
      return false;
    }

    const schema = response.content?.["application/json"]?.schema;
    return Boolean(
      schema &&
        !("$ref" in schema) &&
        schema.properties?.success &&
        schema.properties.code &&
        schema.properties.data,
    );
  });
}

function hasGenericEnvelopeData(operation: OperationObject): boolean {
  return Object.entries(operation.responses).some(([statusCode, response]) => {
    if (!/^2\d\d$/.test(statusCode) || !isResponseObject(response)) {
      return false;
    }

    const schema = response.content?.["application/json"]?.schema;
    const dataSchema =
      schema && isSchemaObject(schema) ? schema.properties?.data : undefined;

    return Boolean(
      dataSchema &&
        isSchemaObject(dataSchema) &&
        dataSchema.type === "object" &&
        !dataSchema.properties,
    );
  });
}

function hasMissingErrorResponses(operation: OperationObject): boolean {
  return REQUIRED_ERROR_STATUSES.some(
    (statusCode) => !operation.responses[statusCode],
  );
}

function isRequestBodyObject(
  requestBody: RequestBodyObject | ReferenceObject,
): requestBody is RequestBodyObject {
  return !("$ref" in requestBody);
}

function isResponseObject(
  response: OperationObject["responses"][string],
): response is ResponseObject {
  return Boolean(response && !("$ref" in response));
}

function isSchemaObject(
  schema: SchemaObject | ReferenceObject,
): schema is SchemaObject {
  return !("$ref" in schema);
}
