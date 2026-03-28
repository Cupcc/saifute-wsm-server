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
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { SystemManagementService } from "../application/system-management.service";

@SkipResponseEnvelope()
@Controller("system/user")
export class SystemUserController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Get("list")
  @Permissions("system:user:list")
  listUsers(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listUsers(query);
  }

  @Post("export")
  @Permissions("system:user:export")
  exportUsers(@Body() query: Record<string, string | undefined>) {
    const exportResult = this.systemManagementService.exportUsers(query);
    return new StreamableFile(Buffer.from(exportResult.content, "utf8"), {
      disposition: `attachment; filename="${exportResult.fileName}"`,
      type: exportResult.contentType,
    });
  }

  @Get("profile")
  getUserProfile(@CurrentUser() user: SessionUserSnapshot) {
    return this.systemManagementService.getCurrentUserProfile(user.userId);
  }

  @Put("profile")
  updateUserProfile(
    @CurrentUser() user: SessionUserSnapshot,
    @Body() data: Record<string, unknown>,
  ) {
    return this.systemManagementService.updateCurrentUserProfile(
      user.userId,
      data,
    );
  }

  @Put("profile/updatePwd")
  updateUserPassword(
    @CurrentUser() user: SessionUserSnapshot,
    @Body() data: Record<string, unknown>,
  ) {
    return this.systemManagementService.updateCurrentUserPassword(
      user.userId,
      String(data.oldPassword ?? ""),
      String(data.newPassword ?? ""),
    );
  }

  @Get("authRole/:userId")
  @Permissions("system:user:edit")
  getAuthRole(@Param("userId") userId: string) {
    return this.systemManagementService.getAuthRole(Number(userId));
  }

  @Put("authRole")
  @Permissions("system:user:edit")
  updateAuthRole(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.updateAuthRole(query);
  }

  @Get("deptTree")
  @Permissions("system:user:list")
  getDeptTree() {
    return this.systemManagementService.getDeptTreeSelect();
  }

  @Put("resetPwd")
  @Permissions("system:user:resetPwd")
  resetUserPassword(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.resetUserPassword(
      Number(data.userId),
      String(data.password ?? ""),
    );
  }

  @Put("changeStatus")
  @Permissions("system:user:edit")
  changeUserStatus(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.changeUserStatus(
      Number(data.userId),
      String(data.status ?? "0") === "1" ? "1" : "0",
    );
  }

  @Get()
  @Permissions("system:user:list")
  getUserTemplate() {
    return this.systemManagementService.getUser(null);
  }

  @Get(":userId")
  @Permissions("system:user:list")
  getUser(@Param("userId") userId: string) {
    return this.systemManagementService.getUser(Number(userId));
  }

  @Post()
  @Permissions("system:user:add")
  createUser(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.createUser(data);
  }

  @Put()
  @Permissions("system:user:edit")
  updateUser(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updateUser(data);
  }

  @Delete(":userIds")
  @Permissions("system:user:remove")
  deleteUsers(@Param("userIds") userIds: string) {
    return this.systemManagementService.deleteUsers(this.toIdList(userIds));
  }

  private toIdList(value: string) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
}
