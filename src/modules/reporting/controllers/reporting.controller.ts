import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  StreamableFile,
  UnauthorizedException,
} from "@nestjs/common";
import { SkipResponseEnvelope } from "../../../shared/common/interceptors/skip-response-envelope.decorator";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { AuditLog } from "../../audit-log/decorators/audit-log.decorator";
import { WorkshopScopeService } from "../../rbac/application/workshop-scope.service";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { ReportingService } from "../application/reporting.service";
import {
  ExportReportDto,
  QueryInventorySummaryDto,
  QueryMaterialCategorySummaryDto,
  QueryTrendSeriesDto,
} from "../dto/query-reporting.dto";

const WAREHOUSE_MANAGER_ROLE = "warehouse-manager";

@Controller("reporting")
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly workshopScopeService: WorkshopScopeService,
  ) {}

  @Get("home")
  async getHomeDashboard(@CurrentUser() user?: SessionUserSnapshot) {
    this.assertReportingAccess(user, {
      permissions: ["reporting:home:view"],
      roles: [WAREHOUSE_MANAGER_ROLE],
    });
    const inventoryScope =
      await this.workshopScopeService.getResolvedStockScope(user);
    return this.reportingService.getHomeDashboard(inventoryScope?.stockScope);
  }

  @Permissions("reporting:inventory-summary:view")
  @Get("inventory-summary")
  async getInventorySummary(
    @Query() query: QueryInventorySummaryDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    return this.reportingService.getInventorySummary({
      ...query,
      stockScope: inventoryScope?.stockScope,
    });
  }

  @Get("material-category-summary")
  async getMaterialCategorySummary(
    @Query() query: QueryMaterialCategorySummaryDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    this.assertReportingAccess(user, {
      permissions: ["reporting:material-category-summary:view"],
      roles: [WAREHOUSE_MANAGER_ROLE],
    });
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    return this.reportingService.getMaterialCategorySummary({
      ...query,
      stockScope: inventoryScope?.stockScope,
    });
  }

  @Get("trends")
  async getTrendSeries(
    @Query() query: QueryTrendSeriesDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    this.assertReportingAccess(user, {
      permissions: ["reporting:trends:view"],
      roles: [WAREHOUSE_MANAGER_ROLE],
    });
    const inventoryScope =
      await this.workshopScopeService.getResolvedStockScope(user);
    return this.reportingService.getTrendSeries(
      query,
      inventoryScope?.stockScope,
    );
  }

  @Permissions("reporting:export")
  @AuditLog({ title: "导出报表", action: "EXPORT_REPORT" })
  @SkipResponseEnvelope()
  @Get("export")
  async exportReport(
    @Query() query: ExportReportDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    const exportResult = await this.reportingService.exportReport(
      {
        ...query,
      },
      inventoryScope?.stockScope,
    );
    return new StreamableFile(Buffer.from(exportResult.content, "utf8"), {
      disposition: `attachment; filename="${exportResult.fileName}"`,
      type: exportResult.contentType,
    });
  }

  private assertReportingAccess(
    user: SessionUserSnapshot | undefined,
    options: {
      permissions?: string[];
      roles?: string[];
    },
  ) {
    if (!user) {
      throw new UnauthorizedException("当前请求未携带用户上下文");
    }
    if (user.userId === 1) {
      return;
    }

    const hasPermission =
      options.permissions?.some((permission) =>
        user.permissions.includes(permission),
      ) ?? false;
    const hasRole =
      options.roles?.some((role) => user.roles.includes(role)) ?? false;

    if (hasPermission || hasRole) {
      return;
    }

    throw new ForbiddenException("当前用户缺少所需权限");
  }
}
