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
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { MasterDataService } from "../application/master-data.service";
import { CreateMaterialDto } from "../dto/create-material.dto";
import { QueryMasterDataDto } from "../dto/query-master-data.dto";
import { UpdateMaterialDto } from "../dto/update-material.dto";

@Controller("master-data")
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Permissions("master:material:list")
  @Get("materials")
  async listMaterials(@Query() query: QueryMasterDataDto) {
    return this.masterDataService.listMaterials(query);
  }

  @Permissions("master:material:list")
  @Get("materials/:id")
  async getMaterial(@Param("id", ParseIntPipe) id: number) {
    return this.masterDataService.getMaterialById(id);
  }

  @Permissions("master:material:create")
  @Post("materials")
  async createMaterial(
    @Body() dto: CreateMaterialDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.masterDataService.createMaterial(dto, user?.userId?.toString());
  }

  @Permissions("master:material:update")
  @Patch("materials/:id")
  async updateMaterial(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.masterDataService.updateMaterial(
      id,
      dto,
      user?.userId?.toString(),
    );
  }

  @Permissions("master:customer:list")
  @Get("customers")
  async listCustomers(@Query() query: QueryMasterDataDto) {
    return this.masterDataService.listCustomers(query);
  }

  @Permissions("master:supplier:list")
  @Get("suppliers")
  async listSuppliers(@Query() query: QueryMasterDataDto) {
    return this.masterDataService.listSuppliers(query);
  }

  @Permissions("master:personnel:list")
  @Get("personnel")
  async listPersonnel(@Query() query: QueryMasterDataDto) {
    return this.masterDataService.listPersonnel(query);
  }

  @Permissions("master:workshop:list")
  @Get("workshops")
  async listWorkshops(@Query() query: QueryMasterDataDto) {
    return this.masterDataService.listWorkshops(query);
  }
}
