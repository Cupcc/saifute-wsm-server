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
@Controller("system/menu")
export class SystemMenuController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Get("list")
  @Permissions("system:menu:list")
  listMenus(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listMenus(query);
  }

  @Get("treeselect")
  @Permissions("system:menu:list")
  getMenuTreeSelect() {
    return this.systemManagementService.getMenuTreeSelect();
  }

  @Get("roleMenuTreeselect/:roleId")
  @Permissions("system:role:edit")
  getRoleMenuTree(@Param("roleId") roleId: string) {
    return this.systemManagementService.getRoleMenuTree(Number(roleId));
  }

  @Get(":menuId")
  @Permissions("system:menu:list")
  getMenu(@Param("menuId") menuId: string) {
    return this.systemManagementService.getMenu(Number(menuId));
  }

  @Post()
  @Permissions("system:menu:add")
  createMenu(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.createMenu(data);
  }

  @Put()
  @Permissions("system:menu:edit")
  updateMenu(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updateMenu(data);
  }

  @Delete(":menuIds")
  @Permissions("system:menu:remove")
  deleteMenus(@Param("menuIds") menuIds: string) {
    return this.systemManagementService.deleteMenus(this.toIdList(menuIds));
  }

  private toIdList(value: string) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
}
