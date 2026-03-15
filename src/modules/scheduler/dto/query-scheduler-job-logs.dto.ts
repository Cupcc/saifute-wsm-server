import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { SchedulerJobLogStatus } from "../../../generated/prisma/client";

export class QuerySchedulerJobLogsDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  jobName?: string;

  @IsOptional()
  @IsEnum(SchedulerJobLogStatus)
  status?: SchedulerJobLogStatus;

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
