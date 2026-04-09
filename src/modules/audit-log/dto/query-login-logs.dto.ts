import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  LoginLogAction,
  LoginLogResult,
} from "../../../../generated/prisma/client";

export class QueryLoginLogsDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ip?: string;

  @IsOptional()
  @IsEnum(LoginLogAction)
  action?: LoginLogAction;

  @IsOptional()
  @IsEnum(LoginLogResult)
  result?: LoginLogResult;

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

  @IsOptional()
  @IsString()
  @MaxLength(32)
  beginTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  endTime?: string;
}
