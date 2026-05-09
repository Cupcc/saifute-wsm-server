import { Injectable } from "@nestjs/common";
import {
  DocumentFamily,
  DocumentLifecycleStatus,
  DocumentRelationType,
  Prisma,
} from "../../../../generated/prisma/client";
import { BusinessDocumentType } from "../../../shared/domain/business-document-type";
import { PrismaService } from "../../../shared/prisma/prisma.service";

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class InboundRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(handler: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.runInTransaction(handler);
  }

  private db(db?: DbClient) {
    return db ?? this.prisma;
  }

  private buildOrderWhere(params: {
    documentNo?: string;
    orderType?: Prisma.StockInOrderWhereInput["orderType"];
    bizDateFrom?: Date;
    bizDateTo?: Date;
    supplierId?: number;
    supplierName?: string;
    handlerName?: string;
    materialId?: number;
    materialName?: string;
    stockScopeId?: number;
    workshopId?: number;
    includeVoided?: boolean;
  }): Prisma.StockInOrderWhereInput {
    const where: Prisma.StockInOrderWhereInput = params.includeVoided
      ? {}
      : {
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
    if (params.supplierId) {
      where.supplierId = params.supplierId;
    }
    if (params.supplierName) {
      where.supplierNameSnapshot = { contains: params.supplierName };
    }
    if (params.handlerName) {
      where.handlerNameSnapshot = { contains: params.handlerName };
    }
    if (params.materialId || params.materialName) {
      where.lines = {
        some: {
          ...(params.materialId ? { materialId: params.materialId } : {}),
          ...(params.materialName
            ? {
                materialNameSnapshot: {
                  contains: params.materialName,
                },
              }
            : {}),
        },
      };
    }
    if (params.stockScopeId) {
      where.stockScopeId = params.stockScopeId;
    }
    if (params.workshopId) {
      where.workshopId = params.workshopId;
    }

    return where;
  }

  async findOrders(
    params: {
      documentNo?: string;
      orderType?: Prisma.StockInOrderWhereInput["orderType"];
      bizDateFrom?: Date;
      bizDateTo?: Date;
      supplierId?: number;
      supplierName?: string;
      handlerName?: string;
      materialId?: number;
      materialName?: string;
      stockScopeId?: number;
      workshopId?: number;
      includeVoided?: boolean;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where = this.buildOrderWhere(params);

    const client = this.db(db);
    const [items, total] = await Promise.all([
      client.stockInOrder.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: [{ bizDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        include: { lines: true },
      }),
      client.stockInOrder.count({ where }),
    ]);

    return { items, total };
  }

  async findOrderLines(
    params: {
      documentNo?: string;
      orderType?: Prisma.StockInOrderWhereInput["orderType"];
      bizDateFrom?: Date;
      bizDateTo?: Date;
      supplierId?: number;
      supplierName?: string;
      handlerName?: string;
      materialId?: number;
      detailId?: number;
      materialCode?: string;
      materialName?: string;
      specification?: string;
      stockScopeId?: number;
      workshopId?: number;
      includeVoided?: boolean;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where: Prisma.StockInOrderLineWhereInput = {
      order: this.buildOrderWhere(params),
    };
    if (params.detailId) {
      where.id = params.detailId;
    }
    if (params.materialId) {
      where.materialId = params.materialId;
    }
    if (params.materialCode) {
      where.materialCodeSnapshot = { contains: params.materialCode };
    }
    if (params.materialName) {
      where.materialNameSnapshot = { contains: params.materialName };
    }
    if (params.specification) {
      where.materialSpecSnapshot = { contains: params.specification };
    }

    const client = this.db(db);
    const [items, total] = await Promise.all([
      client.stockInOrderLine.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: [
          { order: { bizDate: "desc" } },
          { order: { createdAt: "desc" } },
          { orderId: "desc" },
          { lineNo: "asc" },
        ],
        include: { order: true },
      }),
      client.stockInOrderLine.count({ where }),
    ]);

    return { items, total };
  }

  async findOrderById(id: number, db?: DbClient) {
    return this.db(db).stockInOrder.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: "asc" } } },
    });
  }

  async findOrderByDocumentNo(documentNo: string, db?: DbClient) {
    return this.db(db).stockInOrder.findUnique({
      where: { documentNo },
      include: { lines: true },
    });
  }

  async findEffectivePriceCorrectionLineBySourceLogId(
    sourceInventoryLogId: number,
    db?: DbClient,
  ) {
    return this.db(db).stockInPriceCorrectionOrderLine.findFirst({
      where: {
        sourceInventoryLogId,
        order: {
          lifecycleStatus: { not: DocumentLifecycleStatus.VOIDED },
        },
      },
      include: {
        generatedInLog: true,
        order: true,
      },
    });
  }

  async getInventorySourceAvailability(sourceLogId: number, db?: DbClient) {
    const log = await this.db(db).inventoryLog.findUnique({
      where: { id: sourceLogId },
      include: {
        allocatedSourceUsages: {
          select: {
            allocatedQty: true,
            releasedQty: true,
          },
        },
      },
    });
    if (!log) return null;

    const netAllocated = log.allocatedSourceUsages.reduce(
      (sum, usage) =>
        sum
          .add(new Prisma.Decimal(usage.allocatedQty))
          .sub(new Prisma.Decimal(usage.releasedQty)),
      new Prisma.Decimal(0),
    );

    return {
      id: log.id,
      unitCost: log.unitCost,
      changeQty: log.changeQty,
      availableQty: new Prisma.Decimal(log.changeQty).sub(netAllocated),
    };
  }

  async createOrder(
    data: Prisma.StockInOrderUncheckedCreateInput,
    lines: Omit<Prisma.StockInOrderLineUncheckedCreateInput, "orderId">[],
    db?: DbClient,
  ) {
    const client = this.db(db);
    const order = await client.stockInOrder.create({
      data,
    });
    const linesWithOrderId = lines.map((l) => ({ ...l, orderId: order.id }));
    await client.stockInOrderLine.createMany({ data: linesWithOrderId });
    const result = await client.stockInOrder.findUnique({
      where: { id: order.id },
      include: { lines: { orderBy: { lineNo: "asc" } } },
    });
    if (!result) throw new Error("Order creation failed");
    return result;
  }

  async updateOrder(
    id: number,
    data: Prisma.StockInOrderUncheckedUpdateInput,
    db?: DbClient,
  ) {
    return this.db(db).stockInOrder.update({
      where: { id },
      data,
      include: { lines: { orderBy: { lineNo: "asc" } } },
    });
  }

  async deleteOrderLines(orderId: number, db?: DbClient) {
    return this.db(db).stockInOrderLine.deleteMany({
      where: { orderId },
    });
  }

  async createOrderLines(
    lines: Prisma.StockInOrderLineUncheckedCreateInput[],
    db?: DbClient,
  ) {
    if (lines.length === 0) return [];
    const client = this.db(db);
    await client.stockInOrderLine.createMany({ data: lines });
    const orderId = lines[0]?.orderId;
    if (!orderId) return [];
    return client.stockInOrderLine.findMany({
      where: { orderId },
      orderBy: { lineNo: "asc" },
    });
  }

  async createOrderLine(
    data: Prisma.StockInOrderLineUncheckedCreateInput,
    db?: DbClient,
  ) {
    return this.db(db).stockInOrderLine.create({
      data,
    });
  }

  async updateOrderLine(
    id: number,
    data: Prisma.StockInOrderLineUncheckedUpdateInput,
    db?: DbClient,
  ) {
    return this.db(db).stockInOrderLine.update({
      where: { id },
      data,
    });
  }

  async deleteOrderLine(id: number, db?: DbClient) {
    return this.db(db).stockInOrderLine.delete({
      where: { id },
    });
  }

  async hasActiveDownstreamDependencies(orderId: number, db?: DbClient) {
    const client = this.db(db);
    const [documentCount, lineRelations] = await Promise.all([
      client.documentRelation.count({
        where: {
          upstreamFamily: DocumentFamily.STOCK_IN,
          upstreamDocumentId: orderId,
          isActive: true,
        },
      }),
      client.documentLineRelation.findMany({
        where: {
          upstreamFamily: DocumentFamily.STOCK_IN,
          upstreamDocumentId: orderId,
        },
        select: {
          downstreamFamily: true,
          downstreamDocumentType: true,
          downstreamDocumentId: true,
        },
      }),
    ]);

    if (documentCount > 0) return true;
    if (lineRelations.length === 0) return false;

    const downstreamStockInIds = [
      ...new Set(
        lineRelations
          .filter(
            (relation) =>
              relation.downstreamFamily === DocumentFamily.STOCK_IN &&
              relation.downstreamDocumentType ===
                BusinessDocumentType.StockInOrder,
          )
          .map((relation) => relation.downstreamDocumentId),
      ),
    ];
    const voidedStockInOrders =
      downstreamStockInIds.length === 0
        ? []
        : await client.stockInOrder.findMany({
            where: {
              id: { in: downstreamStockInIds },
              lifecycleStatus: DocumentLifecycleStatus.VOIDED,
            },
            select: { id: true },
          });
    const voidedStockInIds = new Set(
      voidedStockInOrders.map((order) => order.id),
    );

    return lineRelations.some(
      (relation) =>
        !(
          relation.downstreamFamily === DocumentFamily.STOCK_IN &&
          relation.downstreamDocumentType ===
            BusinessDocumentType.StockInOrder &&
          voidedStockInIds.has(relation.downstreamDocumentId)
        ),
    );
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

  async sumActiveSupplierReturnedQtyBySourceLine(
    sourceOrderId: number,
    db?: DbClient,
  ): Promise<Map<number, Prisma.Decimal>> {
    const client = this.db(db);
    const lineRelations = await client.documentLineRelation.findMany({
      where: {
        relationType: DocumentRelationType.STOCK_IN_RETURN_TO_SUPPLIER,
        upstreamFamily: DocumentFamily.STOCK_IN,
        upstreamDocumentType: BusinessDocumentType.StockInOrder,
        upstreamDocumentId: sourceOrderId,
      },
      select: {
        upstreamLineId: true,
        downstreamDocumentId: true,
        linkedQty: true,
      },
    });

    if (lineRelations.length === 0) return new Map();

    const downstreamIds = [
      ...new Set(
        lineRelations.map((relation) => relation.downstreamDocumentId),
      ),
    ];
    const voidedReturns = await client.stockInOrder.findMany({
      where: { id: { in: downstreamIds }, lifecycleStatus: "VOIDED" },
      select: { id: true },
    });
    const voidedIds = new Set(voidedReturns.map((order) => order.id));

    const result = new Map<number, Prisma.Decimal>();
    for (const relation of lineRelations) {
      if (voidedIds.has(relation.downstreamDocumentId)) continue;
      const previous =
        result.get(relation.upstreamLineId) ?? new Prisma.Decimal(0);
      result.set(
        relation.upstreamLineId,
        previous.add(new Prisma.Decimal(relation.linkedQty)),
      );
    }
    return result;
  }

  async sumEffectiveAcceptedQtyByRdProcurementLineIds(
    lineIds: number[],
    excludeOrderId?: number,
    db?: DbClient,
  ) {
    if (lineIds.length === 0) {
      return new Map<number, Prisma.Decimal>();
    }

    const rows = await this.db(db).stockInOrderLine.findMany({
      where: {
        rdProcurementRequestLineId: { in: lineIds },
        order: {
          lifecycleStatus: "EFFECTIVE",
          ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
        },
      },
      select: {
        rdProcurementRequestLineId: true,
        quantity: true,
      },
    });

    const totals = new Map<number, Prisma.Decimal>();
    rows.forEach((row) => {
      if (!row.rdProcurementRequestLineId) {
        return;
      }
      const current =
        totals.get(row.rdProcurementRequestLineId) ?? new Prisma.Decimal(0);
      totals.set(
        row.rdProcurementRequestLineId,
        current.add(new Prisma.Decimal(row.quantity)),
      );
    });
    return totals;
  }

  async findMaterialCategoryByCode(categoryCode: string, db?: DbClient) {
    return this.db(db).materialCategory.findUnique({
      where: { categoryCode },
      select: {
        id: true,
        categoryCode: true,
        categoryName: true,
      },
    });
  }
}
