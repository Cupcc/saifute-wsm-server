import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditStatusSnapshot,
  DocumentLifecycleStatus,
  InventoryEffectStatus,
  InventoryOperationType,
  Prisma,
  StockDirection,
} from "../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { InventoryService } from "../../inventory-core/application/inventory.service";
import { MasterDataService } from "../../master-data/application/master-data.service";
import type { CreateRdHandoffOrderDto } from "../dto/create-rd-handoff-order.dto";
import type { QueryRdHandoffOrderDto } from "../dto/query-rd-handoff-order.dto";
import { RdHandoffRepository } from "../infrastructure/rd-handoff.repository";

const DOCUMENT_TYPE = "RdHandoffOrder";
const BUSINESS_MODULE = "rd-subwarehouse";
const RD_SUBWAREHOUSE_CODE = "RD";
const MAIN_WAREHOUSE_CODE = "MAIN";

@Injectable()
export class RdHandoffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RdHandoffRepository,
    private readonly masterDataService: MasterDataService,
    private readonly inventoryService: InventoryService,
  ) {}

  async listOrders(query: QueryRdHandoffOrderDto) {
    const limit = Math.min(query.limit ?? 50, 100);
    const offset = query.offset ?? 0;
    return this.repository.findOrders({
      documentNo: query.documentNo,
      bizDateFrom: query.bizDateFrom ? new Date(query.bizDateFrom) : undefined,
      bizDateTo: query.bizDateTo ? new Date(query.bizDateTo) : undefined,
      handlerName: query.handlerName,
      materialId: query.materialId,
      materialName: query.materialName,
      sourceWorkshopId: query.sourceWorkshopId,
      targetWorkshopId: query.targetWorkshopId,
      limit,
      offset,
    });
  }

  async getOrderById(id: number) {
    const order = await this.repository.findOrderById(id);
    if (!order) {
      throw new NotFoundException(`RD 交接单不存在: ${id}`);
    }
    return order;
  }

  async createOrder(dto: CreateRdHandoffOrderDto, createdBy?: string) {
    const existing = await this.repository.findOrderByDocumentNo(
      dto.documentNo,
    );
    if (existing) {
      throw new ConflictException(`单据编号已存在: ${dto.documentNo}`);
    }

    const [sourceWorkshop, targetWorkshop] = await Promise.all([
      this.masterDataService.getWorkshopById(dto.sourceWorkshopId),
      this.masterDataService.getWorkshopByCode(RD_SUBWAREHOUSE_CODE),
    ]);
    if (sourceWorkshop.id === targetWorkshop.id) {
      throw new BadRequestException("主仓与 RD 小仓不能是同一车间");
    }
    if (sourceWorkshop.workshopCode === RD_SUBWAREHOUSE_CODE) {
      throw new BadRequestException("RD 小仓不能作为主仓交接来源");
    }
    if (sourceWorkshop.workshopCode !== MAIN_WAREHOUSE_CODE) {
      throw new BadRequestException("当前切片只允许主仓发起到 RD 小仓的交接");
    }

    const handlerSnapshot = dto.handlerPersonnelId
      ? await this.resolveHandlerSnapshot(dto.handlerPersonnelId)
      : { handlerNameSnapshot: null };

    const bizDate = new Date(dto.bizDate);
    const linesWithSnapshots = await Promise.all(
      dto.lines.map(async (line, idx) => {
        const material = await this.masterDataService.getMaterialById(
          line.materialId,
        );
        const quantity = new Prisma.Decimal(line.quantity);
        const unitPrice = new Prisma.Decimal(line.unitPrice ?? "0");
        const amount = quantity.mul(unitPrice);
        return {
          lineNo: idx + 1,
          materialId: material.id,
          materialCodeSnapshot: material.materialCode,
          materialNameSnapshot: material.materialName,
          materialSpecSnapshot: material.specModel ?? "",
          unitCodeSnapshot: material.unitCode,
          quantity,
          unitPrice,
          amount,
          remark: line.remark,
        };
      }),
    );

    const totalQty = linesWithSnapshots.reduce(
      (sum, line) => sum.add(line.quantity),
      new Prisma.Decimal(0),
    );
    const totalAmount = linesWithSnapshots.reduce(
      (sum, line) => sum.add(line.amount),
      new Prisma.Decimal(0),
    );

    return this.prisma.runInTransaction(async (tx) => {
      const order = await this.repository.createOrder(
        {
          documentNo: dto.documentNo,
          bizDate,
          handlerPersonnelId: dto.handlerPersonnelId,
          sourceWorkshopId: sourceWorkshop.id,
          targetWorkshopId: targetWorkshop.id,
          auditStatusSnapshot: AuditStatusSnapshot.NOT_REQUIRED,
          handlerNameSnapshot: handlerSnapshot.handlerNameSnapshot,
          sourceWorkshopNameSnapshot: sourceWorkshop.workshopName,
          targetWorkshopNameSnapshot: targetWorkshop.workshopName,
          totalQty,
          totalAmount,
          remark: dto.remark,
          createdBy,
          updatedBy: createdBy,
        },
        linesWithSnapshots.map((line) => ({
          ...line,
          createdBy,
          updatedBy: createdBy,
        })),
        tx,
      );

      for (const line of order.lines) {
        await this.inventoryService.decreaseStock(
          {
            materialId: line.materialId,
            workshopId: order.sourceWorkshopId,
            quantity: line.quantity,
            operationType: InventoryOperationType.RD_HANDOFF_OUT,
            businessModule: BUSINESS_MODULE,
            businessDocumentType: DOCUMENT_TYPE,
            businessDocumentId: order.id,
            businessDocumentNumber: order.documentNo,
            businessDocumentLineId: line.id,
            operatorId: createdBy,
            idempotencyKey: `${DOCUMENT_TYPE}:${order.id}:out:${line.id}`,
            note: `主仓交接到 RD 小仓: ${order.sourceWorkshopNameSnapshot} -> ${order.targetWorkshopNameSnapshot}`,
          },
          tx,
        );
        await this.inventoryService.increaseStock(
          {
            materialId: line.materialId,
            workshopId: order.targetWorkshopId,
            quantity: line.quantity,
            operationType: InventoryOperationType.RD_HANDOFF_IN,
            businessModule: BUSINESS_MODULE,
            businessDocumentType: DOCUMENT_TYPE,
            businessDocumentId: order.id,
            businessDocumentNumber: order.documentNo,
            businessDocumentLineId: line.id,
            operatorId: createdBy,
            idempotencyKey: `${DOCUMENT_TYPE}:${order.id}:in:${line.id}`,
            note: `主仓交接到 RD 小仓: ${order.sourceWorkshopNameSnapshot} -> ${order.targetWorkshopNameSnapshot}`,
          },
          tx,
        );
      }

      return order;
    });
  }

  async voidOrder(id: number, voidReason?: string, voidedBy?: string) {
    const order = await this.repository.findOrderById(id);
    if (!order) {
      throw new NotFoundException(`RD 交接单不存在: ${id}`);
    }
    if (order.lifecycleStatus === DocumentLifecycleStatus.VOIDED) {
      throw new BadRequestException("单据已作废");
    }
    if (order.inventoryEffectStatus !== InventoryEffectStatus.POSTED) {
      throw new BadRequestException("库存状态异常，无法作废");
    }

    return this.prisma.runInTransaction(async (tx) => {
      const logs = await this.inventoryService.getLogsForDocument(
        {
          businessDocumentType: DOCUMENT_TYPE,
          businessDocumentId: id,
        },
        tx,
      );
      if (logs.length === 0) {
        throw new BadRequestException("未找到可冲回的库存流水");
      }

      const orderedLogs = [...logs].sort((left, right) => {
        if (left.direction === right.direction) {
          return left.id - right.id;
        }
        return left.direction === StockDirection.IN ? -1 : 1;
      });

      for (const log of orderedLogs) {
        await this.inventoryService.reverseStock(
          {
            logIdToReverse: log.id,
            idempotencyKey: `${DOCUMENT_TYPE}:void:${id}:log:${log.id}`,
            note: `作废 RD 交接单: ${order.documentNo}`,
          },
          tx,
        );
      }

      await this.repository.updateOrder(
        id,
        {
          lifecycleStatus: DocumentLifecycleStatus.VOIDED,
          inventoryEffectStatus: InventoryEffectStatus.REVERSED,
          auditStatusSnapshot: AuditStatusSnapshot.NOT_REQUIRED,
          voidReason: voidReason ?? null,
          voidedBy: voidedBy ?? null,
          voidedAt: new Date(),
          updatedBy: voidedBy,
        },
        tx,
      );

      return this.repository.findOrderById(id, tx);
    });
  }

  private async resolveHandlerSnapshot(handlerPersonnelId: number) {
    const personnel =
      await this.masterDataService.getPersonnelById(handlerPersonnelId);
    return { handlerNameSnapshot: personnel.personnelName };
  }
}
