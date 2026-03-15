import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../../../shared/config/app-config.service";

export interface AiProviderPrompt {
  message: string;
  usedTools: string[];
  toolResults: Array<{
    name: string;
    summary: string;
  }>;
  navigationPath?: string | null;
  prefillForm?: string | null;
}

@Injectable()
export class OpenAiCompatibleAiProvider {
  private readonly logger = new Logger(OpenAiCompatibleAiProvider.name);

  constructor(private readonly appConfigService: AppConfigService) {}

  get providerLabel(): string {
    return this.appConfigService.aiAssistantModel;
  }

  async generateSummary(prompt: AiProviderPrompt): Promise<string | null> {
    if (!this.appConfigService.aiAssistantApiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.appConfigService.aiAssistantBaseUrl.replace(/\/+$/g, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.appConfigService.aiAssistantApiKey}`,
          },
          body: JSON.stringify({
            model: this.appConfigService.aiAssistantModel,
            temperature: 0.2,
            max_tokens: 200,
            messages: [
              {
                role: "system",
                content:
                  "你是一个仓储系统的只读 AI 助手。请基于工具执行结果，给出简洁中文总结，不要编造未查询到的数据，不要建议直接写业务数据。",
              },
              {
                role: "user",
                content: JSON.stringify(prompt),
              },
            ],
          }),
          signal: AbortSignal.timeout(
            this.appConfigService.aiAssistantTimeoutMs,
          ),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `AI provider returned ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      };

      const content = payload.choices?.[0]?.message?.content?.trim();
      return content || null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown provider error";
      this.logger.warn(`AI provider request failed: ${message}`);
      return null;
    }
  }
}
