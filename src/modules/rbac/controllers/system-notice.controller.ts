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
@Controller("system/notice")
export class SystemNoticeController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Get("list")
  @Permissions("system:notice:list")
  listNotices(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listNotices(query);
  }

  @Get(":noticeId")
  @Permissions("system:notice:list")
  getNotice(@Param("noticeId") noticeId: string) {
    return this.systemManagementService.getNotice(Number(noticeId));
  }

  @Post()
  @Permissions("system:notice:add")
  createNotice(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.createNotice(data);
  }

  @Put()
  @Permissions("system:notice:edit")
  updateNotice(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updateNotice(data);
  }

  @Delete(":noticeIds")
  @Permissions("system:notice:remove")
  deleteNotices(@Param("noticeIds") noticeIds: string) {
    return this.systemManagementService.deleteNotices(this.toIdList(noticeIds));
  }

  private toIdList(value: string) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
}
