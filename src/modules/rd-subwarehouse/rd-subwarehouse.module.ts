import { Module } from "@nestjs/common";
import { InventoryCoreModule } from "../inventory-core/inventory-core.module";
import { MasterDataModule } from "../master-data/master-data.module";
import { RbacModule } from "../rbac/rbac.module";
import { RdHandoffService } from "./application/rd-handoff.service";
import { RdHandoffController } from "./controllers/rd-handoff.controller";
import { RdHandoffRepository } from "./infrastructure/rd-handoff.repository";

@Module({
  imports: [MasterDataModule, InventoryCoreModule, RbacModule],
  controllers: [RdHandoffController],
  providers: [RdHandoffService, RdHandoffRepository],
  exports: [RdHandoffService],
})
export class RdSubwarehouseModule {}
