import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { WorkflowService } from "../application/workflow.service";
import { CreateAuditDocumentDto } from "../dto/create-audit-document.dto";
import { QueryAuditStatusDto } from "../dto/query-audit-status.dto";
import { QueryAuditsDto } from "../dto/query-audits.dto";
import { RejectAuditDto } from "../dto/reject-audit.dto";

@Controller("workflow")
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Permissions("workflow:audit:status")
  @Get("audits/status")
  async getAuditStatus(@Query() query: QueryAuditStatusDto) {
    return this.workflowService.getAuditStatus(
      query.documentType,
      query.documentId,
    );
  }

  @Permissions("workflow:audit:status")
  @Get("audits/document")
  async getAuditDocument(@Query() query: QueryAuditStatusDto) {
    return this.workflowService.getAuditDocument(
      query.documentType,
      query.documentId,
    );
  }

  @Permissions("workflow:audit:list")
  @Get("audits")
  async listAudits(@Query() query: QueryAuditsDto) {
    return this.workflowService.listAudits({
      documentFamily: query.documentFamily,
      auditStatus: query.auditStatus,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Permissions("workflow:audit:create")
  @Post("audits")
  async createAuditDocument(
    @Body() dto: CreateAuditDocumentDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.workflowService.createOrRefreshAuditDocument({
      documentFamily: dto.documentFamily,
      documentType: dto.documentType,
      documentId: dto.documentId,
      documentNumber: dto.documentNumber,
      submittedBy: dto.submittedBy ?? user?.userId?.toString(),
      createdBy: user?.userId?.toString(),
    });
  }

  @Permissions("workflow:audit:approve")
  @Post("audits/:id/approve")
  async approve(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.workflowService.approve(id, user?.userId?.toString());
  }

  @Permissions("workflow:audit:reject")
  @Post("audits/:id/reject")
  async reject(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RejectAuditDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.workflowService.reject(
      id,
      dto.rejectReason,
      user?.userId?.toString(),
    );
  }

  @Permissions("workflow:audit:reset")
  @Post("audits/:id/reset")
  async reset(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.workflowService.reset(id, user?.userId?.toString());
  }
}
