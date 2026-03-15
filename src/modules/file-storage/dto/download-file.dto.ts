import { IsString, MaxLength } from "class-validator";

export class DownloadFileDto {
  @IsString()
  @MaxLength(255)
  path!: string;
}
