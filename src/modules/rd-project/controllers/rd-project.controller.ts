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
import { RdProjectService } from "../application/rd-project.service";
import { RdProjectMaterialActionService } from "../application/rd-project-material-action.service";
import { CreateRdProjectDto } from "../dto/create-rd-project.dto";
import { CreateRdProjectMaterialActionDto } from "../dto/create-rd-project-material-action.dto";
import { QueryRdProjectDto } from "../dto/query-rd-project.dto";
import { UpdateRdProjectDto } from "../dto/update-rd-project.dto";
import { VoidRdProjectDto } from "../dto/void-rd-project.dto";
import { VoidRdProjectMaterialActionDto } from "../dto/void-rd-project-material-action.dto";

@Controller("rd-projects")
export class RdProjectController {
  constructor(
    private readonly rdProjectService: RdProjectService,
    private readonly rdProjectMaterialActionService: RdProjectMaterialActionService,
    private readonly workshopScopeService: WorkshopScopeService,
  ) {}

  @Permissions("rd:project:list")
  @Get()
  async listProjects(
    @Query() query: QueryRdProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    await this.assertRdProjectScope(user);
    const workshopId = await this.workshopScopeService.resolveQueryWorkshopId(
      user,
      query.workshopId,
    );
    const inventoryScope =
      await this.workshopScopeService.getResolvedStockScope(user);
    return this.rdProjectService.listProjects({
      ...query,
      workshopId,
      stockScope: inventoryScope?.stockScope,
    });
  }

  @Permissions("rd:project:get")
  @Get(":id")
  async getProject(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.rdProjectService.getProjectById(id);
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

  @Permissions("rd:project:create")
  @Post()
  async createProject(
    @Body() dto: CreateRdProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    await this.assertRdProjectScope(user);
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.rdProjectService.createProject(
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("rd:project:update")
  @Patch(":id")
  async updateProject(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateRdProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const existingProject = await this.rdProjectService.getProjectById(id);
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
    return this.rdProjectService.updateProject(
      id,
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("rd:project:void")
  @Post(":id/void")
  async voidProject(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VoidRdProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.rdProjectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.rdProjectService.voidProject(
      id,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }

  @Permissions("rd:project:get")
  @Get(":id/materials")
  async listMaterials(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.rdProjectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.rdProjectService.listMaterials(id);
  }

  @Permissions("rd:project:get")
  @Get(":id/material-actions")
  async listMaterialActions(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.rdProjectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.rdProjectMaterialActionService.listMaterialActions(id);
  }

  @Permissions("rd:project:get")
  @Get("material-actions/:actionId")
  async getMaterialAction(
    @Param("actionId", ParseIntPipe) actionId: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const action =
      await this.rdProjectMaterialActionService.getMaterialActionById(actionId);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      action.rdProject.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      action.rdProject.stockScopeId,
    );
    return action;
  }

  @Permissions("rd:project:create")
  @Post(":id/material-actions")
  async createMaterialAction(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateRdProjectMaterialActionDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const project = await this.rdProjectService.getProjectById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      project.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      project.stockScopeId,
    );
    return this.rdProjectMaterialActionService.createMaterialAction(
      id,
      dto,
      user?.userId?.toString(),
    );
  }

  @Permissions("rd:project:void")
  @Post("material-actions/:actionId/void")
  async voidMaterialAction(
    @Param("actionId", ParseIntPipe) actionId: number,
    @Body() dto: VoidRdProjectMaterialActionDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const action =
      await this.rdProjectMaterialActionService.getMaterialActionById(actionId);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      action.rdProject.workshopId,
    );
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      action.rdProject.stockScopeId,
    );
    return this.rdProjectMaterialActionService.voidMaterialAction(
      actionId,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }

  private async assertRdProjectScope(user?: SessionUserSnapshot) {
    const fixedScope =
      await this.workshopScopeService.getResolvedStockScope(user);
    if (fixedScope && fixedScope.stockScope !== "RD_SUB") {
      throw new ForbiddenException("研发项目仅支持研发小仓 RD_SUB");
    }
  }
}
