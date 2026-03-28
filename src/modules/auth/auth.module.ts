import { Module } from "@nestjs/common";
import { RedisModule } from "../../shared/redis/redis.module";
import { RbacModule } from "../rbac/rbac.module";
import { SessionModule } from "../session/session.module";
import { AuthService } from "./application/auth.service";
import { AuthController } from "./controllers/auth.controller";
import { AuthStateRepository } from "./infrastructure/auth-state.repository";

@Module({
  imports: [RedisModule, RbacModule, SessionModule],
  controllers: [AuthController],
  providers: [AuthService, AuthStateRepository],
})
export class AuthModule {}
