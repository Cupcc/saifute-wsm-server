import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateStockScopeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  scopeCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  scopeName!: string;
}
