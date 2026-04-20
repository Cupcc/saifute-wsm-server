import { Module } from "@nestjs/common";
import { InventoryCoreModule } from "../inventory-core/inventory-core.module";
import { MasterDataModule } from "../master-data/master-data.module";
import { RbacModule } from "../rbac/rbac.module";
import { RdSubwarehouseModule } from "../rd-subwarehouse/rd-subwarehouse.module";
import { RdProjectService } from "./application/rd-project.service";
import { RdProjectMaterialActionService } from "./application/rd-project-material-action.service";
import { RdProjectController } from "./controllers/rd-project.controller";
import { RdProjectRepository } from "./infrastructure/rd-project.repository";

@Module({
  imports: [
    MasterDataModule,
    InventoryCoreModule,
    RbacModule,
    RdSubwarehouseModule,
  ],
  controllers: [RdProjectController],
  providers: [
    RdProjectService,
    RdProjectMaterialActionService,
    RdProjectRepository,
  ],
  exports: [RdProjectService, RdProjectMaterialActionService],
})
export class RdProjectModule {}
