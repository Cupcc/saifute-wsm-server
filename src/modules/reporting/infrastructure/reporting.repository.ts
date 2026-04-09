import { Injectable } from "@nestjs/common";
import {
  DocumentLifecycleStatus,
  InventoryOperationType,
  MasterDataStatus,
  Prisma,
  SalesStockOrderType,
  WorkshopMaterialOrderType,
} from "../../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { StockScopeCode } from "../../session/domain/user-session";

export interface InventoryBalanceSnapshot {
  id: number;
  quantityOnHand: Prisma.Decimal;
  updatedAt: Date;
  stockScope: {
    id: number;
    scopeCode: string;
    scopeName: string;
  } | null;
  material: {
    id: number;
    materialCode: string;
    materialName: string;
    specModel: string | null;
    unitCode: string;
    warningMinQty: Prisma.Decimal | null;
    warningMaxQty: Prisma.Decimal | null;
    category: {
      id: number;
      categoryCode: string;
      categoryName: string;
    } | null;
  };
}

export interface TrendDocumentSnapshot {
  sourceType: "INBOUND" | "SALES" | "WORKSHOP_MATERIAL" | "RD_PROJECT" | "RD";
  bizDate: Date;
  totalQty: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
}

interface InventoryLogTrendGroup {
  bizDate: Date;
  _sum: {
    changeQty: Prisma.Decimal | null;
    costAmount: Prisma.Decimal | null;
  } | null;
}

