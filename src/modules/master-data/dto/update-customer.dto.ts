import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @MaxLength(128)
  customerName?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  parentId?: number | null;
}
