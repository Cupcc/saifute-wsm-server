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
  /** 物料编码或名称关键字 */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  /** 物料分类 ID */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  /** 车间 ID */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workshopId?: number;

  /** 每页条数，默认 50 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  /** 分页偏移量，从 0 开始 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class QueryMaterialCategorySummaryDto {
  /** 分类名称关键字 */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  /** 车间 ID */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workshopId?: number;

  /** 每页条数，默认 50 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  /** 分页偏移量，从 0 开始 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class QueryTrendSeriesDto {
  /** 趋势图统计类型 */
  @IsOptional()
  @IsEnum(ReportingTrendType)
  trendType?: ReportingTrendType = ReportingTrendType.ALL;

  /** 开始日期，格式为 YYYY-MM-DD */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** 结束日期，格式为 YYYY-MM-DD */
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class ExportReportDto {
  /** 导出的报表类型 */
  @IsEnum(ReportingExportType)
  reportType!: ReportingExportType;

  /** 导出关键字 */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  /** 物料分类 ID */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  /** 车间 ID */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workshopId?: number;

  /** 趋势图统计类型 */
  @IsOptional()
  @IsEnum(ReportingTrendType)
  trendType?: ReportingTrendType = ReportingTrendType.ALL;

  /** 开始日期，格式为 YYYY-MM-DD */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** 结束日期，格式为 YYYY-MM-DD */
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
