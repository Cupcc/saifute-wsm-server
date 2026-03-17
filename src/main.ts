import "reflect-metadata";
import type { LoggerService } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AppModule } from "./app.module";
import { setupApp } from "./app.setup";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);
  app.flushLogs();
  const appConfigService = await setupApp(app);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  if (appConfigService.environment === "development") {
    logger.log(
      buildDevelopmentStartupMessage(
        normalizeLocalUrl(await app.getUrl()),
        appConfigService,
      ),
      "Bootstrap",
    );
  }
}

function buildDevelopmentStartupMessage(
  appUrl: string,
  appConfigService: Awaited<ReturnType<typeof setupApp>>,
): string {
  const swaggerEnabled = appConfigService.swaggerEnabled;
  const swaggerPath = `/${joinRouteSegments(
    appConfigService.apiGlobalPrefix,
    appConfigService.swaggerPath,
  )}`;
  const swaggerJsonPath = `/${joinRouteSegments(
    appConfigService.apiGlobalPrefix,
    appConfigService.swaggerJsonPath,
  )}`;

  return [
    "Development startup info",
    `- app: ${appConfigService.appName}`,
    `- environment: ${appConfigService.environment}`,
    `- baseUrl: ${appUrl}`,
    `- apiPrefix: /${appConfigService.apiGlobalPrefix}`,
    `- swaggerEnabled: ${swaggerEnabled}`,
    `- swaggerPath: ${swaggerPath}`,
    `- swaggerUrl: ${swaggerEnabled ? `${appUrl}${swaggerPath}` : "disabled"}`,
    `- swaggerJsonPath: ${swaggerJsonPath}`,
    `- swaggerJsonUrl: ${
      swaggerEnabled ? `${appUrl}${swaggerJsonPath}` : "disabled"
    }`,
    `- logLevel: ${appConfigService.logLevel}`,
    `- logDir: ${appConfigService.logDirPath}`,
    `- schedulerEnabled: ${appConfigService.schedulerEnabled}`,
    `- aiAssistantEnabled: ${appConfigService.aiAssistantEnabled}`,
    `- timezone: ${appConfigService.businessTimezone}`,
  ].join("\n");
}

function joinRouteSegments(...segments: string[]): string {
  return segments
    .map((segment) => segment.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function normalizeLocalUrl(url: string): string {
  return url.replace("http://[::1]", "http://localhost");
}

void bootstrap();
