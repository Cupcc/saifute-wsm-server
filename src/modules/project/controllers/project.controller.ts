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
import { ProjectService } from "../application/project.service";
import { ProjectMaterialActionService } from "../application/project-material-action.service";
import { CreateProjectDto } from "../dto/create-project.dto";
import { CreateProjectMaterialActionDto } from "../dto/create-project-material-action.dto";
import { QueryProjectDto } from "../dto/query-project.dto";
import { UpdateProjectDto } from "../dto/update-project.dto";
import { VoidProjectDto } from "../dto/void-project.dto";
import { VoidProjectMaterialActionDto } from "../dto/void-project-material-action.dto";

@Controller("projects")
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectMaterialActionService: ProjectMaterialActionService,
    private readonly workshopScopeService: WorkshopScopeService,
  ) {}

  @Permissions("project:list")
  @Get()
  async listProjects(
    @Query() query: QueryProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    await this.assertProjectStockScope(user);
    const workshopId = await this.workshopScopeService.resolveQueryWorkshopId(
      user,
      query.workshopId,
    );
    const inventoryScope =
      await this.workshopScopeService.getResolvedStockScope(user);
    return this.projectService.listProjects({
      ...query,
      workshopId,
      stockScope: inventoryScope?.stockScope,
    });
  }

  @Permissions("project:get")
  @Get(":id")
  async getProject(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.projectService.getProjectById(id);
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

  @Permissions("project:create")
  @Post()
  async createProject(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    await this.assertProjectStockScope(user);
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.projectService.createProject(
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("project:update")
  @Patch(":id")
  async updateProject(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const existingProject = await this.projectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      existingProject.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      existingProject.stockScopeId,
    );
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.projectService.updateProject(
      id,
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("project:void")
  @Post(":id/void")
  async voidProject(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VoidProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.projectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.projectService.voidProject(
      id,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }

  @Permissions("project:get")
  @Get(":id/materials")
  async listMaterials(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.projectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.projectService.listMaterials(id);
  }

  @Permissions("project:get")
  @Get(":id/material-actions")
  async listMaterialActions(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.projectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.projectMaterialActionService.listMaterialActions(id);
  }

  @Permissions("project:get")
  @Get("material-actions/:actionId")
  async getMaterialAction(
    @Param("actionId", ParseIntPipe) actionId: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const action =
      await this.projectMaterialActionService.getMaterialActionById(actionId);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      action.project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      action.project.stockScopeId,
    );
    return action;
  }

  @Permissions("project:create")
  @Post(":id/material-actions")
  async createMaterialAction(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateProjectMaterialActionDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.projectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.projectMaterialActionService.createMaterialAction(
      id,
      dto,
      user?.userId?.toString(),
    );
  }

  @Permissions("project:void")
  @Post("material-actions/:actionId/void")
  async voidMaterialAction(
    @Param("actionId", ParseIntPipe) actionId: number,
    @Body() dto: VoidProjectMaterialActionDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const action =
      await this.projectMaterialActionService.getMaterialActionById(actionId);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      action.project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      action.project.stockScopeId,
    );
    return this.projectMaterialActionService.voidMaterialAction(
      actionId,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }

  private async assertProjectStockScope(user?: SessionUserSnapshot) {
    const fixedScope =
      await this.workshopScopeService.getResolvedStockScope(user);
    if (fixedScope && fixedScope.stockScope !== "RD_SUB") {
      throw new ForbiddenException("项目管理仅支持研发小仓 RD_SUB");
    }
  }
}
