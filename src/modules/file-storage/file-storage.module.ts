import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { FileStorageService } from "./application/file-storage.service";
import { FileStorageController } from "./controllers/file-storage.controller";

@Module({
  imports: [RbacModule],
  controllers: [FileStorageController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
