import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  materialCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  materialName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  specModel?: string;

  @IsNumber()
  @IsOptional()
  categoryId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  unitCode!: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,6})?$/)
  warningMinQty?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,6})?$/)
  warningMaxQty?: string;
}
