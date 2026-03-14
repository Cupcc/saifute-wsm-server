import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class ReverseStockDto {
  @IsInt()
  @Min(1)
  logIdToReverse!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
