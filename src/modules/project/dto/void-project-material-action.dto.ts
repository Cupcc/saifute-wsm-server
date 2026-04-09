import { IsOptional, IsString, MaxLength } from "class-validator";

export class VoidProjectMaterialActionDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  voidReason?: string;
}
