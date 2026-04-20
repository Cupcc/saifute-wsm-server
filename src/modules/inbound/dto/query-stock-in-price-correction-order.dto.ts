import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class QueryStockInPriceCorrectionOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  documentNo?: string;

  @IsOptional()
  @IsDateString()
  bizDateFrom?: string;

  @IsOptional()
  @IsDateString()
  bizDateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  materialId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sourceInventoryLogId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workshopId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
