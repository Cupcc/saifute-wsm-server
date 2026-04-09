import { IsOptional, IsString, MaxLength } from "class-validator";

export class VoidRdProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  voidReason?: string;
}
