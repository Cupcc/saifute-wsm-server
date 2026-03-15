import { Injectable } from "@nestjs/common";
import {
  CustomerStockOrderType,
  DocumentLifecycleStatus,
  MasterDataStatus,
  Prisma,
  WorkshopMaterialOrderType,
} from "../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";

export interface InventoryBalanceSnapshot {
  id: number;
  quantityOnHand: Prisma.Decimal;
  updatedAt: Date;
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
  workshop: {
    id: number;
    workshopCode: string;
    workshopName: string;
  };
}

export interface TrendDocumentSnapshot {
  sourceType: "INBOUND" | "OUTBOUND" | "WORKSHOP_MATERIAL";
  bizDate: Date;
  totalQty: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
}

@Injectable()
export class ReportingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeMetrics(todayStart: Date, todayEnd: Date) {
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
      this.prisma.material.count({
        where: { status: MasterDataStatus.ACTIVE },
      }),
      this.prisma.workshop.count({
        where: { status: MasterDataStatus.ACTIVE },
      }),
      this.prisma.inventoryBalance.aggregate({
        _sum: { quantityOnHand: true },
      }),
      this.prisma.inventoryBalance.findMany({
        include: {
          material: {
            select: {
              warningMinQty: true,
            },
          },
        },
      }),
      this.prisma.stockInOrder.count({
        where: {
          lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
          bizDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.customerStockOrder.count({
        where: {
          orderType: CustomerStockOrderType.OUTBOUND,
          lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
          bizDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.workshopMaterialOrder.count({
        where: {
          lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
          bizDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.stockInOrder.aggregate({
        where: { lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE },
        _sum: { totalQty: true, totalAmount: true },
      }),
      this.prisma.customerStockOrder.aggregate({
        where: {
          orderType: CustomerStockOrderType.OUTBOUND,
          lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
        },
        _sum: { totalQty: true, totalAmount: true },
      }),
      this.prisma.workshopMaterialOrder.aggregate({
        where: { lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE },
        _sum: { totalQty: true, totalAmount: true },
      }),
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
    workshopId?: number;
  }): Promise<InventoryBalanceSnapshot[]> {
    return this.prisma.inventoryBalance.findMany({
      where: {
        workshopId: params.workshopId,
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
        material: {
          include: {
            category: true,
          },
        },
        workshop: true,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
  }

  async findTrendDocuments(params: {
    dateFrom: Date;
    dateTo: Date;
  }): Promise<TrendDocumentSnapshot[]> {
    const [inbound, outbound, workshopMaterial] = await Promise.all([
      this.prisma.stockInOrder.findMany({
        where: {
          lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
          bizDate: { gte: params.dateFrom, lte: params.dateTo },
        },
        select: {
          bizDate: true,
          totalQty: true,
          totalAmount: true,
        },
      }),
      this.prisma.customerStockOrder.findMany({
        where: {
          orderType: CustomerStockOrderType.OUTBOUND,
          lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
          bizDate: { gte: params.dateFrom, lte: params.dateTo },
        },
        select: {
          bizDate: true,
          totalQty: true,
          totalAmount: true,
        },
      }),
      this.prisma.workshopMaterialOrder.findMany({
        where: {
          orderType: {
            in: [
              WorkshopMaterialOrderType.PICK,
              WorkshopMaterialOrderType.RETURN,
              WorkshopMaterialOrderType.SCRAP,
            ],
          },
          lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
          bizDate: { gte: params.dateFrom, lte: params.dateTo },
        },
        select: {
          bizDate: true,
          totalQty: true,
          totalAmount: true,
        },
      }),
    ]);

    return [
      ...inbound.map((item) => ({
        sourceType: "INBOUND" as const,
        bizDate: item.bizDate,
        totalQty: item.totalQty,
        totalAmount: item.totalAmount,
      })),
      ...outbound.map((item) => ({
        sourceType: "OUTBOUND" as const,
        bizDate: item.bizDate,
        totalQty: item.totalQty,
        totalAmount: item.totalAmount,
      })),
      ...workshopMaterial.map((item) => ({
        sourceType: "WORKSHOP_MATERIAL" as const,
        bizDate: item.bizDate,
        totalQty: item.totalQty,
        totalAmount: item.totalAmount,
      })),
    ];
  }
}
