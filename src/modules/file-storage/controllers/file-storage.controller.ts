import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import type { Request } from "express";
import { SkipResponseEnvelope } from "../../../shared/common/interceptors/skip-response-envelope.decorator";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { AuditLog } from "../../audit-log/decorators/audit-log.decorator";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import {
  FileStorageService,
  type UploadedBinaryFile,
} from "../application/file-storage.service";
import { DownloadFileDto } from "../dto/download-file.dto";
import { ConfiguredFileInterceptor } from "../infrastructure/configured-file.interceptor";

@Controller("files")
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @AuditLog({ title: "普通文件上传", action: "UPLOAD_FILE" })
  @Post("upload")
  @UseInterceptors(ConfiguredFileInterceptor("file"))
  async uploadFile(
    @UploadedFile() file: UploadedBinaryFile | undefined,
    @Req() request: Request,
  ) {
    if (!request.is("multipart/form-data")) {
      throw new BadRequestException("请选择要上传的文件");
    }

    return this.fileStorageService.uploadFile(file);
  }

  @AuditLog({ title: "头像上传", action: "UPLOAD_AVATAR" })
  @Post("avatar")
  @UseInterceptors(ConfiguredFileInterceptor("avatar"))
  async uploadAvatar(
    @UploadedFile() file: UploadedBinaryFile | undefined,
    @Req() request: Request,
    @CurrentUser() currentUser: SessionUserSnapshot | undefined,
  ) {
    if (!request.is("multipart/form-data")) {
      throw new BadRequestException("请选择要上传的文件");
    }
    if (!currentUser) {
      throw new UnauthorizedException("当前请求未携带用户上下文");
    }

    return this.fileStorageService.uploadAvatar(currentUser.userId, file);
  }

  @AuditLog({ title: "文件下载", action: "DOWNLOAD_FILE" })
  @SkipResponseEnvelope()
  @Get("download")
  async downloadFile(@Query() query: DownloadFileDto) {
    return this.fileStorageService.downloadFile(query.path);
  }
}
