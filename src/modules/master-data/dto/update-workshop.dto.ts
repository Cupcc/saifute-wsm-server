import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateWorkshopDto {
  @IsString()
  @IsOptional()
  @MaxLength(128)
  workshopName?: string;
}
