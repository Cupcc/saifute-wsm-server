import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  supplierCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  supplierName!: string;
}
