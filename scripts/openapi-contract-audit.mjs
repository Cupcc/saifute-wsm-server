#!/usr/bin/env bun

import { readFile } from "node:fs/promises";

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);
const BODY_METHODS = new Set(["post", "put", "patch"]);
const MAX_EXAMPLES = 10;
const OBJECT_SCHEMA_REF = "#/components/schemas/Object";
const REQUIRED_ERROR_STATUSES = ["400", "401", "403", "500"];
const DEFAULT_EXPECTED_PUBLIC_OPERATIONS = [
  { method: "GET", path: "/api/health" },
  { method: "GET", path: "/api/auth/captcha" },
  { method: "POST", path: "/api/auth/login" },
  { method: "POST", path: "/api/auth/refresh" },
  { method: "POST", path: "/api/auth/logout" },
];
const DEFAULT_EXPECTED_NO_ENVELOPE_OPERATIONS = [
  { method: "GET", path: "/api/files/download" },
  { method: "GET", path: "/api/reporting/export" },
  { method: "POST", path: "/api/reporting/monthly-reporting/export" },
  { method: "POST", path: "/api/ai/chat" },
];
const DEFAULT_EXPECTED_NO_ENVELOPE_PREFIXES = ["/api/system/"];

function printHelp() {
  console.log(`Usage: bun ./scripts/openapi-contract-audit.mjs --input <file-or-url>

Options:
  --input <file-or-url>    OpenAPI JSON file path or http(s) URL.
  --expect-public <METHOD> <PATH>
                           Add an operation expected to have security: [].
  --expect-no-envelope <METHOD> <PATH>
                           Add an operation expected not to use the success envelope.
  --expect-no-envelope-prefix <PATH>
                           Add a path prefix whose operations must not use the success envelope.
  --json                   Print machine-readable JSON.
  --help                   Show this help message.

Examples:
  bun ./scripts/openapi-contract-audit.mjs --input http://127.0.0.1:8112/api/docs-json
  bun ./scripts/openapi-contract-audit.mjs --input ./openapi.json
`);
}

