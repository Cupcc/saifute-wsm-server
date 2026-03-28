import { Global, Module } from "@nestjs/common";
import { SharedConfigModule } from "../config/shared-config.module";
import { RedisStoreService } from "./redis-store.service";

@Global()
@Module({
  imports: [SharedConfigModule],
  providers: [RedisStoreService],
  exports: [RedisStoreService],
})
export class RedisModule {}
