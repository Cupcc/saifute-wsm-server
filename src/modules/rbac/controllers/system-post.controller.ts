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
@Controller("system/post")
export class SystemPostController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Get("list")
  @Permissions("system:post:list")
  listPosts(@Query() query: Record<string, string | undefined>) {
    return this.systemManagementService.listPosts(query);
  }

  @Post("export")
  @Permissions("system:post:export")
  exportPosts(@Body() query: Record<string, string | undefined>) {
    const exportResult = this.systemManagementService.exportPosts(query);
    return new StreamableFile(Buffer.from(exportResult.content, "utf8"), {
      disposition: `attachment; filename="${exportResult.fileName}"`,
      type: exportResult.contentType,
    });
  }

  @Get(":postId")
  @Permissions("system:post:list")
  getPost(@Param("postId") postId: string) {
    return this.systemManagementService.getPost(Number(postId));
  }

  @Post()
  @Permissions("system:post:add")
  createPost(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.createPost(data);
  }

  @Put()
  @Permissions("system:post:edit")
  updatePost(@Body() data: Record<string, unknown>) {
    return this.systemManagementService.updatePost(data);
  }

  @Delete(":postIds")
  @Permissions("system:post:remove")
  deletePosts(@Param("postIds") postIds: string) {
    return this.systemManagementService.deletePosts(this.toIdList(postIds));
  }

  private toIdList(value: string) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
}
