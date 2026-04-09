import { Injectable } from "@nestjs/common";
import {
  AllocationTargetType,
  DocumentFamily,
  Prisma,
  ProjectMaterialActionType,
} from "../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { StockScopeCode } from "../../session/domain/user-session";

type DbClient = Prisma.TransactionClient | PrismaService;

const PROJECT_ACTION_DOCUMENT_TYPE = "ProjectMaterialAction";

@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(db?: DbClient) {
    return db ?? this.prisma;
  }

  async findProjects(
    params: {
      projectCode?: string;
      projectName?: string;
      bizDateFrom?: Date;
      bizDateTo?: Date;
      customerId?: number;
      supplierId?: number;
      workshopId?: number;
      stockScope?: StockScopeCode;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where: Prisma.ProjectWhereInput = {
      lifecycleStatus: "EFFECTIVE",
    };
    if (params.projectCode) {
      where.projectCode = { contains: params.projectCode };
    }
    if (params.projectName) {
      where.projectName = { contains: params.projectName };
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
    if (params.supplierId) {
      where.supplierId = params.supplierId;
    }
    if (params.workshopId) {
      where.workshopId = params.workshopId;
    }
    if (params.stockScope) {
      where.stockScope = {
        is: {
          scopeCode: params.stockScope,
        },
      };
    }

    const client = this.db(db);
    const [items, total] = await Promise.all([
      client.project.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: [{ bizDate: "desc" }, { id: "desc" }],
        include: {
          stockScope: true,
          bomLines: { orderBy: { lineNo: "asc" } },
        },
      }),
      client.project.count({ where }),
    ]);

    return { items, total };
  }

  async findProjectById(id: number, db?: DbClient) {
    return this.db(db).project.findUnique({
      where: { id },
      include: {
        stockScope: true,
        bomLines: { orderBy: { lineNo: "asc" } },
        materialLines: { orderBy: { lineNo: "asc" } },
        materialActions: {
          orderBy: [{ bizDate: "desc" }, { id: "desc" }],
          include: {
            stockScope: true,
            lines: { orderBy: { lineNo: "asc" } },
          },
        },
      },
    });
  }

  async findProjectByCode(projectCode: string, db?: DbClient) {
    return this.db(db).project.findUnique({
      where: { projectCode },
      include: {
        stockScope: true,
        bomLines: { orderBy: { lineNo: "asc" } },
      },
    });
  }

  async createProject(
    data: Prisma.ProjectUncheckedCreateInput,
    bomLines: Omit<Prisma.ProjectBomLineUncheckedCreateInput, "projectId">[],
    db?: DbClient,
  ) {
    const client = this.db(db);
    const project = await client.project.create({ data });
    if (bomLines.length > 0) {
      await client.projectBomLine.createMany({
        data: bomLines.map((line) => ({
          ...line,
          projectId: project.id,
        })),
      });
    }

    const result = await this.findProjectById(project.id, client);
    if (!result) {
      throw new Error("Project creation failed");
    }
    return result;
  }

  async updateProject(
    id: number,
    data: Prisma.ProjectUncheckedUpdateInput,
    db?: DbClient,
  ) {
    return this.db(db).project.update({
      where: { id },
      data,
      include: {
        stockScope: true,
        bomLines: { orderBy: { lineNo: "asc" } },
        materialLines: { orderBy: { lineNo: "asc" } },
        materialActions: {
          orderBy: [{ bizDate: "desc" }, { id: "desc" }],
          include: {
            stockScope: true,
            lines: { orderBy: { lineNo: "asc" } },
          },
        },
      },
    });
  }

  async replaceProjectBomLines(
    projectId: number,
    lines: Omit<Prisma.ProjectBomLineUncheckedCreateInput, "projectId">[],
    db?: DbClient,
  ) {
    const client = this.db(db);
    await client.projectBomLine.deleteMany({
      where: { projectId },
    });
    if (lines.length > 0) {
      await client.projectBomLine.createMany({
        data: lines.map((line) => ({
          ...line,
          projectId,
        })),
      });
    }
    return client.projectBomLine.findMany({
      where: { projectId },
      orderBy: { lineNo: "asc" },
    });
  }

  async findAllocationTargetBySource(
    params: {
      targetType: AllocationTargetType;
      sourceDocumentType: string;
      sourceDocumentId: number;
    },
    db?: DbClient,
  ) {
    return this.db(db).allocationTarget.findFirst({
      where: {
        targetType: params.targetType,
        sourceDocumentType: params.sourceDocumentType,
        sourceDocumentId: params.sourceDocumentId,
      },
    });
  }

  async createAllocationTarget(
    data: Prisma.AllocationTargetUncheckedCreateInput,
    db?: DbClient,
  ) {
    return this.db(db).allocationTarget.create({ data });
  }

  async updateAllocationTarget(
    id: number,
    data: Prisma.AllocationTargetUncheckedUpdateInput,
    db?: DbClient,
  ) {
    return this.db(db).allocationTarget.update({
      where: { id },
      data,
    });
  }

  async attachAllocationTargetToProject(
    projectId: number,
    allocationTargetId: number,
    updatedBy?: string,
    db?: DbClient,
  ) {
    return this.db(db).project.update({
      where: { id: projectId },
      data: {
        allocationTargetId,
        updatedBy,
      },
    });
  }

  async findMaterialActionsByProjectId(projectId: number, db?: DbClient) {
    return this.db(db).projectMaterialAction.findMany({
      where: { projectId },
      orderBy: [{ bizDate: "desc" }, { id: "desc" }],
      include: {
        stockScope: true,
        lines: { orderBy: { lineNo: "asc" } },
      },
    });
  }

  async findMaterialActionById(id: number, db?: DbClient) {
    return this.db(db).projectMaterialAction.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            stockScope: true,
          },
        },
        stockScope: true,
        lines: { orderBy: { lineNo: "asc" } },
      },
    });
  }

  async createMaterialAction(
    data: Prisma.ProjectMaterialActionUncheckedCreateInput,
    lines: Omit<
      Prisma.ProjectMaterialActionLineUncheckedCreateInput,
      "actionId"
    >[],
    db?: DbClient,
  ) {
    const client = this.db(db);
    const action = await client.projectMaterialAction.create({ data });
    await client.projectMaterialActionLine.createMany({
      data: lines.map((line) => ({
        ...line,
        actionId: action.id,
      })),
    });
    const result = await this.findMaterialActionById(action.id, client);
    if (!result) {
      throw new Error("Project material action creation failed");
    }
    return result;
  }

  async updateMaterialAction(
    id: number,
    data: Prisma.ProjectMaterialActionUncheckedUpdateInput,
    db?: DbClient,
  ) {
    return this.db(db).projectMaterialAction.update({
      where: { id },
      data,
      include: {
        project: {
          include: {
            stockScope: true,
          },
        },
        stockScope: true,
        lines: { orderBy: { lineNo: "asc" } },
      },
    });
  }

  async updateMaterialActionLineCost(
    id: number,
    data: {
      costUnitPrice: Prisma.Decimal;
      costAmount: Prisma.Decimal;
    },
    db?: DbClient,
  ) {
    return this.db(db).projectMaterialActionLine.update({
      where: { id },
      data,
    });
  }

  async hasActiveReturnDownstream(actionId: number, db?: DbClient) {
    const count = await this.db(db).projectMaterialActionLine.count({
      where: {
        sourceDocumentType: PROJECT_ACTION_DOCUMENT_TYPE,
        sourceDocumentId: actionId,
        action: {
          lifecycleStatus: "EFFECTIVE",
          actionType: ProjectMaterialActionType.RETURN,
        },
      },
    });
    return count > 0;
  }

  async sumActiveReturnedQtyBySourceLine(
    actionId: number,
    db?: DbClient,
  ): Promise<Map<number, Prisma.Decimal>> {
    const rows = await this.db(db).projectMaterialActionLine.findMany({
      where: {
        sourceDocumentType: PROJECT_ACTION_DOCUMENT_TYPE,
        sourceDocumentId: actionId,
        action: {
          lifecycleStatus: "EFFECTIVE",
          actionType: ProjectMaterialActionType.RETURN,
        },
      },
      select: {
        sourceDocumentLineId: true,
        quantity: true,
      },
    });

    const totals = new Map<number, Prisma.Decimal>();
    for (const row of rows) {
      if (row.sourceDocumentLineId == null) {
        continue;
      }
      const current =
        totals.get(row.sourceDocumentLineId) ?? new Prisma.Decimal(0);
      totals.set(
        row.sourceDocumentLineId,
        current.add(new Prisma.Decimal(row.quantity)),
      );
    }
    return totals;
  }

  async hasActiveDownstreamDependencies(projectId: number, db?: DbClient) {
    const count = await this.db(db).documentRelation.count({
      where: {
        upstreamFamily: DocumentFamily.PROJECT,
        upstreamDocumentId: projectId,
        isActive: true,
      },
    });
    return count > 0;
  }

  async hasEffectiveMaterialActions(projectId: number, db?: DbClient) {
    const count = await this.db(db).projectMaterialAction.count({
      where: {
        projectId,
        lifecycleStatus: "EFFECTIVE",
      },
    });
    return count > 0;
  }
}
