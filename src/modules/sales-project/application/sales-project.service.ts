import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DocumentLifecycleStatus,
  Prisma,
  SalesStockOrderType,
} from "../../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { InventoryService } from "../../inventory-core/application/inventory.service";
import { MasterDataService } from "../../master-data/application/master-data.service";
import type { CreateSalesProjectDto } from "../dto/create-sales-project.dto";
import type { CreateSalesProjectOutboundDraftDto } from "../dto/create-sales-project-outbound-draft.dto";
import type { QuerySalesProjectDto } from "../dto/query-sales-project.dto";
import type { UpdateSalesProjectDto } from "../dto/update-sales-project.dto";
import { SalesProjectRepository } from "../infrastructure/sales-project.repository";
import {
  ensureSalesProjectTarget,
  maxZero,
  requireProjectTargetId,
  SALES_PROJECT_LABEL,
  SALES_PROJECT_STOCK_SCOPE,
  toDecimal,
  ZERO,
} from "./sales-project.shared";

type SalesProjectRecord = NonNullable<
  Awaited<ReturnType<SalesProjectRepository["findProjectById"]>>
>;

type ProjectMaterialViewRow = {
  materialId: number;
  materialCodeSnapshot: string;
  materialNameSnapshot: string;
  materialSpecSnapshot: string | null;
  unitCodeSnapshot: string;
  targetQty: Prisma.Decimal;
  targetUnitPrice: Prisma.Decimal;
  targetAmount: Prisma.Decimal;
  currentInventoryQty: Prisma.Decimal;
  outboundQty: Prisma.Decimal;
  outboundAmount: Prisma.Decimal;
  outboundCostAmount: Prisma.Decimal;
  returnQty: Prisma.Decimal;
  returnAmount: Prisma.Decimal;
  returnCostAmount: Prisma.Decimal;
  netShipmentQty: Prisma.Decimal;
  netShipmentAmount: Prisma.Decimal;
  netShipmentCostAmount: Prisma.Decimal;
  pendingSupplyQty: Prisma.Decimal;
  remark: string | null;
  lastShipmentDate: Date | null;
};

export type SalesProjectBindingReference = {
  id: number;
  salesProjectCode: string;
  salesProjectName: string;
  customerId: number | null;
  workshopId: number;
  projectTargetId: number;
  lifecycleStatus: DocumentLifecycleStatus;
};

