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
import { WorkshopScopeService } from "../../rbac/application/workshop-scope.service";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { ProjectService } from "../application/project.service";
import { CreateProjectDto } from "../dto/create-project.dto";
import { QueryProjectDto } from "../dto/query-project.dto";
import { UpdateProjectDto } from "../dto/update-project.dto";
import { VoidProjectDto } from "../dto/void-project.dto";

@Controller("projects")
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly workshopScopeService: WorkshopScopeService,
  ) {}

  @Permissions("project:list")
  @Get()
  async listProjects(
    @Query() query: QueryProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const workshopId = await this.workshopScopeService.resolveQueryWorkshopId(
      user,
      query.workshopId,
    );
    return this.projectService.listProjects({
      ...query,
      workshopId,
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
    return project;
  }

  @Permissions("project:create")
  @Post()
  async createProject(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
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
    return this.projectService.listMaterials(id);
  }
}
