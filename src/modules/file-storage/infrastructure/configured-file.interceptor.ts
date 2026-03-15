import * as path from "node:path";
import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  mixin,
  type NestInterceptor,
  type Type,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { from, type Observable } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";
import { AppConfigService } from "../../../shared/config/app-config.service";

interface MulterLikeError {
  code?: string;
}

export function ConfiguredFileInterceptor(
  fieldName: string,
): Type<NestInterceptor> {
  @Injectable()
  class ConfiguredFileMixinInterceptor implements NestInterceptor {
    private readonly delegate: NestInterceptor;

    constructor(private readonly appConfigService: AppConfigService) {
      this.delegate = new (FileInterceptor(fieldName, {
        limits: {
          fileSize: this.appConfigService.fileUploadMaxSizeBytes,
        },
        fileFilter: (_request, file, callback) => {
          const originalName = path.basename(file.originalname ?? "");
          if (originalName.length > 100) {
            callback(
              new BadRequestException("文件名长度不能超过 100 个字符"),
              false,
            );
            return;
          }

          const extension = path.extname(originalName).toLowerCase();
          if (
            !extension ||
            !this.appConfigService.fileAllowedExtensions.includes(extension)
          ) {
            callback(new BadRequestException("文件类型不受支持"), false);
            return;
          }

          callback(null, true);
        },
      }))();
    }

    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<unknown> {
      try {
        return from(
          Promise.resolve(this.delegate.intercept(context, next)),
        ).pipe(
          mergeMap((stream) => stream),
          catchError((error: unknown) => {
            throw this.normalizeUploadError(error);
          }),
        );
      } catch (error) {
        throw this.normalizeUploadError(error);
      }
    }

    private normalizeUploadError(error: unknown): unknown {
      if (error instanceof BadRequestException) {
        return error;
      }

      if (this.isFileTooLargeError(error)) {
        return new BadRequestException("文件大小超过限制");
      }

      return error;
    }

    private isFileTooLargeError(error: unknown): error is MulterLikeError {
      return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "LIMIT_FILE_SIZE"
      );
    }
  }

  return mixin(ConfiguredFileMixinInterceptor);
}
