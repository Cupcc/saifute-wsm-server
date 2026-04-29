import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class QuerySalesReturnDto {
  @IsString()
  @IsOptional()
  @MaxLength(64)
  documentNo?: string;

  @IsDateString()
  @IsOptional()
  bizDateFrom?: string;

  @IsDateString()
  @IsOptional()
  bizDateTo?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  customerId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  sourceOutboundOrderId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  workshopId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  materialId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  detailId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  materialCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  materialName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  specification?: string;

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
