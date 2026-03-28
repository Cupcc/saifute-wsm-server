import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import Redis from "ioredis";
import { AppConfigService } from "../config/app-config.service";

const REDIS_SCAN_COUNT = 100;

const CONSUME_IF_EQUALS_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current then
  return 0
end

redis.call("DEL", KEYS[1])

if current == ARGV[1] then
  return 1
end

return 0
`;

const INCREMENT_FAILURE_WINDOW_SCRIPT = `
local maxFailures = tonumber(ARGV[1])
local lockedUntil = ARGV[2]
local windowSeconds = tonumber(ARGV[3])
local current = redis.call("GET", KEYS[1])
local count = 0

if current then
  local decoded = cjson.decode(current)
  if decoded["count"] ~= nil then
    count = tonumber(decoded["count"]) or 0
  end
end

count = count + 1

local nextState = { count = count }
if count >= maxFailures then
  nextState["lockedUntil"] = lockedUntil
end

local encoded = cjson.encode(nextState)
redis.call("SET", KEYS[1], encoded, "EX", windowSeconds)
return encoded
`;

@Injectable()
export class RedisStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisStoreService.name);
  private readonly client: Redis;
  private isShuttingDown = false;

  constructor(private readonly appConfigService: AppConfigService) {
    this.client = new Redis({
      host: this.appConfigService.redisHost,
      port: this.appConfigService.redisPort,
      password: this.appConfigService.redisPassword ?? undefined,
      db: this.appConfigService.redisDb,
      connectTimeout: this.appConfigService.redisConnectTimeoutMs,
      connectionName: `${this.appConfigService.appName}:shared-redis`,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    this.registerClientEvents();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      const pingResult = await this.client.ping();
      this.logger.log(
        `Redis ready at ${this.appConfigService.redisHost}:${this.appConfigService.redisPort}/db${this.appConfigService.redisDb} (ping=${pingResult})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Redis startup probe failed for ${this.appConfigService.redisHost}:${this.appConfigService.redisPort}/db${this.appConfigService.redisDb}: ${message}`,
      );
      this.client.disconnect(false);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.client.status !== "ready") {
      this.client.disconnect(false);
      return;
    }

    try {
      await this.client.quit();
      this.client.disconnect(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis quit failed, forcing disconnect: ${message}`);
      this.client.disconnect(false);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = this.serialize(value);
    if (this.hasTtl(ttlSeconds)) {
      await this.client.set(key, serialized, "EX", ttlSeconds);
      return;
    }

    await this.client.set(key, serialized);
  }

  async get<T>(key: string): Promise<T | null> {
    const serialized = await this.client.get(key);
    if (serialized === null) {
      return null;
    }

    return this.deserialize<T>(key, serialized);
  }

  async del(key: string): Promise<boolean> {
    return (await this.client.del(key)) > 0;
  }

  async ttl(key: string): Promise<number | null> {
    const remainingSeconds = await this.client.ttl(key);
    if (remainingSeconds === -2 || remainingSeconds === -1) {
      return null;
    }

    return remainingSeconds;
  }

  async listByPrefix<T>(
    prefix: string,
  ): Promise<Array<{ key: string; value: T }>> {
    const keys = await this.scanKeysByPattern(`${prefix}*`);
    if (keys.length === 0) {
      return [];
    }

    const serializedValues = await this.client.mget(keys);
    return keys.flatMap((key, index) => {
      const serialized = serializedValues[index];
      if (serialized === null) {
        return [];
      }

      return [
        {
          key,
          value: this.deserialize<T>(key, serialized),
        },
      ];
    });
  }

  async consumeIfEquals<T>(key: string, expectedValue: T): Promise<boolean> {
    const result = await this.client.eval(
      CONSUME_IF_EQUALS_SCRIPT,
      1,
      key,
      this.serialize(expectedValue),
    );
    return Number(result) === 1;
  }

  async incrementFailureWindow(
    key: string,
    options: {
      maxFailures: number;
      windowSeconds: number;
      lockedUntilIso?: string;
    },
  ): Promise<{ count: number; lockedUntil?: string }> {
    const lockedUntilIso =
      options.lockedUntilIso ??
      new Date(Date.now() + options.windowSeconds * 1000).toISOString();
    const result = await this.client.eval(
      INCREMENT_FAILURE_WINDOW_SCRIPT,
      1,
      key,
      options.maxFailures,
      lockedUntilIso,
      options.windowSeconds,
    );

    if (typeof result !== "string") {
      throw new Error(
        `Unexpected Redis failure-window result for key "${key}"`,
      );
    }

    return this.deserialize<{ count: number; lockedUntil?: string }>(
      key,
      result,
    );
  }

  private registerClientEvents(): void {
    this.client.on("error", (error) => {
      if (this.isShuttingDown) {
        return;
      }
      const message = error.stack ?? error.message;
      this.logger.error(`Redis client error: ${message}`);
    });

    this.client.on("end", () => {
      if (this.isShuttingDown) {
        return;
      }
      this.logger.warn("Redis connection closed");
    });
  }

  private async scanKeysByPattern(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, batchKeys] = await this.client.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        REDIS_SCAN_COUNT,
      );
      cursor = nextCursor;
      keys.push(...batchKeys);
    } while (cursor !== "0");

    return keys;
  }

  private serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  private deserialize<T>(key: string, serialized: string): T {
    try {
      return JSON.parse(serialized) as T;
    } catch (error) {
      throw new Error(`Failed to parse Redis value for key "${key}"`, {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  private hasTtl(ttlSeconds?: number): ttlSeconds is number {
    return (
      typeof ttlSeconds === "number" &&
      Number.isFinite(ttlSeconds) &&
      ttlSeconds > 0
    );
  }
}
