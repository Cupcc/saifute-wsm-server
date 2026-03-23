import { Injectable } from "@nestjs/common";
import {
  CustomerStockOrderType,
  DocumentFamily,
  DocumentRelationType,
  Prisma,
} from "../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";

const DOCUMENT_TYPE = "CustomerStockOrder";
type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(db?: DbClient) {
    return db ?? this.prisma;
  }

  async findOrders(
    params: {
      documentNo?: string;
      orderType?: CustomerStockOrderType;
      bizDateFrom?: Date;
      bizDateTo?: Date;
      customerId?: number;
      workshopId?: number;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where: Prisma.CustomerStockOrderWhereInput = {
      orderType: CustomerStockOrderType.OUTBOUND,
      lifecycleStatus: "EFFECTIVE",
    };
    if (params.documentNo) {
      where.documentNo = { contains: params.documentNo };
    }
    if (params.orderType) {
      where.orderType = params.orderType;
    }
    if (params.bizDateFrom || params.bizDateTo) {
      where.bizDate = {};
      if (params.bizDateFrom) {
        where.bizDate.gte = params.bizDateFrom;
      }
      if (params.bizDateTo) {
        where.bizDate.lte = params.bizDateTo;
      }
    }
    if (params.customerId) {
      where.customerId = params.customerId;
    }
    if (params.workshopId) {
      where.workshopId = params.workshopId;
    }

    const client = this.db(db);
    const [items, total] = await Promise.all([
      client.customerStockOrder.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { bizDate: "desc" },
        include: { lines: { orderBy: { lineNo: "asc" } } },
      }),
      client.customerStockOrder.count({ where }),
    ]);

    return { items, total };
  }

  async findSalesReturns(
    params: {
      documentNo?: string;
      bizDateFrom?: Date;
      bizDateTo?: Date;
      customerId?: number;
      sourceOutboundOrderId?: number;
      workshopId?: number;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where: Prisma.CustomerStockOrderWhereInput = {
      orderType: CustomerStockOrderType.SALES_RETURN,
      lifecycleStatus: "EFFECTIVE",
    };
    if (params.documentNo) {
      where.documentNo = { contains: params.documentNo };
    }
    if (params.bizDateFrom || params.bizDateTo) {
      where.bizDate = {};
      if (params.bizDateFrom) {
        where.bizDate.gte = params.bizDateFrom;
      }
      if (params.bizDateTo) {
        where.bizDate.lte = params.bizDateTo;
      }
    }
    if (params.customerId) {
      where.customerId = params.customerId;
    }
    if (params.workshopId) {
      where.workshopId = params.workshopId;
    }
    if (params.sourceOutboundOrderId) {
      const relations = await this.db(db).documentRelation.findMany({
        where: {
          relationType: DocumentRelationType.SALES_RETURN_FROM_OUTBOUND,
          upstreamFamily: DocumentFamily.CUSTOMER_STOCK,
          upstreamDocumentType: DOCUMENT_TYPE,
          upstreamDocumentId: params.sourceOutboundOrderId,
          isActive: true,
        },
        select: { downstreamDocumentId: true },
      });
      const downstreamIds = relations.map((r) => r.downstreamDocumentId);
      if (downstreamIds.length === 0) {
        where.id = -1;
      } else {
        where.id = { in: downstreamIds };
      }
    }

    const client = this.db(db);
    const [items, total] = await Promise.all([
      client.customerStockOrder.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { bizDate: "desc" },
        include: { lines: { orderBy: { lineNo: "asc" } } },
      }),
      client.customerStockOrder.count({ where }),
    ]);

    return { items, total };
  }

  async findOrderById(id: number, db?: DbClient) {
    return this.db(db).customerStockOrder.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: "asc" } } },
    });
  }

  async findOrderByDocumentNo(documentNo: string, db?: DbClient) {
    return this.db(db).customerStockOrder.findUnique({
      where: { documentNo },
      include: { lines: true },
    });
  }

  async createOrder(
    data: Prisma.CustomerStockOrderUncheckedCreateInput,
    lines: Omit<Prisma.CustomerStockOrderLineUncheckedCreateInput, "orderId">[],
    db?: DbClient,
  ) {
    const client = this.db(db);
    const order = await client.customerStockOrder.create({
      data,
    });
    const linesWithOrderId = lines.map((l) => ({ ...l, orderId: order.id }));
    await client.customerStockOrderLine.createMany({ data: linesWithOrderId });
    const result = await client.customerStockOrder.findUnique({
      where: { id: order.id },
      include: { lines: { orderBy: { lineNo: "asc" } } },
    });
    if (!result) throw new Error("Order creation failed");
    return result;
  }

  async updateOrder(
    id: number,
    data: Prisma.CustomerStockOrderUncheckedUpdateInput,
    db?: DbClient,
  ) {
    return this.db(db).customerStockOrder.update({
      where: { id },
      data,
      include: { lines: { orderBy: { lineNo: "asc" } } },
    });
  }

  async createOrderLine(
    data: Prisma.CustomerStockOrderLineUncheckedCreateInput,
    db?: DbClient,
  ) {
    return this.db(db).customerStockOrderLine.create({
      data,
    });
  }

  async updateOrderLine(
    id: number,
    data: Prisma.CustomerStockOrderLineUncheckedUpdateInput,
    db?: DbClient,
  ) {
    return this.db(db).customerStockOrderLine.update({
      where: { id },
      data,
    });
  }

  async deleteOrderLine(id: number, db?: DbClient) {
    return this.db(db).customerStockOrderLine.delete({
      where: { id },
    });
  }

  async hasActiveDownstreamSalesReturns(
    outboundOrderId: number,
    db?: DbClient,
  ) {
    const client = this.db(db);
    const relations = await client.documentRelation.findMany({
      where: {
        relationType: DocumentRelationType.SALES_RETURN_FROM_OUTBOUND,
        upstreamFamily: DocumentFamily.CUSTOMER_STOCK,
        upstreamDocumentType: DOCUMENT_TYPE,
        upstreamDocumentId: outboundOrderId,
        isActive: true,
      },
    });

    if (relations.length === 0) return false;

    const downstreamIds = relations.map((r) => r.downstreamDocumentId);
    const effectiveCount = await client.customerStockOrder.count({
      where: {
        id: { in: downstreamIds },
        lifecycleStatus: "EFFECTIVE",
      },
    });
    return effectiveCount > 0;
  }

  async createDocumentRelation(
    data: Prisma.DocumentRelationUncheckedCreateInput,
    db?: DbClient,
  ) {
    return this.db(db).documentRelation.create({ data });
  }

  async createDocumentLineRelation(
    data: Prisma.DocumentLineRelationUncheckedCreateInput,
    db?: DbClient,
  ) {
    return this.db(db).documentLineRelation.create({ data });
  }

  async deactivateDocumentRelationsForOrder(
    documentId: number,
    documentType: string,
    db?: DbClient,
  ) {
    return this.db(db).documentRelation.updateMany({
      where: {
        downstreamDocumentType: documentType,
        downstreamDocumentId: documentId,
        isActive: true,
      },
      data: { isActive: false },
    });
  }

  /**
   * Returns a map of sourceOutboundLineId → sum of linkedQty across all active
   * (non-voided) downstream sales-return line relations for the given outbound order.
   * Used to enforce cumulative return-quantity limits before creating a new sales return.
   */
  async sumActiveReturnedQtyByOutboundLine(
    outboundOrderId: number,
    db?: DbClient,
  ): Promise<Map<number, Prisma.Decimal>> {
    const client = this.db(db);
    const lineRelations = await client.documentLineRelation.findMany({
      where: {
        relationType: DocumentRelationType.SALES_RETURN_FROM_OUTBOUND,
        upstreamFamily: DocumentFamily.CUSTOMER_STOCK,
        upstreamDocumentType: DOCUMENT_TYPE,
        upstreamDocumentId: outboundOrderId,
      },
      select: {
        upstreamLineId: true,
        downstreamDocumentId: true,
        linkedQty: true,
      },
    });

    if (lineRelations.length === 0) return new Map();

    const downstreamIds = [
      ...new Set(lineRelations.map((r) => r.downstreamDocumentId)),
    ];
    const voidedOrders = await client.customerStockOrder.findMany({
      where: { id: { in: downstreamIds }, lifecycleStatus: "VOIDED" },
      select: { id: true },
    });
    const voidedIds = new Set(voidedOrders.map((o) => o.id));

    const result = new Map<number, Prisma.Decimal>();
    for (const rel of lineRelations) {
      if (voidedIds.has(rel.downstreamDocumentId)) continue;
      const prev = result.get(rel.upstreamLineId) ?? new Prisma.Decimal(0);
      result.set(
        rel.upstreamLineId,
        prev.add(new Prisma.Decimal(rel.linkedQty)),
      );
    }
    return result;
  }
}
