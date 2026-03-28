import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class QueryRdHandoffOrderDto {
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

  @IsString()
  @IsOptional()
  @MaxLength(64)
  handlerName?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  materialId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  materialName?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  sourceWorkshopId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  targetWorkshopId?: number;

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
