import { Controller, Get, Query, StreamableFile } from "@nestjs/common";
import { SkipResponseEnvelope } from "../../../shared/common/interceptors/skip-response-envelope.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { AuditLog } from "../../audit-log/decorators/audit-log.decorator";
import { ReportingService } from "../application/reporting.service";
import {
  ExportReportDto,
  QueryInventorySummaryDto,
  QueryMaterialCategorySummaryDto,
  QueryTrendSeriesDto,
} from "../dto/query-reporting.dto";

@Controller("reporting")
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Permissions("reporting:home:view")
  @Get("home")
  async getHomeDashboard() {
    return this.reportingService.getHomeDashboard();
  }

  @Permissions("reporting:inventory-summary:view")
  @Get("inventory-summary")
  async getInventorySummary(@Query() query: QueryInventorySummaryDto) {
    return this.reportingService.getInventorySummary(query);
  }

  @Permissions("reporting:material-category-summary:view")
  @Get("material-category-summary")
  async getMaterialCategorySummary(
    @Query() query: QueryMaterialCategorySummaryDto,
  ) {
    return this.reportingService.getMaterialCategorySummary(query);
  }

  @Permissions("reporting:trends:view")
  @Get("trends")
  async getTrendSeries(@Query() query: QueryTrendSeriesDto) {
    return this.reportingService.getTrendSeries(query);
  }

  @Permissions("reporting:export")
  @AuditLog({ title: "导出报表", action: "EXPORT_REPORT" })
  @SkipResponseEnvelope()
  @Get("export")
  async exportReport(@Query() query: ExportReportDto) {
    const exportResult = await this.reportingService.exportReport(query);
    return new StreamableFile(Buffer.from(exportResult.content, "utf8"), {
      disposition: `attachment; filename="${exportResult.fileName}"`,
      type: exportResult.contentType,
    });
  }
}
