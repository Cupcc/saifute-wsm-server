import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { SkipResponseEnvelope } from "../../../shared/common/interceptors/skip-response-envelope.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { SystemManagementService } from "../application/system-management.service";

@SkipResponseEnvelope()
@Controller("system/dept")
export class SystemDeptController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Get("list")
  @Permissions("system:dept:list")
  listDepts(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listDepts(query);
  }

  @Get("list/exclude/:deptId")
  @Permissions("system:dept:list")
  listDeptExcludeChild(@Param("deptId") deptId: string) {
    return this.systemManagementService.listDeptExcludeChild(Number(deptId));
  }

  @Get(":deptId")
  @Permissions("system:dept:list")
  getDept(@Param("deptId") deptId: string) {
    return this.systemManagementService.getDept(Number(deptId));
  }

  @Post()
  @Permissions("system:dept:add")
  createDept(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.createDept(data);
  }

  @Put()
  @Permissions("system:dept:edit")
  updateDept(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updateDept(data);
  }

  @Delete(":deptIds")
  @Permissions("system:dept:remove")
  deleteDepts(@Param("deptIds") deptIds: string) {
    return this.systemManagementService.deleteDepts(this.toIdList(deptIds));
  }

  private toIdList(value: string) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
}