function parseArgs(argv) {
  const options = {
    expectedNoEnvelopeOperations: [...DEFAULT_EXPECTED_NO_ENVELOPE_OPERATIONS],
    expectedNoEnvelopePrefixes: [...DEFAULT_EXPECTED_NO_ENVELOPE_PREFIXES],
    expectedPublicOperations: [...DEFAULT_EXPECTED_PUBLIC_OPERATIONS],
    help: false,
    input: null,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }

    if (argument === "--json") {
      options.json = true;
      continue;
    }

    if (
      argument === "--expect-public" ||
      argument.startsWith("--expect-public=")
    ) {
      const { operation, nextIndex } = parseOperationExpectation(
        argv,
        index,
        "--expect-public",
        argument,
      );
      options.expectedPublicOperations.push(operation);
      index = nextIndex;
      continue;
    }

    if (
      argument === "--expect-no-envelope" ||
      argument.startsWith("--expect-no-envelope=")
    ) {
      const { operation, nextIndex } = parseOperationExpectation(
        argv,
        index,
        "--expect-no-envelope",
        argument,
      );
      options.expectedNoEnvelopeOperations.push(operation);
      index = nextIndex;
      continue;
    }

    if (
      argument === "--expect-no-envelope-prefix" ||
      argument.startsWith("--expect-no-envelope-prefix=")
    ) {
      const value =
        argument === "--expect-no-envelope-prefix"
          ? argv[++index]
          : argument.slice("--expect-no-envelope-prefix=".length);

      if (!value) {
        throw new Error(
          "--expect-no-envelope-prefix expects a path prefix value.",
        );
      }

      options.expectedNoEnvelopePrefixes.push(normalizePath(value));
      continue;
    }

    if (argument === "--input" || argument.startsWith("--input=")) {
      const value =
        argument === "--input"
          ? argv[++index]
          : argument.slice("--input=".length);

      if (!value) {
        throw new Error("--input expects a file path or http(s) URL.");
      }

      options.input = value;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function parseOperationExpectation(argv, index, optionName, argument) {
  if (argument.startsWith(`${optionName}=`)) {
    return {
      operation: parseOperationText(argument.slice(`${optionName}=`.length)),
      nextIndex: index,
    };
  }

  const method = argv[index + 1];
  const path = argv[index + 2];
  if (!method || !path) {
    throw new Error(`${optionName} expects <METHOD> <PATH>.`);
  }

  return {
    operation: normalizeOperation({ method, path }),
    nextIndex: index + 2,
  };
}

function parseOperationText(value) {
  const [method, ...pathParts] = value.trim().split(/\s+/);
  const path = pathParts.join(" ");
  if (!method || !path) {
    throw new Error("Operation expectation must use '<METHOD> <PATH>'.");
  }

  return normalizeOperation({ method, path });
}

function normalizeOperation(operation) {
  return {
    method: normalizeMethod(operation.method),
    path: normalizePath(operation.path),
  };
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function readOpenApiJson(input) {
  if (isHttpUrl(input)) {
    const response = await fetch(input);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenAPI JSON: HTTP ${response.status} ${response.statusText}`,
      );
    }

    return response.text();
  }

  return readFile(input, "utf8");
}

function parseOpenApi(content, input) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse OpenAPI JSON from ${input}: ${error.message}`,
    );
  }
}

function assertOpenApiDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("Input is not a JSON object.");
  }

  if (!document.paths || typeof document.paths !== "object") {
    throw new Error(
      "Input does not look like an OpenAPI document: missing paths.",
    );
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeMethod(method) {
  return method.toUpperCase();
}

function normalizePath(path) {
  const normalizedPath = String(path)
    .trim()
    .replace(/^\/+|\/+$/g, "");
  return normalizedPath ? `/${normalizedPath}` : "/";
}

function operationKey(method, path) {
  return `${normalizeMethod(method)} ${normalizePath(path)}`;
}

function formatOperation(record) {
  return `${record.method} ${record.path}`;
}

function operationRecords(document) {
  const records = [];

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!isPlainObject(pathItem)) {
      continue;
    }

    for (const [methodKey, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(methodKey) || !isPlainObject(operation)) {
        continue;
      }

      records.push({
        method: normalizeMethod(methodKey),
        methodKey,
        operation,
        path: normalizePath(path),
        pathItem,
      });
    }
  }

  return records;
}

function resolveLocalRef(document, ref) {
  if (!isNonEmptyString(ref) || !ref.startsWith("#/")) {
    return null;
  }

  let current = document;
  const segments = ref
    .slice(2)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));

  for (const segment of segments) {
    if (!isPlainObject(current) && !Array.isArray(current)) {
      return null;
    }

    current = current[segment];
  }

  return current ?? null;
}

function resolveSchema(document, schema, seenRefs = new Set()) {
  if (!isPlainObject(schema) || !isNonEmptyString(schema.$ref)) {
    return schema;
  }

  if (seenRefs.has(schema.$ref)) {
    return schema;
  }

  seenRefs.add(schema.$ref);
  return resolveSchema(
    document,
    resolveLocalRef(document, schema.$ref),
    seenRefs,
  );
}

function resolveParameter(document, parameter) {
  if (!isPlainObject(parameter) || !isNonEmptyString(parameter.$ref)) {
    return parameter;
  }

  return resolveLocalRef(document, parameter.$ref) ?? parameter;
}

function schemaVariants(document, schema, seenRefs = new Set()) {
  const resolved = resolveSchema(document, schema, seenRefs);

  if (!isPlainObject(resolved)) {
    return [];
  }

  const variants = [resolved];

  for (const key of ["allOf", "anyOf", "oneOf"]) {
    if (!Array.isArray(resolved[key])) {
      continue;
    }

    for (const item of resolved[key]) {
      variants.push(...schemaVariants(document, item, new Set(seenRefs)));
    }
  }

  return variants;
}

function mergedProperties(document, schema) {
  const properties = {};

  for (const variant of schemaVariants(document, schema)) {
    if (isPlainObject(variant.properties)) {
      Object.assign(properties, variant.properties);
    }
  }

  return properties;
}

