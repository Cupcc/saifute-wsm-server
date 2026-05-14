import { BadRequestException } from "@nestjs/common";
import {
  AuditStatusSnapshot,
  DocumentLifecycleStatus,
  DocumentRelationType,
  InventoryEffectStatus,
  InventoryOperationType,
  Prisma,
  StockInOrderType,
} from "../../../../generated/prisma/client";
import { BusinessDocumentType } from "../../../shared/domain/business-document-type";
import type { ApprovalService } from "../../approval/application/approval.service";
import type { InventoryService } from "../../inventory-core/application/inventory.service";
import type { MasterDataService } from "../../master-data/application/master-data.service";
import type { InboundRepository } from "../infrastructure/inbound.repository";
import type { InboundSharedService } from "./inbound-shared.service";
import { InboundSupplierReturnService } from "./inbound-supplier-return.service";

describe("InboundSupplierReturnService", () => {
  const sourceOrder = {
    id: 1,
    documentNo: "YS20260508001",
    orderType: StockInOrderType.ACCEPTANCE,
    bizDate: new Date("2026-05-08"),
    salesProjectId: null,
    supplierId: 10,
    handlerPersonnelId: 20,
    stockScopeId: 1,
    workshopId: 2,
    rdProcurementRequestId: null,
    lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
    auditStatusSnapshot: AuditStatusSnapshot.PENDING,
    inventoryEffectStatus: InventoryEffectStatus.POSTED,
    revisionNo: 1,
    salesProjectCodeSnapshot: null,
    salesProjectNameSnapshot: null,
    supplierCodeSnapshot: "SUP001",
    supplierNameSnapshot: "供应商 A",
    handlerNameSnapshot: "经办人 A",
    workshopNameSnapshot: "主仓关联部门",
    rdProcurementRequestNoSnapshot: null,
    rdProcurementProjectCodeSnapshot: null,
    rdProcurementProjectNameSnapshot: null,
    totalQty: new Prisma.Decimal(100),
    totalAmount: new Prisma.Decimal(1000),
    remark: null,
    voidReason: null,
    voidedBy: null,
    voidedAt: null,
    createdBy: "7",
    createdAt: new Date(),
    updatedBy: "7",
    updatedAt: new Date(),
    lines: [
      {
        id: 11,
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
        materialNameSnapshot: "物料 A",
        materialSpecSnapshot: "10K",
        unitCodeSnapshot: "PCS",
        quantity: new Prisma.Decimal(100),
        unitPrice: new Prisma.Decimal(10),
        amount: new Prisma.Decimal(1000),
        remark: null,
        createdBy: "7",
        createdAt: new Date(),
        updatedBy: "7",
        updatedAt: new Date(),
      },
    ],
  };
  const supplierReturnOrder = {
    ...sourceOrder,
    id: 2,
    documentNo: "TGC20260508001",
    orderType: StockInOrderType.SUPPLIER_RETURN,
    totalQty: new Prisma.Decimal(30),
    totalAmount: new Prisma.Decimal(300),
    lines: [
      {
        ...sourceOrder.lines[0],
        id: 21,
        orderId: 2,
        quantity: new Prisma.Decimal(30),
        amount: new Prisma.Decimal(300),
      },
    ],
  };
  const sourceLog = {
    id: 101,
    businessDocumentLineId: 11,
    operationType: InventoryOperationType.ACCEPTANCE_IN,
    unitCost: new Prisma.Decimal(10),
  };

  let service: InboundSupplierReturnService;
  let repository: jest.Mocked<InboundRepository>;
  let inventoryService: jest.Mocked<InventoryService>;
  let approvalService: jest.Mocked<ApprovalService>;

  beforeEach(() => {
    repository = {
      runInTransaction: jest.fn((handler) => handler({} as never)),
      findOrderById: jest.fn().mockResolvedValue(sourceOrder),
      findOrders: jest.fn(),
      findOrderLines: jest.fn(),
      findEffectivePriceCorrectionLineBySourceLogId: jest
        .fn()
        .mockResolvedValue(null),
      getInventorySourceAvailability: jest.fn().mockResolvedValue({
        id: 101,
        unitCost: new Prisma.Decimal(10),
        changeQty: new Prisma.Decimal(100),
        availableQty: new Prisma.Decimal(100),
      }),
      createOrder: jest.fn().mockResolvedValue(supplierReturnOrder),
      updateOrder: jest.fn().mockResolvedValue(supplierReturnOrder),
      createDocumentRelation: jest.fn().mockResolvedValue({}),
      createDocumentLineRelation: jest.fn().mockResolvedValue({}),
      deactivateDocumentRelationsForOrder: jest.fn().mockResolvedValue({
        count: 1,
      }),
      sumActiveSupplierReturnedQtyBySourceLine: jest
        .fn()
        .mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<InboundRepository>;
    inventoryService = {
      getLogsForDocument: jest.fn().mockResolvedValue([sourceLog]),
      settleConsumerOut: jest.fn().mockResolvedValue({
        outLog: { id: 201 },
        settledUnitCost: new Prisma.Decimal(10),
        settledCostAmount: new Prisma.Decimal(300),
        allocations: [],
      }),
      releaseAllSourceUsagesForConsumer: jest.fn().mockResolvedValue(undefined),
      reverseStock: jest.fn().mockResolvedValue({ id: 202 }),
    } as unknown as jest.Mocked<InventoryService>;
    approvalService = {
      createOrRefreshApprovalDocument: jest.fn().mockResolvedValue({}),
      markApprovalNotRequired: jest.fn().mockResolvedValue({ count: 1 }),
    } as unknown as jest.Mocked<ApprovalService>;

    service = new InboundSupplierReturnService(
      repository,
      {
        getStockScopeByCode: jest.fn().mockResolvedValue({
          id: 1,
          scopeCode: "MAIN",
          scopeName: "主仓",
        }),
        getPersonnelById: jest.fn(),
      } as unknown as jest.Mocked<MasterDataService>,
      inventoryService,
      approvalService,
      {
        resolveHandlerSnapshot: jest
          .fn()
          .mockResolvedValue({ handlerNameSnapshot: "经办人 A" }),
      } as unknown as jest.Mocked<InboundSharedService>,
    );
  });

  it("creates supplier return with source-bound OUT settlement and line relation", async () => {
    const result = await service.createSupplierReturn(
      1,
      {
        bizDate: "2026-05-08",
        handlerName: "经办人 A",
        lines: [{ sourceStockInOrderLineId: 11, quantity: "30" }],
      },
      "7",
    );

    expect(result).toEqual(supplierReturnOrder);
    expect(repository.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: StockInOrderType.SUPPLIER_RETURN,
        supplierId: 10,
        totalQty: new Prisma.Decimal(30),
        totalAmount: new Prisma.Decimal(300),
      }),
      expect.arrayContaining([
        expect.objectContaining({
          materialId: 100,
          quantity: new Prisma.Decimal(30),
          unitPrice: new Prisma.Decimal(10),
          amount: new Prisma.Decimal(300),
        }),
      ]),
      expect.anything(),
    );
    expect(inventoryService.settleConsumerOut).toHaveBeenCalledWith(
      expect.objectContaining({
        materialId: 100,
        sourceLogId: 101,
        selectedUnitCost: new Prisma.Decimal(10),
        operationType: InventoryOperationType.SUPPLIER_RETURN_OUT,
        businessDocumentType: BusinessDocumentType.StockInOrder,
        businessDocumentId: 2,
        businessDocumentNumber: "TGC20260508001",
        businessDocumentLineId: 21,
        consumerLineId: 21,
      }),
      expect.anything(),
    );
    expect(repository.createDocumentLineRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        relationType: DocumentRelationType.STOCK_IN_RETURN_TO_SUPPLIER,
        upstreamDocumentId: 1,
        upstreamLineId: 11,
        downstreamDocumentId: 2,
        downstreamLineId: 21,
        linkedQty: new Prisma.Decimal(30),
      }),
      expect.anything(),
    );
  });

  it("previews current returnable quantity and source cost for the acceptance line", async () => {
    repository.sumActiveSupplierReturnedQtyBySourceLine.mockResolvedValue(
      new Map([[11, new Prisma.Decimal(20)]]),
    );
    repository.getInventorySourceAvailability.mockResolvedValue({
      id: 101,
      unitCost: new Prisma.Decimal(10),
      changeQty: new Prisma.Decimal(100),
      availableQty: new Prisma.Decimal(70),
    } as never);

    const result = await service.getSupplierReturnPreview(1);

    expect(result.sourceOrder).toEqual(
      expect.objectContaining({
        id: 1,
        documentNo: "YS20260508001",
        supplierName: "供应商 A",
      }),
    );
    expect(result.lines).toEqual([
      expect.objectContaining({
        sourceStockInOrderLineId: 11,
        sourceLogId: 101,
        sourceQuantity: new Prisma.Decimal(100),
        activeReturnedQty: new Prisma.Decimal(20),
        sourceAvailableQty: new Prisma.Decimal(70),
        availableQty: new Prisma.Decimal(70),
        currentUnitCost: new Prisma.Decimal(10),
      }),
    ]);
  });

  it("lists supplier returns across lifecycle states so void results remain visible", async () => {
    await service.listSupplierReturns({ limit: 20, offset: 0 });

    expect(repository.findOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: StockInOrderType.SUPPLIER_RETURN,
        includeVoided: true,
      }),
    );
  });

  it("rejects when active returned quantity would exceed the source line", async () => {
    repository.sumActiveSupplierReturnedQtyBySourceLine.mockResolvedValue(
      new Map([[11, new Prisma.Decimal(80)]]),
    );

    await expect(
      service.createSupplierReturn(
        1,
        {
          bizDate: "2026-05-08",
          lines: [{ sourceStockInOrderLineId: 11, quantity: "30" }],
        },
        "7",
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repository.createOrder).not.toHaveBeenCalled();
  });

  it("returns against current price-corrected source layer when the source line was adjusted", async () => {
    repository.createOrder.mockImplementationOnce(
      async (_data, lines) =>
        ({
          ...supplierReturnOrder,
          totalAmount: new Prisma.Decimal(360),
          lines: [
            {
              ...supplierReturnOrder.lines[0],
              unitPrice: lines[0]?.unitPrice ?? new Prisma.Decimal(12),
              amount: lines[0]?.amount ?? new Prisma.Decimal(360),
            },
          ],
        }) as never,
    );
    repository.findEffectivePriceCorrectionLineBySourceLogId
      .mockResolvedValueOnce({
        generatedInLog: {
          id: 102,
          businessDocumentLineId: 301,
          operationType: InventoryOperationType.PRICE_CORRECTION_IN,
          unitCost: new Prisma.Decimal(12),
        },
        order: {},
      } as never)
      .mockResolvedValueOnce(null);

    await service.createSupplierReturn(
      1,
      {
        bizDate: "2026-05-08",
        lines: [{ sourceStockInOrderLineId: 11, quantity: "30" }],
      },
      "7",
    );

    expect(repository.createOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          unitPrice: new Prisma.Decimal(12),
          amount: new Prisma.Decimal(360),
        }),
      ]),
      expect.anything(),
    );
    expect(inventoryService.settleConsumerOut).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceLogId: 102,
        selectedUnitCost: new Prisma.Decimal(12),
        sourceOperationTypes: expect.arrayContaining([
          InventoryOperationType.ACCEPTANCE_IN,
          InventoryOperationType.PRICE_CORRECTION_IN,
        ]),
      }),
      expect.anything(),
    );
  });

  it("voids supplier return by releasing source usage before reversing OUT logs", async () => {
    repository.findOrderById
      .mockResolvedValueOnce(supplierReturnOrder)
      .mockResolvedValueOnce(supplierReturnOrder);
    inventoryService.getLogsForDocument.mockResolvedValueOnce([
      { id: 201 },
    ] as never);

    const result = await service.voidSupplierReturn(2, "退货取消", "7");

    expect(result).toEqual(supplierReturnOrder);
    expect(
      inventoryService.releaseAllSourceUsagesForConsumer,
    ).toHaveBeenCalledWith(
      {
        consumerDocumentType: BusinessDocumentType.StockInOrder,
        consumerDocumentId: 2,
        operatorId: "7",
      },
      expect.anything(),
    );
    expect(inventoryService.reverseStock).toHaveBeenCalledWith(
      expect.objectContaining({
        logIdToReverse: 201,
        idempotencyKey: "StockInSupplierReturn:void:2:log:201",
      }),
      expect.anything(),
    );
    expect(repository.deactivateDocumentRelationsForOrder).toHaveBeenCalledWith(
      2,
      BusinessDocumentType.StockInOrder,
      expect.anything(),
    );
  });
});
