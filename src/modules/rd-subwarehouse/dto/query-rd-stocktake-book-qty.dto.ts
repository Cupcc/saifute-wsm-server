import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class QueryRdStocktakeBookQtyDto {
  @IsInt()
  @Type(() => Number)
  @Min(1)
  materialId!: number;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  rdProjectId!: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  workshopId?: number;
}
