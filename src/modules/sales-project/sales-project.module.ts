import { Module } from "@nestjs/common";
import { InventoryCoreModule } from "../inventory-core/inventory-core.module";
import { MasterDataModule } from "../master-data/master-data.module";
import { RbacModule } from "../rbac/rbac.module";
import { SalesProjectService } from "./application/sales-project.service";
import { SalesProjectController } from "./controllers/sales-project.controller";
import { SalesProjectRepository } from "./infrastructure/sales-project.repository";

@Module({
  imports: [MasterDataModule, InventoryCoreModule, RbacModule],
  controllers: [SalesProjectController],
  providers: [SalesProjectService, SalesProjectRepository],
  exports: [SalesProjectService],
})
export class SalesProjectModule {}
