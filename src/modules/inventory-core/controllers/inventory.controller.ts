import { Controller, Get, Query } from "@nestjs/common";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { InventoryService } from "../application/inventory.service";
import {
  QueryInventoryBalancesDto,
  QueryInventoryLogsDto,
  QueryInventorySourceUsagesDto,
} from "../dto/query-inventory.dto";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Permissions("inventory:balance:list")
  @Get("balances")
  async listBalances(@Query() query: QueryInventoryBalancesDto) {
    return this.inventoryService.listBalances({
      materialId: query.materialId,
      workshopId: query.workshopId,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Permissions("inventory:log:list")
  @Get("logs")
  async listLogs(@Query() query: QueryInventoryLogsDto) {
    return this.inventoryService.listLogs({
      materialId: query.materialId,
      workshopId: query.workshopId,
      businessDocumentId: query.businessDocumentId,
      businessDocumentType: query.businessDocumentType,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Permissions("inventory:source-usage:list")
  @Get("source-usages")
  async listSourceUsages(@Query() query: QueryInventorySourceUsagesDto) {
    return this.inventoryService.listSourceUsages({
      materialId: query.materialId,
      consumerDocumentType: query.consumerDocumentType,
      consumerDocumentId: query.consumerDocumentId,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