function isEnvelopeSchema(document, schema) {
  const properties = mergedProperties(document, schema);
  return Boolean(properties.success && properties.code && properties.data);
}

function envelopeDataSchema(document, schema) {
  return mergedProperties(document, schema).data ?? null;
}

function isGenericObjectSchema(document, schema) {
  const resolved = resolveSchema(document, schema);

  if (!isPlainObject(resolved) || isNonEmptyString(resolved.$ref)) {
    return false;
  }

  if (resolved.type !== "object") {
    return false;
  }

  const hasProperties =
    isPlainObject(resolved.properties) &&
    Object.keys(resolved.properties).length > 0;

  return (
    !hasProperties &&
    !isPlainObject(resolved.additionalProperties) &&
    resolved.additionalProperties !== true &&
    !Array.isArray(resolved.allOf) &&
    !Array.isArray(resolved.anyOf) &&
    !Array.isArray(resolved.oneOf) &&
    !resolved.items
  );
}

function responseEntries(operation) {
  if (!isPlainObject(operation.responses)) {
    return [];
  }

  return Object.entries(operation.responses).filter(([, response]) =>
    isPlainObject(response),
  );
}

function isSuccessStatus(statusCode) {
  const statusNumber = Number.parseInt(statusCode, 10);
  return (
    Number.isInteger(statusNumber) && statusNumber >= 200 && statusNumber < 300
  );
}

function isErrorStatus(statusCode) {
  const statusNumber = Number.parseInt(statusCode, 10);
  return (
    Number.isInteger(statusNumber) && statusNumber >= 400 && statusNumber < 600
  );
}

function missingRequiredErrorStatuses(operation) {
  return REQUIRED_ERROR_STATUSES.filter(
    (statusCode) => !isPlainObject(operation.responses?.[statusCode]),
  );
}

function responseSchemas(response) {
  if (!isPlainObject(response.content)) {
    return [];
  }

  return Object.entries(response.content)
    .map(([mediaType, media]) => ({
      mediaType,
      schema: isPlainObject(media) ? media.schema : null,
    }))
    .filter(({ schema }) => isPlainObject(schema));
}

function operationSuccessSchemas(record) {
  const schemas = [];

  for (const [statusCode, response] of responseEntries(record.operation)) {
    if (!isSuccessStatus(statusCode)) {
      continue;
    }

    for (const responseSchema of responseSchemas(response)) {
      schemas.push({
        ...responseSchema,
        statusCode,
      });
    }
  }

  return schemas;
}

function operationHasEnvelopeSuccessResponse(document, operation) {
  return responseEntries(operation).some(([statusCode, response]) => {
    if (!isSuccessStatus(statusCode)) {
      return false;
    }

    return responseSchemas(response).some(({ schema }) =>
      isEnvelopeSchema(document, schema),
    );
  });
}

function hasMultipartRequestBody(operation) {
  return Boolean(operation.requestBody?.content?.["multipart/form-data"]);
}

function schemaContainsBinaryString(document, schema, seenRefs = new Set()) {
  const resolved = resolveSchema(document, schema, seenRefs);

  if (!isPlainObject(resolved)) {
    return false;
  }

  if (resolved.type === "string" && resolved.format === "binary") {
    return true;
  }

  if (isPlainObject(resolved.items)) {
    return schemaContainsBinaryString(
      document,
      resolved.items,
      new Set(seenRefs),
    );
  }

  for (const key of ["allOf", "anyOf", "oneOf"]) {
    if (
      Array.isArray(resolved[key]) &&
      resolved[key].some((item) =>
        schemaContainsBinaryString(document, item, new Set(seenRefs)),
      )
    ) {
      return true;
    }
  }

  if (isPlainObject(resolved.properties)) {
    return Object.values(resolved.properties).some((propertySchema) =>
      schemaContainsBinaryString(document, propertySchema, new Set(seenRefs)),
    );
  }

  return false;
}

function operationHasBinaryResponse(document, operation) {
  for (const [, response] of responseEntries(operation)) {
    for (const { mediaType, schema } of responseSchemas(response)) {
      if (
        mediaType === "application/octet-stream" ||
        schemaContainsBinaryString(document, schema)
      ) {
        return true;
      }
    }
  }

  return false;
}

