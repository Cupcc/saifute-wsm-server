import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { InventoryCoreModule } from "../inventory-core/inventory-core.module";
import { MasterDataModule } from "../master-data/master-data.module";
import { ReportingModule } from "../reporting/reporting.module";
import { AiAssistantService } from "./application/ai-assistant.service";
import { AiAssistantController } from "./controllers/ai-assistant.controller";
import { OpenAiCompatibleAiProvider } from "./infrastructure/openai-compatible-ai.provider";

@Module({
  imports: [
    AuditLogModule,
    ReportingModule,
    InventoryCoreModule,
    MasterDataModule,
  ],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, OpenAiCompatibleAiProvider],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}
