import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";

export class DecreaseStockDto {
  @IsInt()
  @Min(1)
  materialId!: number;

  @IsInt()
  @Min(1)
  workshopId!: number;

  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d+(\.\d{1,6})?$/)
  quantity!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  operationType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  businessModule!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  businessDocumentType!: string;

  @IsInt()
  @Min(1)
  businessDocumentId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  businessDocumentNumber!: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  businessDocumentLineId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
