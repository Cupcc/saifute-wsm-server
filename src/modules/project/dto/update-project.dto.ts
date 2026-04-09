import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ProjectBomLineDto } from "./project-bom-line.dto";

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(64)
  projectCode?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(128)
  projectName?: string;

  @IsDateString()
  @IsOptional()
  bizDate?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  customerId?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  supplierId?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  managerPersonnelId?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  workshopId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  remark?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectBomLineDto)
  bomLines?: ProjectBomLineDto[];
}
