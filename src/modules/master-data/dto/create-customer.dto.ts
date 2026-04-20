import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customerCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  customerName!: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  parentId?: number;
}
