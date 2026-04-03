import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdatePersonnelDto {
  @IsString()
  @IsOptional()
  @MaxLength(128)
  personnelName?: string;
}
