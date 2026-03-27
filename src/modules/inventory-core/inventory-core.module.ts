import { Module } from "@nestjs/common";
import { MasterDataModule } from "../master-data/master-data.module";
import { RbacModule } from "../rbac/rbac.module";
import { InventoryService } from "./application/inventory.service";
import { InventoryController } from "./controllers/inventory.controller";
import { InventoryRepository } from "./infrastructure/inventory.repository";

@Module({
  imports: [MasterDataModule, RbacModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService],
})
export class InventoryCoreModule {}
