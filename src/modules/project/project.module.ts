import { Module } from "@nestjs/common";
import { InventoryCoreModule } from "../inventory-core/inventory-core.module";
import { MasterDataModule } from "../master-data/master-data.module";
import { RbacModule } from "../rbac/rbac.module";
import { RdSubwarehouseModule } from "../rd-subwarehouse/rd-subwarehouse.module";
import { ProjectService } from "./application/project.service";
import { ProjectMaterialActionService } from "./application/project-material-action.service";
import { ProjectController } from "./controllers/project.controller";
import { ProjectRepository } from "./infrastructure/project.repository";

@Module({
  imports: [
    MasterDataModule,
    InventoryCoreModule,
    RbacModule,
    RdSubwarehouseModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectMaterialActionService, ProjectRepository],
  exports: [ProjectService, ProjectMaterialActionService],
})
export class ProjectModule {}
