import { Injectable } from "@nestjs/common";

interface StoredValue {
  serialized: string;
  expiresAt?: number;
}

@Injectable()
export class RedisStoreE2eStub {
  private readonly store = new Map<string, StoredValue>();

  async onModuleInit(): Promise<void> {}

  async onModuleDestroy(): Promise<void> {
    this.store.clear();
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt =
      typeof ttlSeconds === "number" && ttlSeconds > 0
        ? Date.now() + ttlSeconds * 1000
        : undefined;
    this.store.set(key, {
      serialized: JSON.stringify(value),
      expiresAt,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    this.cleanupKey(key);
    const stored = this.store.get(key);
    if (!stored) {
      return null;
    }

    return JSON.parse(stored.serialized) as T;
  }

  async del(key: string): Promise<boolean> {
    this.cleanupKey(key);
    return this.store.delete(key);
  }

  async ttl(key: string): Promise<number | null> {
    this.cleanupKey(key);
    const stored = this.store.get(key);
    if (!stored?.expiresAt) {
      return null;
    }

    return Math.max(0, Math.ceil((stored.expiresAt - Date.now()) / 1000));
  }

  async listByPrefix<T>(
    prefix: string,
  ): Promise<Array<{ key: string; value: T }>> {
    this.cleanupExpired();
    return [...this.store.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, stored]) => ({
        key,
        value: JSON.parse(stored.serialized) as T,
      }));
  }

  async consumeIfEquals<T>(key: string, expectedValue: T): Promise<boolean> {
    this.cleanupKey(key);
    const stored = this.store.get(key);
    if (!stored) {
      return false;
    }

    this.store.delete(key);
    return stored.serialized === JSON.stringify(expectedValue);
  }

  async incrementFailureWindow(
    key: string,
    options: {
      maxFailures: number;
      windowSeconds: number;
      lockedUntilIso?: string;
    },
  ): Promise<{ count: number; lockedUntil?: string }> {
    const current = (await this.get<{ count: number; lockedUntil?: string }>(
      key,
    )) ?? {
      count: 0,
    };
    const nextState: { count: number; lockedUntil?: string } = {
      count: current.count + 1,
    };

    if (nextState.count >= options.maxFailures) {
      nextState.lockedUntil =
        options.lockedUntilIso ??
        new Date(Date.now() + options.windowSeconds * 1000).toISOString();
    }

    await this.set(key, nextState, options.windowSeconds);
    return nextState;
  }

  private cleanupExpired(): void {
    for (const [key, value] of this.store.entries()) {
      if (value.expiresAt && value.expiresAt <= Date.now()) {
        this.store.delete(key);
      }
    }
  }

  private cleanupKey(key: string): void {
    const stored = this.store.get(key);
    if (stored?.expiresAt && stored.expiresAt <= Date.now()) {
      this.store.delete(key);
    }
  }
}
