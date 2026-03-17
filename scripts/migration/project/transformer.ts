import {
  DEFAULT_WORKSHOP_CODE,
  DEFAULT_WORKSHOP_NAME,
  normalizeOptionalText,
} from "../shared/deterministic";
import type {
  ArchivedFieldPayloadRecord,
  DocumentLifecycleStatusValue,
  ExcludedProjectPlanRecord,
  LegacyProjectLineRow,
  LegacyProjectRow,
  LegacyProjectSnapshot,
  ProjectDependencySnapshot,
  ProjectGlobalBlocker,
  ProjectLinePlanRecord,
  ProjectMigrationPlan,
  ProjectPlanCounts,
  ProjectPlanRecord,
  ProjectTargetInsert,
  ProjectWarning,
  ResolvedCustomerDependency,
  ResolvedMaterialDependency,
  ResolvedPersonnelDependency,
  ResolvedWorkshopDependency,
} from "./types";
import { PROJECT_MIGRATION_BATCH } from "./types";

interface ParsedDecimal {
  sign: 1 | -1;
  digits: string;
  scale: number;
}

interface PreparedLine {
  source: LegacyProjectLineRow;
  material: ResolvedMaterialDependency;
  materialNameSnapshot: string;
  materialSpecSnapshot: string | null;
  unitCodeSnapshot: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

interface PreparedHeaderDependencies {
  customer: ResolvedCustomerDependency | null;
  customerCodeSnapshot: string | null;
  customerNameSnapshot: string | null;
  manager: ResolvedPersonnelDependency | null;
  managerNameSnapshot: string | null;
  workshop: ResolvedWorkshopDependency;
}

function buildLegacyKey(legacyTable: string, legacyId: number): string {
  return `${legacyTable}::${legacyId}`;
}

function buildProjectKey(
  project: Pick<LegacyProjectRow, "legacyTable" | "legacyId">,
): string {
  return buildLegacyKey(project.legacyTable, project.legacyId);
}

function normalizePersonnelLookupName(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replace(/\s+/gu, " ") : null;
}

function parseDecimalInput(
  value: string | number | null | undefined,
): ParsedDecimal | null {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^([+-])?(\d+)(?:\.(\d+))?$/u);

  if (!match) {
    return null;
  }

  const [, signSymbol, integerPartRaw, fractionalPartRaw = ""] = match;
  const digits = `${integerPartRaw}${fractionalPartRaw}`.replace(
    /^0+(?=\d)/u,
    "",
  );
  const normalizedDigits = digits.length > 0 ? digits : "0";
  const sign =
    signSymbol === "-" && normalizedDigits !== "0"
      ? (-1 as const)
      : (1 as const);

  return {
    sign,
    digits: normalizedDigits,
    scale: fractionalPartRaw.length,
  };
}

function pow10(power: number): bigint {
  return 10n ** BigInt(power);
}

function roundScaledInteger(
  value: bigint,
  currentScale: number,
  targetScale: number,
): bigint {
  if (currentScale <= targetScale) {
    return value * pow10(targetScale - currentScale);
  }

  const divisor = pow10(currentScale - targetScale);
  const quotient = value / divisor;
  const remainder = value % divisor;
  const absoluteRemainder = remainder < 0n ? -remainder : remainder;

  if (absoluteRemainder * 2n >= divisor && remainder !== 0n) {
    return quotient + (value >= 0n ? 1n : -1n);
  }

  return quotient;
}

function toScaledInteger(
  value: string | number | null | undefined,
  scale: number,
): bigint | null {
  const parsed = parseDecimalInput(value);

  if (!parsed) {
    return null;
  }

  const signedInteger = BigInt(parsed.digits) * BigInt(parsed.sign);
  return roundScaledInteger(signedInteger, parsed.scale, scale);
}

function formatScaledInteger(value: bigint, scale: number): string {
  const isNegative = value < 0n;
  const absoluteValue = isNegative ? -value : value;
  const rawDigits = absoluteValue.toString().padStart(scale + 1, "0");

  if (scale === 0) {
    return `${isNegative ? "-" : ""}${rawDigits}`;
  }

  const integerPart = rawDigits.slice(0, -scale) || "0";
  const fractionalPart = rawDigits.slice(-scale);
  return `${isNegative ? "-" : ""}${integerPart}.${fractionalPart}`;
}

