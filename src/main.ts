import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { registerFileStorageStaticAssets } from "./modules/file-storage/infrastructure/file-storage-static-assets";
import { HttpExceptionFilter } from "./shared/common/filters/http-exception.filter";
import { ResponseEnvelopeInterceptor } from "./shared/common/interceptors/response-envelope.interceptor";
import { AppConfigService } from "./shared/config/app-config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });
  const appConfigService = app.get(AppConfigService);

  app.setGlobalPrefix(appConfigService.apiGlobalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(app.get(ResponseEnvelopeInterceptor));
  await registerFileStorageStaticAssets(app, appConfigService);

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();
