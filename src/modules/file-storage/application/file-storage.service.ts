import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from "@nestjs/common";
import { AppConfigService } from "../../../shared/config/app-config.service";
import { RbacService } from "../../rbac/application/rbac.service";

export interface UploadedBinaryFile {
  originalname: string;
  size: number;
  buffer: Buffer;
  mimetype?: string;
}

export interface StoredFileResult {
  originalName: string;
  fileName: string;
  size: number;
  relativePath: string;
  url: string;
}

export interface AvatarUploadResult extends StoredFileResult {
  avatarUrl: string;
  previousAvatarUrl: string | null;
}

@Injectable()
export class FileStorageService {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly rbacService: RbacService,
  ) {}

  async uploadFile(
    file: UploadedBinaryFile | undefined,
  ): Promise<StoredFileResult> {
    this.validateUpload(file);
    return this.storeFile(file, this.buildDatedDirectory("upload"));
  }

  async uploadAvatar(
    userId: number,
    file: UploadedBinaryFile | undefined,
  ): Promise<AvatarUploadResult> {
    this.validateUpload(file);

    const storedFile = await this.storeFile(
      file,
      path.posix.join("avatar", String(userId)),
    );
    const avatarUpdate = await this.rbacService.updateAvatar(
      userId,
      storedFile.url,
    );

    if (
      avatarUpdate.previousAvatarUrl &&
      avatarUpdate.previousAvatarUrl !== storedFile.url
    ) {
      await this.deleteStoredFile(avatarUpdate.previousAvatarUrl);
    }

    return {
      ...storedFile,
      avatarUrl: avatarUpdate.currentUser.avatarUrl ?? storedFile.url,
      previousAvatarUrl: avatarUpdate.previousAvatarUrl,
    };
  }

  async downloadFile(publicOrRelativePath: string): Promise<StreamableFile> {
    const relativePath = this.normalizeRelativePath(publicOrRelativePath);
    const absolutePath = this.toAbsolutePath(relativePath);

    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundException("文件不存在");
    }

    const fileStat = await stat(absolutePath);
    return new StreamableFile(createReadStream(absolutePath), {
      disposition: `attachment; filename="${path.basename(relativePath)}"`,
      length: fileStat.size,
      type: "application/octet-stream",
    });
  }

  private validateUpload(
    file: UploadedBinaryFile | undefined,
  ): asserts file is UploadedBinaryFile {
    if (!file) {
      throw new BadRequestException("请选择要上传的文件");
    }

    const originalName = path.basename(file.originalname);
    if (originalName.length > 100) {
      throw new BadRequestException("文件名长度不能超过 100 个字符");
    }

    if (file.size <= 0) {
      throw new BadRequestException("文件内容不能为空");
    }

    if (file.size > this.appConfigService.fileUploadMaxSizeBytes) {
      throw new BadRequestException("文件大小超过限制");
    }

    const extension = path.extname(originalName).toLowerCase();
    if (
      !extension ||
      !this.appConfigService.fileAllowedExtensions.includes(extension)
    ) {
      throw new BadRequestException("文件类型不受支持");
    }
  }

  private async storeFile(
    file: UploadedBinaryFile,
    relativeDirectory: string,
  ): Promise<StoredFileResult> {
    const originalName = path.basename(file.originalname);
    const extension = path.extname(originalName).toLowerCase();
    const fileName = `${randomUUID()}${extension}`;
    const relativePath = path.posix.join(relativeDirectory, fileName);
    const absolutePath = this.toAbsolutePath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      originalName,
      fileName,
      size: file.size,
      relativePath,
      url: this.buildPublicUrl(relativePath),
    };
  }

  private buildDatedDirectory(rootDirectory: string): string {
    const now = new Date();
    return path.posix.join(
      rootDirectory,
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    );
  }

  private buildPublicUrl(relativePath: string): string {
    const normalizedRelativePath = relativePath.replace(/\\/g, "/");
    return `${this.appConfigService.profilePublicPrefix}/${normalizedRelativePath}`;
  }

  private normalizeRelativePath(publicOrRelativePath: string): string {
    const rawPath = publicOrRelativePath.trim().replace(/\\/g, "/");
    if (!rawPath) {
      throw new BadRequestException("文件路径不能为空");
    }

    const prefix = `${this.appConfigService.profilePublicPrefix}/`;
    const withoutPublicPrefix = rawPath.startsWith(prefix)
      ? rawPath.slice(prefix.length)
      : rawPath.startsWith(this.appConfigService.profilePublicPrefix)
        ? rawPath.slice(this.appConfigService.profilePublicPrefix.length)
        : rawPath;

    const normalized = path.posix
      .normalize(withoutPublicPrefix)
      .replace(/^\/+/, "");
    if (
      !normalized ||
      normalized === "." ||
      normalized === ".." ||
      normalized.startsWith("../") ||
      path.posix.isAbsolute(normalized)
    ) {
      throw new BadRequestException("文件路径非法");
    }

    return normalized;
  }

  private async deleteStoredFile(publicOrRelativePath: string): Promise<void> {
    try {
      const relativePath = this.normalizeRelativePath(publicOrRelativePath);
      if (!relativePath.startsWith("avatar/")) {
        return;
      }

      await rm(this.toAbsolutePath(relativePath), { force: true });
    } catch {
      // Old avatar cleanup is best-effort and must not block profile updates.
    }
  }

  private toAbsolutePath(relativePath: string): string {
    const rootPath = path.resolve(this.appConfigService.fileStorageRootPath);
    const absolutePath = path.resolve(
      rootPath,
      ...relativePath.split("/").filter(Boolean),
    );
    const relativeToRoot = path.relative(rootPath, absolutePath);

    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      throw new BadRequestException("文件路径非法");
    }

    return absolutePath;
  }
}
