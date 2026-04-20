import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import {
  SchedulerConcurrencyPolicy,
  SchedulerMisfirePolicy,
} from "../../../../generated/prisma/client";

export class UpdateSchedulerJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  jobName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  invokeTarget?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[^\s].*[^\s]$|^[^\s]$/, {
    message: "cronExpression 不能为空",
  })
  cronExpression?: string;

  @IsOptional()
  @IsEnum(SchedulerConcurrencyPolicy)
  concurrencyPolicy?: SchedulerConcurrencyPolicy;

  @IsOptional()
  @IsEnum(SchedulerMisfirePolicy)
  misfirePolicy?: SchedulerMisfirePolicy;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
