import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class QuerySalesProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(64)
  salesProjectCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  salesProjectName?: string;

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
