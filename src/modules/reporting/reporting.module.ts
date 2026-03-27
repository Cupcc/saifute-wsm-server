import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { ReportingService } from "./application/reporting.service";
import { ReportingController } from "./controllers/reporting.controller";
import { ReportingRepository } from "./infrastructure/reporting.repository";

@Module({
  imports: [RbacModule],
  controllers: [ReportingController],
  providers: [ReportingService, ReportingRepository],
  exports: [ReportingService],
})
export class ReportingModule {}
