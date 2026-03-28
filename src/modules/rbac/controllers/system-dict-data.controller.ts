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
import { SkipResponseEnvelope } from "../../../shared/common/interceptors/skip-response-envelope.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { SystemManagementService } from "../application/system-management.service";

@SkipResponseEnvelope()
@Controller("system/dict/data")
export class SystemDictDataController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Get("list")
  @Permissions("system:dict:list")
  listDictData(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listDictData(query);
  }

  @Post("export")
  @Permissions("system:dict:export")
  exportDictData(@Body() query: Record<string, string | undefined>) {
    const exportResult = this.systemManagementService.exportDictData(query);
    return new StreamableFile(Buffer.from(exportResult.content, "utf8"), {
      disposition: `attachment; filename="${exportResult.fileName}"`,
      type: exportResult.contentType,
    });
  }

  @Get("type/:dictType")
  getDicts(@Param("dictType") dictType: string) {
    return this.systemManagementService.getDicts(dictType);
  }

  @Get(":dictCode")
  @Permissions("system:dict:list")
  getDictData(@Param("dictCode") dictCode: string) {
    return this.systemManagementService.getDictData(Number(dictCode));
  }

  @Post()
  @Permissions("system:dict:add")
  createDictData(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.createDictData(data);
  }

  @Put()
  @Permissions("system:dict:edit")
  updateDictData(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updateDictData(data);
  }

  @Delete(":dictCodes")
  @Permissions("system:dict:remove")
  deleteDictData(@Param("dictCodes") dictCodes: string) {
    return this.systemManagementService.deleteDictData(
      this.toIdList(dictCodes),
    );
  }

  private toIdList(value: string) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
}
