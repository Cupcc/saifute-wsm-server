import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../shared/config/app-config.service";
import { RedisStoreService } from "../../../shared/redis/redis-store.service";

interface PasswordAttemptState {
  count: number;
  lockedUntil?: string;
}

@Injectable()
export class AuthStateRepository {
  constructor(
    private readonly redisStoreService: RedisStoreService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async storeCaptcha(captchaId: string, captchaCode: string): Promise<void> {
    await this.redisStoreService.set(
      this.buildCaptchaKey(captchaId),
      { captchaCode },
      this.appConfigService.captchaTtlSeconds,
    );
  }

  async consumeCaptcha(
    captchaId: string,
    captchaCode: string,
  ): Promise<boolean> {
    return this.redisStoreService.consumeIfEquals(
      this.buildCaptchaKey(captchaId),
      {
        captchaCode,
      },
    );
  }

  async getPasswordAttempt(username: string): Promise<PasswordAttemptState> {
    return (
      (await this.redisStoreService.get<PasswordAttemptState>(
        this.buildPasswordAttemptKey(username),
      )) ?? { count: 0 }
    );
  }

  async recordPasswordFailure(username: string): Promise<PasswordAttemptState> {
    return this.redisStoreService.incrementFailureWindow(
      this.buildPasswordAttemptKey(username),
      {
        maxFailures: this.appConfigService.passwordMaxRetries,
        windowSeconds: this.appConfigService.passwordLockMinutes * 60,
      },
    );
  }

  async clearPasswordFailures(username: string): Promise<void> {
    await this.redisStoreService.del(this.buildPasswordAttemptKey(username));
  }

  private buildCaptchaKey(captchaId: string): string {
    return `auth:captcha:${captchaId}`;
  }

  private buildPasswordAttemptKey(username: string): string {
    return `auth:password-attempt:${username}`;
  }
}
