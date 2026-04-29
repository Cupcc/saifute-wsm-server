import { applyDecorators } from "@nestjs/common";
import { ApiBody, ApiConsumes } from "@nestjs/swagger";

type ApiMultipartFileOptions = {
  fieldName?: string;
  required?: boolean;
  description?: string;
};

export function ApiMultipartFile(
  options: ApiMultipartFileOptions = {},
): MethodDecorator {
  const fieldName = options.fieldName ?? "file";

  return applyDecorators(
    ApiConsumes("multipart/form-data"),
    ApiBody({
      description: options.description,
      required: options.required ?? true,
      schema: {
        type: "object",
        properties: {
          [fieldName]: {
            type: "string",
            format: "binary",
          },
        },
        required: options.required === false ? [] : [fieldName],
      },
    }),
  );
}
