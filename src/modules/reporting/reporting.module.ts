import { Module } from "@nestjs/common";
import { ReportingService } from "./application/reporting.service";
import { ReportingController } from "./controllers/reporting.controller";
import { ReportingRepository } from "./infrastructure/reporting.repository";

@Module({
  controllers: [ReportingController],
  providers: [ReportingService, ReportingRepository],
  exports: [ReportingService],
})
export class ReportingModule {}
