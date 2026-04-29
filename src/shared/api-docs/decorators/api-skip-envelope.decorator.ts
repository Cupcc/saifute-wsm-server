import { applyDecorators } from "@nestjs/common";
import { SkipResponseEnvelope } from "../../common/interceptors/skip-response-envelope.decorator";

export function ApiSkipEnvelope(): MethodDecorator & ClassDecorator {
  return applyDecorators(SkipResponseEnvelope());
}
