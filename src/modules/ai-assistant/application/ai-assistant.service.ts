import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AppConfigService } from "../../../shared/config/app-config.service";
import { InventoryService } from "../../inventory-core/application/inventory.service";
import { MasterDataService } from "../../master-data/application/master-data.service";
import { ReportingService } from "../../reporting/application/reporting.service";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import type { AiChatDto } from "../dto/ai-chat.dto";
import { OpenAiCompatibleAiProvider } from "../infrastructure/openai-compatible-ai.provider";

export interface AiToolDefinition {
  name: string;
  description: string;
  requiredPermissions: string[];
}

export interface AiStreamEvent {
  event: string;
  data: Record<string, unknown>;
}

interface AiToolCallPlan {
  name: string;
  input: Record<string, unknown>;
}

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly reportingService: ReportingService,
    private readonly masterDataService: MasterDataService,
    private readonly inventoryService: InventoryService,
    private readonly aiProvider: OpenAiCompatibleAiProvider,
  ) {}

  listTools(currentUser: SessionUserSnapshot): AiToolDefinition[] {
    return this.getToolDefinitions().filter((tool) =>
      this.hasAllPermissions(currentUser, tool.requiredPermissions),
    );
  }

  async buildChatStream(
    currentUser: SessionUserSnapshot,
    dto: AiChatDto,
  ): Promise<{
    events: AiStreamEvent[];
    usedTools: string[];
  }> {
    const events: AiStreamEvent[] = [
      {
        event: "ready",
        data: {
          contractVersion: "1",
          provider: this.aiProvider.providerLabel,
          tools: this.listTools(currentUser).map((tool) => tool.name),
        },
      },
    ];

    if (!this.appConfigService.aiAssistantEnabled) {
      events.push({
        event: "message",
        data: {
          text: "AI 助手当前未启用，请稍后再试。",
        },
      });
      events.push({
        event: "done",
        data: {
          usedTools: [],
        },
      });

      return {
        events,
        usedTools: [],
      };
    }

    const toolCalls = this.planToolCalls(currentUser, dto);
    const usedTools: string[] = [];
    const toolResults: Array<{
      name: string;
      summary: string;
    }> = [];

    for (const toolCall of toolCalls) {
      events.push({
        event: "tool-call",
        data: {
          name: toolCall.name,
          input: toolCall.input,
        },
      });

      const result = await this.executeToolCall(currentUser, toolCall);
      usedTools.push(toolCall.name);
      toolResults.push({
        name: toolCall.name,
        summary: this.summarizeToolResult(result),
      });
      events.push({
        event: "tool-result",
        data: {
          name: toolCall.name,
          output: result,
        },
      });
    }

    const navigation = this.buildNavigationCommand(dto.message);
    if (navigation) {
      events.push({
        event: "navigation",
        data: navigation,
      });
    }

    const prefill = this.buildPrefillCommand(dto.message);
    if (prefill) {
      events.push({
        event: "prefill",
        data: prefill,
      });
    }

    const summaryText =
      (await this.aiProvider.generateSummary({
        message: dto.message,
        usedTools,
        toolResults,
        navigationPath:
          typeof navigation?.path === "string" ? navigation.path : null,
        prefillForm: typeof prefill?.form === "string" ? prefill.form : null,
      })) ??
      this.buildAssistantSummary(dto.message, usedTools, navigation, prefill);

    events.push({
      event: "message",
      data: {
        text: summaryText,
      },
    });
    events.push({
      event: "done",
      data: {
        usedTools,
      },
    });

    return {
      events,
      usedTools,
    };
  }

  private planToolCalls(
    currentUser: SessionUserSnapshot,
    dto: AiChatDto,
  ): AiToolCallPlan[] {
    const requestedTools = new Set(dto.toolNames ?? []);
    const message = dto.message.toLowerCase();
    const availableTools = this.listTools(currentUser).map((tool) => tool.name);
    const plans: AiToolCallPlan[] = [];

    const maybeAddPlan = (name: string, input: Record<string, unknown>) => {
      if (!availableTools.includes(name)) {
        return;
      }
      if (requestedTools.size > 0 && !requestedTools.has(name)) {
        return;
      }
      if (plans.some((plan) => plan.name === name)) {
        return;
      }

      plans.push({ name, input });
    };

    if (requestedTools.size > 0) {
      for (const requestedTool of requestedTools) {
        if (
          !this.getToolDefinitions().some((tool) => tool.name === requestedTool)
        ) {
          throw new BadRequestException(`未知 AI 工具: ${requestedTool}`);
        }
        if (!availableTools.includes(requestedTool)) {
          throw new ForbiddenException(
            `当前用户无权使用工具: ${requestedTool}`,
          );
        }
        maybeAddPlan(
          requestedTool,
          this.inferToolInput(requestedTool, dto.message),
        );
      }
      return plans;
    }

    if (/(首页|home|看板|dashboard|统计)/.test(message)) {
      maybeAddPlan("reporting.home", {});
    }
    if (/(库存|inventory|结存|汇总)/.test(message)) {
      maybeAddPlan("reporting.inventory-summary", {
        keyword: this.extractKeyword(dto.message),
        limit: 5,
        offset: 0,
      });
    }
    if (/(物料|material)/.test(message)) {
      maybeAddPlan("master-data.materials", {
        keyword: this.extractKeyword(dto.message),
        limit: 5,
        offset: 0,
      });
    }
    if (/(库存流水|库存余额|balance)/.test(message)) {
      maybeAddPlan("inventory.balances", {
        limit: 5,
        offset: 0,
      });
    }

    return plans.slice(0, 3);
  }

  private inferToolInput(
    toolName: string,
    message: string,
  ): Record<string, unknown> {
    switch (toolName) {
      case "reporting.inventory-summary":
      case "master-data.materials":
        return {
          keyword: this.extractKeyword(message),
          limit: 5,
          offset: 0,
        };
      case "inventory.balances":
        return {
          limit: 5,
          offset: 0,
        };
      default:
        return {};
    }
  }

  private async executeToolCall(
    currentUser: SessionUserSnapshot,
    toolCall: AiToolCallPlan,
  ): Promise<unknown> {
    switch (toolCall.name) {
      case "reporting.home":
        this.assertToolPermissions(currentUser, ["reporting:home:view"]);
        return this.reportingService.getHomeDashboard();
      case "reporting.inventory-summary":
        this.assertToolPermissions(currentUser, [
          "reporting:inventory-summary:view",
        ]);
        return this.reportingService.getInventorySummary({
          keyword: this.toOptionalString(toolCall.input.keyword),
          limit: this.toOptionalNumber(toolCall.input.limit),
          offset: this.toOptionalNumber(toolCall.input.offset),
        });
      case "master-data.materials":
        this.assertToolPermissions(currentUser, ["master:material:list"]);
        return this.masterDataService.listMaterials({
          keyword: this.toOptionalString(toolCall.input.keyword),
          limit: this.toOptionalNumber(toolCall.input.limit),
          offset: this.toOptionalNumber(toolCall.input.offset),
        });
      case "inventory.balances":
        this.assertToolPermissions(currentUser, ["inventory:balance:list"]);
        return this.inventoryService.listBalances({
          limit: this.toOptionalNumber(toolCall.input.limit),
          offset: this.toOptionalNumber(toolCall.input.offset),
        });
      default:
        throw new Error(`Unsupported AI tool: ${toolCall.name}`);
    }
  }

  private buildNavigationCommand(message: string) {
    const normalized = message.toLowerCase();
    if (/(库存|inventory|结存|汇总)/.test(normalized)) {
      return {
        contractVersion: "1",
        path: "/system/reporting/inventory-summary",
        label: "库存汇总",
      };
    }
    if (/(首页|home|看板|dashboard)/.test(normalized)) {
      return {
        contractVersion: "1",
        path: "/system/reporting/home",
        label: "首页看板",
      };
    }
    if (/(任务|scheduler|调度)/.test(normalized)) {
      return {
        contractVersion: "1",
        path: "/system/scheduler/jobs",
        label: "调度任务",
      };
    }

    return null;
  }

  private buildPrefillCommand(message: string) {
    const normalized = message.toLowerCase();
    if (/(新建|创建).*(物料)|物料.*(新建|创建)/.test(normalized)) {
      return {
        contractVersion: "1",
        form: "material",
        values: {
          materialName: "",
        },
      };
    }

    return null;
  }

  private buildAssistantSummary(
    message: string,
    usedTools: string[],
    navigation: Record<string, unknown> | null,
    prefill: Record<string, unknown> | null,
  ): string {
    if (usedTools.length === 0) {
      return `已收到你的请求：“${message}”。当前没有匹配到可执行的只读工具，我可以继续基于现有报表、物料查询或库存查询工具协助你。`;
    }

    const parts = [`已完成 ${usedTools.join("、")} 的只读查询。`];
    if (navigation) {
      parts.push(`建议跳转到 ${String(navigation.label)} 页面继续查看。`);
    }
    if (prefill) {
      parts.push(`我还生成了 ${String(prefill.form)} 表单的预填命令。`);
    }

    return parts.join("");
  }

  private getToolDefinitions(): AiToolDefinition[] {
    return [
      {
        name: "reporting.home",
        description: "Read the reporting home dashboard metrics.",
        requiredPermissions: ["reporting:home:view"],
      },
      {
        name: "reporting.inventory-summary",
        description: "Read the inventory summary report.",
        requiredPermissions: ["reporting:inventory-summary:view"],
      },
      {
        name: "master-data.materials",
        description: "Search materials from master data.",
        requiredPermissions: ["master:material:list"],
      },
      {
        name: "inventory.balances",
        description: "Read inventory balance snapshots.",
        requiredPermissions: ["inventory:balance:list"],
      },
    ];
  }

  private hasAllPermissions(
    currentUser: SessionUserSnapshot,
    requiredPermissions: string[],
  ): boolean {
    return (
      currentUser.userId === 1 ||
      requiredPermissions.every((permission) =>
        currentUser.permissions.includes(permission),
      )
    );
  }

  private assertToolPermissions(
    currentUser: SessionUserSnapshot,
    requiredPermissions: string[],
  ): void {
    if (!this.hasAllPermissions(currentUser, requiredPermissions)) {
      throw new ForbiddenException("当前用户无权执行该 AI 工具");
    }
  }

  private extractKeyword(message: string): string | undefined {
    const matches = message.match(/[\u4e00-\u9fa5A-Za-z0-9_-]{2,}/g) ?? [];
    return matches.find(
      (item) =>
        !["库存", "物料", "首页", "看板", "统计", "查询", "报表"].includes(
          item,
        ),
    );
  }

  private toOptionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value : undefined;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  }

  private summarizeToolResult(result: unknown): string {
    const serialized = JSON.stringify(result);
    if (!serialized) {
      return "";
    }

    return serialized.length > 1500
      ? `${serialized.slice(0, 1500)}...[TRUNCATED]`
      : serialized;
  }
}
