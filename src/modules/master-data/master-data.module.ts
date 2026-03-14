import { Module } from "@nestjs/common";
import { MasterDataService } from "./application/master-data.service";
import { MasterDataController } from "./controllers/master-data.controller";
import { MasterDataRepository } from "./infrastructure/master-data.repository";

@Module({
  controllers: [MasterDataController],
  providers: [MasterDataService, MasterDataRepository],
  exports: [MasterDataService],
})
export class MasterDataModule {}
