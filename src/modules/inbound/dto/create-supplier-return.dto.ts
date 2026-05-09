import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateSupplierReturnLineDto {
  @IsInt()
  @Min(1)
  sourceStockInOrderLineId!: number;

  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d+(\.\d{1,6})?$/, {
    message: "quantity must be a positive decimal string",
  })
  quantity!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  remark?: string;
}

export class CreateSupplierReturnDto {
  @IsDateString()
  bizDate!: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  handlerPersonnelId?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  handlerName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  remark?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "lines must have at least one item" })
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierReturnLineDto)
  lines!: CreateSupplierReturnLineDto[];
}
