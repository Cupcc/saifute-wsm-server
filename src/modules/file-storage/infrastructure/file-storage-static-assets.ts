import { mkdir } from "node:fs/promises";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { AppConfigService } from "../../../shared/config/app-config.service";

export async function registerFileStorageStaticAssets(
  app: NestExpressApplication,
  appConfigService: AppConfigService,
): Promise<void> {
  await mkdir(appConfigService.fileStorageRootPath, { recursive: true });

  const prefix = appConfigService.profilePublicPrefix.endsWith("/")
    ? appConfigService.profilePublicPrefix
    : `${appConfigService.profilePublicPrefix}/`;

  app.useStaticAssets(appConfigService.fileStorageRootPath, {
    prefix,
  });
}
