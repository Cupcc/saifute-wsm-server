import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  AuditStatusSnapshot,
  DocumentLifecycleStatus,
  InventoryEffectStatus,
  Prisma,
  RdProjectMaterialActionType,
} from "../../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { InventoryService } from "../../inventory-core/application/inventory.service";
import { MasterDataService } from "../../master-data/application/master-data.service";
import { RdProcurementRequestService } from "../../rd-subwarehouse/application/rd-procurement-request.service";
import { RdProjectRepository } from "../infrastructure/rd-project.repository";
import { RdProjectService } from "./rd-project.service";

describe("RdProjectService", () => {
  let service: RdProjectService;
  let repository: jest.Mocked<RdProjectRepository>;
  let masterDataService: jest.Mocked<MasterDataService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let rdProcurementRequestService: jest.Mocked<RdProcurementRequestService>;
  let prisma: { runInTransaction: jest.Mock };

  const stockScope = {
    id: 2,
    scopeCode: "RD_SUB",
    scopeName: "研发小仓",
    status: "ACTIVE",
    createdBy: null,
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: new Date(),
  } as const;

  const baseProject = {
    id: 1,
    projectCode: "PRJ-001",
    projectName: "RD Project A",
    bizDate: new Date("2026-04-01"),
    customerId: null,
    supplierId: null,
    managerPersonnelId: null,
    stockScopeId: 2,
    workshopId: 1,
    projectTargetId: 5001,
    lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
    auditStatusSnapshot: AuditStatusSnapshot.NOT_REQUIRED,
    inventoryEffectStatus: InventoryEffectStatus.POSTED,
    revisionNo: 1,
    customerCodeSnapshot: null,
    customerNameSnapshot: null,
    supplierCodeSnapshot: null,
    supplierNameSnapshot: null,
    managerNameSnapshot: null,
    workshopNameSnapshot: "RD Workshop",
    totalQty: new Prisma.Decimal(100),
    totalAmount: new Prisma.Decimal(1000),
    remark: null,
    voidReason: null,
    voidedBy: null,
    voidedAt: null,
    createdBy: "1",
    createdAt: new Date(),
    updatedBy: "1",
    updatedAt: new Date(),
    stockScope,
    bomLines: [
      {
        id: 11,
        projectId: 1,
        lineNo: 1,
        materialId: 100,
        materialCodeSnapshot: "MAT-100",
        materialNameSnapshot: "Material 100",
        materialSpecSnapshot: "Spec",
        unitCodeSnapshot: "PCS",
        quantity: new Prisma.Decimal(100),
        unitPrice: new Prisma.Decimal(10),
        amount: new Prisma.Decimal(1000),
        remark: null,
        createdBy: "1",
        createdAt: new Date(),
        updatedBy: "1",
        updatedAt: new Date(),
      },
    ],
    materialLines: [],
    materialActions: [],
  };

  const sourcePickAction = {
    id: 41,
    documentNo: "PJPK202604010001",
    projectId: 1,
    actionType: RdProjectMaterialActionType.PICK,
    bizDate: new Date("2026-04-01"),
    stockScopeId: 2,
    workshopId: 1,
    lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
    inventoryEffectStatus: InventoryEffectStatus.POSTED,
    totalQty: new Prisma.Decimal(10),
    totalAmount: new Prisma.Decimal(100),
    remark: null,
    voidReason: null,
    voidedBy: null,
    voidedAt: null,
    createdBy: "1",
    createdAt: new Date(),
    updatedBy: "1",
    updatedAt: new Date(),
    stockScope,
    rdProject: {
      id: 1,
      stockScopeId: 2,
      workshopId: 1,
    },
    lines: [
      {
        id: 42,
        actionId: 41,
        lineNo: 1,
        materialId: 100,
        materialCodeSnapshot: "MAT-100",
        materialNameSnapshot: "Material 100",
        materialSpecSnapshot: "Spec",
        unitCodeSnapshot: "PCS",
        quantity: new Prisma.Decimal(10),
        unitPrice: new Prisma.Decimal(10),
        amount: new Prisma.Decimal(100),
        costUnitPrice: new Prisma.Decimal(10),
        costAmount: new Prisma.Decimal(100),
        sourceDocumentType: null,
        sourceDocumentId: null,
        sourceDocumentLineId: null,
        remark: null,
        createdBy: "1",
        createdAt: new Date(),
        updatedBy: "1",
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      runInTransaction: jest.fn((handler: (tx: unknown) => Promise<unknown>) =>
        handler({}),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RdProjectService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: RdProjectRepository,
          useValue: {
            findProjectByCode: jest.fn(),
            findProjectById: jest.fn(),
            findProjects: jest.fn(),
            createProject: jest.fn(),
            updateProject: jest.fn(),
            replaceProjectBomLines: jest.fn(),
            findProjectTargetBySource: jest.fn(),
            createProjectTarget: jest.fn(),
            updateProjectTarget: jest.fn(),
            attachProjectTargetToProject: jest.fn(),
            hasActiveDownstreamDependencies: jest.fn().mockResolvedValue(false),
            hasEffectiveMaterialActions: jest.fn().mockResolvedValue(false),
            findMaterialActionsByProjectId: jest.fn().mockResolvedValue([]),
            findMaterialActionById: jest.fn(),
            createMaterialAction: jest.fn(),
            updateMaterialAction: jest.fn(),
            updateMaterialActionLineCost: jest.fn(),
            hasActiveReturnDownstream: jest.fn().mockResolvedValue(false),
            sumActiveReturnedQtyBySourceLine: jest
              .fn()
              .mockResolvedValue(new Map()),
          },
        },
        {
          provide: MasterDataService,
          useValue: {
            getMaterialById: jest.fn().mockResolvedValue({
              id: 100,
              materialCode: "MAT-100",
              materialName: "Material 100",
              specModel: "Spec",
              unitCode: "PCS",
            }),
            getWorkshopById: jest.fn().mockResolvedValue({
              id: 1,
              workshopName: "RD Workshop",
            }),
            getStockScopeByCode: jest.fn().mockResolvedValue(stockScope),
            getCustomerById: jest.fn(),
            getSupplierById: jest.fn(),
            getPersonnelById: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            settleConsumerOut: jest.fn(),
            increaseStock: jest.fn(),
            releaseAllSourceUsagesForConsumer: jest.fn(),
            releaseInventorySource: jest.fn(),
            reverseStock: jest.fn(),
            getLogsForDocument: jest.fn().mockResolvedValue([]),
            summarizeAttributedQuantities: jest.fn().mockResolvedValue(new Map()),
            getBalanceSnapshot: jest.fn().mockResolvedValue({
              quantityOnHand: new Prisma.Decimal(0),
            }),
            listSourceUsagesForConsumerLine: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RdProcurementRequestService,
          useValue: {
            listRequests: jest.fn().mockResolvedValue({
              total: 0,
              items: [],
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(RdProjectService);
    repository = moduleRef.get(RdProjectRepository);
    masterDataService = moduleRef.get(MasterDataService);
    inventoryService = moduleRef.get(InventoryService);
    rdProcurementRequestService = moduleRef.get(RdProcurementRequestService);
  });

  it("creates a project master with BOM without posting inventory", async () => {
    repository.findProjectByCode.mockResolvedValue(null);
    repository.createProject.mockResolvedValue({
      ...baseProject,
      projectTargetId: null,
    } as never);
    repository.findProjectTargetBySource.mockResolvedValue(null);
    repository.createProjectTarget.mockResolvedValue({
      id: 5001,
      targetType: "RD_PROJECT",
      targetCode: "PRJ-001",
      targetName: "RD Project A",
      sourceDocumentType: "RdProject",
      sourceDocumentId: 1,
      isSystemDefault: false,
      remark: null,
      createdBy: "1",
      createdAt: new Date(),
      updatedBy: "1",
      updatedAt: new Date(),
    } as never);
    repository.attachProjectTargetToProject.mockResolvedValue({} as never);
    repository.findProjectById.mockResolvedValue(baseProject as never);

    const result = await service.createProject(
      {
        projectCode: "PRJ-001",
        projectName: "RD Project A",
        bizDate: "2026-04-01",
        workshopId: 1,
        bomLines: [
          {
            materialId: 100,
            quantity: "100",
            unitPrice: "10",
          },
        ],
      },
      "1",
    );

    expect(repository.createProject).toHaveBeenCalled();
    expect(inventoryService.settleConsumerOut).not.toHaveBeenCalled();
    expect(result.summary.plannedQty.toString()).toBe("100");
    expect(result.summary.plannedAmount.toString()).toBe("1000");
  });

  it("rejects duplicate project codes", async () => {
    repository.findProjectByCode.mockResolvedValue(baseProject as never);

    await expect(
      service.createProject(
        {
          projectCode: "PRJ-001",
          projectName: "Duplicate",
          bizDate: "2026-04-01",
          workshopId: 1,
        },
        "1",
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("builds ledger using BOM, legacy consumption, actions, stock, and replenishment", async () => {
    repository.findProjectById.mockResolvedValue({
      ...baseProject,
      materialLines: [
        {
          id: 21,
          projectId: 1,
          lineNo: 1,
          materialId: 100,
          materialCodeSnapshot: "MAT-100",
          materialNameSnapshot: "Material 100",
          materialSpecSnapshot: "Spec",
          unitCodeSnapshot: "PCS",
          quantity: new Prisma.Decimal(40),
          unitPrice: new Prisma.Decimal(10),
          amount: new Prisma.Decimal(400),
          costUnitPrice: new Prisma.Decimal(10),
          costAmount: new Prisma.Decimal(400),
          remark: null,
          createdBy: "1",
          createdAt: new Date(),
          updatedBy: "1",
          updatedAt: new Date(),
        },
      ],
      materialActions: [
        {
          id: 31,
          documentNo: "PJRT202604020001",
          projectId: 1,
          actionType: RdProjectMaterialActionType.RETURN,
          bizDate: new Date("2026-04-02"),
          stockScopeId: 2,
          workshopId: 1,
          lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
          inventoryEffectStatus: InventoryEffectStatus.POSTED,
          totalQty: new Prisma.Decimal(10),
          totalAmount: new Prisma.Decimal(100),
          remark: null,
          voidReason: null,
          voidedBy: null,
          voidedAt: null,
          createdBy: "1",
          createdAt: new Date(),
          updatedBy: "1",
          updatedAt: new Date(),
          stockScope,
          lines: [
            {
              id: 32,
              actionId: 31,
              lineNo: 1,
              materialId: 100,
              materialCodeSnapshot: "MAT-100",
              materialNameSnapshot: "Material 100",
              materialSpecSnapshot: "Spec",
              unitCodeSnapshot: "PCS",
              quantity: new Prisma.Decimal(10),
              unitPrice: new Prisma.Decimal(10),
              amount: new Prisma.Decimal(100),
              costUnitPrice: new Prisma.Decimal(10),
              costAmount: new Prisma.Decimal(100),
              sourceDocumentType: "RdProjectMaterialAction",
              sourceDocumentId: 41,
              sourceDocumentLineId: 42,
              remark: null,
              createdBy: "1",
              createdAt: new Date(),
              updatedBy: "1",
              updatedAt: new Date(),
            },
          ],
        },
        {
          id: 33,
          documentNo: "PJSC202604030001",
          projectId: 1,
          actionType: RdProjectMaterialActionType.SCRAP,
          bizDate: new Date("2026-04-03"),
          stockScopeId: 2,
          workshopId: 1,
          lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
          inventoryEffectStatus: InventoryEffectStatus.POSTED,
          totalQty: new Prisma.Decimal(5),
          totalAmount: new Prisma.Decimal(50),
          remark: null,
          voidReason: null,
          voidedBy: null,
          voidedAt: null,
          createdBy: "1",
          createdAt: new Date(),
          updatedBy: "1",
          updatedAt: new Date(),
          stockScope,
          lines: [
            {
              id: 34,
              actionId: 33,
              lineNo: 1,
              materialId: 100,
              materialCodeSnapshot: "MAT-100",
              materialNameSnapshot: "Material 100",
              materialSpecSnapshot: "Spec",
              unitCodeSnapshot: "PCS",
              quantity: new Prisma.Decimal(5),
              unitPrice: new Prisma.Decimal(10),
              amount: new Prisma.Decimal(50),
              costUnitPrice: new Prisma.Decimal(10),
              costAmount: new Prisma.Decimal(50),
              sourceDocumentType: null,
              sourceDocumentId: null,
              sourceDocumentLineId: null,
              remark: null,
              createdBy: "1",
              createdAt: new Date(),
              updatedBy: "1",
              updatedAt: new Date(),
            },
          ],
        },
      ],
    } as never);
    inventoryService.summarizeAttributedQuantities.mockResolvedValue(
      new Map([[100, new Prisma.Decimal(20)]]) as never,
    );
    rdProcurementRequestService.listRequests.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 88,
          lines: [
            {
              materialId: 100,
              statusLedger: {
                pendingQty: new Prisma.Decimal(30),
                inProcurementQty: new Prisma.Decimal(0),
                acceptedQty: new Prisma.Decimal(0),
                handedOffQty: new Prisma.Decimal(0),
              },
            },
          ],
        },
      ],
    } as never);

    const result = await service.getProjectById(1);
    const row = result.materialLedger[0];

    expect(row.netUsedQty.toString()).toBe("35");
    expect(row.shortageQty.toString()).toBe("15");
    expect(row.netUsedCostAmount.toString()).toBe("350");
    expect(result.hasShortage).toBe(true);
  });

  it("creates a pick action through inventory-core and persists settled cost", async () => {
    repository.findProjectById.mockResolvedValue(baseProject as never);
    repository.createMaterialAction.mockResolvedValue({
      id: 51,
      documentNo: "PJPK202604010001",
      projectId: 1,
      actionType: RdProjectMaterialActionType.PICK,
      bizDate: new Date("2026-04-01"),
      stockScopeId: 2,
      workshopId: 1,
      lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
      inventoryEffectStatus: InventoryEffectStatus.POSTED,
      totalQty: new Prisma.Decimal(10),
      totalAmount: new Prisma.Decimal(90),
      remark: null,
      voidReason: null,
      voidedBy: null,
      voidedAt: null,
      createdBy: "1",
      createdAt: new Date(),
      updatedBy: "1",
      updatedAt: new Date(),
      stockScope,
      rdProject: { id: 1, stockScopeId: 2, workshopId: 1 },
      lines: [
        {
          id: 52,
          actionId: 51,
          lineNo: 1,
          materialId: 100,
          materialCodeSnapshot: "MAT-100",
          materialNameSnapshot: "Material 100",
          materialSpecSnapshot: "Spec",
          unitCodeSnapshot: "PCS",
          quantity: new Prisma.Decimal(10),
          unitPrice: new Prisma.Decimal(9),
          amount: new Prisma.Decimal(90),
          costUnitPrice: null,
          costAmount: null,
          sourceDocumentType: null,
          sourceDocumentId: null,
          sourceDocumentLineId: null,
          remark: null,
          createdBy: "1",
          createdAt: new Date(),
          updatedBy: "1",
          updatedAt: new Date(),
        },
      ],
    } as never);
    repository.findMaterialActionById.mockResolvedValue({
      id: 51,
      documentNo: "PJPK202604010001",
      projectId: 1,
      actionType: RdProjectMaterialActionType.PICK,
      bizDate: new Date("2026-04-01"),
      stockScopeId: 2,
      workshopId: 1,
      lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
      inventoryEffectStatus: InventoryEffectStatus.POSTED,
      totalQty: new Prisma.Decimal(10),
      totalAmount: new Prisma.Decimal(90),
      remark: null,
      voidReason: null,
      voidedBy: null,
      voidedAt: null,
      createdBy: "1",
      createdAt: new Date(),
      updatedBy: "1",
      updatedAt: new Date(),
      stockScope,
      rdProject: { id: 1, stockScopeId: 2, workshopId: 1 },
      lines: [
        {
          id: 52,
          actionId: 51,
          lineNo: 1,
          materialId: 100,
          materialCodeSnapshot: "MAT-100",
          materialNameSnapshot: "Material 100",
          materialSpecSnapshot: "Spec",
          unitCodeSnapshot: "PCS",
          quantity: new Prisma.Decimal(10),
          unitPrice: new Prisma.Decimal(9),
          amount: new Prisma.Decimal(90),
          costUnitPrice: new Prisma.Decimal(10),
          costAmount: new Prisma.Decimal(100),
          sourceDocumentType: null,
          sourceDocumentId: null,
          sourceDocumentLineId: null,
          remark: null,
          createdBy: "1",
          createdAt: new Date(),
          updatedBy: "1",
          updatedAt: new Date(),
        },
      ],
    } as never);
    inventoryService.settleConsumerOut.mockResolvedValue({
      outLog: { id: 901 },
      settledUnitCost: new Prisma.Decimal(10),
      settledCostAmount: new Prisma.Decimal(100),
      allocations: [],
    } as never);

    const result = await service.createMaterialAction(
      1,
      {
        actionType: RdProjectMaterialActionType.PICK,
        bizDate: "2026-04-01",
        lines: [
          {
            materialId: 100,
            quantity: "10",
            unitPrice: "9",
          },
        ],
      },
      "1",
    );

    expect(inventoryService.settleConsumerOut).toHaveBeenCalledWith(
      expect.objectContaining({
        stockScope: "RD_SUB",
        operationType: "RD_PROJECT_OUT",
        businessDocumentType: "RdProjectMaterialAction",
        businessDocumentId: 51,
      }),
      expect.anything(),
    );
    expect(repository.updateMaterialActionLineCost).toHaveBeenCalledWith(
      52,
      {
        costUnitPrice: new Prisma.Decimal(10),
        costAmount: new Prisma.Decimal(100),
      },
      expect.anything(),
    );
    expect(repository.findMaterialActionById).toHaveBeenCalledWith(
      51,
      expect.anything(),
    );
  });

  it("creates a return action by releasing source usages and increasing stock", async () => {
    repository.findProjectById.mockResolvedValue(baseProject as never);
    repository.findMaterialActionById.mockImplementation(async (id: number) => {
      if (id === 41) {
        return sourcePickAction as never;
      }
      return {
        id: 61,
        documentNo: "PJRT202604020001",
        projectId: 1,
        actionType: RdProjectMaterialActionType.RETURN,
        bizDate: new Date("2026-04-02"),
        stockScopeId: 2,
        workshopId: 1,
        lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
        inventoryEffectStatus: InventoryEffectStatus.POSTED,
        totalQty: new Prisma.Decimal(5),
        totalAmount: new Prisma.Decimal(50),
        remark: null,
        voidReason: null,
        voidedBy: null,
        voidedAt: null,
        createdBy: "1",
        createdAt: new Date(),
        updatedBy: "1",
        updatedAt: new Date(),
        stockScope,
        rdProject: { id: 1, stockScopeId: 2, workshopId: 1 },
        lines: [
          {
            id: 62,
            actionId: 61,
            lineNo: 1,
            materialId: 100,
            materialCodeSnapshot: "MAT-100",
            materialNameSnapshot: "Material 100",
            materialSpecSnapshot: "Spec",
            unitCodeSnapshot: "PCS",
            quantity: new Prisma.Decimal(5),
            unitPrice: new Prisma.Decimal(10),
            amount: new Prisma.Decimal(50),
            costUnitPrice: new Prisma.Decimal(10),
            costAmount: new Prisma.Decimal(50),
            sourceDocumentType: "RdProjectMaterialAction",
            sourceDocumentId: 41,
            sourceDocumentLineId: 42,
            remark: null,
            createdBy: "1",
            createdAt: new Date(),
            updatedBy: "1",
            updatedAt: new Date(),
          },
        ],
      } as never;
    });
    repository.createMaterialAction.mockResolvedValue({
      id: 61,
      documentNo: "PJRT202604020001",
      projectId: 1,
      actionType: RdProjectMaterialActionType.RETURN,
      bizDate: new Date("2026-04-02"),
      stockScopeId: 2,
      workshopId: 1,
      lifecycleStatus: DocumentLifecycleStatus.EFFECTIVE,
      inventoryEffectStatus: InventoryEffectStatus.POSTED,
      totalQty: new Prisma.Decimal(5),
      totalAmount: new Prisma.Decimal(50),
      remark: null,
      voidReason: null,
      voidedBy: null,
      voidedAt: null,
      createdBy: "1",
      createdAt: new Date(),
      updatedBy: "1",
      updatedAt: new Date(),
      stockScope,
      rdProject: { id: 1, stockScopeId: 2, workshopId: 1 },
      lines: [
        {
          id: 62,
          actionId: 61,
          lineNo: 1,
          materialId: 100,
          materialCodeSnapshot: "MAT-100",
          materialNameSnapshot: "Material 100",
          materialSpecSnapshot: "Spec",
          unitCodeSnapshot: "PCS",
          quantity: new Prisma.Decimal(5),
          unitPrice: new Prisma.Decimal(10),
          amount: new Prisma.Decimal(50),
          costUnitPrice: null,
          costAmount: null,
          sourceDocumentType: "RdProjectMaterialAction",
          sourceDocumentId: 41,
          sourceDocumentLineId: 42,
          remark: null,
          createdBy: "1",
          createdAt: new Date(),
          updatedBy: "1",
          updatedAt: new Date(),
        },
      ],
    } as never);
    inventoryService.listSourceUsagesForConsumerLine.mockResolvedValue([
      {
        sourceLogId: 1001,
        allocatedQty: new Prisma.Decimal(10),
        releasedQty: new Prisma.Decimal(0),
        sourceLog: {
          unitCost: new Prisma.Decimal(10),
        },
      },
    ] as never);
    inventoryService.increaseStock.mockResolvedValue({ id: 1002 } as never);

    const result = await service.createMaterialAction(
      1,
      {
        actionType: RdProjectMaterialActionType.RETURN,
        bizDate: "2026-04-02",
        lines: [
          {
            materialId: 100,
            quantity: "5",
            unitPrice: "10",
            sourceDocumentType: "RdProjectMaterialAction",
            sourceDocumentId: 41,
            sourceDocumentLineId: 42,
          },
        ],
      },
      "1",
    );

    expect(inventoryService.releaseInventorySource).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerDocumentType: "RdProjectMaterialAction",
        consumerDocumentId: 41,
        consumerLineId: 42,
        targetReleasedQty: new Prisma.Decimal(5),
      }),
      expect.anything(),
    );
    expect(inventoryService.increaseStock).toHaveBeenCalledWith(
      expect.objectContaining({
        stockScope: "RD_SUB",
        operationType: "RETURN_IN",
        businessDocumentType: "RdProjectMaterialAction",
        businessDocumentId: 61,
        unitCost: new Prisma.Decimal(10),
        costAmount: new Prisma.Decimal(50),
      }),
      expect.anything(),
    );
    expect(repository.findMaterialActionById).toHaveBeenCalledWith(
      61,
      expect.anything(),
    );
  });
});
