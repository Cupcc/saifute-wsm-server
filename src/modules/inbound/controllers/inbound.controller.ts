import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Permissions } from "../../../shared/decorators/permissions.decorator";
import { WorkshopScopeService } from "../../rbac/application/workshop-scope.service";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { InboundService } from "../application/inbound.service";
import { InboundSupplierReturnService } from "../application/inbound-supplier-return.service";
import { StockInPriceCorrectionService } from "../application/stock-in-price-correction.service";
import { CreateInboundOrderDto } from "../dto/create-inbound-order.dto";
import { CreateStockInPriceCorrectionOrderDto } from "../dto/create-stock-in-price-correction-order.dto";
import { CreateSupplierReturnDto } from "../dto/create-supplier-return.dto";
import { QueryInboundOrderDto } from "../dto/query-inbound-order.dto";
import { QueryStockInPriceCorrectionOrderDto } from "../dto/query-stock-in-price-correction-order.dto";
import { UpdateInboundOrderDto } from "../dto/update-inbound-order.dto";
import { VoidInboundOrderDto } from "../dto/void-inbound-order.dto";

@Controller("inbound")
export class InboundController {
  constructor(
    private readonly inboundService: InboundService,
    private readonly inboundSupplierReturnService: InboundSupplierReturnService,
    private readonly stockInPriceCorrectionService: StockInPriceCorrectionService,
    private readonly workshopScopeService: WorkshopScopeService,
  ) {}

  @Permissions("inbound:price-correction-order:list")
  @Get("price-correction-orders")
  async listPriceCorrectionOrders(
    @Query() query: QueryStockInPriceCorrectionOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    return this.stockInPriceCorrectionService.listOrders({
      ...query,
      stockScopeId: inventoryScope?.stockScopeId,
    });
  }

  @Permissions("inbound:price-correction-order:list")
  @Get("price-correction-orders/:id")
  async getPriceCorrectionOrder(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.stockInPriceCorrectionService.getOrderById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      order.stockScopeId,
    );
    return order;
  }

  @Permissions("inbound:price-correction-order:create")
  @Post("price-correction-orders")
  async createPriceCorrectionOrder(
    @Body() dto: CreateStockInPriceCorrectionOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.stockInPriceCorrectionService.createOrder(
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("inbound:order:list")
  @Get("orders")
  async listOrders(
    @Query() query: QueryInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    return this.inboundService.listOrders({
      ...query,
      stockScopeId: inventoryScope?.stockScopeId,
    });
  }

  @Permissions("inbound:order:list")
  @Get("orders/details")
  async listOrderLines(
    @Query() query: QueryInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    return this.inboundService.listOrderLines({
      ...query,
      stockScopeId: inventoryScope?.stockScopeId,
    });
  }

  @Permissions("inbound:order:list")
  @Get("supplier-returns")
  async listSupplierReturns(
    @Query() query: QueryInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    return this.inboundSupplierReturnService.listSupplierReturns({
      ...query,
      stockScopeId: inventoryScope?.stockScopeId,
    });
  }

  @Permissions("inbound:order:list")
  @Get("supplier-returns/details")
  async listSupplierReturnLines(
    @Query() query: QueryInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    return this.inboundSupplierReturnService.listSupplierReturnLines({
      ...query,
      stockScopeId: inventoryScope?.stockScopeId,
    });
  }

  @Permissions("inbound:order:list")
  @Get("supplier-returns/:id")
  async getSupplierReturn(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order =
      await this.inboundSupplierReturnService.getSupplierReturnById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      order.stockScopeId,
    );
    return order;
  }

  @Permissions("inbound:order:list")
  @Get("orders/:id")
  async getOrder(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      order.stockScopeId,
    );
    return order;
  }

  @Permissions("inbound:order:create")
  @Get("orders/:id/supplier-return-preview")
  async getSupplierReturnPreview(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const sourceOrder = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      sourceOrder.stockScopeId,
    );
    return this.inboundSupplierReturnService.getSupplierReturnPreview(id);
  }

  @Permissions("inbound:order:create")
  @Post("orders")
  async createOrder(
    @Body() dto: CreateInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.inboundService.createOrder(scopedDto, user?.userId?.toString());
  }

  @Permissions("inbound:order:create")
  @Post("orders/:id/supplier-return")
  async createSupplierReturn(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateSupplierReturnDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const sourceOrder = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      sourceOrder.stockScopeId,
    );
    return this.inboundSupplierReturnService.createSupplierReturn(
      id,
      dto,
      user?.userId?.toString(),
    );
  }

  @Permissions("inbound:order:update")
  @Patch("orders/:id")
  async updateOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      order.stockScopeId,
    );
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.inboundService.updateOrder(
      id,
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("inbound:order:void")
  @Post("orders/:id/void")
  async voidOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VoidInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      order.stockScopeId,
    );
    return this.inboundService.voidOrder(
      id,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }

  @Permissions("inbound:order:void")
  @Post("supplier-returns/:id/void")
  async voidSupplierReturn(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VoidInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order =
      await this.inboundSupplierReturnService.getSupplierReturnById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      order.stockScopeId,
    );
    return this.inboundSupplierReturnService.voidSupplierReturn(
      id,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }

  @Permissions("inbound:into-order:list")
  @Get("into-orders")
  async listIntoOrders(
    @Query() query: QueryInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    return this.inboundService.listIntoOrders({
      ...query,
      stockScopeId: inventoryScope?.stockScopeId,
    });
  }

  @Permissions("inbound:into-order:list")
  @Get("into-orders/details")
  async listIntoOrderLines(
    @Query() query: QueryInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const inventoryScope =
      await this.workshopScopeService.resolveInventoryQueryScope(
        user,
        query.workshopId,
      );
    return this.inboundService.listIntoOrderLines({
      ...query,
      stockScopeId: inventoryScope?.stockScopeId,
    });
  }

  @Permissions("inbound:into-order:list")
  @Get("into-orders/:id")
  async getIntoOrder(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getIntoOrderById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      order.stockScopeId,
    );
    return order;
  }

  @Permissions("inbound:into-order:create")
  @Post("into-orders")
  async createIntoOrder(
    @Body() dto: CreateInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.inboundService.createIntoOrder(
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("inbound:into-order:update")
  @Patch("into-orders/:id")
  async updateIntoOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getIntoOrderById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      order.stockScopeId,
    );
    const scopedDto = await this.workshopScopeService.applyFixedWorkshopScope(
      user,
      dto,
    );
    return this.inboundService.updateIntoOrder(
      id,
      scopedDto,
      user?.userId?.toString(),
    );
  }

  @Permissions("inbound:into-order:void")
  @Post("into-orders/:id/void")
  async voidIntoOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VoidInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getIntoOrderById(id);
    await this.workshopScopeService.assertInventoryStockScopeAccess(
      user,
      order.stockScopeId,
    );
    return this.inboundService.voidIntoOrder(
      id,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }
}
