import { IsOptional, IsString, MaxLength } from "class-validator";

export class VoidSalesProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  voidReason?: string;
}
