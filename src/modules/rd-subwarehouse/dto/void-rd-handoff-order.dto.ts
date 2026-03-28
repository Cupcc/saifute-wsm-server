import { IsOptional, IsString, MaxLength } from "class-validator";

export class VoidRdHandoffOrderDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  voidReason?: string;
}
