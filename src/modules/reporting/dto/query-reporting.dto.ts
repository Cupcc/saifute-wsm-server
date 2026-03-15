import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export enum ReportingTrendType {
  ALL = "ALL",
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
  WORKSHOP_MATERIAL = "WORKSHOP_MATERIAL",
}

export enum ReportingExportType {
  INVENTORY_SUMMARY = "INVENTORY_SUMMARY",
  MATERIAL_CATEGORY_SUMMARY = "MATERIAL_CATEGORY_SUMMARY",
  TRENDS = "TRENDS",
}

export class QueryInventorySummaryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

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

export class QueryMaterialCategorySummaryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

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

export class QueryTrendSeriesDto {
  @IsOptional()
  @IsEnum(ReportingTrendType)
  trendType?: ReportingTrendType = ReportingTrendType.ALL;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class ExportReportDto {
  @IsEnum(ReportingExportType)
  reportType!: ReportingExportType;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workshopId?: number;

  @IsOptional()
  @IsEnum(ReportingTrendType)
  trendType?: ReportingTrendType = ReportingTrendType.ALL;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
