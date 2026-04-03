import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateStockScopeDto {
  @IsString()
  @IsOptional()
  @MaxLength(128)
  scopeName?: string;
}
