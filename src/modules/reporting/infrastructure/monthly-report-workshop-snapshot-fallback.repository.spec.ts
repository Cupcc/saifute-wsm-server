import { Prisma } from "../../../../generated/prisma/client";
import { MonthlyReportingTopicKey } from "../application/monthly-reporting.shared";
import { MonthlyMaterialCategoryRepository } from "./monthly-material-category.repository";
import { MonthlyReportRepository } from "./monthly-report.repository";

describe("monthly report workshop snapshot fallback", () => {
  function createMockPrisma() {
    const stockInOrder = { findMany: jest.fn().mockResolvedValue([]) };
    const stockInOrderLine = { findMany: jest.fn().mockResolvedValue([]) };
    const salesStockOrder = { findMany: jest.fn().mockResolvedValue([]) };
    const salesStockOrderLine = { findMany: jest.fn().mockResolvedValue([]) };
    const inventoryLog = { groupBy: jest.fn().mockResolvedValue([]) };
    const workshopMaterialOrder = { findMany: jest.fn().mockResolvedValue([]) };
    const rdProjectMaterialAction = {
      findMany: jest.fn().mockResolvedValue([]),
    };
    const rdHandoffOrder = { findMany: jest.fn().mockResolvedValue([]) };
    const rdStocktakeOrder = { findMany: jest.fn().mockResolvedValue([]) };
    const stockInPriceCorrectionOrder = {
      findMany: jest.fn().mockResolvedValue([]),
    };

    return {
      stockInOrder,
      stockInOrderLine,
      salesStockOrder,
      salesStockOrderLine,
      inventoryLog,
      workshopMaterialOrder,
      rdProjectMaterialAction,
      rdHandoffOrder,
      rdStocktakeOrder,
      stockInPriceCorrectionOrder,
    };
  }

  function createAppConfig() {
    return {
      businessTimezone: "Asia/Shanghai",
    } as never;
  }

  it("uses sales order workshop snapshot when material-category relation is missing", async () => {
    const prisma = createMockPrisma();
    const repository = new MonthlyMaterialCategoryRepository(
      prisma as never,
      createAppConfig(),
    );

    prisma.salesStockOrderLine.findMany.mockResolvedValue([
      {
        id: 302,
        lineNo: 1,
        materialId: 602,
        materialCodeSnapshot: "M-SALE-001",
        materialNameSnapshot: "销售物料",
        materialSpecSnapshot: null,
        unitCodeSnapshot: "PCS",
        quantity: new Prisma.Decimal("2"),
        unitPrice: new Prisma.Decimal("10"),
        amount: new Prisma.Decimal("20"),
        selectedUnitCost: new Prisma.Decimal("6"),
        costAmount: new Prisma.Decimal("12"),
        salesProjectId: null,
        salesProjectCodeSnapshot: null,
        salesProjectNameSnapshot: null,
        sourceDocumentId: null,
        materialCategoryIdSnapshot: 21,
        materialCategoryCodeSnapshot: "SALE",
        materialCategoryNameSnapshot: "销售类",
        materialCategoryPathSnapshot: null,
        order: {
          id: 402,
          documentNo: "CK-ORPHAN-WORKSHOP",
          bizDate: new Date("2026-04-12T00:00:00.000Z"),
          createdAt: new Date("2026-04-12T08:00:00.000Z"),
          orderType: "OUTBOUND",
          stockScope: {
            scopeCode: "MAIN",
            scopeName: "主仓",
          },
          workshopId: 999,
          workshopNameSnapshot: "历史销售车间",
          workshop: null,
        },
      },
    ] as never);

    const result = await repository.findMonthlyMaterialCategoryEntries({
      start: new Date("2026-04-01T00:00:00.000Z"),
      end: new Date("2026-04-30T23:59:59.999Z"),
    });

    expect(result).toEqual([
      expect.objectContaining({
        topicKey: MonthlyReportingTopicKey.SALES_OUTBOUND,
        documentNo: "CK-ORPHAN-WORKSHOP",
        workshopId: 999,
        workshopName: "历史销售车间",
      }),
    ]);
  });

  it("uses sales order workshop snapshot when domain relation is missing", async () => {
    const prisma = createMockPrisma();
    const repository = new MonthlyReportRepository(
      prisma as never,
      createAppConfig(),
    );

    prisma.salesStockOrder.findMany.mockResolvedValue([
      {
        id: 501,
        documentNo: "CK-DOMAIN-ORPHAN-WORKSHOP",
        bizDate: new Date("2026-04-13T00:00:00.000Z"),
        createdAt: new Date("2026-04-13T08:00:00.000Z"),
        orderType: "OUTBOUND",
        stockScope: {
          scopeCode: "MAIN",
          scopeName: "主仓",
        },
        workshopId: 999,
        workshopNameSnapshot: "历史领域车间",
        workshop: null,
        totalQty: new Prisma.Decimal("2"),
        totalAmount: new Prisma.Decimal("20"),
        lines: [
          {
            costAmount: new Prisma.Decimal("12"),
            sourceDocumentId: null,
            salesProjectId: null,
            salesProjectCodeSnapshot: null,
            salesProjectNameSnapshot: null,
          },
        ],
      },
    ] as never);

    const result = await repository.findMonthlyReportEntries({
      start: new Date("2026-04-01T00:00:00.000Z"),
      end: new Date("2026-04-30T23:59:59.999Z"),
    });

    expect(result).toEqual([
      expect.objectContaining({
        topicKey: MonthlyReportingTopicKey.SALES_OUTBOUND,
        documentNo: "CK-DOMAIN-ORPHAN-WORKSHOP",
        workshopId: 999,
        workshopName: "历史领域车间",
      }),
    ]);
  });
});
