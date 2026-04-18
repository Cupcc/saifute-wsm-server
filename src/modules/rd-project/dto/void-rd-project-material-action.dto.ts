import { IsOptional, IsString, MaxLength } from "class-validator";

export class VoidRdProjectMaterialActionDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  voidReason?: string;
}
