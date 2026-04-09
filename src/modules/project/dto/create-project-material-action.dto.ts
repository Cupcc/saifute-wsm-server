import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ProjectMaterialActionType } from "../../../generated/prisma/client";
import { CreateProjectMaterialActionLineDto } from "./create-project-material-action-line.dto";

export class CreateProjectMaterialActionDto {
  @IsEnum(ProjectMaterialActionType)
  actionType!: ProjectMaterialActionType;

  @IsDateString()
  bizDate!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  remark?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "lines must have at least one item" })
  @ValidateNested({ each: true })
  @Type(() => CreateProjectMaterialActionLineDto)
  lines!: CreateProjectMaterialActionLineDto[];
}
