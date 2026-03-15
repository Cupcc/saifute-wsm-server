import { Injectable } from "@nestjs/common";
import { ReportingService } from "../../reporting/application/reporting.service";

export interface SchedulerExecutorDefinition {
  invokeTarget: string;
  description: string;
}

export interface SchedulerExecutorResult {
  summary: string;
  payload?: unknown;
}

@Injectable()
export class SchedulerExecutorRegistry {
  constructor(private readonly reportingService: ReportingService) {}

  listExecutors(): SchedulerExecutorDefinition[] {
    return [
      {
        invokeTarget: "system.noop",
        description: "No-op executor used for scheduler smoke tests.",
      },
      {
        invokeTarget: "reporting.home-dashboard",
        description:
          "Refresh the reporting home dashboard read model snapshot.",
      },
    ];
  }

  hasExecutor(invokeTarget: string): boolean {
    return this.listExecutors().some(
      (executor) => executor.invokeTarget === invokeTarget,
    );
  }

  async runExecutor(invokeTarget: string): Promise<SchedulerExecutorResult> {
    switch (invokeTarget) {
      case "system.noop":
        return {
          summary: "No-op executor completed successfully.",
          payload: {
            ok: true,
          },
        };
      case "reporting.home-dashboard": {
        const dashboard = await this.reportingService.getHomeDashboard();
        return {
          summary: "Reporting home dashboard refreshed.",
          payload: dashboard,
        };
      }
      default:
        throw new Error(`Unsupported invokeTarget: ${invokeTarget}`);
    }
  }
}
