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
@Controller("system/role")
export class SystemRoleController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Get("list")
  @Permissions("system:role:list")
  listRoles(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listRoles(query);
  }

  @Post("export")
  @Permissions("system:role:export")
  @ApiFileResponse({ description: "导出系统角色文件" })
  exportRoles(@Body() query: Record<string, string | undefined>) {
    const exportResult = this.systemManagementService.exportRoles(query);
    return new StreamableFile(Buffer.from(exportResult.content, "utf8"), {
      disposition: `attachment; filename="${exportResult.fileName}"`,
      type: exportResult.contentType,
    });
  }

  @Put("dataScope")
  @Permissions("system:role:edit")
  updateRoleDataScope(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updateRoleDataScope(data);
  }

  @Put("changeStatus")
  @Permissions("system:role:edit")
  changeRoleStatus(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.changeRoleStatus(
      Number(data.roleId),
      String(data.status ?? "0") === "1" ? "1" : "0",
    );
  }

  @Get("authUser/allocatedList")
  @Permissions("system:role:edit")
  listAllocatedUsers(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listAllocatedUsers(query);
  }

  @Get("authUser/unallocatedList")
  @Permissions("system:role:edit")
  listUnallocatedUsers(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listUnallocatedUsers(query);
  }

  @Put("authUser/cancel")
  @Permissions("system:role:remove")
  cancelAuthUser(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.cancelAuthUser(data);
  }

  @Put("authUser/cancelAll")
  @Permissions("system:role:remove")
  cancelAuthUserAll(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.cancelAuthUserAll(query);
  }

  @Put("authUser/selectAll")
  @Permissions("system:role:add")
  selectUsersToRole(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.selectUsersToRole(query);
  }

  @Get("deptTree/:roleId")
  @Permissions("system:role:edit")
  getRoleDeptTree(@Param("roleId") roleId: string) {
    return this.systemManagementService.getRoleDeptTree(Number(roleId));
  }

  @Get(":roleId")
  @Permissions("system:role:list")
  getRole(@Param("roleId") roleId: string) {
    return this.systemManagementService.getRole(Number(roleId));
  }

  @Post()
  @Permissions("system:role:add")
  createRole(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.createRole(data);
  }

  @Put()
  @Permissions("system:role:edit")
  updateRole(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updateRole(data);
  }

  @Delete(":roleIds")
  @Permissions("system:role:remove")
  deleteRoles(@Param("roleIds") roleIds: string) {
    return this.systemManagementService.deleteRoles(this.toIdList(roleIds));
  }

  private toIdList(value: string) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
}
