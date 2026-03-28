import type Redis from "ioredis";
import {
  canConnectToRedisForTests,
  closeRedisClient,
  createRedisAppConfigStub,
  createRedisClientForTests,
} from "../../../../test/redis-test.utils";
import { RedisStoreService } from "../../../shared/redis/redis-store.service";
import { AuthStateRepository } from "./auth-state.repository";

describe("AuthStateRepository (integration)", () => {
  let rawClient: Redis | null = null;
  let redisStoreService: RedisStoreService | null = null;
  let repository: AuthStateRepository | null = null;

  const appConfigService = createRedisAppConfigStub({
    captchaTtlSeconds: 120,
    passwordLockMinutes: 1,
    passwordMaxRetries: 5,
  });

  beforeAll(async () => {
    const redisAvailable = await canConnectToRedisForTests();
    if (!redisAvailable) {
      process.stderr.write(
        "[AuthStateRepository.spec] Redis unavailable, skipping integration assertions.\n",
      );
      return;
    }

    rawClient = await createRedisClientForTests();
    redisStoreService = new RedisStoreService(appConfigService);
    await redisStoreService.onModuleInit();
    repository = new AuthStateRepository(redisStoreService, appConfigService);
  });

  beforeEach(async () => {
    await rawClient?.flushdb();
  });

  afterAll(async () => {
    if (redisStoreService) {
      await redisStoreService.onModuleDestroy();
    }
    await closeRedisClient(rawClient);
  });

  it("stores captchas in Redis and consumes them exactly once", async () => {
    const authStateRepository = repository;
    const redisClient = rawClient;

    if (!authStateRepository || !redisClient) {
      return;
    }

    await authStateRepository.storeCaptcha("captcha-1", "1234");
    expect(await redisClient.get("auth:captcha:captcha-1")).toBe(
      JSON.stringify({ captchaCode: "1234" }),
    );

    expect(await authStateRepository.consumeCaptcha("captcha-1", "1234")).toBe(
      true,
    );
    expect(await authStateRepository.consumeCaptcha("captcha-1", "1234")).toBe(
      false,
    );

    await authStateRepository.storeCaptcha("captcha-2", "5678");
    expect(await authStateRepository.consumeCaptcha("captcha-2", "0000")).toBe(
      false,
    );
    expect(await redisClient.get("auth:captcha:captcha-2")).toBeNull();
  });

  it("preserves password failure counts under concurrency and clears them on success", async () => {
    const authStateRepository = repository;
    const redisClient = rawClient;

    if (!authStateRepository || !redisClient) {
      return;
    }

    await Promise.all(
      Array.from({ length: 5 }, () =>
        authStateRepository.recordPasswordFailure("operator"),
      ),
    );

    const state = await authStateRepository.getPasswordAttempt("operator");
    expect(state.count).toBe(5);
    expect(state.lockedUntil).toBeDefined();
    expect(
      JSON.parse(
        (await redisClient.get("auth:password-attempt:operator")) ?? "{}",
      ),
    ).toEqual({
      count: 5,
      lockedUntil: state.lockedUntil,
    });

    await authStateRepository.clearPasswordFailures("operator");
    expect(await authStateRepository.getPasswordAttempt("operator")).toEqual({
      count: 0,
    });
    expect(await redisClient.get("auth:password-attempt:operator")).toBeNull();
  });
});