function normalizeDecimalToScale(
  value: string | number | null | undefined,
  scale: number,
): string | null {
  const scaledInteger = toScaledInteger(value, scale);
  return scaledInteger === null
    ? null
    : formatScaledInteger(scaledInteger, scale);
}

function sumDecimalValues(
  values: Array<string | number | null | undefined>,
  scale: number,
): string {
  const total = values.reduce<bigint>((runningTotal, value) => {
    const scaledInteger = toScaledInteger(value, scale);
    return runningTotal + (scaledInteger ?? 0n);
  }, 0n);

  return formatScaledInteger(total, scale);
}

function multiplyToAmount(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
): string | null {
  const parsedLeft = parseDecimalInput(left);
  const parsedRight = parseDecimalInput(right);

  if (!parsedLeft || !parsedRight) {
    return null;
  }

  const sign =
    parsedLeft.sign * parsedRight.sign >= 0 ? (1 as const) : (-1 as const);
  const product =
    BigInt(parsedLeft.digits) * BigInt(parsedRight.digits) * BigInt(sign);
  return formatScaledInteger(
    roundScaledInteger(product, parsedLeft.scale + parsedRight.scale, 2),
    2,
  );
}

function normalizeDate(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/u);
  return match?.[1] ?? null;
}

function normalizeDateTime(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  return normalized.length >= 19 ? normalized.slice(0, 19) : normalized;
}

