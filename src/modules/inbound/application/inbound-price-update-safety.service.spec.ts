import {
  AuditStatusSnapshot,
  DocumentLifecycleStatus,
  InventoryEffectStatus,
  InventoryOperationType,
  Prisma,
  StockInOrderType,
} from "../../../../generated/prisma/client";
import { ApprovalService } from "../../approval/application/approval.service";
import { InventoryService } from "../../inventory-core/application/inventory.service";
import { MasterDataService } from "../../master-data/application/master-data.service";
import { SupplierService } from "../../master-data/application/supplier.service";
import {
  applyAcceptanceStatusesForOrder,
  reverseAcceptanceStatusesForOrder,
} from "../../rd-subwarehouse/application/rd-material-status.helper";
import { RdProcurementRequestService } from "../../rd-subwarehouse/application/rd-procurement-request.service";
import { InboundRepository } from "../infrastructure/inbound.repository";
import { InboundAcceptanceUpdateService } from "./inbound-acceptance-update.service";
import { InboundProductionReceiptUpdateService } from "./inbound-production-receipt-update.service";
import { InboundSharedService } from "./inbound-shared.service";

jest.mock(
  "../../rd-subwarehouse/application/rd-material-status.helper",
  () => ({
    applyAcceptanceStatusesForOrder: jest.fn().mockResolvedValue(undefined),
    reverseAcceptanceStatusesForOrder: jest.fn().mockResolvedValue(undefined),
  }),
);