function collectParameters(document, record) {
  const parameters = [
    ...(Array.isArray(record.pathItem.parameters)
      ? record.pathItem.parameters
      : []),
    ...(Array.isArray(record.operation.parameters)
      ? record.operation.parameters
      : []),
  ];

  return parameters
    .map((parameter) => resolveParameter(document, parameter))
    .filter(isPlainObject);
}

function hasEmptyObjectComponent(document) {
  const objectSchema = document.components?.schemas?.Object;

  if (!isPlainObject(objectSchema)) {
    return false;
  }

  return (
    objectSchema.type === "object" &&
    isPlainObject(objectSchema.properties) &&
    Object.keys(objectSchema.properties).length === 0
  );
}

function walkRefs(value, visitor, path = []) {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      walkRefs(item, visitor, [...path, String(index)]);
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  if (isNonEmptyString(value.$ref)) {
    visitor(value.$ref, path);
  }

  for (const [key, item] of Object.entries(value)) {
    walkRefs(item, visitor, [...path, key]);
  }
}

function addExample(examples, value) {
  if (examples.length >= MAX_EXAMPLES || examples.includes(value)) {
    return;
  }

  examples.push(value);
}

function auditDocument(document, options) {
  const records = operationRecords(document);
  const recordByKey = new Map(
    records.map((record) => [operationKey(record.method, record.path), record]),
  );
  const examples = {
    binaryResponseOperations: [],
    emptyObjectSchemaReferences: [],
    emptyResponseDescriptions: [],
    envelopeWrappedSuccessResponses: [],
    genericEnvelopeDataObjects: [],
    missingRequiredErrorResponses: [],
    missingPathParameterDescriptions: [],
    missingQueryParameterDescriptions: [],
    missingRequestBodyOperations: [],
    noEnvelopeWrappingMismatches: [],
    missingResponseErrorCoverage: [],
    multipartOperations: [],
    publicRouteSecurityMismatches: [],
  };
  const counts = {
    binaryResponseOperations: 0,
    emptyObjectSchemaReferences: 0,
    emptyResponseDescriptions: 0,
    envelopeWrappedSuccessResponses: 0,
    genericEnvelopeDataObjects: 0,
    missingRequiredErrorResponses: 0,
    missingPathParameterDescriptions: 0,
    missingQueryParameterDescriptions: 0,
    missingRequestBodyOperations: 0,
    noEnvelopeWrappingMismatches: 0,
    multipartOperations: 0,
    operations: records.length,
    operationsWithErrorResponses: 0,
    operationsWithRequiredErrorResponses: 0,
    operationsWithSummary: 0,
    publicRouteSecurityMismatches: 0,
  };

  for (const record of records) {
    const operationLabel = formatOperation(record);

    if (isNonEmptyString(record.operation.summary)) {
      counts.operationsWithSummary += 1;
    }

    const responses = responseEntries(record.operation);
    const hasErrorResponse = responses.some(([statusCode]) =>
      isErrorStatus(statusCode),
    );

    if (hasErrorResponse) {
      counts.operationsWithErrorResponses += 1;
    } else {
      addExample(examples.missingResponseErrorCoverage, operationLabel);
    }

    const missingErrorStatuses = missingRequiredErrorStatuses(record.operation);
    if (missingErrorStatuses.length === 0) {
      counts.operationsWithRequiredErrorResponses += 1;
    } else {
      counts.missingRequiredErrorResponses += 1;
      addExample(
        examples.missingRequiredErrorResponses,
        `${operationLabel} missing ${missingErrorStatuses.join("/")}`,
      );
    }

    for (const [statusCode, response] of responses) {
      if (!isNonEmptyString(response.description)) {
        counts.emptyResponseDescriptions += 1;
        addExample(
          examples.emptyResponseDescriptions,
          `${operationLabel} response ${statusCode}`,
        );
      }
    }

    const successSchemas = operationSuccessSchemas(record);
    const envelopeSchemas = successSchemas.filter(({ schema }) =>
      isEnvelopeSchema(document, schema),
    );

    if (envelopeSchemas.length > 0) {
      counts.envelopeWrappedSuccessResponses += 1;
      addExample(examples.envelopeWrappedSuccessResponses, operationLabel);
    }

    const hasGenericEnvelopeData = envelopeSchemas.some(({ schema }) =>
      isGenericObjectSchema(document, envelopeDataSchema(document, schema)),
    );

    if (hasGenericEnvelopeData) {
      counts.genericEnvelopeDataObjects += 1;
      addExample(examples.genericEnvelopeDataObjects, operationLabel);
    }

    for (const parameter of collectParameters(document, record)) {
      if (parameter.in !== "query" && parameter.in !== "path") {
        continue;
      }

      if (isNonEmptyString(parameter.description)) {
        continue;
      }

      const example = `${operationLabel} ${parameter.in} parameter ${parameter.name ?? "(unnamed)"}`;

      if (parameter.in === "query") {
        counts.missingQueryParameterDescriptions += 1;
        addExample(examples.missingQueryParameterDescriptions, example);
      } else {
        counts.missingPathParameterDescriptions += 1;
        addExample(examples.missingPathParameterDescriptions, example);
      }
    }

    if (BODY_METHODS.has(record.methodKey) && !record.operation.requestBody) {
      counts.missingRequestBodyOperations += 1;
      addExample(examples.missingRequestBodyOperations, operationLabel);
    }

    if (hasMultipartRequestBody(record.operation)) {
      counts.multipartOperations += 1;
      addExample(examples.multipartOperations, operationLabel);
    }

    if (operationHasBinaryResponse(document, record.operation)) {
      counts.binaryResponseOperations += 1;
      addExample(examples.binaryResponseOperations, operationLabel);
    }

    if (hasEmptyObjectComponent(document)) {
      walkRefs(record.operation, (ref, path) => {
        if (ref !== OBJECT_SCHEMA_REF) {
          return;
        }

        counts.emptyObjectSchemaReferences += 1;
        addExample(
          examples.emptyObjectSchemaReferences,
          `${operationLabel} at ${path.join(".")}`,
        );
      });
    }
  }

  for (const expectedOperation of options.expectedPublicOperations) {
    const key = operationKey(expectedOperation.method, expectedOperation.path);
    const record = recordByKey.get(key);

    if (!record) {
      counts.publicRouteSecurityMismatches += 1;
      addExample(
        examples.publicRouteSecurityMismatches,
        `${key} missing operation`,
      );
      continue;
    }

    if (!Array.isArray(record.operation.security)) {
      counts.publicRouteSecurityMismatches += 1;
      addExample(
        examples.publicRouteSecurityMismatches,
        `${key} inherits global security`,
      );
      continue;
    }

    if (record.operation.security.length !== 0) {
      counts.publicRouteSecurityMismatches += 1;
      addExample(
        examples.publicRouteSecurityMismatches,
        `${key} has non-empty security`,
      );
    }
  }

  const expectedNoEnvelopeKeys = new Set(
    options.expectedNoEnvelopeOperations.map((operation) =>
      operationKey(operation.method, operation.path),
    ),
  );
  for (const record of records) {
    const key = operationKey(record.method, record.path);
    const isExpectedNoEnvelope =
      expectedNoEnvelopeKeys.has(key) ||
      options.expectedNoEnvelopePrefixes.some((prefix) =>
        record.path.startsWith(prefix),
      );

    if (
      !isExpectedNoEnvelope ||
      !operationHasEnvelopeSuccessResponse(document, record.operation)
    ) {
      continue;
    }

    counts.noEnvelopeWrappingMismatches += 1;
    addExample(examples.noEnvelopeWrappingMismatches, key);
  }

  return {
    counts,
    examples,
  };
}

