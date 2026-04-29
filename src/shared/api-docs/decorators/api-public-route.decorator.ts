import { applyDecorators } from "@nestjs/common";
import { Public } from "../../decorators/public.decorator";

export function ApiPublicRoute(): MethodDecorator & ClassDecorator {
  return applyDecorators(Public());
}
