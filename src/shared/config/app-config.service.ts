import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get appName(): string {
    return this.readString("APP_NAME", "saifute-wms-server");
  }

  get environment(): string {
    return this.readString("NODE_ENV", "development");
  }

  get apiGlobalPrefix(): string {
    return this.normalizeRoutePrefix(
      this.readString("API_GLOBAL_PREFIX", "api"),
    );
  }

  get swaggerEnabled(): boolean {
    const configured = this.parseBooleanValue(
      this.configService.get<string>("SWAGGER_ENABLED"),
    );
    if (configured !== null) {
      return configured;
    }

    return ["development", "dev", "local"].includes(
      this.environment.trim().toLowerCase(),
    );
  }

  get swaggerTitle(): string {
    return this.readString("SWAGGER_TITLE", `${this.appName} API`);
  }

  get swaggerDescription(): string {
    return this.readString(
      "SWAGGER_DESCRIPTION",
      `${this.appName} API documentation`,
    );
  }

  get swaggerVersion(): string {
    return this.readString("SWAGGER_VERSION", "0.1.0");
  }

  get swaggerPath(): string {
    return this.normalizeRoutePrefix(this.readString("SWAGGER_PATH", "docs"));
  }

  get swaggerJsonPath(): string {
    return this.normalizeRoutePrefix(
      this.readString("SWAGGER_JSON_PATH", "docs-json"),
    );
  }

  get jwtSecret(): string {
    return this.readString("JWT_SECRET", "dev-secret");
  }

  get jwtExpiresInSeconds(): number {
    return this.readNumber("JWT_EXPIRES_IN_SECONDS", 3600);
  }

  get sessionTtlSeconds(): number {
    return this.readNumber("SESSION_TTL_SECONDS", 3600);
  }

  get sessionMaxTtlSeconds(): number {
    return this.readNumber("SESSION_MAX_TTL_SECONDS", 28800);
  }

  get sessionRefreshThresholdSeconds(): number {
    return this.readNumber("SESSION_REFRESH_THRESHOLD_SECONDS", 1200);
  }

  get captchaTtlSeconds(): number {
    return this.readNumber("CAPTCHA_TTL_SECONDS", 300);
  }

  get captchaEnabled(): boolean {
    return this.readBoolean("CAPTCHA_ENABLED", true);
  }

  get passwordMaxRetries(): number {
    return this.readNumber("PASSWORD_MAX_RETRIES", 5);
  }

  get passwordLockMinutes(): number {
    return this.readNumber("PASSWORD_LOCK_MINUTES", 15);
  }

  get redisHost(): string {
    return this.readString("REDIS_HOST", "127.0.0.1");
  }

  get redisPort(): number {
    return this.readNumber("REDIS_PORT", 6379);
  }

  get redisPassword(): string | null {
    const value = this.readString("REDIS_PASSWORD", "").trim();
    return value ? value : null;
  }

  get redisDb(): number {
    return this.readNumber("REDIS_DB", 0);
  }

  get redisConnectTimeoutMs(): number {
    return this.readNumber("REDIS_CONNECT_TIMEOUT_MS", 5000);
  }

  get authIpBlacklist(): string[] {
    const value = this.readString("AUTH_IP_BLACKLIST", "");
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  get fileStorageRootPath(): string {
    const configuredRoot =
      this.configService.get<string>("FILE_STORAGE_ROOT_PATH") ??
      this.configService.get<string>("UPLOAD_ROOT_PATH") ??
      "storage";
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(process.cwd(), configuredRoot);
  }

  get uploadRootPath(): string {
    return this.fileStorageRootPath;
  }

  get profilePublicPrefix(): string {
    const value = this.readString("FILE_STORAGE_PUBLIC_PREFIX", "/profile");
    return this.normalizePublicPrefix(value);
  }

  get fileUploadMaxSizeBytes(): number {
    return this.readNumber("FILE_STORAGE_MAX_SIZE_BYTES", 5 * 1024 * 1024);
  }

  get fileAllowedExtensions(): string[] {
    const configured = this.readString(
      "FILE_STORAGE_ALLOWED_EXTENSIONS",
      ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar",
    );

    return configured
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .map((item) => (item.startsWith(".") ? item : `.${item}`));
  }

  get businessTimezone(): string {
    return this.readString("BUSINESS_TIMEZONE", "Asia/Shanghai");
  }

  get schedulerEnabled(): boolean {
    return this.readBoolean("SCHEDULER_ENABLED", true);
  }

  get schedulerTimezone(): string {
    return this.readString("SCHEDULER_TIMEZONE", this.businessTimezone);
  }

  get logLevel(): string {
    return this.readString(
      "LOG_LEVEL",
      this.environment === "development" ? "debug" : "info",
    );
  }

  get logDirPath(): string {
    const configuredRoot = this.readString(
      "LOG_DIR",
      this.environment === "development" ? "logs-dev" : "logs",
    );
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(process.cwd(), configuredRoot);
  }

  get aiAssistantEnabled(): boolean {
    return this.readBoolean("AI_ASSISTANT_ENABLED", true);
  }

  get aiAssistantBaseUrl(): string {
    return this.readString(
      "AI_ASSISTANT_BASE_URL",
      "https://api.openai.com/v1",
    );
  }

  get aiAssistantModel(): string {
    return this.readString("AI_ASSISTANT_MODEL", "gpt-4.1-mini");
  }

  get aiAssistantApiKey(): string | null {
    const value = this.readString("AI_ASSISTANT_API_KEY", "").trim();
    return value ? value : null;
  }

  get aiAssistantTimeoutMs(): number {
    return this.readNumber("AI_ASSISTANT_TIMEOUT_MS", 15000);
  }

  private readNumber(key: string, fallback: number): number {
    const value = this.configService.get<string>(key);
    const parsed = value ? Number(value) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private readBoolean(key: string, fallback: boolean): boolean {
    const parsed = this.parseBooleanValue(this.configService.get<string>(key));
    if (parsed === null) {
      return fallback;
    }
    return parsed;
  }

  private readString(key: string, fallback: string): string {
    return this.configService.get<string>(key) ?? fallback;
  }

  private parseBooleanValue(value: string | undefined): boolean | null {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }

    return null;
  }

  private normalizeRoutePrefix(value: string): string {
    return value.replace(/^\/+|\/+$/g, "");
  }

  private normalizePublicPrefix(value: string): string {
    const normalized = value.trim().replace(/\/+$/g, "");
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }
}
