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
import { StockInOrderType } from "../../../../generated/prisma/client";

export class QueryInboundOrderDto {
  /** 入库单号关键字 */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  documentNo?: string;

  /** 入库单据类型 */
  @IsEnum(StockInOrderType)
  @IsOptional()
  orderType?: StockInOrderType;

  /** 业务日期起始值，格式为 YYYY-MM-DD */
  @IsDateString()
  @IsOptional()
  bizDateFrom?: string;

  /** 业务日期结束值，格式为 YYYY-MM-DD */
  @IsDateString()
  @IsOptional()
  bizDateTo?: string;

  /** 供应商 ID */
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  supplierId?: number;

  /** 经办人姓名关键字 */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  handlerName?: string;

  /** 物料 ID */
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  materialId?: number;

  /** 物料名称关键字 */
  @IsString()
  @IsOptional()
  @MaxLength(128)
  materialName?: string;

  /** 车间 ID */
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  workshopId?: number;

  /** 每页条数，默认 50，最大由服务端限制 */
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