describe("Inbound price update safety", () => {
  const material = {
    id: 100,
    materialCode: "MAT001",
    materialName: "Material A",
    specModel: "Spec",
    unitCode: "PCS",
    category: {
      id: 99,
      categoryCode: "RESISTOR",
      categoryName: "电阻",
    },
  };
  const baseOrder = {
    id: 1,
    documentNo: "SI-001",
    orderType: StockInOrderType.ACCEPTANCE,
    bizDate: new Date("2025-03-14"),
    supplierId: 10,
    handlerPersonnelId: 20,
    stockScopeId: 1,
    workshopId: 1,
    rdProcurementRequestId: null,
    rdProcurementRequestNoSnapshot: null,
    rdProcurementProjectCodeSnapshot: null,
    rdProcurementProjectNameSnapshot: null,
    lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
    auditStatusSnapshot: AuditStatusSnapshot.PENDING,
    inventoryEffectStatus: InventoryEffectStatus.POSTED,
    revisionNo: 1,
    supplierCodeSnapshot: "SUP001",
    supplierNameSnapshot: "Supplier A",
    handlerNameSnapshot: "Handler A",
    workshopNameSnapshot: "Workshop A",
    totalQty: new Prisma.Decimal(100),
    totalAmount: new Prisma.Decimal(1000),
    remark: null,
    voidReason: null,
    voidedBy: null,
    voidedAt: null,
    createdBy: "tester",
    createdAt: new Date("2025-03-14"),
    updatedBy: "tester",
    updatedAt: new Date("2025-03-14"),
    lines: [
      {
        id: 1,
        orderId: 1,
        lineNo: 1,
        materialId: 100,
        rdProcurementRequestLineId: null,
        materialCategoryIdSnapshot: 99,
        materialCategoryCodeSnapshot: "RESISTOR",
        materialCategoryNameSnapshot: "电阻",
        materialCategoryPathSnapshot: [
          { id: 99, categoryCode: "RESISTOR", categoryName: "电阻" },
        ],
        materialCodeSnapshot: "MAT001",
        materialNameSnapshot: "Material A",
        materialSpecSnapshot: "Spec",
        unitCodeSnapshot: "PCS",
        quantity: new Prisma.Decimal(100),
        unitPrice: new Prisma.Decimal(10),
        amount: new Prisma.Decimal(1000),
        remark: null,
        createdBy: "tester",
        createdAt: new Date("2025-03-14"),
        updatedBy: "tester",
        updatedAt: new Date("2025-03-14"),
      },
    ],
  };

  function createHarness() {
    const repository = {
      runInTransaction: jest.fn((handler) => handler({})),
      findOrderById: jest.fn(),
      updateOrder: jest.fn(),
      updateOrderLine: jest.fn(),
      deleteOrderLine: jest.fn(),
      createOrderLine: jest.fn(),
      sumEffectiveAcceptedQtyByRdProcurementLineIds: jest
        .fn()
        .mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<InboundRepository>;
    const masterDataService = {
      getMaterialById: jest.fn().mockResolvedValue(material),
      getWorkshopById: jest.fn().mockResolvedValue({
        id: 1,
        workshopName: "Workshop A",
      }),
      getStockScopeByCode: jest.fn().mockResolvedValue({
        id: 1,
        scopeCode: "MAIN",
        scopeName: "主仓",
      }),
      getSupplierById: jest.fn().mockResolvedValue({
        id: 10,
        supplierCode: "SUP001",
        supplierName: "Supplier A",
      }),
      getPersonnelById: jest.fn().mockResolvedValue({
        id: 20,
        personnelName: "Handler A",
      }),
    } as unknown as jest.Mocked<MasterDataService>;
    const inventoryService = {
      getLogsForDocument: jest
        .fn()
        .mockResolvedValue([{ id: 1, businessDocumentLineId: 1 }]),
      hasUnreleasedAllocations: jest.fn().mockResolvedValue(false),
      reverseStock: jest.fn().mockResolvedValue({ id: 2 }),
      increaseStock: jest.fn().mockResolvedValue({ id: 3 }),
    } as unknown as jest.Mocked<InventoryService>;
    const approvalService = {
      createOrRefreshApprovalDocument: jest.fn().mockResolvedValue({}),
      markApprovalNotRequired: jest.fn().mockResolvedValue({ count: 1 }),
    } as unknown as jest.Mocked<ApprovalService>;
    const shared = new InboundSharedService(
      masterDataService,
      { getRequestById: jest.fn() } as unknown as RdProcurementRequestService,
      repository,
      { ensure: jest.fn() } as unknown as SupplierService,
    );

    return {
      repository,
      masterDataService,
      inventoryService,
      approvalService,
      shared,
    };
  }

  function priceChangeDto(orderType?: StockInOrderType) {
    return {
      ...(orderType ? { orderType } : {}),
      bizDate: "2025-03-15",
      workshopId: 1,
      lines: [
        {
          id: 1,
          materialId: 100,
          quantity: "100",
          unitPrice: "12",
        },
      ],
    };
  }

  it("reposts acceptance inventory when only unit price changes", async () => {
    const harness = createHarness();
    const updatedLine = {
      ...baseOrder.lines[0],
      unitPrice: new Prisma.Decimal(12),
      amount: new Prisma.Decimal(1200),
    };
    const updatedOrder = {
      ...baseOrder,
      totalAmount: new Prisma.Decimal(1200),
      lines: [updatedLine],
    };
    harness.repository.findOrderById
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce(updatedOrder);
    harness.repository.updateOrderLine.mockResolvedValue(updatedLine);
    harness.repository.updateOrder.mockResolvedValue(updatedOrder);

    const service = new InboundAcceptanceUpdateService(
      harness.repository,
      harness.masterDataService,
      harness.inventoryService,
      harness.approvalService,
      harness.shared,
    );

    await service.updateOrder(1, priceChangeDto(), "tester");

    expect(
      harness.inventoryService.hasUnreleasedAllocations,
    ).toHaveBeenCalledWith(1, expect.anything());
    expect(harness.inventoryService.reverseStock).toHaveBeenCalledWith(
      expect.objectContaining({
        logIdToReverse: 1,
        idempotencyKey: "StockInOrder:1:rev:2:replace:1",
      }),
      expect.anything(),
    );
    expect(harness.inventoryService.increaseStock).toHaveBeenCalledWith(
      expect.objectContaining({
        businessDocumentLineId: 1,
        unitCost: new Prisma.Decimal(12),
        costAmount: new Prisma.Decimal(1200),
      }),
      expect.anything(),
    );
    expect(reverseAcceptanceStatusesForOrder).toHaveBeenCalled();
    expect(applyAcceptanceStatusesForOrder).toHaveBeenCalled();
  });

  it("rejects acceptance unit price changes after downstream allocation", async () => {
    const harness = createHarness();
    harness.repository.findOrderById
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce(baseOrder);
    harness.inventoryService.hasUnreleasedAllocations.mockResolvedValue(true);
    const service = new InboundAcceptanceUpdateService(
      harness.repository,
      harness.masterDataService,
      harness.inventoryService,
      harness.approvalService,
      harness.shared,
    );

    await expect(
      service.updateOrder(1, priceChangeDto(), "tester"),
    ).rejects.toThrow("已有下游消耗分配");

    expect(harness.repository.updateOrderLine).not.toHaveBeenCalled();
    expect(harness.inventoryService.reverseStock).not.toHaveBeenCalled();
  });

  it("reposts production receipt inventory when only unit price changes", async () => {
    const harness = createHarness();
    const productionOrder = {
      ...baseOrder,
      orderType: StockInOrderType.PRODUCTION_RECEIPT,
      supplierId: null,
      supplierCodeSnapshot: null,
      supplierNameSnapshot: null,
    };
    const updatedLine = {
      ...productionOrder.lines[0],
      unitPrice: new Prisma.Decimal(12),
      amount: new Prisma.Decimal(1200),
    };
    const updatedOrder = {
      ...productionOrder,
      totalAmount: new Prisma.Decimal(1200),
      lines: [updatedLine],
    };
    harness.repository.findOrderById
      .mockResolvedValueOnce(productionOrder)
      .mockResolvedValueOnce(productionOrder)
      .mockResolvedValueOnce(updatedOrder);
    harness.repository.updateOrderLine.mockResolvedValue(updatedLine);
    harness.repository.updateOrder.mockResolvedValue(updatedOrder);

    const service = new InboundProductionReceiptUpdateService(
      harness.repository,
      harness.masterDataService,
      harness.inventoryService,
      harness.approvalService,
      harness.shared,
    );

    await service.updateOrder(
      1,
      priceChangeDto(StockInOrderType.PRODUCTION_RECEIPT),
      "tester",
    );

    expect(harness.inventoryService.reverseStock).toHaveBeenCalledWith(
      expect.objectContaining({
        logIdToReverse: 1,
        idempotencyKey: "StockInOrder:1:rev:2:replace:1",
      }),
      expect.anything(),
    );
    expect(harness.inventoryService.increaseStock).toHaveBeenCalledWith(
      expect.objectContaining({
        businessDocumentLineId: 1,
        operationType: InventoryOperationType.PRODUCTION_RECEIPT_IN,
        unitCost: new Prisma.Decimal(12),
        costAmount: new Prisma.Decimal(1200),
      }),
      expect.anything(),
    );
  });
});