function printExamples(title, examples) {
  console.log(`${title}:`);

  if (examples.length === 0) {
    console.log("  none");
    return;
  }

  for (const example of examples) {
    console.log(`  - ${example}`);
  }
}

function printTextReport(input, audit) {
  const { counts, examples } = audit;
  const operationsWithoutErrorResponses =
    counts.operations - counts.operationsWithErrorResponses;

  console.log(`OpenAPI contract audit: ${input}`);
  console.log("");
  console.log("Core metrics:");
  console.log(`  Operations: ${counts.operations}`);
  console.log(`  Operations with summary: ${counts.operationsWithSummary}`);
  console.log(
    `  Empty response descriptions: ${counts.emptyResponseDescriptions}`,
  );
  console.log(
    `  Operations with 4xx/5xx responses: ${counts.operationsWithErrorResponses}/${counts.operations}`,
  );
  console.log(
    `  Operations missing 4xx/5xx responses: ${operationsWithoutErrorResponses}`,
  );
  console.log(
    `  Operations with 400/401/403/500 responses: ${counts.operationsWithRequiredErrorResponses}/${counts.operations}`,
  );
  console.log(
    `  Operations missing required error responses: ${counts.missingRequiredErrorResponses}`,
  );
  console.log(
    `  Public route security mismatches: ${counts.publicRouteSecurityMismatches}`,
  );
  console.log(
    `  No-envelope wrapping mismatches: ${counts.noEnvelopeWrappingMismatches}`,
  );
  console.log(
    `  Envelope-wrapped success responses: ${counts.envelopeWrappedSuccessResponses}`,
  );
  console.log(
    `  Generic envelope data object responses: ${counts.genericEnvelopeDataObjects}`,
  );
  console.log(
    `  Missing query parameter descriptions: ${counts.missingQueryParameterDescriptions}`,
  );
  console.log(
    `  Missing path parameter descriptions: ${counts.missingPathParameterDescriptions}`,
  );
  console.log(
    `  POST/PUT/PATCH operations without requestBody: ${counts.missingRequestBodyOperations}`,
  );
  console.log(
    `  Multipart/form-data operations: ${counts.multipartOperations}`,
  );
  console.log(
    `  Binary/file response operations: ${counts.binaryResponseOperations}`,
  );
  console.log(
    `  Empty Object schema references: ${counts.emptyObjectSchemaReferences}`,
  );
  console.log("");
  console.log(`Examples (first ${MAX_EXAMPLES} per category):`);
  printExamples(
    "  Empty response descriptions",
    examples.emptyResponseDescriptions,
  );
  printExamples(
    "  Operations missing 4xx/5xx responses",
    examples.missingResponseErrorCoverage,
  );
  printExamples(
    "  Operations missing required error responses",
    examples.missingRequiredErrorResponses,
  );
  printExamples(
    "  Public route security mismatches",
    examples.publicRouteSecurityMismatches,
  );
  printExamples(
    "  No-envelope wrapping mismatches",
    examples.noEnvelopeWrappingMismatches,
  );
  printExamples(
    "  Envelope-wrapped success responses",
    examples.envelopeWrappedSuccessResponses,
  );
  printExamples(
    "  Generic envelope data object responses",
    examples.genericEnvelopeDataObjects,
  );
  printExamples(
    "  Missing query parameter descriptions",
    examples.missingQueryParameterDescriptions,
  );
  printExamples(
    "  Missing path parameter descriptions",
    examples.missingPathParameterDescriptions,
  );
  printExamples(
    "  POST/PUT/PATCH operations without requestBody",
    examples.missingRequestBodyOperations,
  );
  printExamples(
    "  Multipart/form-data operations",
    examples.multipartOperations,
  );
  printExamples(
    "  Binary/file response operations",
    examples.binaryResponseOperations,
  );
  printExamples(
    "  Empty Object schema references",
    examples.emptyObjectSchemaReferences,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.input) {
    throw new Error(
      "Missing required --input. Use --input <file-or-url> or --help for usage.",
    );
  }

  const content = await readOpenApiJson(options.input);
  const document = parseOpenApi(content, options.input);
  assertOpenApiDocument(document);

  const audit = auditDocument(document, options);

  if (options.json) {
    console.log(JSON.stringify({ input: options.input, ...audit }, null, 2));
    return;
  }

  printTextReport(options.input, audit);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  console.error("");
  printHelp();
  process.exitCode = 1;
});
