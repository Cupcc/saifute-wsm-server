import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { AuditLog } from "../../audit-log/decorators/audit-log.decorator";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { SchedulerService } from "../application/scheduler.service";
import { CreateSchedulerJobDto } from "../dto/create-scheduler-job.dto";
import { QuerySchedulerJobLogsDto } from "../dto/query-scheduler-job-logs.dto";
import { QuerySchedulerJobsDto } from "../dto/query-scheduler-jobs.dto";
import { UpdateSchedulerJobDto } from "../dto/update-scheduler-job.dto";

@Controller("scheduler")
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Permissions("scheduler:job:list")
  @Get("jobs")
  async listJobs(@Query() query: QuerySchedulerJobsDto) {
    return this.schedulerService.listJobs(query);
  }

  @Permissions("scheduler:job:create")
  @AuditLog({ title: "新增调度任务", action: "CREATE_SCHEDULER_JOB" })
  @Post("jobs")
  async createJob(
    @Body() dto: CreateSchedulerJobDto,
    @CurrentUser() currentUser: SessionUserSnapshot,
  ) {
    return this.schedulerService.createJob(dto, currentUser.username);
  }

  @Permissions("scheduler:job:update")
  @AuditLog({ title: "更新调度任务", action: "UPDATE_SCHEDULER_JOB" })
  @Patch("jobs/:id")
  async updateJob(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSchedulerJobDto,
    @CurrentUser() currentUser: SessionUserSnapshot,
  ) {
    return this.schedulerService.updateJob(id, dto, currentUser.username);
  }

  @Permissions("scheduler:job:run")
  @AuditLog({ title: "立即执行调度任务", action: "RUN_SCHEDULER_JOB" })
  @Post("jobs/:id/run")
  async runJob(@Param("id", ParseIntPipe) id: number) {
    return this.schedulerService.runJobNow(id);
  }

  @Permissions("scheduler:job:pause")
  @AuditLog({ title: "暂停调度任务", action: "PAUSE_SCHEDULER_JOB" })
  @Post("jobs/:id/pause")
  async pauseJob(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() currentUser: SessionUserSnapshot,
  ) {
    return this.schedulerService.pauseJob(id, currentUser.username);
  }

  @Permissions("scheduler:job:pause")
  @AuditLog({ title: "恢复调度任务", action: "RESUME_SCHEDULER_JOB" })
  @Post("jobs/:id/resume")
  async resumeJob(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() currentUser: SessionUserSnapshot,
  ) {
    return this.schedulerService.resumeJob(id, currentUser.username);
  }

  @Permissions("scheduler:job:log:list")
  @Get("job-logs")
  async listJobLogs(@Query() query: QuerySchedulerJobLogsDto) {
    return this.schedulerService.listJobLogs(query);
  }
}
