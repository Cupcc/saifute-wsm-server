import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test, type TestingModule } from "@nestjs/testing";
import type Redis from "ioredis";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/shared/prisma/prisma.service";
import { PrismaE2eStub } from "./prisma-e2e-stub";
import {
  closeRedisClient,
  createRedisClientForTests,
} from "./redis-test.utils";

interface TestAppContext {
  app: NestExpressApplication;
  close: () => Promise<void>;
}

const REDIS_REAL_TEST_DB = 14;

async function bootstrapApp(
  envOverrides: Record<string, string | undefined> = {},
): Promise<TestAppContext> {
  const previousEnv = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(envOverrides)) {
    previousEnv.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  let moduleRef: TestingModule | null = null;
  let app: NestExpressApplication | null = null;

  try {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useClass(PrismaE2eStub)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    await setupApp(app);
    await app.init();

    return {
      app,
      close: async () => {
        await app?.close();
        for (const [key, value] of previousEnv.entries()) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      },
    };
  } catch (error) {
    await app?.close().catch(() => undefined);
    await moduleRef?.close().catch(() => undefined);
    for (const [key, value] of previousEnv.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    throw error;
  }
}

describe("Redis real integration (e2e)", () => {
  let appContext: TestAppContext | null = null;
  let rawClient: Redis | null = null;

  beforeAll(async () => {
    rawClient = await createRedisClientForTests({
      redisDb: REDIS_REAL_TEST_DB,
    });
  });

  beforeEach(async () => {
    await rawClient?.flushdb();
  });

  afterEach(async () => {
    await appContext?.close();
    appContext = null;
    await rawClient?.flushdb();
  });

  afterAll(async () => {
    await closeRedisClient(rawClient);
  });

  it("boots the app against real Redis and persists the auth/session chain", async () => {
    appContext = await bootstrapApp({
      REDIS_DB: String(REDIS_REAL_TEST_DB),
      REDIS_CONNECT_TIMEOUT_MS: "1000",
    });
    const server = appContext.app.getHttpServer();

    const captchaResponse = await request(server)
      .get("/api/auth/captcha")
      .expect(200);
    const captchaId = captchaResponse.body.data.captchaId as string;
    const captchaCode = captchaResponse.body.data.captchaCode as string;

    expect(await rawClient?.get(`auth:captcha:${captchaId}`)).toBe(
      JSON.stringify({ captchaCode }),
    );

    const loginResponse = await request(server)
      .post("/api/auth/login")
      .send({
        username: "admin",
        password: "admin123",
        captchaId,
        captchaCode,
      })
      .expect(201);
    const accessToken = loginResponse.body.data.accessToken as string;
    const sessionId = loginResponse.body.data.sessionId as string;

    expect(await rawClient?.get(`auth:captcha:${captchaId}`)).toBeNull();
    expect(await rawClient?.get(`login_tokens:${sessionId}`)).toBeTruthy();
    expect(await rawClient?.ttl(`login_tokens:${sessionId}`)).toBeGreaterThan(
      0,
    );

    await request(server)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    await request(server)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201);

    expect(await rawClient?.get(`login_tokens:${sessionId}`)).toBeNull();
  });

  it("fails fast during app init when Redis is unreachable", async () => {
    await expect(
      bootstrapApp({
        REDIS_PORT: "1",
        REDIS_DB: String(REDIS_REAL_TEST_DB),
        REDIS_CONNECT_TIMEOUT_MS: "200",
      }),
    ).rejects.toThrow();
  });
});
