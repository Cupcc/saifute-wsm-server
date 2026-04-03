import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateWorkshopDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  workshopCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  workshopName!: string;
}
