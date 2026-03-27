import { Module } from "@nestjs/common";
import { MasterDataModule } from "../master-data/master-data.module";
import { RbacService } from "./application/rbac.service";
import { WorkshopScopeService } from "./application/workshop-scope.service";
import { RbacController } from "./controllers/rbac.controller";
import { InMemoryRbacRepository } from "./infrastructure/in-memory-rbac.repository";

@Module({
  imports: [MasterDataModule],
  controllers: [RbacController],
  providers: [RbacService, WorkshopScopeService, InMemoryRbacRepository],
  exports: [RbacService, WorkshopScopeService],
})
export class RbacModule {}
