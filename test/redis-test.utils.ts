import Redis from "ioredis";
import type { AppConfigService } from "../src/shared/config/app-config.service";

interface RedisTestConfigOverrides {
  appName?: string;
  captchaTtlSeconds?: number;
  passwordLockMinutes?: number;
  passwordMaxRetries?: number;
  redisConnectTimeoutMs?: number;
  redisDb?: number;
  redisHost?: string;
  redisPassword?: string | null;
  redisPort?: number;
  sessionMaxTtlSeconds?: number;
  sessionRefreshThresholdSeconds?: number;
  sessionTtlSeconds?: number;
}

const DEFAULT_REDIS_TEST_HOST = process.env.REDIS_HOST ?? "127.0.0.1";
const DEFAULT_REDIS_TEST_PORT = Number(process.env.REDIS_PORT ?? "6379");
const DEFAULT_REDIS_TEST_PASSWORD = process.env.REDIS_PASSWORD?.trim() || null;
const DEFAULT_REDIS_TEST_DB = Number(process.env.REDIS_TEST_DB ?? "15");
const DEFAULT_REDIS_TEST_CONNECT_TIMEOUT_MS = Number(
  process.env.REDIS_CONNECT_TIMEOUT_MS ?? "5000",
);

export function createRedisAppConfigStub(
  overrides: RedisTestConfigOverrides = {},
): AppConfigService {
  return {
    appName: overrides.appName ?? "saifute-wms-server-test",
    captchaTtlSeconds: overrides.captchaTtlSeconds ?? 300,
    passwordLockMinutes: overrides.passwordLockMinutes ?? 15,
    passwordMaxRetries: overrides.passwordMaxRetries ?? 5,
    redisConnectTimeoutMs:
      overrides.redisConnectTimeoutMs ?? DEFAULT_REDIS_TEST_CONNECT_TIMEOUT_MS,
    redisDb: overrides.redisDb ?? DEFAULT_REDIS_TEST_DB,
    redisHost: overrides.redisHost ?? DEFAULT_REDIS_TEST_HOST,
    redisPassword: overrides.redisPassword ?? DEFAULT_REDIS_TEST_PASSWORD,
    redisPort: overrides.redisPort ?? DEFAULT_REDIS_TEST_PORT,
    sessionMaxTtlSeconds: overrides.sessionMaxTtlSeconds ?? 28800,
    sessionRefreshThresholdSeconds:
      overrides.sessionRefreshThresholdSeconds ?? 1200,
    sessionTtlSeconds: overrides.sessionTtlSeconds ?? 3600,
  } as AppConfigService;
}

export async function createRedisClientForTests(
  overrides: RedisTestConfigOverrides = {},
): Promise<Redis> {
  const config = createRedisAppConfigStub(overrides);
  const client = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword ?? undefined,
    db: config.redisDb,
    connectTimeout: config.redisConnectTimeoutMs,
    connectionName: `${config.appName}:test-client`,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  try {
    await client.connect();
    await client.ping();
    return client;
  } catch (error) {
    client.disconnect(false);
    throw error;
  }
}

export async function canConnectToRedisForTests(
  overrides: RedisTestConfigOverrides = {},
): Promise<boolean> {
  let client: Redis | null = null;

  try {
    client = await createRedisClientForTests(overrides);
    return true;
  } catch {
    return false;
  } finally {
    await closeRedisClient(client);
  }
}

export async function closeRedisClient(client: Redis | null): Promise<void> {
  if (!client) {
    return;
  }

  try {
    await client.quit();
    client.disconnect(false);
  } catch {
    client.disconnect(false);
  }
}
