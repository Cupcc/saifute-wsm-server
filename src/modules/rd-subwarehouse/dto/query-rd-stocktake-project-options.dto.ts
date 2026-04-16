import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class QueryRdStocktakeProjectOptionsDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  workshopId?: number;
}
