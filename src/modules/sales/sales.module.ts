import { Module } from "@nestjs/common";
import { ApprovalModule } from "../approval/approval.module";
import { InventoryCoreModule } from "../inventory-core/inventory-core.module";
import { MasterDataModule } from "../master-data/master-data.module";
import { SalesProjectModule } from "../sales-project/sales-project.module";
import { SalesService } from "./application/sales.service";
import { SalesController } from "./controllers/sales.controller";
import { SalesRepository } from "./infrastructure/sales.repository";

@Module({
  imports: [
    MasterDataModule,
    InventoryCoreModule,
    ApprovalModule,
    SalesProjectModule,
  ],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService],
})
export class SalesModule {}
