import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { WorkshopScopeService } from "../../rbac/application/workshop-scope.service";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { SalesProjectService } from "../application/sales-project.service";
import { CreateSalesProjectDto } from "../dto/create-sales-project.dto";
import { CreateSalesProjectOutboundDraftDto } from "../dto/create-sales-project-outbound-draft.dto";
import { QuerySalesProjectDto } from "../dto/query-sales-project.dto";
import { UpdateSalesProjectDto } from "../dto/update-sales-project.dto";
import { VoidSalesProjectDto } from "../dto/void-sales-project.dto";

@Controller("sales-projects")
export class SalesProjectController {
  constructor(
    private readonly salesProjectService: SalesProjectService,
    private readonly workshopScopeService: WorkshopScopeService,
  ) {}

  @Permissions("sales:project:list")
  @Get()
  async listProjects(
    @Query() query: QuerySalesProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    await this.assertSalesProjectScope(user);
    const workshopId = await this.workshopScopeService.resolveQueryWorkshopId(
      user,
      query.workshopId,
    );
    return this.salesProjectService.listProjects({
      ...query,
      workshopId,
    });
  }

  @Permissions("sales:project:get")
  @Get(":id")
  async getProject(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.salesProjectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return project;
  }

  @Permissions("sales:project:create")
  @Post()
  async createProject(
    @Body() dto: CreateSalesProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    await this.assertSalesProjectScope(user);
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.salesProjectService.createProject(
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("sales:project:update")
  @Patch(":id")
  async updateProject(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSalesProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.salesProjectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.salesProjectService.updateProject(
      id,
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("sales:project:void")
  @Post(":id/void")
  async voidProject(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VoidSalesProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.salesProjectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.salesProjectService.voidProject(
      id,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }

  @Permissions("sales:project:get")
  @Get(":id/materials")
  async listMaterials(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.salesProjectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.salesProjectService.listMaterials(id);
  }

  @Permissions("sales:project:draft")
  @Post(":id/sales-outbound-draft")
  async createSalesOutboundDraft(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateSalesProjectOutboundDraftDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.salesProjectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.salesProjectService.createSalesOutboundDraft(id, dto);
  }

  private async assertSalesProjectScope(user?: SessionUserSnapshot) {
    const fixedScope =
      await this.workshopScopeService.getResolvedStockScope(user);
    if (fixedScope && fixedScope.stockScope !== "MAIN") {
      throw new ForbiddenException("销售项目仅支持主仓 MAIN");
    }
  }
}
