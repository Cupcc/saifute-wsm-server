import {
  Global,
  MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import { AppConfigService } from "../config/app-config.service";
import { SharedConfigModule } from "../config/shared-config.module";
import { HttpLoggingMiddleware } from "./http-logging.middleware";
import { createWinstonModuleOptions } from "./winston.config";

@Global()
@Module({
  imports: [
    SharedConfigModule,
    WinstonModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) =>
        createWinstonModuleOptions(appConfigService),
    }),
  ],
  providers: [HttpLoggingMiddleware],
  exports: [WinstonModule],
})
export class SharedLoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpLoggingMiddleware).forRoutes({
      path: "*",
      method: RequestMethod.ALL,
    });
  }
}