@Injectable()
export class SalesProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: SalesProjectRepository,
    private readonly masterDataService: MasterDataService,
    private readonly inventoryService: InventoryService,
  ) {}

  async listProjects(query: QuerySalesProjectDto) {
    const limit = Math.min(query.limit ?? 50, 100);
    const offset = query.offset ?? 0;
    const result = await this.repository.findProjects({
      salesProjectCode: query.salesProjectCode,
      salesProjectName: query.salesProjectName,
      bizDateFrom: query.bizDateFrom ? new Date(query.bizDateFrom) : undefined,
      bizDateTo: query.bizDateTo ? new Date(query.bizDateTo) : undefined,
      customerId: query.customerId,
      workshopId: query.workshopId,
      limit,
      offset,
    });

    return {
      total: result.total,
      items: await Promise.all(
        result.items.map((item) => this.buildProjectView(item)),
      ),
    };
  }

  async getProjectById(id: number) {
    const project = await this.requireProject(id);
    return this.buildProjectView(project);
  }

  async createProject(dto: CreateSalesProjectDto, createdBy?: string) {
    await this.validateProjectMasterData(dto);
    await this.assertProjectCodeAvailable(dto.salesProjectCode);

    const stockScope = await this.masterDataService.getStockScopeByCode(
      SALES_PROJECT_STOCK_SCOPE,
    );
    const customerSnapshot = await this.resolveCustomerSnapshot(dto.customerId);
    const managerSnapshot = await this.resolveManagerSnapshot(
      dto.managerPersonnelId,
    );
    const workshop = await this.masterDataService.getWorkshopById(
      dto.workshopId,
    );
    const materialLines = await this.buildMaterialLineWriteData(
      dto.materialLines ?? [],
    );

    const totalQty = materialLines.reduce(
      (sum, line) => sum.add(line.quantity),
      new Prisma.Decimal(0),
    );
    const totalAmount = materialLines.reduce(
      (sum, line) => sum.add(line.amount),
      new Prisma.Decimal(0),
    );

    return this.prisma.runInTransaction(async (tx) => {
      const project = await this.repository.createProject(
        {
          salesProjectCode: dto.salesProjectCode,
          salesProjectName: dto.salesProjectName,
          bizDate: new Date(dto.bizDate),
          customerId: dto.customerId,
          managerPersonnelId: dto.managerPersonnelId,
          stockScopeId: stockScope.id,
          workshopId: dto.workshopId,
          customerCodeSnapshot: customerSnapshot.customerCodeSnapshot,
          customerNameSnapshot: customerSnapshot.customerNameSnapshot,
          managerNameSnapshot: managerSnapshot.managerNameSnapshot,
          workshopNameSnapshot: workshop.workshopName,
          totalQty,
          totalAmount,
          remark: dto.remark,
          createdBy,
          updatedBy: createdBy,
        },
        materialLines.map((line, index) => ({
          ...line,
          lineNo: index + 1,
          createdBy,
          updatedBy: createdBy,
        })),
        tx,
      );

      await ensureSalesProjectTarget({
        project,
        updatedBy: createdBy,
        repository: this.repository,
        tx,
      });

      const latest = await this.requireProject(project.id, tx);
      return this.buildProjectView(latest, tx);
    });
  }

  async updateProject(
    id: number,
    dto: UpdateSalesProjectDto,
    updatedBy?: string,
  ) {
    const existing = await this.requireProject(id);
    if (existing.lifecycleStatus === DocumentLifecycleStatus.VOIDED) {
      throw new BadRequestException("已作废的销售项目不能修改");
    }

    if (
      dto.salesProjectCode &&
      dto.salesProjectCode !== existing.salesProjectCode
    ) {
      await this.assertProjectCodeAvailable(dto.salesProjectCode, existing.id);
    }

    await this.validateProjectMasterData(dto);

    const finalCustomerId = dto.customerId ?? existing.customerId ?? undefined;
    const finalManagerId =
      dto.managerPersonnelId ?? existing.managerPersonnelId ?? undefined;
    const finalWorkshopId = dto.workshopId ?? existing.workshopId;

    const customerSnapshot = finalCustomerId
      ? await this.resolveCustomerSnapshot(finalCustomerId)
      : {
          customerCodeSnapshot: existing.customerCodeSnapshot,
          customerNameSnapshot: existing.customerNameSnapshot,
        };
    const managerSnapshot = finalManagerId
      ? await this.resolveManagerSnapshot(finalManagerId)
      : {
          managerNameSnapshot: existing.managerNameSnapshot,
        };
    const workshop =
      finalWorkshopId === existing.workshopId
        ? { workshopName: existing.workshopNameSnapshot }
        : await this.masterDataService.getWorkshopById(finalWorkshopId);

    const nextMaterialLines =
      dto.materialLines == null
        ? existing.materialLines.map((line) => ({
            materialId: line.materialId,
            materialCodeSnapshot: line.materialCodeSnapshot,
            materialNameSnapshot: line.materialNameSnapshot,
            materialSpecSnapshot: line.materialSpecSnapshot ?? "",
            unitCodeSnapshot: line.unitCodeSnapshot,
            quantity: toDecimal(line.quantity),
            unitPrice: toDecimal(line.unitPrice),
            amount: toDecimal(line.amount),
            remark: line.remark ?? undefined,
          }))
        : await this.buildMaterialLineWriteData(dto.materialLines);

    const totalQty = nextMaterialLines.reduce(
      (sum, line) => sum.add(line.quantity),
      new Prisma.Decimal(0),
    );
    const totalAmount = nextMaterialLines.reduce(
      (sum, line) => sum.add(line.amount),
      new Prisma.Decimal(0),
    );

    return this.prisma.runInTransaction(async (tx) => {
      await this.repository.updateProject(
        id,
        {
          salesProjectCode: dto.salesProjectCode ?? existing.salesProjectCode,
          salesProjectName: dto.salesProjectName ?? existing.salesProjectName,
          bizDate: dto.bizDate ? new Date(dto.bizDate) : existing.bizDate,
          customerId: finalCustomerId,
          managerPersonnelId: finalManagerId,
          workshopId: finalWorkshopId,
          customerCodeSnapshot: customerSnapshot.customerCodeSnapshot,
          customerNameSnapshot: customerSnapshot.customerNameSnapshot,
          managerNameSnapshot: managerSnapshot.managerNameSnapshot,
          workshopNameSnapshot: workshop.workshopName,
          totalQty,
          totalAmount,
          remark: dto.remark ?? existing.remark,
          revisionNo: { increment: 1 },
          updatedBy,
        },
        tx,
      );

      if (dto.materialLines != null) {
        await this.repository.replaceProjectMaterialLines(
          id,
          nextMaterialLines.map((line, index) => ({
            lineNo: index + 1,
            materialId: line.materialId,
            materialCodeSnapshot: line.materialCodeSnapshot,
            materialNameSnapshot: line.materialNameSnapshot,
            materialSpecSnapshot: line.materialSpecSnapshot,
            unitCodeSnapshot: line.unitCodeSnapshot,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.amount,
            remark: line.remark,
            createdBy: updatedBy,
            updatedBy,
          })),
          tx,
        );
      }

      const latest = await this.requireProject(id, tx);
      await ensureSalesProjectTarget({
        project: latest,
        updatedBy,
        repository: this.repository,
        tx,
      });

      const refreshed = await this.requireProject(id, tx);
      return this.buildProjectView(refreshed, tx);
    });
  }

  async voidProject(id: number, voidReason?: string, voidedBy?: string) {
    const existing = await this.requireProject(id);
    if (existing.lifecycleStatus === DocumentLifecycleStatus.VOIDED) {
      throw new BadRequestException("销售项目已作废");
    }

    return this.prisma.runInTransaction(async (tx) => {
      await this.repository.updateProject(
        id,
        {
          lifecycleStatus: DocumentLifecycleStatus.VOIDED,
          voidReason: voidReason ?? null,
          voidedBy: voidedBy ?? null,
          voidedAt: new Date(),
          revisionNo: { increment: 1 },
          updatedBy: voidedBy,
        },
        tx,
      );

      const latest = await this.requireProject(id, tx);
      return this.buildProjectView(latest, tx);
    });
  }

  async listMaterials(projectId: number) {
    const project = await this.requireProject(projectId);
    return this.buildProjectView(project);
  }

  async createSalesOutboundDraft(
    projectId: number,
    dto: CreateSalesProjectOutboundDraftDto,
  ) {
    const project = await this.requireProject(projectId);
    if (project.lifecycleStatus === DocumentLifecycleStatus.VOIDED) {
      throw new BadRequestException("已作废的销售项目不能生成出库草稿");
    }

    const view = await this.buildProjectView(project);
    const rowByMaterialId = new Map(
      view.items.map((row: ProjectMaterialViewRow) => [row.materialId, row]),
    );
    const requestedLines = dto.lines?.length
      ? dto.lines
      : view.items
          .filter((row: ProjectMaterialViewRow) => row.pendingSupplyQty.gt(0))
          .map((row: ProjectMaterialViewRow) => ({
            materialId: row.materialId,
            quantity: row.pendingSupplyQty.toString(),
            unitPrice: row.targetUnitPrice.toString(),
            remark: row.remark ?? undefined,
          }));

    if (requestedLines.length === 0) {
      throw new BadRequestException("当前项目没有可生成出库草稿的待供货物料");
    }

    const bizDate = dto.bizDate ?? new Date().toISOString().slice(0, 10);
    const customerId = dto.customerId ?? project.customerId ?? undefined;
    const handlerPersonnelId =
      dto.handlerPersonnelId ?? project.managerPersonnelId ?? undefined;
    const workshopId = dto.workshopId ?? project.workshopId;

    const lines = requestedLines.map((line) => {
      const row = rowByMaterialId.get(line.materialId);
      if (!row) {
        throw new BadRequestException(
          `销售项目不存在对应物料上下文: materialId=${line.materialId}`,
        );
      }

      const quantity = line.quantity
        ? new Prisma.Decimal(line.quantity)
        : row.pendingSupplyQty.gt(0)
          ? row.pendingSupplyQty
          : row.targetQty;
      if (quantity.lte(0)) {
        throw new BadRequestException(
          `销售项目物料出库数量必须大于 0: materialId=${line.materialId}`,
        );
      }

      const unitPrice = new Prisma.Decimal(
        line.unitPrice ?? row.targetUnitPrice.toString(),
      );

      return {
        materialId: row.materialId,
        materialCode: row.materialCodeSnapshot,
        materialName: row.materialNameSnapshot,
        specification: row.materialSpecSnapshot ?? "",
        quantity: quantity.toString(),
        selectedUnitCost: "",
        unitPrice: unitPrice.toString(),
        salesProjectId: project.id,
        salesProjectCode: project.salesProjectCode,
        salesProjectName: project.salesProjectName,
        remark: line.remark ?? row.remark ?? "",
      };
    });

    return {
      orderId: undefined,
      documentNo: "",
      bizDate,
      customerId,
      customerCode: project.customerCodeSnapshot ?? "",
      customerName: project.customerNameSnapshot ?? "",
      handlerPersonnelId,
      handlerName: project.managerNameSnapshot ?? "",
      workshopId,
      workshopName: project.workshopNameSnapshot,
      remark: dto.remark ?? project.remark ?? "",
      salesProjectId: project.id,
      salesProjectCode: project.salesProjectCode,
      salesProjectName: project.salesProjectName,
      lines,
    };
  }

  async getProjectReferenceById(
    projectId: number,
    options?: { allowVoided?: boolean },
    tx?: Prisma.TransactionClient,
  ) {
    const result = await this.listProjectReferencesByIds(
      [projectId],
      options,
      tx,
    );
    const project = result.get(projectId);
    if (!project) {
      throw new NotFoundException(`${SALES_PROJECT_LABEL}不存在: ${projectId}`);
    }
    return project;
  }

  async listProjectReferencesByIds(
    projectIds: number[],
    options?: { allowVoided?: boolean },
    tx?: Prisma.TransactionClient,
  ) {
    const distinctIds = [...new Set(projectIds.filter(Boolean))];
    if (distinctIds.length === 0) {
      return new Map<number, SalesProjectBindingReference>();
    }

    const records = await this.repository.findProjectsByIds(distinctIds, tx);
    const recordById = new Map(records.map((record) => [record.id, record]));

    for (const projectId of distinctIds) {
      const record = recordById.get(projectId);
      if (!record) {
        throw new NotFoundException(
          `${SALES_PROJECT_LABEL}不存在: ${projectId}`,
        );
      }
      if (
        !options?.allowVoided &&
        record.lifecycleStatus === DocumentLifecycleStatus.VOIDED
      ) {
        throw new BadRequestException(
          `已作废的销售项目不能继续引用: ${projectId}`,
        );
      }
      requireProjectTargetId(record);
    }

    return new Map<number, SalesProjectBindingReference>(
      records.map((record) => [
        record.id,
        {
          id: record.id,
          salesProjectCode: record.salesProjectCode,
          salesProjectName: record.salesProjectName,
          customerId: record.customerId,
          workshopId: record.workshopId,
          projectTargetId: record.projectTargetId as number,
          lifecycleStatus: record.lifecycleStatus,
        },
      ]),
    );
  }

  private async requireProject(id: number, tx?: Prisma.TransactionClient) {
    const project = await this.repository.findProjectById(id, tx);
    if (!project) {
      throw new NotFoundException(`${SALES_PROJECT_LABEL}不存在: ${id}`);
    }
    return project;
  }

  private async buildProjectView(
    project: SalesProjectRecord,
    tx?: Prisma.TransactionClient,
  ) {
    const shipmentLines =
      await this.repository.findEffectiveShipmentLinesByProjectId(
        project.id,
        tx,
      );

    const ledgerSeed = new Map<number, ProjectMaterialViewRow>();

    for (const line of project.materialLines) {
      ledgerSeed.set(line.materialId, {
        materialId: line.materialId,
        materialCodeSnapshot: line.materialCodeSnapshot,
        materialNameSnapshot: line.materialNameSnapshot,
        materialSpecSnapshot: line.materialSpecSnapshot,
        unitCodeSnapshot: line.unitCodeSnapshot,
        targetQty: toDecimal(line.quantity),
        targetUnitPrice: toDecimal(line.unitPrice),
        targetAmount: toDecimal(line.amount),
        currentInventoryQty: new Prisma.Decimal(0),
        outboundQty: new Prisma.Decimal(0),
        outboundAmount: new Prisma.Decimal(0),
        outboundCostAmount: new Prisma.Decimal(0),
        returnQty: new Prisma.Decimal(0),
        returnAmount: new Prisma.Decimal(0),
        returnCostAmount: new Prisma.Decimal(0),
        netShipmentQty: new Prisma.Decimal(0),
        netShipmentAmount: new Prisma.Decimal(0),
        netShipmentCostAmount: new Prisma.Decimal(0),
        pendingSupplyQty: new Prisma.Decimal(0),
        remark: line.remark ?? null,
        lastShipmentDate: null,
      });
    }

    for (const line of shipmentLines) {
      const current = ledgerSeed.get(line.materialId) ?? {
        materialId: line.materialId,
        materialCodeSnapshot: line.materialCodeSnapshot,
        materialNameSnapshot: line.materialNameSnapshot,
        materialSpecSnapshot: line.materialSpecSnapshot,
        unitCodeSnapshot: line.unitCodeSnapshot,
        targetQty: new Prisma.Decimal(0),
        targetUnitPrice: new Prisma.Decimal(0),
        targetAmount: new Prisma.Decimal(0),
        currentInventoryQty: new Prisma.Decimal(0),
        outboundQty: new Prisma.Decimal(0),
        outboundAmount: new Prisma.Decimal(0),
        outboundCostAmount: new Prisma.Decimal(0),
        returnQty: new Prisma.Decimal(0),
        returnAmount: new Prisma.Decimal(0),
        returnCostAmount: new Prisma.Decimal(0),
        netShipmentQty: new Prisma.Decimal(0),
        netShipmentAmount: new Prisma.Decimal(0),
        netShipmentCostAmount: new Prisma.Decimal(0),
        pendingSupplyQty: new Prisma.Decimal(0),
        remark: line.remark ?? null,
        lastShipmentDate: null,
      };

      if (line.order.orderType === SalesStockOrderType.OUTBOUND) {
        current.outboundQty = current.outboundQty.add(toDecimal(line.quantity));
        current.outboundAmount = current.outboundAmount.add(
          toDecimal(line.amount),
        );
        current.outboundCostAmount = current.outboundCostAmount.add(
          toDecimal(line.costAmount),
        );
      } else {
        current.returnQty = current.returnQty.add(toDecimal(line.quantity));
        current.returnAmount = current.returnAmount.add(toDecimal(line.amount));
        current.returnCostAmount = current.returnCostAmount.add(
          toDecimal(line.costAmount),
        );
      }

      if (
        current.lastShipmentDate == null ||
        current.lastShipmentDate.getTime() < line.order.bizDate.getTime()
      ) {
        current.lastShipmentDate = line.order.bizDate;
      }

      ledgerSeed.set(line.materialId, current);
    }

    const items = await Promise.all(
      Array.from(ledgerSeed.values()).map(async (row) => {
        const balance = await this.inventoryService.getBalanceSnapshot(
          {
            materialId: row.materialId,
            stockScope: SALES_PROJECT_STOCK_SCOPE,
          },
          tx,
        );
        const currentInventoryQty = toDecimal(balance?.quantityOnHand);
        const netShipmentQty = row.outboundQty.sub(row.returnQty);
        const netShipmentAmount = row.outboundAmount.sub(row.returnAmount);
        const netShipmentCostAmount = row.outboundCostAmount.sub(
          row.returnCostAmount,
        );
        const pendingSupplyQty = maxZero(row.targetQty.sub(netShipmentQty));

        return {
          ...row,
          currentInventoryQty,
          netShipmentQty,
          netShipmentAmount,
          netShipmentCostAmount,
          pendingSupplyQty,
        };
      }),
    );

    const summary = items.reduce(
      (acc, row) => ({
        materialLineCount: acc.materialLineCount + 1,
        totalTargetQty: acc.totalTargetQty.add(row.targetQty),
        totalTargetAmount: acc.totalTargetAmount.add(row.targetAmount),
        totalCurrentInventoryQty: acc.totalCurrentInventoryQty.add(
          row.currentInventoryQty,
        ),
        totalOutboundQty: acc.totalOutboundQty.add(row.outboundQty),
        totalOutboundAmount: acc.totalOutboundAmount.add(row.outboundAmount),
        totalOutboundCostAmount: acc.totalOutboundCostAmount.add(
          row.outboundCostAmount,
        ),
        totalReturnQty: acc.totalReturnQty.add(row.returnQty),
        totalReturnAmount: acc.totalReturnAmount.add(row.returnAmount),
        totalReturnCostAmount: acc.totalReturnCostAmount.add(
          row.returnCostAmount,
        ),
        totalNetShipmentQty: acc.totalNetShipmentQty.add(row.netShipmentQty),
        totalNetShipmentAmount: acc.totalNetShipmentAmount.add(
          row.netShipmentAmount,
        ),
        totalNetShipmentCostAmount: acc.totalNetShipmentCostAmount.add(
          row.netShipmentCostAmount,
        ),
        totalPendingSupplyQty: acc.totalPendingSupplyQty.add(
          row.pendingSupplyQty,
        ),
      }),
      {
        materialLineCount: 0,
        totalTargetQty: new Prisma.Decimal(0),
        totalTargetAmount: new Prisma.Decimal(0),
        totalCurrentInventoryQty: new Prisma.Decimal(0),
        totalOutboundQty: new Prisma.Decimal(0),
        totalOutboundAmount: new Prisma.Decimal(0),
        totalOutboundCostAmount: new Prisma.Decimal(0),
        totalReturnQty: new Prisma.Decimal(0),
        totalReturnAmount: new Prisma.Decimal(0),
        totalReturnCostAmount: new Prisma.Decimal(0),
        totalNetShipmentQty: new Prisma.Decimal(0),
        totalNetShipmentAmount: new Prisma.Decimal(0),
        totalNetShipmentCostAmount: new Prisma.Decimal(0),
        totalPendingSupplyQty: new Prisma.Decimal(0),
      },
    );

    return {
      ...project,
      summary,
      items,
    };
  }

  private async validateProjectMasterData(dto: {
    customerId?: number;
    managerPersonnelId?: number;
    workshopId?: number;
    materialLines?: Array<{ materialId: number }>;
  }) {
    if (dto.workshopId) {
      await this.masterDataService.getWorkshopById(dto.workshopId);
    }
    if (dto.customerId) {
      await this.masterDataService.getCustomerById(dto.customerId);
    }
    if (dto.managerPersonnelId) {
      await this.masterDataService.getPersonnelById(dto.managerPersonnelId);
    }
    for (const line of dto.materialLines ?? []) {
      await this.masterDataService.getMaterialById(line.materialId);
    }
  }

  private async assertProjectCodeAvailable(
    salesProjectCode: string,
    excludeId?: number,
  ) {
    const existing = await this.repository.findProjectByCode(salesProjectCode);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `${SALES_PROJECT_LABEL}编码已存在: ${salesProjectCode}`,
      );
    }
  }

  private async resolveCustomerSnapshot(customerId?: number) {
    if (!customerId) {
      return {
        customerCodeSnapshot: null,
        customerNameSnapshot: null,
      };
    }
    const customer = await this.masterDataService.getCustomerById(customerId);
    return {
      customerCodeSnapshot: customer.customerCode,
      customerNameSnapshot: customer.customerName,
    };
  }

  private async resolveManagerSnapshot(managerPersonnelId?: number) {
    if (!managerPersonnelId) {
      return {
        managerNameSnapshot: null,
      };
    }
    const manager =
      await this.masterDataService.getPersonnelById(managerPersonnelId);
    return {
      managerNameSnapshot: manager.personnelName,
    };
  }

  private async buildMaterialLineWriteData(
    lines: Array<{
      materialId: number;
      quantity: string;
      unitPrice?: string;
      remark?: string;
    }>,
  ) {
    return Promise.all(
      lines.map(async (line) => {
        const material = await this.masterDataService.getMaterialById(
          line.materialId,
        );
        const quantity = new Prisma.Decimal(line.quantity);
        const unitPrice = new Prisma.Decimal(line.unitPrice ?? "0");
        return {
          materialId: material.id,
          materialCodeSnapshot: material.materialCode,
          materialNameSnapshot: material.materialName,
          materialSpecSnapshot: material.specModel ?? "",
          unitCodeSnapshot: material.unitCode,
          quantity,
          unitPrice,
          amount: quantity.mul(unitPrice),
          remark: line.remark,
        };
      }),
    );
  }
}
