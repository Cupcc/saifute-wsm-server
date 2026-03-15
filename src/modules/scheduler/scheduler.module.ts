import { Module } from "@nestjs/common";
import { ReportingModule } from "../reporting/reporting.module";
import { SchedulerService } from "./application/scheduler.service";
import { SchedulerController } from "./controllers/scheduler.controller";
import { SchedulerRepository } from "./infrastructure/scheduler.repository";
import { SchedulerExecutorRegistry } from "./infrastructure/scheduler-executor.registry";

@Module({
  imports: [ReportingModule],
  controllers: [SchedulerController],
  providers: [SchedulerService, SchedulerRepository, SchedulerExecutorRegistry],
  exports: [SchedulerService],
})
export class SchedulerModule {}
