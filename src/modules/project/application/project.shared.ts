import { BadRequestException } from "@nestjs/common";
import {
  AllocationTargetType,
  InventoryOperationType,
  Prisma,
  ProjectMaterialActionType,
} from "../../../generated/prisma/client";
import {
  buildCompactDocumentNo,
  createWithGeneratedDocumentNo,
} from "../../../shared/common/document-number.util";
import type { ProjectRepository } from "../infrastructure/project.repository";

export const FIXED_PROJECT_STOCK_SCOPE = "RD_SUB" as const;
export const PROJECT_DOCUMENT_TYPE = "Project";
export const PROJECT_ACTION_DOCUMENT_TYPE = "ProjectMaterialAction";
export const PROJECT_BUSINESS_MODULE = "project";
export const ZERO = new Prisma.Decimal(0);

export function toDecimal(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  if (value == null) {
    return new Prisma.Decimal(0);
  }
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function maxZero(value: Prisma.Decimal) {
  return Prisma.Decimal.max(value, ZERO);
}

export function toProjectInventoryOperationType(
  actionType: ProjectMaterialActionType,
) {
  switch (actionType) {
    case ProjectMaterialActionType.PICK:
      return InventoryOperationType.PICK_OUT;
    case ProjectMaterialActionType.RETURN:
      return InventoryOperationType.RETURN_IN;
    case ProjectMaterialActionType.SCRAP:
      return InventoryOperationType.SCRAP_OUT;
    default:
      throw new BadRequestException(`Unsupported actionType: ${actionType}`);
  }
}

function getActionPrefix(actionType: ProjectMaterialActionType) {
  switch (actionType) {
    case ProjectMaterialActionType.PICK:
      return "PJP";
    case ProjectMaterialActionType.RETURN:
      return "PJR";
    case ProjectMaterialActionType.SCRAP:
      return "PJS";
    default:
      throw new BadRequestException(`Unsupported actionType: ${actionType}`);
  }
}

export async function createProjectActionDocumentNo(
  actionType: ProjectMaterialActionType,
  bizDate: Date,
  factory: (documentNo: string) => Promise<unknown>,
) {
  const prefix = getActionPrefix(actionType);
  return createWithGeneratedDocumentNo((attempt) =>
    factory(buildCompactDocumentNo(prefix, bizDate, attempt)),
  );
}

export async function ensureProjectAllocationTarget(params: {
  project: {
    id: number;
    projectCode: string;
    projectName: string;
    allocationTargetId?: number | null;
  };
  updatedBy?: string;
  repository: ProjectRepository;
  tx: Prisma.TransactionClient;
}) {
  const { project, updatedBy, repository, tx } = params;

  if (project.allocationTargetId) {
    return project.allocationTargetId;
  }

  const existing = await repository.findAllocationTargetBySource(
    {
      targetType: AllocationTargetType.RD_PROJECT,
      sourceDocumentType: PROJECT_DOCUMENT_TYPE,
      sourceDocumentId: project.id,
    },
    tx,
  );

  if (existing) {
    const target =
      existing.targetCode !== project.projectCode ||
      existing.targetName !== project.projectName
        ? await repository.updateAllocationTarget(
            existing.id,
            {
              targetCode: project.projectCode,
              targetName: project.projectName,
              updatedBy,
            },
            tx,
          )
        : existing;

    await repository.attachAllocationTargetToProject(
      project.id,
      target.id,
      updatedBy,
      tx,
    );
    return target.id;
  }

  const created = await repository.createAllocationTarget(
    {
      targetType: AllocationTargetType.RD_PROJECT,
      targetCode: project.projectCode,
      targetName: project.projectName,
      sourceDocumentType: PROJECT_DOCUMENT_TYPE,
      sourceDocumentId: project.id,
      createdBy: updatedBy,
      updatedBy,
    },
    tx,
  );

  await repository.attachAllocationTargetToProject(
    project.id,
    created.id,
    updatedBy,
    tx,
  );
  return created.id;
}