function normalizePositiveLegacyId(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function buildProjectCode(legacyId: number): string {
  return `PRJ-LEGACY-${legacyId}`;
}

function resolveBizDate(project: LegacyProjectRow): string | null {
  return (
    normalizeDate(project.orderDate) ??
    normalizeDate(project.outBoundDate) ??
    normalizeDate(project.createdAt)
  );
}

function toLifecycleStatus(
  delFlag: string | number | null | undefined,
): DocumentLifecycleStatusValue {
  return String(delFlag ?? "0") === "2" ? "VOIDED" : "EFFECTIVE";
}

function buildLinesByProjectKey(
  lines: readonly LegacyProjectLineRow[],
): Map<string, LegacyProjectLineRow[]> {
  const linesByProjectKey = new Map<string, LegacyProjectLineRow[]>();

  for (const line of [...lines].sort(
    (left, right) =>
      left.parentLegacyTable.localeCompare(right.parentLegacyTable) ||
      left.parentLegacyId - right.parentLegacyId ||
      left.legacyId - right.legacyId,
  )) {
    const projectKey = buildLegacyKey(
      line.parentLegacyTable,
      line.parentLegacyId,
    );
    const existingLines = linesByProjectKey.get(projectKey) ?? [];
    existingLines.push(line);
    linesByProjectKey.set(projectKey, existingLines);
  }

  return linesByProjectKey;
}

function buildProjectArchivedPayload(
  project: LegacyProjectRow,
  targetProjectCode: string,
): ArchivedFieldPayloadRecord {
  return {
    legacyTable: project.legacyTable,
    legacyId: project.legacyId,
    targetTable: "project",
    targetCode: targetProjectCode,
    payloadKind: "legacy-unmapped-fields",
    archiveReason: "Archive source-only project header fields.",
    payload: {
      classification: normalizeOptionalText(project.classification),
      salesman: normalizeOptionalText(project.salesman),
      outBoundDate: normalizeDate(project.outBoundDate),
    },
  };
}

function buildLineArchivedPayload(
  line: LegacyProjectLineRow,
  targetCode: string,
): ArchivedFieldPayloadRecord {
  return {
    legacyTable: line.legacyTable,
    legacyId: line.legacyId,
    targetTable: "project_material_line",
    targetCode,
    payloadKind: "legacy-unmapped-fields",
    archiveReason: "Archive source-only project material line fields.",
    payload: {
      acceptanceDate: normalizeDate(line.acceptanceDate),
      instruction: normalizeOptionalText(line.instruction),
      interval: normalizeOptionalText(line.interval),
      supplierLegacyId: normalizePositiveLegacyId(line.supplierLegacyId),
      taxIncludedPrice: normalizeDecimalToScale(line.taxIncludedPrice, 2),
    },
  };
}

function buildExcludedProjectPlan(
  project: LegacyProjectRow,
  lines: readonly LegacyProjectLineRow[],
  targetProjectCodeCandidate: string,
  exclusionReasons: string[],
): ExcludedProjectPlanRecord {
  return {
    legacyTable: project.legacyTable,
    legacyId: project.legacyId,
    exclusionReason: exclusionReasons.join("; "),
    payload: {
      targetProjectCodeCandidate,
      projectName: normalizeOptionalText(project.projectName),
      customerLegacyId: normalizePositiveLegacyId(project.customerLegacyId),
      customerName: normalizeOptionalText(project.customerName),
      classification: normalizeOptionalText(project.classification),
      salesman: normalizeOptionalText(project.salesman),
      totalAmount: normalizeDecimalToScale(project.totalAmount, 2),
      orderDate: normalizeDate(project.orderDate),
      outBoundDate: normalizeDate(project.outBoundDate),
      bizDate: resolveBizDate(project),
      remark: normalizeOptionalText(project.remark),
      lifecycleStatus: toLifecycleStatus(project.delFlag),
      createdBy: normalizeOptionalText(project.createdBy),
      createdAt: normalizeDateTime(project.createdAt),
      updatedBy: normalizeOptionalText(project.updatedBy),
      updatedAt: normalizeDateTime(project.updatedAt),
      exclusionReasons,
      lines: lines.map((line) => ({
        legacyTable: line.legacyTable,
        legacyId: line.legacyId,
        materialLegacyId: normalizePositiveLegacyId(line.materialLegacyId),
        materialName: normalizeOptionalText(line.materialName),
        materialSpec: normalizeOptionalText(line.materialSpec),
        quantity: normalizeDecimalToScale(line.quantity, 6),
        unitPrice:
          normalizeDecimalToScale(line.unitPrice, 2) ??
          formatScaledInteger(0n, 2),
        remark: normalizeOptionalText(line.remark),
        unit: normalizeOptionalText(line.unit),
        acceptanceDate: normalizeDate(line.acceptanceDate),
        supplierLegacyId: normalizePositiveLegacyId(line.supplierLegacyId),
        taxIncludedPrice: normalizeDecimalToScale(line.taxIncludedPrice, 2),
        instruction: normalizeOptionalText(line.instruction),
        interval: normalizeOptionalText(line.interval),
      })),
    },
  };
}

function pushGlobalBlockers(
  globalBlockers: ProjectGlobalBlocker[],
  dependencies: ProjectDependencySnapshot,
): void {
  for (const issue of dependencies.batch1Baseline.issues) {
    globalBlockers.push({
      reason: issue,
    });
  }

  if (!dependencies.defaultWorkshop) {
    globalBlockers.push({
      reason:
        "Frozen default workshop is missing from the migrated workshop staging map.",
      details: {
        expectedWorkshopCode: DEFAULT_WORKSHOP_CODE,
        expectedWorkshopName: DEFAULT_WORKSHOP_NAME,
      },
    });
  }
}

function pushDependencyWarnings(
  warnings: ProjectWarning[],
  dependencies: ProjectDependencySnapshot,
): void {
  for (const ambiguousName of Array.from(
    dependencies.ambiguousPersonnelNames,
  ).sort((left, right) => left.localeCompare(right))) {
    warnings.push({
      legacyTable: "personnel",
      legacyId: null,
      reason:
        "Target personnel snapshot contains ambiguous names; manager matches will preserve managerNameSnapshot without managerPersonnelId.",
      details: {
        personnelName: ambiguousName,
      },
    });
  }
}

function resolveHeaderDependencies(
  project: LegacyProjectRow,
  dependencies: ProjectDependencySnapshot,
  exclusionReasons: string[],
  warnings: ProjectWarning[],
): PreparedHeaderDependencies | null {
  const customerLegacyId = normalizePositiveLegacyId(project.customerLegacyId);
  const legacyCustomerName = normalizeOptionalText(project.customerName);
  const normalizedSalesman = normalizePersonnelLookupName(project.salesman);
  const workshop = dependencies.defaultWorkshop;

  if (!workshop) {
    exclusionReasons.push(
      "Frozen default workshop is unavailable in the migrated workshop staging map.",
    );
    return null;
  }

  let customer: ResolvedCustomerDependency | null = null;
  let customerCodeSnapshot: string | null = null;
  let customerNameSnapshot: string | null = legacyCustomerName;

  if (customerLegacyId !== null) {
    customer =
      dependencies.customerByLegacyKey.get(
        buildLegacyKey("saifute_customer", customerLegacyId),
      ) ?? null;

    if (!customer) {
      warnings.push({
        legacyTable: project.legacyTable,
        legacyId: project.legacyId,
        reason:
          "Customer dependency is missing from the batch1 customer map; preserving customer snapshot without customerId.",
        details: {
          customerLegacyId,
          customerName: legacyCustomerName,
        },
      });
    } else {
      customerCodeSnapshot = customer.customerCode;
      customerNameSnapshot = customer.customerName;
    }
  }

  let manager: ResolvedPersonnelDependency | null = null;
  let managerNameSnapshot: string | null = normalizeOptionalText(
    project.salesman,
  );

  if (normalizedSalesman !== null) {
    if (dependencies.ambiguousPersonnelNames.has(normalizedSalesman)) {
      warnings.push({
        legacyTable: project.legacyTable,
        legacyId: project.legacyId,
        reason:
          "Manager personnel name is ambiguous in the migrated personnel snapshot; preserving managerNameSnapshot without managerPersonnelId.",
        details: {
          salesman: normalizedSalesman,
        },
      });
    } else {
      manager =
        dependencies.personnelByNormalizedName.get(normalizedSalesman) ?? null;

      if (!manager) {
        warnings.push({
          legacyTable: project.legacyTable,
          legacyId: project.legacyId,
          reason:
            "Manager personnel name is missing from the migrated personnel snapshot; preserving managerNameSnapshot without managerPersonnelId.",
          details: {
            salesman: normalizedSalesman,
          },
        });
      } else {
        managerNameSnapshot = manager.personnelName;
      }
    }
  }

  return {
    customer,
    customerCodeSnapshot,
    customerNameSnapshot,
    manager,
    managerNameSnapshot,
    workshop,
  };
}

function prepareLines(
  lines: readonly LegacyProjectLineRow[],
  dependencies: ProjectDependencySnapshot,
  exclusionReasons: string[],
): PreparedLine[] {
  const preparedLines: PreparedLine[] = [];

  for (const line of [...lines].sort(
    (left, right) => left.legacyId - right.legacyId,
  )) {
    const materialLegacyId = normalizePositiveLegacyId(line.materialLegacyId);
    if (materialLegacyId === null) {
      exclusionReasons.push(
        `Line ${line.legacyTable}#${line.legacyId} is missing material_id.`,
      );
      continue;
    }

    if (dependencies.blockedMaterialLegacyIds.has(materialLegacyId)) {
      exclusionReasons.push(
        `Line ${line.legacyTable}#${line.legacyId} references blocked batch1 material ${materialLegacyId}.`,
      );
      continue;
    }

    const material =
      dependencies.materialByLegacyKey.get(
        buildLegacyKey("saifute_material", materialLegacyId),
      ) ?? null;
    if (!material) {
      exclusionReasons.push(
        `Line ${line.legacyTable}#${line.legacyId} material ${materialLegacyId} is missing from the batch1 material map.`,
      );
      continue;
    }

    const quantity = normalizeDecimalToScale(line.quantity, 6);
    if (!quantity) {
      exclusionReasons.push(
        `Line ${line.legacyTable}#${line.legacyId} quantity is required.`,
      );
      continue;
    }

    const unitCodeSnapshot = normalizeOptionalText(line.unit);
    if (!unitCodeSnapshot) {
      exclusionReasons.push(
        `Line ${line.legacyTable}#${line.legacyId} unit is required for unitCodeSnapshot.`,
      );
      continue;
    }

    const unitPrice =
      normalizeDecimalToScale(line.unitPrice, 2) ?? formatScaledInteger(0n, 2);
    const amount = multiplyToAmount(quantity, unitPrice);
    if (!amount) {
      exclusionReasons.push(
        `Line ${line.legacyTable}#${line.legacyId} amount could not be derived deterministically.`,
      );
      continue;
    }

    preparedLines.push({
      source: line,
      material,
      materialNameSnapshot:
        normalizeOptionalText(line.materialName) ?? material.materialName,
      materialSpecSnapshot:
        normalizeOptionalText(line.materialSpec) ?? material.specModel,
      unitCodeSnapshot,
      quantity,
      unitPrice,
      amount,
    });
  }

  return preparedLines;
}

function buildCounts(
  snapshot: LegacyProjectSnapshot,
  migratedProjects: readonly ProjectPlanRecord[],
  excludedProjects: readonly ExcludedProjectPlanRecord[],
): ProjectPlanCounts {
  return {
    projects: {
      source: snapshot.projects.length,
      migrated: migratedProjects.length,
      excluded: excludedProjects.length,
    },
    lines: {
      source: snapshot.lines.length,
      migrated: migratedProjects.reduce(
        (total, project) => total + project.lines.length,
        0,
      ),
      excluded: excludedProjects.reduce((total, project) => {
        const lines = project.payload.lines;
        return total + (Array.isArray(lines) ? lines.length : 0);
      }, 0),
    },
    sourceProjectTables: {
      saifute_composite_product: snapshot.projects.length,
    },
    sourceLineTables: {
      saifute_product_material: snapshot.lines.length,
    },
  };
}

export function buildProjectMigrationPlan(
  snapshot: LegacyProjectSnapshot,
  dependencies: ProjectDependencySnapshot,
): ProjectMigrationPlan {
  const warnings: ProjectWarning[] = [];
  const globalBlockers: ProjectGlobalBlocker[] = [];
  const migratedProjects: ProjectPlanRecord[] = [];
  const excludedProjects: ExcludedProjectPlanRecord[] = [];
  const linesByProjectKey = buildLinesByProjectKey(snapshot.lines);

  pushGlobalBlockers(globalBlockers, dependencies);
  pushDependencyWarnings(warnings, dependencies);

  for (const project of [...snapshot.projects].sort(
    (left, right) =>
      left.legacyTable.localeCompare(right.legacyTable) ||
      left.legacyId - right.legacyId,
  )) {
    const projectCode = buildProjectCode(project.legacyId);
    const projectKey = buildProjectKey(project);
    const lines = linesByProjectKey.get(projectKey) ?? [];
    const exclusionReasons: string[] = [];

    const projectName = normalizeOptionalText(project.projectName);
    if (!projectName) {
      exclusionReasons.push("Project name is required.");
    }

    const bizDate = resolveBizDate(project);
    if (!bizDate) {
      exclusionReasons.push(
        "Business date is required from order_date, out_bound_date, or create_time.",
      );
    }

    if (lines.length === 0) {
      exclusionReasons.push("No legacy line rows were found for this project.");
    }

    const resolvedDependencies = resolveHeaderDependencies(
      project,
      dependencies,
      exclusionReasons,
      warnings,
    );
    const preparedLines = prepareLines(lines, dependencies, exclusionReasons);

    if (
      exclusionReasons.length > 0 ||
      !resolvedDependencies ||
      !projectName ||
      !bizDate
    ) {
      excludedProjects.push(
        buildExcludedProjectPlan(project, lines, projectCode, exclusionReasons),
      );
      continue;
    }

    const lifecycleStatus = toLifecycleStatus(project.delFlag);
    const createdAt = normalizeDateTime(project.createdAt);
    const updatedAt = normalizeDateTime(project.updatedAt) ?? createdAt;
    const target: ProjectTargetInsert = {
      projectCode,
      projectName,
      bizDate,
      customerId: resolvedDependencies.customer?.targetId ?? null,
      supplierId: null,
      managerPersonnelId: resolvedDependencies.manager?.targetId ?? null,
      workshopId: resolvedDependencies.workshop.targetId,
      lifecycleStatus,
      auditStatusSnapshot: "NOT_REQUIRED",
      inventoryEffectStatus:
        lifecycleStatus === "VOIDED" ? "REVERSED" : "POSTED",
      revisionNo: 1,
      customerCodeSnapshot: resolvedDependencies.customerCodeSnapshot,
      customerNameSnapshot: resolvedDependencies.customerNameSnapshot,
      supplierCodeSnapshot: null,
      supplierNameSnapshot: null,
      managerNameSnapshot: resolvedDependencies.managerNameSnapshot,
      workshopNameSnapshot: resolvedDependencies.workshop.workshopName,
      totalQty: sumDecimalValues(
        preparedLines.map((line) => line.quantity),
        6,
      ),
      totalAmount:
        normalizeDecimalToScale(project.totalAmount, 2) ??
        sumDecimalValues(
          preparedLines.map((line) => line.amount),
          2,
        ),
      remark: normalizeOptionalText(project.remark),
      voidReason: null,
      voidedBy:
        lifecycleStatus === "VOIDED"
          ? normalizeOptionalText(project.updatedBy)
          : null,
      voidedAt:
        lifecycleStatus === "VOIDED"
          ? normalizeDateTime(project.updatedAt)
          : null,
      createdBy: normalizeOptionalText(project.createdBy),
      createdAt,
      updatedBy: normalizeOptionalText(project.updatedBy),
      updatedAt,
    };
    const linePlans: ProjectLinePlanRecord[] = preparedLines.map(
      (preparedLine, index) => {
        const lineNo = index + 1;
        const targetCode = `${projectCode}#${lineNo}`;

        return {
          legacyTable: preparedLine.source.legacyTable,
          legacyId: preparedLine.source.legacyId,
          parentLegacyTable: preparedLine.source.parentLegacyTable,
          parentLegacyId: preparedLine.source.parentLegacyId,
          targetTable: "project_material_line",
          targetCode,
          target: {
            lineNo,
            materialId: preparedLine.material.targetId,
            materialCodeSnapshot: preparedLine.material.materialCode,
            materialNameSnapshot: preparedLine.materialNameSnapshot,
            materialSpecSnapshot: preparedLine.materialSpecSnapshot,
            unitCodeSnapshot: preparedLine.unitCodeSnapshot,
            quantity: preparedLine.quantity,
            unitPrice: preparedLine.unitPrice,
            amount: preparedLine.amount,
            remark: normalizeOptionalText(preparedLine.source.remark),
            createdBy: normalizeOptionalText(project.createdBy),
            createdAt,
            updatedBy: normalizeOptionalText(project.updatedBy),
            updatedAt,
          },
          archivedPayload: buildLineArchivedPayload(
            preparedLine.source,
            targetCode,
          ),
        };
      },
    );

    migratedProjects.push({
      legacyTable: project.legacyTable,
      legacyId: project.legacyId,
      targetTable: "project",
      targetCode: projectCode,
      target,
      lines: linePlans,
      archivedPayload: buildProjectArchivedPayload(project, projectCode),
    });
  }

  const counts = buildCounts(snapshot, migratedProjects, excludedProjects);

  return {
    migrationBatch: PROJECT_MIGRATION_BATCH,
    migratedProjects: migratedProjects.sort(
      (left, right) =>
        left.legacyTable.localeCompare(right.legacyTable) ||
        left.legacyId - right.legacyId,
    ),
    excludedProjects: excludedProjects.sort(
      (left, right) =>
        left.legacyTable.localeCompare(right.legacyTable) ||
        left.legacyId - right.legacyId,
    ),
    warnings: warnings.sort(
      (left, right) =>
        left.legacyTable.localeCompare(right.legacyTable) ||
        (left.legacyId ?? 0) - (right.legacyId ?? 0) ||
        left.reason.localeCompare(right.reason),
    ),
    globalBlockers,
    counts,
    context: {
      defaultWorkshopCode:
        dependencies.defaultWorkshop?.workshopCode ?? DEFAULT_WORKSHOP_CODE,
      defaultWorkshopName:
        dependencies.defaultWorkshop?.workshopName ?? DEFAULT_WORKSHOP_NAME,
      blockedMaterialLegacyIds: Array.from(
        dependencies.blockedMaterialLegacyIds,
      ).sort((left, right) => left - right),
      batch1Baseline: dependencies.batch1Baseline,
    },
  };
}

export function hasExecutionBlockers(plan: ProjectMigrationPlan): boolean {
  return plan.globalBlockers.length > 0;
}

export function buildDryRunSummary(
  plan: ProjectMigrationPlan,
): Record<string, unknown> {
  return {
    migrationBatch: plan.migrationBatch,
    counts: plan.counts,
    globalBlockers: plan.globalBlockers,
    warnings: plan.warnings,
    excludedProjects: plan.excludedProjects.map((project) => ({
      legacyTable: project.legacyTable,
      legacyId: project.legacyId,
      exclusionReason: project.exclusionReason,
      targetProjectCodeCandidate:
        typeof project.payload.targetProjectCodeCandidate === "string"
          ? project.payload.targetProjectCodeCandidate
          : null,
      excludedLineCount: Array.isArray(project.payload.lines)
        ? project.payload.lines.length
        : 0,
    })),
    migratedProjects: plan.migratedProjects.map((project) => ({
      legacyTable: project.legacyTable,
      legacyId: project.legacyId,
      projectCode: project.target.projectCode,
      lineCount: project.lines.length,
      lifecycleStatus: project.target.lifecycleStatus,
      auditStatusSnapshot: project.target.auditStatusSnapshot,
      inventoryEffectStatus: project.target.inventoryEffectStatus,
    })),
    context: plan.context,
  };
}
