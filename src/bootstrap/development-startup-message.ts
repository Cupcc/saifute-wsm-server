import type { AppConfigService } from "../shared/config/app-config.service";

export type DevelopmentStartupConfig = Pick<
  AppConfigService,
  | "aiAssistantEnabled"
  | "apiGlobalPrefix"
  | "appName"
  | "businessTimezone"
  | "environment"
  | "logDirPath"
  | "logLevel"
  | "schedulerEnabled"
  | "swaggerEnabled"
  | "swaggerJsonPath"
  | "swaggerPath"
>;

type DevelopmentStartupInfo = {
  app: string;
  environment: string;
  baseUrl: string;
  apiPrefix: string;
  swaggerEnabled: boolean;
  swaggerPath: string;
  swaggerUrl: string;
  swaggerJsonPath: string;
  swaggerJsonUrl: string;
  logLevel: string;
  logDir: string;
  schedulerEnabled: boolean;
  aiAssistantEnabled: boolean;
  timezone: string;
};

export function buildDevelopmentStartupMessage(
  appUrl: string,
  appConfigService: DevelopmentStartupConfig,
): string {
  return JSON.stringify(
    buildDevelopmentStartupInfo(appUrl, appConfigService),
    null,
    2,
  );
}

function buildDevelopmentStartupInfo(
  appUrl: string,
  appConfigService: DevelopmentStartupConfig,
): DevelopmentStartupInfo {
  const normalizedAppUrl = normalizeLocalUrl(appUrl);
  const swaggerEnabled = appConfigService.swaggerEnabled;
  const swaggerPath = `/${joinRouteSegments(
    appConfigService.apiGlobalPrefix,
    appConfigService.swaggerPath,
  )}`;
  const swaggerJsonPath = `/${joinRouteSegments(
    appConfigService.apiGlobalPrefix,
    appConfigService.swaggerJsonPath,
  )}`;

  return {
    app: appConfigService.appName,
    environment: appConfigService.environment,
    baseUrl: normalizedAppUrl,
    apiPrefix: `/${appConfigService.apiGlobalPrefix}`,
    swaggerEnabled,
    swaggerPath,
    swaggerUrl: swaggerEnabled
      ? `${normalizedAppUrl}${swaggerPath}`
      : "disabled",
    swaggerJsonPath,
    swaggerJsonUrl: swaggerEnabled
      ? `${normalizedAppUrl}${swaggerJsonPath}`
      : "disabled",
    logLevel: appConfigService.logLevel,
    logDir: appConfigService.logDirPath,
    schedulerEnabled: appConfigService.schedulerEnabled,
    aiAssistantEnabled: appConfigService.aiAssistantEnabled,
    timezone: appConfigService.businessTimezone,
  };
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
