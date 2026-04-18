import {
  buildDevelopmentStartupMessage,
  type DevelopmentStartupConfig,
} from "./development-startup-message";

describe("buildDevelopmentStartupMessage", () => {
  it("renders the development startup config as formatted JSON", () => {
    const config = {
      appName: "saifute-wms-server",
      environment: "development",
      apiGlobalPrefix: "api",
      swaggerEnabled: true,
      swaggerPath: "docs",
      swaggerJsonPath: "docs-json",
      logLevel: "debug",
      logDirPath: "/tmp/logs-dev",
      schedulerEnabled: true,
      aiAssistantEnabled: true,
      businessTimezone: "Asia/Shanghai",
    } satisfies DevelopmentStartupConfig;

    expect(
      JSON.parse(buildDevelopmentStartupMessage("http://[::1]:3000", config)),
    ).toEqual({
      app: "saifute-wms-server",
      environment: "development",
      baseUrl: "http://localhost:3000",
      apiPrefix: "/api",
      swaggerEnabled: true,
      swaggerPath: "/api/docs",
      swaggerUrl: "http://localhost:3000/api/docs",
      swaggerJsonPath: "/api/docs-json",
      swaggerJsonUrl: "http://localhost:3000/api/docs-json",
      logLevel: "debug",
      logDir: "/tmp/logs-dev",
      schedulerEnabled: true,
      aiAssistantEnabled: true,
      timezone: "Asia/Shanghai",
    });
  });

  it("keeps swagger routes but marks URLs disabled when swagger is off", () => {
    const config = {
      appName: "saifute-wms-server",
      environment: "development",
      apiGlobalPrefix: "api",
      swaggerEnabled: false,
      swaggerPath: "docs",
      swaggerJsonPath: "docs-json",
      logLevel: "debug",
      logDirPath: "/tmp/logs-dev",
      schedulerEnabled: true,
      aiAssistantEnabled: true,
      businessTimezone: "Asia/Shanghai",
    } satisfies DevelopmentStartupConfig;

    expect(
      JSON.parse(
        buildDevelopmentStartupMessage("http://localhost:3000", config),
      ),
    ).toMatchObject({
      swaggerEnabled: false,
      swaggerPath: "/api/docs",
      swaggerUrl: "disabled",
      swaggerJsonPath: "/api/docs-json",
      swaggerJsonUrl: "disabled",
    });
  });
});
