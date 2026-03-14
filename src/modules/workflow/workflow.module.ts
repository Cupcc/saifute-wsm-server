import { Module } from "@nestjs/common";
import { WorkflowService } from "./application/workflow.service";
import { WorkflowController } from "./controllers/workflow.controller";
import { WorkflowRepository } from "./infrastructure/workflow.repository";

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowRepository],
  exports: [WorkflowService],
})
export class WorkflowModule {}
