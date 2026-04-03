import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  @MaxLength(64)
  supplierCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  supplierName?: string;
}
