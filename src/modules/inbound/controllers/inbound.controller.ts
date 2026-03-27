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
import { CreateInboundOrderDto } from "../dto/create-inbound-order.dto";
import { QueryInboundOrderDto } from "../dto/query-inbound-order.dto";
import { UpdateInboundOrderDto } from "../dto/update-inbound-order.dto";
import { VoidInboundOrderDto } from "../dto/void-inbound-order.dto";

@Controller("inbound")
export class InboundController {
  constructor(
    private readonly inboundService: InboundService,
    private readonly workshopScopeService: WorkshopScopeService,
  ) {}

  @Permissions("inbound:order:list")
  @Get("orders")
  async listOrders(
    @Query() query: QueryInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const workshopId = await this.workshopScopeService.resolveQueryWorkshopId(
      user,
      query.workshopId,
    );
    return this.inboundService.listOrders({
      ...query,
      workshopId,
    });
  }

  @Permissions("inbound:order:list")
  @Get("orders/:id")
  async getOrder(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      order.workshopId,
    );
    return order;
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

  @Permissions("inbound:order:update")
  @Patch("orders/:id")
  async updateOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      order.workshopId,
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
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      order.workshopId,
    );
    return this.inboundService.voidOrder(
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
    const workshopId = await this.workshopScopeService.resolveQueryWorkshopId(
      user,
      query.workshopId,
    );
    return this.inboundService.listIntoOrders({
      ...query,
      workshopId,
    });
  }

  @Permissions("inbound:into-order:list")
  @Get("into-orders/:id")
  async getIntoOrder(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      order.workshopId,
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
    const order = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      order.workshopId,
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

  @Permissions("inbound:into-order:void")
  @Post("into-orders/:id/void")
  async voidIntoOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VoidInboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    const order = await this.inboundService.getOrderById(id);
    await this.workshopScopeService.assertWorkshopAccess(
      user,
      order.workshopId,
    );
    return this.inboundService.voidOrder(
      id,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }
}
