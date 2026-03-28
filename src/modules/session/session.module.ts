import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AppConfigService } from "../../shared/config/app-config.service";
import { RedisModule } from "../../shared/redis/redis.module";
import { SessionService } from "./application/session.service";
import { SessionsController } from "./controllers/sessions.controller";
import { SessionRepository } from "./infrastructure/session.repository";

@Module({
  imports: [
    RedisModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) => ({
        secret: appConfigService.jwtSecret,
        signOptions: {
          expiresIn: appConfigService.jwtExpiresInSeconds,
        },
      }),
    }),
  ],
  controllers: [SessionsController],
  providers: [SessionService, SessionRepository],
  exports: [SessionService],
})
export class SessionModule {}
