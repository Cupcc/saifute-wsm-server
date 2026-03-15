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
} from "../../../generated/prisma/client";

export class CreateSchedulerJobDto {
  @IsString()
  @MaxLength(128)
  jobName!: string;

  @IsString()
  @MaxLength(128)
  invokeTarget!: string;

  @IsString()
  @MaxLength(64)
  @Matches(/^[^\s].*[^\s]$|^[^\s]$/, {
    message: "cronExpression 不能为空",
  })
  cronExpression!: string;

  @IsOptional()
  @IsEnum(SchedulerConcurrencyPolicy)
  concurrencyPolicy?: SchedulerConcurrencyPolicy =
    SchedulerConcurrencyPolicy.FORBID;

  @IsOptional()
  @IsEnum(SchedulerMisfirePolicy)
  misfirePolicy?: SchedulerMisfirePolicy =
    SchedulerMisfirePolicy.FIRE_AND_PROCEED;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
