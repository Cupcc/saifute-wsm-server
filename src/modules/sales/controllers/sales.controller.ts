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
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { SalesService } from "../application/sales.service";
import { CreateOutboundOrderDto } from "../dto/create-outbound-order.dto";
import { CreateSalesReturnDto } from "../dto/create-sales-return.dto";
import { QueryOutboundOrderDto } from "../dto/query-outbound-order.dto";
import { QuerySalesReturnDto } from "../dto/query-sales-return.dto";
import { UpdateOutboundOrderDto } from "../dto/update-outbound-order.dto";
import { VoidOutboundOrderDto } from "../dto/void-outbound-order.dto";
import { VoidSalesReturnDto } from "../dto/void-sales-return.dto";

@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Permissions("sales:order:list")
  @Get("orders")
  async listOrders(@Query() query: QueryOutboundOrderDto) {
    return this.salesService.listOrders(query);
  }

  @Permissions("sales:order:list")
  @Get("orders/:id")
  async getOrder(@Param("id", ParseIntPipe) id: number) {
    return this.salesService.getOrderById(id);
  }

  @Permissions("sales:order:create")
  @Post("orders")
  async createOrder(
    @Body() dto: CreateOutboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.salesService.createOrder(dto, user?.userId?.toString());
  }

  @Permissions("sales:order:update")
  @Patch("orders/:id")
  async updateOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOutboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.salesService.updateOrder(id, dto, user?.userId?.toString());
  }

  @Permissions("sales:order:void")
  @Post("orders/:id/void")
  async voidOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VoidOutboundOrderDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.salesService.voidOrder(
      id,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }

  @Permissions("sales:return:list")
  @Get("sales-returns")
  async listSalesReturns(@Query() query: QuerySalesReturnDto) {
    return this.salesService.listSalesReturns(query);
  }

  @Permissions("sales:return:list")
  @Get("sales-returns/:id")
  async getSalesReturn(@Param("id", ParseIntPipe) id: number) {
    return this.salesService.getSalesReturnById(id);
  }

  @Permissions("sales:return:create")
  @Post("sales-returns")
  async createSalesReturn(
    @Body() dto: CreateSalesReturnDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.salesService.createSalesReturn(dto, user?.userId?.toString());
  }

  @Permissions("sales:return:void")
  @Post("sales-returns/:id/void")
  async voidSalesReturn(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VoidSalesReturnDto,
    @CurrentUser() user?: SessionUserSnapshot,
  ) {
    return this.salesService.voidSalesReturn(
      id,
      dto.voidReason,
      user?.userId?.toString(),
    );
  }
}
