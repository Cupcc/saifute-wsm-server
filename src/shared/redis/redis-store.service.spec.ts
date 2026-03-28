import type Redis from "ioredis";
import {
  canConnectToRedisForTests,
  closeRedisClient,
  createRedisAppConfigStub,
  createRedisClientForTests,
} from "../../../test/redis-test.utils";
import { RedisStoreService } from "./redis-store.service";

describe("RedisStoreService (integration)", () => {
  let rawClient: Redis | null = null;
  let service: RedisStoreService | null = null;

  beforeAll(async () => {
    const redisAvailable = await canConnectToRedisForTests();
    if (!redisAvailable) {
      // Keep the default test suite runnable when a local Redis instance is absent.
      process.stderr.write(
        "[RedisStoreService.spec] Redis unavailable, skipping integration assertions.\n",
      );
      return;
    }

    rawClient = await createRedisClientForTests();
    service = new RedisStoreService(createRedisAppConfigStub());
    await service.onModuleInit();
  });

  beforeEach(async () => {
    await rawClient?.flushdb();
  });

  afterAll(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
    await closeRedisClient(rawClient);
  });

  it("stores JSON payloads in real Redis and adapts ttl semantics", async () => {
    if (!service || !rawClient) {
      return;
    }

    await service.set("redis:test:session", { username: "admin" }, 60);
    await service.set("redis:test:persistent", { enabled: true });

    expect(await rawClient.get("redis:test:session")).toBe(
      JSON.stringify({ username: "admin" }),
    );
    expect(
      await service.get<{ username: string }>("redis:test:session"),
    ).toEqual({ username: "admin" });
    expect(await service.ttl("redis:test:session")).toBeGreaterThan(0);
    expect(await service.ttl("redis:test:persistent")).toBeNull();

    expect(await service.del("redis:test:session")).toBe(true);
    expect(await service.get("redis:test:session")).toBeNull();
    expect(await service.ttl("redis:test:session")).toBeNull();
  });

  it("lists entries by prefix without leaking unrelated keys", async () => {
    if (!service) {
      return;
    }

    await service.set("login_tokens:session-1", { sessionId: "session-1" }, 60);
    await service.set("login_tokens:session-2", { sessionId: "session-2" }, 60);
    await service.set("auth:captcha:1", { captchaCode: "1234" }, 60);

    const entries = await service.listByPrefix<{ sessionId: string }>(
      "login_tokens:",
    );

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.key).sort()).toEqual([
      "login_tokens:session-1",
      "login_tokens:session-2",
    ]);
    expect(entries.map((entry) => entry.value.sessionId).sort()).toEqual([
      "session-1",
      "session-2",
    ]);
  });

  it("consumes matching values atomically and deletes mismatched ones", async () => {
    if (!service || !rawClient) {
      return;
    }

    await service.set("auth:captcha:test", { captchaCode: "1234" }, 60);
    expect(
      await service.consumeIfEquals("auth:captcha:test", {
        captchaCode: "0000",
      }),
    ).toBe(false);
    expect(await rawClient.get("auth:captcha:test")).toBeNull();

    await service.set("auth:captcha:test", { captchaCode: "5678" }, 60);
    expect(
      await service.consumeIfEquals("auth:captcha:test", {
        captchaCode: "5678",
      }),
    ).toBe(true);
    expect(await rawClient.get("auth:captcha:test")).toBeNull();
  });

  it("increments failure windows with stable JSON payloads", async () => {
    if (!service || !rawClient) {
      return;
    }

    const lockedUntil = "2030-01-01T00:00:00.000Z";
    const first = await service.incrementFailureWindow("auth:password:test", {
      maxFailures: 2,
      windowSeconds: 60,
      lockedUntilIso: lockedUntil,
    });
    const second = await service.incrementFailureWindow("auth:password:test", {
      maxFailures: 2,
      windowSeconds: 60,
      lockedUntilIso: lockedUntil,
    });

    expect(first).toEqual({ count: 1 });
    expect(second).toEqual({ count: 2, lockedUntil });
    expect(
      JSON.parse((await rawClient.get("auth:password:test")) ?? "{}"),
    ).toEqual(second);
    expect(await service.ttl("auth:password:test")).toBeGreaterThan(0);
  });
});
