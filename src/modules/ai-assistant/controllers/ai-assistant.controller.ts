import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { OperLogStatus } from "../../../../generated/prisma/client";
import { SkipResponseEnvelope } from "../../../shared/common/interceptors/skip-response-envelope.decorator";
import { resolveRequestIp } from "../../../shared/common/request-ip.util";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { AuditLogService } from "../../audit-log/application/audit-log.service";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import {
  AiAssistantService,
  type AiStreamEvent,
} from "../application/ai-assistant.service";
import { AiChatDto } from "../dto/ai-chat.dto";

type AiRequest = Request & {
  user?: SessionUserSnapshot;
};

@Controller("ai")
export class AiAssistantController {
  constructor(
    private readonly aiAssistantService: AiAssistantService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Permissions("ai:tools:list")
  @Get("tools")
  async listTools(@CurrentUser() currentUser: SessionUserSnapshot) {
    return {
      items: this.aiAssistantService.listTools(currentUser),
    };
  }

  @Permissions("ai:chat")
  @SkipResponseEnvelope()
  @HttpCode(200)
  @Post("chat")
  async chat(
    @Body() dto: AiChatDto,
    @CurrentUser() currentUser: SessionUserSnapshot,
    @Req() request: AiRequest,
    @Headers("user-agent") userAgent: string | undefined,
    @Res() response: Response,
  ) {
    const startedAt = Date.now();

    try {
      const result = await this.aiAssistantService.buildChatStream(
        currentUser,
        dto,
      );

      response.status(200);
      response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("Connection", "keep-alive");

      for (const event of result.events) {
        response.write(this.formatSseEvent(event));
      }
      response.end();

      await this.auditLogService.recordOperationLog({
        title: "AI 对话",
        action: "AI_CHAT",
        method: request.method,
        path: request.originalUrl || request.url,
        operatorId: currentUser.userId,
        operatorName: currentUser.username,
        ip: resolveRequestIp(request),
        userAgent,
        result: OperLogStatus.SUCCESS,
        durationMs: Date.now() - startedAt,
        requestData: {
          messageLength: dto.message.length,
          requestedToolNames: dto.toolNames ?? [],
        },
        responseData: {
          eventCount: result.events.length,
          usedTools: result.usedTools,
        },
      });
    } catch (error) {
      await this.auditLogService.recordOperationLog({
        title: "AI 对话",
        action: "AI_CHAT",
        method: request.method,
        path: request.originalUrl || request.url,
        operatorId: currentUser.userId,
        operatorName: currentUser.username,
        ip: resolveRequestIp(request),
        userAgent,
        result: OperLogStatus.FAILURE,
        durationMs: Date.now() - startedAt,
        requestData: {
          messageLength: dto.message.length,
          requestedToolNames: dto.toolNames ?? [],
        },
        errorMessage:
          error instanceof Error ? error.message : "unknown ai chat error",
      });
      throw error;
    }
  }

  private formatSseEvent(event: AiStreamEvent): string {
    return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
  }
}
