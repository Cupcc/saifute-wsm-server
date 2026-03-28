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
@Controller("system/config")
export class SystemConfigController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Get("list")
  @Permissions("system:config:list")
  listConfigs(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listConfigs(query);
  }

  @Post("export")
  @Permissions("system:config:export")
  exportConfigs(@Body() query: Record<string, string | undefined>) {
    const exportResult = this.systemManagementService.exportConfigs(query);
    return new StreamableFile(Buffer.from(exportResult.content, "utf8"), {
      disposition: `attachment; filename="${exportResult.fileName}"`,
      type: exportResult.contentType,
    });
  }

  @Delete("refreshCache")
  @Permissions("system:config:remove")
  refreshConfigCache() {
    return this.systemManagementService.refreshConfigCache();
  }

  @Get("configKey/:configKey")
  @Permissions("system:user:resetPwd")
  getConfigByKey(@Param("configKey") configKey: string) {
    return this.systemManagementService.getConfigByKey(configKey);
  }

  @Get(":configId")
  @Permissions("system:config:list")
  getConfig(@Param("configId") configId: string) {
    return this.systemManagementService.getConfig(Number(configId));
  }

  @Post()
  @Permissions("system:config:add")
  createConfig(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.createConfig(data);
  }

  @Put()
  @Permissions("system:config:edit")
  updateConfig(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updateConfig(data);
  }

  @Delete(":configIds")
  @Permissions("system:config:remove")
  deleteConfigs(@Param("configIds") configIds: string) {
    return this.systemManagementService.deleteConfigs(this.toIdList(configIds));
  }

  private toIdList(value: string) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
}
