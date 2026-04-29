import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
} from "@nestjs/common";
import { ApiFileResponse } from "../../../shared/api-docs";
import { SkipResponseEnvelope } from "../../../shared/common/interceptors/skip-response-envelope.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { SystemManagementService } from "../application/system-management.service";

@SkipResponseEnvelope()
@Controller("system/dict/type")
export class SystemDictTypeController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Get("list")
  @Permissions("system:dict:list")
  listDictTypes(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listDictTypes(query);
  }

  @Post("export")
  @Permissions("system:dict:export")
  @ApiFileResponse({ description: "导出字典类型文件" })
  exportDictTypes(@Body() query: Record<string, string | undefined>) {
    const exportResult = this.systemManagementService.exportDictTypes(query);
    return new StreamableFile(Buffer.from(exportResult.content, "utf8"), {
      disposition: `attachment; filename="${exportResult.fileName}"`,
      type: exportResult.contentType,
    });
  }

  @Delete("refreshCache")
  @Permissions("system:dict:remove")
  refreshDictCache() {
    return this.systemManagementService.refreshDictCache();
  }

  @Get("optionselect")
  @Permissions("system:dict:list")
  listDictTypeOptions() {
    return this.systemManagementService.listDictTypeOptions();
  }

  @Get(":dictId")
  @Permissions("system:dict:list")
  getDictType(@Param("dictId") dictId: string) {
    return this.systemManagementService.getDictType(Number(dictId));
  }

  @Post()
  @Permissions("system:dict:add")
  createDictType(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.createDictType(data);
  }

  @Put()
  @Permissions("system:dict:edit")
  updateDictType(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updateDictType(data);
  }

  @Delete(":dictIds")
  @Permissions("system:dict:remove")
  deleteDictTypes(@Param("dictIds") dictIds: string) {
    return this.systemManagementService.deleteDictTypes(this.toIdList(dictIds));
  }

  private toIdList(value: string) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
}