@Injectable()
export class ReportingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeMetrics(
    todayStart: Date,
    todayEnd: Date,
    params: {
      stockScope?: StockScopeCode;
      inventoryStockScopeIds: number[];
    },
  ) {
    const inventoryStockScopeFilter = this.buildInventoryStockScopeFilter(
      params.inventoryStockScopeIds,
    );
    const inboundTodayWhere = this.buildInboundWhere(params.stockScope, {
      bizDate: { gte: todayStart, lte: todayEnd },
    });
    const outboundTodayWhere = this.buildOutboundWhere(params.stockScope, {
      bizDate: { gte: todayStart, lte: todayEnd },
    });
    const workshopMaterialTodayWhere = this.buildWorkshopMaterialWhere(
      params.stockScope,
      {
        bizDate: { gte: todayStart, lte: todayEnd },
      },
    );
    const inboundAggregateWhere = this.buildInboundWhere(params.stockScope);
    const outboundAggregateWhere = this.buildOutboundWhere(params.stockScope);
    const workshopMaterialAggregateWhere = this.buildWorkshopMaterialWhere(
      params.stockScope,
    );
    const emptyDocumentAggregate = {
      _sum: {
        totalQty: null,
        totalAmount: null,
      },
    };

    const [
      activeMaterialCount,
      activeWorkshopCount,
      totalInventoryAggregate,
      inventoryBalances,
      inboundTodayCount,
      outboundTodayCount,
      workshopMaterialTodayCount,
      inboundAggregate,
      outboundAggregate,
      workshopMaterialAggregate,
    ] = await Promise.all([
      this.prisma.inventoryBalance
        .findMany({
          where: {
            stockScopeId: inventoryStockScopeFilter,
            material: {
              status: MasterDataStatus.ACTIVE,
            },
          },
          distinct: ["materialId"],
          select: {
            materialId: true,
          },
        })
        .then((items) => items.length),
      this.prisma.stockScope.count({
        where: {
          status: MasterDataStatus.ACTIVE,
          id: inventoryStockScopeFilter,
        },
      }),
      this.prisma.inventoryBalance.aggregate({
        where: { stockScopeId: inventoryStockScopeFilter },
        _sum: { quantityOnHand: true },
      }),
      this.prisma.inventoryBalance.findMany({
        where: { stockScopeId: inventoryStockScopeFilter },
        include: {
          stockScope: true,
          material: {
            select: {
              warningMinQty: true,
            },
          },
        },
      }),
      inboundTodayWhere
        ? this.prisma.stockInOrder.count({
            where: inboundTodayWhere,
          })
        : Promise.resolve(0),
      outboundTodayWhere
        ? this.prisma.salesStockOrder.count({
            where: outboundTodayWhere,
          })
        : Promise.resolve(0),
      workshopMaterialTodayWhere
        ? this.prisma.workshopMaterialOrder.count({
            where: workshopMaterialTodayWhere,
          })
        : Promise.resolve(0),
      inboundAggregateWhere
        ? this.prisma.stockInOrder.aggregate({
            where: inboundAggregateWhere,
            _sum: { totalQty: true, totalAmount: true },
          })
        : Promise.resolve(emptyDocumentAggregate),
      outboundAggregateWhere
        ? this.prisma.salesStockOrder.aggregate({
            where: outboundAggregateWhere,
            _sum: { totalQty: true, totalAmount: true },
          })
        : Promise.resolve(emptyDocumentAggregate),
      workshopMaterialAggregateWhere
        ? this.prisma.workshopMaterialOrder.aggregate({
            where: workshopMaterialAggregateWhere,
            _sum: { totalQty: true, totalAmount: true },
          })
        : Promise.resolve(emptyDocumentAggregate),
    ]);

    return {
      activeMaterialCount,
      activeWorkshopCount,
      totalInventoryQty: totalInventoryAggregate._sum.quantityOnHand,
      lowStockCount: inventoryBalances.filter((item) => {
        if (!item.material.warningMinQty) {
          return false;
        }

        return new Prisma.Decimal(item.quantityOnHand).lt(
          item.material.warningMinQty,
        );
      }).length,
      inboundTodayCount,
      outboundTodayCount,
      workshopMaterialTodayCount,
      inboundTotalQty: inboundAggregate._sum.totalQty,
      inboundTotalAmount: inboundAggregate._sum.totalAmount,
      outboundTotalQty: outboundAggregate._sum.totalQty,
      outboundTotalAmount: outboundAggregate._sum.totalAmount,
      workshopMaterialTotalQty: workshopMaterialAggregate._sum.totalQty,
      workshopMaterialTotalAmount: workshopMaterialAggregate._sum.totalAmount,
    };
  }

  async findInventoryBalanceSnapshots(params: {
    keyword?: string;
    categoryId?: number;
    inventoryStockScopeIds: number[];
  }): Promise<InventoryBalanceSnapshot[]> {
    return this.prisma.inventoryBalance.findMany({
      where: {
        stockScopeId: this.buildInventoryStockScopeFilter(
          params.inventoryStockScopeIds,
        ),
        material: {
          status: MasterDataStatus.ACTIVE,
          categoryId: params.categoryId,
          OR: params.keyword
            ? [
                { materialCode: { contains: params.keyword } },
                { materialName: { contains: params.keyword } },
              ]
            : undefined,
        },
      },
      include: {
        stockScope: true,
        material: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
  }

  async findTrendDocuments(params: {
    dateFrom: Date;
    dateTo: Date;
    inventoryStockScopeIds: number[];
    workshopId?: number;
  }): Promise<TrendDocumentSnapshot[]> {
    if (params.inventoryStockScopeIds.length === 0) {
      return [];
    }

    const baseWhere: Prisma.InventoryLogWhereInput = {
      bizDate: { gte: params.dateFrom, lte: params.dateTo },
      stockScopeId: { in: params.inventoryStockScopeIds },
      ...(params.workshopId ? { workshopId: params.workshopId } : {}),
    };

    const inboundTypes = [
      InventoryOperationType.ACCEPTANCE_IN,
      InventoryOperationType.PRODUCTION_RECEIPT_IN,
    ];
    const salesTypes = [InventoryOperationType.OUTBOUND_OUT];
    const workshopMaterialTypes = [
      InventoryOperationType.PICK_OUT,
      InventoryOperationType.RETURN_IN,
      InventoryOperationType.SCRAP_OUT,
    ];
    const rdProjectTypes = [InventoryOperationType.RD_PROJECT_OUT];
    const rdTypes = [
      InventoryOperationType.RD_HANDOFF_OUT,
      InventoryOperationType.RD_HANDOFF_IN,
      InventoryOperationType.RD_STOCKTAKE_IN,
      InventoryOperationType.RD_STOCKTAKE_OUT,
    ];

    const groupByBizDate = (where: Prisma.InventoryLogWhereInput) =>
      this.prisma.inventoryLog.groupBy({
        by: ["bizDate"],
        where,
        _sum: { changeQty: true, costAmount: true },
      });

    const [inbound, sales, workshopMaterial, rdProject, rd] = await Promise.all(
      [
        groupByBizDate({
          ...baseWhere,
          businessDocumentType: "StockInOrder",
          operationType: { in: inboundTypes },
        }),
        groupByBizDate({
          ...baseWhere,
          businessDocumentType: "SalesStockOrder",
          operationType: { in: salesTypes },
        }),
        groupByBizDate({
          ...baseWhere,
          businessDocumentType: "WorkshopMaterialOrder",
          operationType: { in: workshopMaterialTypes },
        }),
        groupByBizDate({
          ...baseWhere,
          businessDocumentType: "RdProjectMaterialAction",
          operationType: { in: rdProjectTypes },
        }),
        groupByBizDate({
          ...baseWhere,
          operationType: { in: rdTypes },
        }),
      ],
    );

    return [
      ...inbound.map((item) => this.mapLogGroupToSnapshot(item, "INBOUND")),
      ...sales.map((item) => this.mapLogGroupToSnapshot(item, "SALES")),
      ...workshopMaterial.map((item) =>
        this.mapLogGroupToSnapshot(item, "WORKSHOP_MATERIAL"),
      ),
      ...rdProject.map((item) =>
        this.mapLogGroupToSnapshot(item, "RD_PROJECT"),
      ),
      ...rd.map((item) => this.mapLogGroupToSnapshot(item, "RD")),
    ];
  }

  private mapLogGroupToSnapshot(
    group: InventoryLogTrendGroup,
    sourceType: TrendDocumentSnapshot["sourceType"],
  ): TrendDocumentSnapshot {
    return {
      sourceType,
      bizDate: group.bizDate,
      totalQty: group._sum?.changeQty ?? new Prisma.Decimal(0),
      totalAmount: group._sum?.costAmount ?? new Prisma.Decimal(0),
    };
  }

  private buildInventoryStockScopeFilter(stockScopeIds: number[]) {
    return stockScopeIds.length === 1
      ? stockScopeIds[0]
      : { in: stockScopeIds };
  }

  private buildInboundWhere(
    stockScope?: StockScopeCode,
    extra?: Omit<Prisma.StockInOrderWhereInput, "lifecycleStatus">,
  ): Prisma.StockInOrderWhereInput | null {
    if (stockScope === "RD_SUB") {
      return null;
    }

    return {
      lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
      ...(stockScope
        ? {
            stockScope: {
              is: {
                scopeCode: stockScope,
              },
            },
          }
        : {}),
      ...extra,
    };
  }

  private buildOutboundWhere(
    stockScope?: StockScopeCode,
    extra?: Omit<
      Prisma.SalesStockOrderWhereInput,
      "lifecycleStatus" | "orderType"
    >,
  ): Prisma.SalesStockOrderWhereInput | null {
    if (stockScope === "RD_SUB") {
      return null;
    }

    return {
      orderType: SalesStockOrderType.OUTBOUND,
      lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
      ...(stockScope
        ? {
            stockScope: {
              is: {
                scopeCode: stockScope,
              },
            },
          }
        : {}),
      ...extra,
    };
  }

  private buildWorkshopMaterialWhere(
    stockScope?: StockScopeCode,
    extra?: Omit<
      Prisma.WorkshopMaterialOrderWhereInput,
      "lifecycleStatus" | "OR" | "orderType" | "workshop"
    >,
  ): Prisma.WorkshopMaterialOrderWhereInput | null {
    if (stockScope === "RD_SUB") {
      return {
        lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
        orderType: WorkshopMaterialOrderType.SCRAP,
        stockScope: {
          is: {
            scopeCode: "RD_SUB",
          },
        },
        ...extra,
      };
    }

    if (stockScope === "MAIN") {
      return {
        lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
        OR: [
          {
            orderType: {
              in: [
                WorkshopMaterialOrderType.PICK,
                WorkshopMaterialOrderType.RETURN,
              ],
            },
          },
          {
            orderType: WorkshopMaterialOrderType.SCRAP,
            stockScope: {
              is: {
                scopeCode: "MAIN",
              },
            },
          },
        ],
        stockScope: {
          is: {
            scopeCode: "MAIN",
          },
        },
        ...extra,
      };
    }

    return {
      lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
      ...(stockScope
        ? {
            stockScope: {
              is: {
                scopeCode: stockScope,
              },
            },
          }
        : {}),
      orderType: {
        in: [
          WorkshopMaterialOrderType.PICK,
          WorkshopMaterialOrderType.RETURN,
          WorkshopMaterialOrderType.SCRAP,
        ],
      },
      ...extra,
    };
  }
}
