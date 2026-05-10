import {
  DEFAULT_WORKSHOP_CODE,
  DEFAULT_WORKSHOP_NAME,
  normalizeOptionalText,
  resolveDeterministicCodes,
} from "../shared/deterministic";
import type {
  ArchivedFieldPayloadRecord,
  AuditStatusSnapshotValue,
  DocumentLifecycleStatusValue,
  DocumentNoRewriteSummary,
  ExcludedWorkshopPickPlanRecord,
  LegacyAuditDocumentRow,
  LegacyPickLineRow,
  LegacyPickOrderRow,
  LegacyPickSnapshot,
  ResolvedMaterialDependency,
  ResolvedPersonnelDependency,
  ResolvedWorkshopDependency,
  WorkshopMaterialOrderTargetInsert,
  WorkshopPickDependencySnapshot,
  WorkshopPickGlobalBlocker,
  WorkshopPickLinePlanRecord,
  WorkshopPickMigrationPlan,
  WorkshopPickOrderPlanRecord,
  WorkshopPickPlanCounts,
  WorkshopPickWarning,
} from "./types";
import { WORKSHOP_PICK_MIGRATION_BATCH } from "./types";

interface ParsedDecimal {
  sign: 1 | -1;
  digits: string;
  scale: number;
}

interface PreparedLine {
  source: LegacyPickLineRow;
  material: ResolvedMaterialDependency;
  quantity: string;
  amount: string;
  unitPrice: string;
}

interface PreparedLineResult {
  preparedLines: PreparedLine[];
  priceDerivationFailureCount: number;
}

interface PreparedHeaderDependencies {
  handler: ResolvedPersonnelDependency | null;
  handlerNameSnapshot: string | null;
  workshop: ResolvedWorkshopDependency;
  usedDefaultWorkshop: boolean;
}

interface AuditState {
  auditByDocumentKey: Map<string, LegacyAuditDocumentRow>;
  invalidAuditRows: Array<{
    legacyAuditId: number;
    documentId: number;
    auditStatus: string;
  }>;
  invalidDocumentIds: Set<number>;
}

function buildLegacyKey(legacyTable: string, legacyId: number): string {
  return `${legacyTable}::${legacyId}`;
}

function buildOrderKey(
  order: Pick<LegacyPickOrderRow, "legacyTable" | "legacyId">,
): string {
  return buildLegacyKey(order.legacyTable, order.legacyId);
}

function normalizePersonnelLookupName(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replace(/\s+/gu, " ") : null;
}

function resolveDeterministicDocumentNumbers(
  orders: readonly LegacyPickOrderRow[],
): {
  documentNoByOrderKey: Map<string, string>;
  rewrites: DocumentNoRewriteSummary[];
} {
  const resolution = resolveDeterministicCodes(
    orders.flatMap((order) => {
      const sourceDocumentNo = normalizeOptionalText(order.sourceDocumentNo);

      if (!sourceDocumentNo) {
        return [];
      }

      return [
        {
          legacyId: order.legacyId,
          isActive: String(order.delFlag ?? "0") !== "2",
          sourceCode: sourceDocumentNo,
        },
      ];
    }),
    "PICK-LEGACY",
  );

  const documentNoByOrderKey = new Map<string, string>();

  for (const order of orders) {
    const targetDocumentNo = resolution.codeByLegacyId.get(order.legacyId);

    if (targetDocumentNo) {
      documentNoByOrderKey.set(buildOrderKey(order), targetDocumentNo);
    }
  }

  return {
    documentNoByOrderKey,
    rewrites: resolution.rewrites.map((rewrite) => ({
      originalDocumentNo: rewrite.originalCode,
      keptLegacyTable: "saifute_pick_order",
      keptLegacyId: rewrite.keptLegacyId,
      rewritten: rewrite.rewritten.map((entry) => ({
        legacyTable: "saifute_pick_order",
        legacyId: entry.legacyId,
        rewrittenDocumentNo: entry.rewrittenCode,
      })),
    })),
  };
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

function deriveDeterministicUnitPrice(
  quantity: string | number | null | undefined,
  amount: string | number | null | undefined,
): string | null {
  const quantityMicros = toScaledInteger(quantity, 6);
  const amountCents = toScaledInteger(amount, 2);

  if (quantityMicros === null || amountCents === null || quantityMicros <= 0n) {
    return null;
  }

  const numerator = amountCents * 1_000_000n;

  if (numerator % quantityMicros !== 0n) {
    return null;
  }

  return formatScaledInteger(numerator / quantityMicros, 2);
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

function hasRawLegacyValue(value: string | number | null | undefined): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function preserveRawLegacyEvidence(
  value: string | number | null | undefined,
): string | null {
  return normalizeOptionalText(value);
}

function toLifecycleStatus(
  delFlag: string | number | null | undefined,
): DocumentLifecycleStatusValue {
  return String(delFlag ?? "0") === "2" ? "VOIDED" : "EFFECTIVE";
}

function toAuditStatusSnapshot(
  lifecycleStatus: DocumentLifecycleStatusValue,
  auditRow: LegacyAuditDocumentRow | null,
): AuditStatusSnapshotValue {
  if (lifecycleStatus === "VOIDED") {
    return "NOT_REQUIRED";
  }

  const auditStatus = normalizeOptionalText(auditRow?.auditStatus);

  switch (auditStatus) {
    case null:
    case "0":
      return "PENDING";
    case "1":
      return "APPROVED";
    case "2":
      return "REJECTED";
    default:
      return "PENDING";
  }
}

function buildAuditState(
  audits: readonly LegacyAuditDocumentRow[],
): AuditState {
  const auditByDocumentKey = new Map<string, LegacyAuditDocumentRow>();
  const invalidAuditRows: AuditState["invalidAuditRows"] = [];
  const invalidDocumentIds = new Set<number>();

  for (const audit of [...audits].sort(
    (left, right) =>
      left.documentId - right.documentId || left.legacyId - right.legacyId,
  )) {
    const auditStatus = normalizeOptionalText(audit.auditStatus);

    if (
      auditStatus !== null &&
      auditStatus !== "0" &&
      auditStatus !== "1" &&
      auditStatus !== "2"
    ) {
      invalidAuditRows.push({
        legacyAuditId: audit.legacyId,
        documentId: audit.documentId,
        auditStatus,
      });
      invalidDocumentIds.add(audit.documentId);
      continue;
    }

    auditByDocumentKey.set(
      buildLegacyKey(String(audit.documentType), audit.documentId),
      audit,
    );
  }

  return {
    auditByDocumentKey,
    invalidAuditRows,
    invalidDocumentIds,
  };
}

function buildLinesByOrderKey(
  lines: readonly LegacyPickLineRow[],
): Map<string, LegacyPickLineRow[]> {
  const linesByOrderKey = new Map<string, LegacyPickLineRow[]>();

  for (const line of [...lines].sort(
    (left, right) =>
      left.parentLegacyId - right.parentLegacyId ||
      left.legacyId - right.legacyId,
  )) {
    const orderKey = buildLegacyKey(
      line.parentLegacyTable,
      line.parentLegacyId,
    );
    const existingLines = linesByOrderKey.get(orderKey) ?? [];
    existingLines.push(line);
    linesByOrderKey.set(orderKey, existingLines);
  }

  return linesByOrderKey;
}

function buildOrderArchivedPayload(
  order: LegacyPickOrderRow,
  targetDocumentNo: string,
  auditRow: LegacyAuditDocumentRow | null,
): ArchivedFieldPayloadRecord {
  const sourceDocumentNo = normalizeOptionalText(order.sourceDocumentNo);

  return {
    legacyTable: order.legacyTable,
    legacyId: order.legacyId,
    targetTable: "workshop_material_order",
    targetCode: targetDocumentNo,
    payloadKind: "legacy-unmapped-fields",
    archiveReason:
      "Archive source-only pick order fields and original document number when rewritten.",
    payload: {
      chargeBy: normalizeOptionalText(order.chargeBy),
      legacyAudit: auditRow
        ? {
            auditOpinion: normalizeOptionalText(auditRow.auditOpinion),
            auditStatus: normalizeOptionalText(auditRow.auditStatus),
            auditTime: normalizeDateTime(auditRow.auditTime),
            auditor: normalizeOptionalText(auditRow.auditor),
          }
        : null,
      originalDocumentNo:
        sourceDocumentNo && sourceDocumentNo !== targetDocumentNo
          ? sourceDocumentNo
          : null,
      picker: normalizeOptionalText(order.picker),
      projectId: normalizeOptionalText(order.projectId),
      workshopLegacyId: normalizePositiveLegacyId(order.workshopLegacyId),
    },
  };
}

function buildLineArchivedPayload(
  line: LegacyPickLineRow,
  targetCode: string,
  amount: string,
  unitPrice: string,
): ArchivedFieldPayloadRecord {
  return {
    legacyTable: line.legacyTable,
    legacyId: line.legacyId,
    targetTable: "workshop_material_order_line",
    targetCode,
    payloadKind: "legacy-unmapped-fields",
    archiveReason:
      "Archive pick-line-only fields and raw price evidence for deterministic pricing follow-up.",
    payload: {
      instruction: normalizeOptionalText(line.instruction),
      rawPriceEvidence: preserveRawLegacyEvidence(line.priceEvidence),
      rawQuantity: normalizeDecimalToScale(line.quantity, 6),
      derivedAmount: amount,
      derivedUnitPrice: unitPrice,
    },
  };
}

function buildExcludedDocumentPlan(
  order: LegacyPickOrderRow,
  auditRow: LegacyAuditDocumentRow | null,
  lines: readonly LegacyPickLineRow[],
  targetDocumentNoCandidate: string | null,
  exclusionReasons: string[],
): ExcludedWorkshopPickPlanRecord {
  return {
    legacyTable: order.legacyTable,
    legacyId: order.legacyId,
    exclusionReason: exclusionReasons.join("; "),
    payload: {
      audit: auditRow
        ? {
            auditOpinion: normalizeOptionalText(auditRow.auditOpinion),
            auditStatus: normalizeOptionalText(auditRow.auditStatus),
            auditTime: normalizeDateTime(auditRow.auditTime),
            auditor: normalizeOptionalText(auditRow.auditor),
          }
        : null,
      bizDate: normalizeDate(order.bizDate),
      chargeBy: normalizeOptionalText(order.chargeBy),
      createdAt: normalizeDateTime(order.createdAt),
      createdBy: normalizeOptionalText(order.createdBy),
      exclusionReasons,
      lifecycleStatus: toLifecycleStatus(order.delFlag),
      lines: lines.map((line) => ({
        instruction: normalizeOptionalText(line.instruction),
        legacyId: line.legacyId,
        legacyTable: line.legacyTable,
        materialLegacyId: normalizePositiveLegacyId(line.materialLegacyId),
        priceEvidence: preserveRawLegacyEvidence(line.priceEvidence),
        quantity: normalizeDecimalToScale(line.quantity, 6),
        remark: normalizeOptionalText(line.remark),
      })),
      picker: normalizeOptionalText(order.picker),
      projectId: normalizeOptionalText(order.projectId),
      sourceDocumentNo: normalizeOptionalText(order.sourceDocumentNo),
      targetDocumentNoCandidate,
      totalAmount: normalizeDecimalToScale(order.totalAmount, 2),
      updatedAt: normalizeDateTime(order.updatedAt),
      updatedBy: normalizeOptionalText(order.updatedBy),
      voidReason: normalizeOptionalText(order.voidReason),
      workshopLegacyId: normalizePositiveLegacyId(order.workshopLegacyId),
    },
  };
}

function pushGlobalBlockers(
  globalBlockers: WorkshopPickGlobalBlocker[],
  dependencies: WorkshopPickDependencySnapshot,
  auditState: AuditState,
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

  if (auditState.invalidAuditRows.length > 0) {
    globalBlockers.push({
      reason:
        "Legacy saifute_audit_document contains unexpected audit_status values outside the frozen {0,1,2} set for pick documents.",
      details: {
        invalidAuditRows: auditState.invalidAuditRows,
      },
    });
  }
}

function pushDependencyWarnings(
  warnings: WorkshopPickWarning[],
  dependencies: WorkshopPickDependencySnapshot,
): void {
  for (const ambiguousName of Array.from(
    dependencies.ambiguousPersonnelNames,
  ).sort((left, right) => left.localeCompare(right))) {
    warnings.push({
      legacyTable: "personnel",
      legacyId: null,
      reason:
        "Target personnel snapshot contains ambiguous names; picker matches will preserve handlerNameSnapshot without handlerPersonnelId.",
      details: {
        personnelName: ambiguousName,
      },
    });
  }
}

function resolveHeaderDependencies(
  order: LegacyPickOrderRow,
  dependencies: WorkshopPickDependencySnapshot,
  exclusionReasons: string[],
  warnings: WorkshopPickWarning[],
): PreparedHeaderDependencies | null {
  let workshop: ResolvedWorkshopDependency | null = null;
  let usedDefaultWorkshop = false;
  const workshopLegacyId = normalizePositiveLegacyId(order.workshopLegacyId);

  if (!hasRawLegacyValue(order.workshopLegacyId)) {
    workshop = dependencies.defaultWorkshop;
    usedDefaultWorkshop = true;

    if (!workshop) {
      exclusionReasons.push(
        "Frozen default workshop is unavailable in the migrated workshop staging map.",
      );
      return null;
    }
  } else if (workshopLegacyId === null) {
    exclusionReasons.push(
      "Legacy workshop_id is malformed; default workshop fallback only applies to NULL workshop_id.",
    );
    return null;
  } else {
    workshop =
      dependencies.workshopByLegacyKey.get(
        buildLegacyKey("saifute_workshop", workshopLegacyId),
      ) ?? null;

    if (!workshop) {
      exclusionReasons.push(
        `Workshop ${workshopLegacyId} is missing from the batch1 workshop map.`,
      );
      return null;
    }
  }

  const normalizedPicker = normalizePersonnelLookupName(order.picker);
  let handler: ResolvedPersonnelDependency | null = null;
  let handlerNameSnapshot: string | null = normalizeOptionalText(order.picker);

  if (normalizedPicker !== null) {
    if (dependencies.ambiguousPersonnelNames.has(normalizedPicker)) {
      warnings.push({
        legacyTable: order.legacyTable,
        legacyId: order.legacyId,
        reason:
          "Picker name is ambiguous in the migrated personnel snapshot; preserving handlerNameSnapshot without handlerPersonnelId.",
        details: {
          picker: normalizedPicker,
        },
      });
    } else {
      handler =
        dependencies.personnelByNormalizedName.get(normalizedPicker) ?? null;

      if (!handler) {
        warnings.push({
          legacyTable: order.legacyTable,
          legacyId: order.legacyId,
          reason:
            "Picker name is missing from the migrated personnel snapshot; preserving handler_name_snapshot without handler_personnel_id.",
          details: {
            picker: normalizedPicker,
          },
        });
      } else {
        handlerNameSnapshot = handler.personnelName;
      }
    }
  }

  return {
    handler,
    handlerNameSnapshot,
    workshop,
    usedDefaultWorkshop,
  };
}

function prepareLines(
  lines: readonly LegacyPickLineRow[],
  dependencies: WorkshopPickDependencySnapshot,
  exclusionReasons: string[],
): PreparedLineResult {
  const preparedLines: PreparedLine[] = [];
  let priceDerivationFailureCount = 0;

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
    const quantityMicros = toScaledInteger(line.quantity, 6);

    if (!quantity || quantityMicros === null || quantityMicros <= 0n) {
      exclusionReasons.push(
        `Line ${line.legacyTable}#${line.legacyId} quantity must be greater than zero.`,
      );
      continue;
    }

    const amount = normalizeDecimalToScale(line.priceEvidence, 2);

    if (!amount) {
      priceDerivationFailureCount += 1;
      exclusionReasons.push(
        `Line ${line.legacyTable}#${line.legacyId} is missing deterministic legacy price evidence.`,
      );
      continue;
    }

    const unitPrice = deriveDeterministicUnitPrice(quantity, amount);

    if (!unitPrice) {
      priceDerivationFailureCount += 1;
      exclusionReasons.push(
        `Line ${line.legacyTable}#${line.legacyId} amount ${amount} cannot derive a deterministic unit_price from quantity ${quantity}.`,
      );
      continue;
    }

    preparedLines.push({
      source: line,
      material,
      quantity,
      amount,
      unitPrice,
    });
  }

  return {
    preparedLines,
    priceDerivationFailureCount,
  };
}

function buildCounts(
  snapshot: LegacyPickSnapshot,
  migratedOrders: readonly WorkshopPickOrderPlanRecord[],
  excludedDocuments: readonly ExcludedWorkshopPickPlanRecord[],
): WorkshopPickPlanCounts {
  return {
    orders: {
      source: snapshot.orders.length,
      migrated: migratedOrders.length,
      excluded: excludedDocuments.length,
    },
    lines: {
      source: snapshot.lines.length,
      migrated: migratedOrders.reduce(
        (total, order) => total + order.lines.length,
        0,
      ),
      excluded: excludedDocuments.reduce((total, document) => {
        const lines = document.payload.lines;
        return total + (Array.isArray(lines) ? lines.length : 0);
      }, 0),
    },
    sourceOrderTables: {
      saifute_pick_order: snapshot.orders.length,
    },
    sourceLineTables: {
      saifute_pick_detail: snapshot.lines.length,
    },
  };
}

export function buildWorkshopPickMigrationPlan(
  snapshot: LegacyPickSnapshot,
  dependencies: WorkshopPickDependencySnapshot,
): WorkshopPickMigrationPlan {
  const warnings: WorkshopPickWarning[] = [];
  const globalBlockers: WorkshopPickGlobalBlocker[] = [];
  const migratedOrders: WorkshopPickOrderPlanRecord[] = [];
  const excludedDocuments: ExcludedWorkshopPickPlanRecord[] = [];
  const auditState = buildAuditState(snapshot.audits);
  const linesByOrderKey = buildLinesByOrderKey(snapshot.lines);
  const { documentNoByOrderKey, rewrites } =
    resolveDeterministicDocumentNumbers(snapshot.orders);
  let nullWorkshopFallbackCount = 0;
  let priceDerivationFailureCount = 0;

  pushGlobalBlockers(globalBlockers, dependencies, auditState);
  pushDependencyWarnings(warnings, dependencies);

  for (const order of [...snapshot.orders].sort(
    (left, right) => left.legacyId - right.legacyId,
  )) {
    const orderKey = buildOrderKey(order);
    const auditRow =
      auditState.auditByDocumentKey.get(
        buildLegacyKey(String(order.legacyAuditDocumentType), order.legacyId),
      ) ?? null;
    const lines = linesByOrderKey.get(orderKey) ?? [];
    const sourceDocumentNo = normalizeOptionalText(order.sourceDocumentNo);
    const targetDocumentNoCandidate =
      documentNoByOrderKey.get(orderKey) ?? sourceDocumentNo ?? null;
    const exclusionReasons: string[] = [];

    if (!sourceDocumentNo) {
      exclusionReasons.push("Document number is required.");
    }

    const bizDate = normalizeDate(order.bizDate);
    if (!bizDate) {
      exclusionReasons.push("Business date is required.");
    }

    if (lines.length === 0) {
      exclusionReasons.push(
        "No legacy line rows were found for this document.",
      );
    }

    if (auditState.invalidDocumentIds.has(order.legacyId)) {
      exclusionReasons.push(
        "Legacy audit_status contains an unexpected value outside the frozen {0,1,2} set.",
      );
    }

    const resolvedDependencies = resolveHeaderDependencies(
      order,
      dependencies,
      exclusionReasons,
      warnings,
    );
    const preparedLineResult = prepareLines(
      lines,
      dependencies,
      exclusionReasons,
    );
    priceDerivationFailureCount +=
      preparedLineResult.priceDerivationFailureCount;

    if (
      exclusionReasons.length > 0 ||
      !resolvedDependencies ||
      !targetDocumentNoCandidate ||
      !bizDate
    ) {
      excludedDocuments.push(
        buildExcludedDocumentPlan(
          order,
          auditRow,
          lines,
          targetDocumentNoCandidate,
          exclusionReasons,
        ),
      );
      continue;
    }

    if (resolvedDependencies.usedDefaultWorkshop) {
      nullWorkshopFallbackCount += 1;
    }

    const lifecycleStatus = toLifecycleStatus(order.delFlag);
    const createdAt = normalizeDateTime(order.createdAt);
    const updatedAt = normalizeDateTime(order.updatedAt) ?? createdAt;
    const target: WorkshopMaterialOrderTargetInsert = {
      documentNo: targetDocumentNoCandidate,
      orderType: "PICK",
      bizDate,
      handlerPersonnelId: resolvedDependencies.handler?.targetId ?? null,
      workshopId: resolvedDependencies.workshop.targetId,
      lifecycleStatus,
      auditStatusSnapshot: toAuditStatusSnapshot(lifecycleStatus, auditRow),
      inventoryEffectStatus:
        lifecycleStatus === "VOIDED" ? "REVERSED" : "POSTED",
      revisionNo: 1,
      handlerNameSnapshot: resolvedDependencies.handlerNameSnapshot,
      workshopNameSnapshot: resolvedDependencies.workshop.workshopName,
      totalQty: sumDecimalValues(
        preparedLineResult.preparedLines.map((line) => line.quantity),
        6,
      ),
      totalAmount:
        normalizeDecimalToScale(order.totalAmount, 2) ??
        sumDecimalValues(
          preparedLineResult.preparedLines.map((line) => line.amount),
          2,
        ),
      remark: normalizeOptionalText(order.remark),
      voidReason: normalizeOptionalText(order.voidReason),
      voidedBy:
        lifecycleStatus === "VOIDED"
          ? normalizeOptionalText(order.updatedBy)
          : null,
      voidedAt:
        lifecycleStatus === "VOIDED"
          ? normalizeDateTime(order.updatedAt)
          : null,
      createdBy: normalizeOptionalText(order.createdBy),
      createdAt,
      updatedBy: normalizeOptionalText(order.updatedBy),
      updatedAt,
    };
    const linePlans: WorkshopPickLinePlanRecord[] =
      preparedLineResult.preparedLines.map((preparedLine, index) => {
        const lineNo = index + 1;
        const targetCode = `${targetDocumentNoCandidate}#${lineNo}`;

        return {
          legacyTable: preparedLine.source.legacyTable,
          legacyId: preparedLine.source.legacyId,
          parentLegacyTable: preparedLine.source.parentLegacyTable,
          parentLegacyId: preparedLine.source.parentLegacyId,
          targetTable: "workshop_material_order_line",
          targetCode,
          target: {
            lineNo,
            materialId: preparedLine.material.targetId,
            materialCodeSnapshot: preparedLine.material.materialCode,
            materialNameSnapshot: preparedLine.material.materialName,
            materialSpecSnapshot: preparedLine.material.specModel,
            unitCodeSnapshot: preparedLine.material.unitCode,
            quantity: preparedLine.quantity,
            unitPrice: preparedLine.unitPrice,
            amount: preparedLine.amount,
            sourceDocumentType: null,
            sourceDocumentId: null,
            sourceDocumentLineId: null,
            remark: normalizeOptionalText(preparedLine.source.remark),
            createdBy: normalizeOptionalText(order.createdBy),
            createdAt,
            updatedBy: normalizeOptionalText(order.updatedBy),
            updatedAt,
          },
          archivedPayload: buildLineArchivedPayload(
            preparedLine.source,
            targetCode,
            preparedLine.amount,
            preparedLine.unitPrice,
          ),
        };
      });

    migratedOrders.push({
      legacyTable: order.legacyTable,
      legacyId: order.legacyId,
      sourceDocumentNo: sourceDocumentNo ?? targetDocumentNoCandidate,
      targetTable: "workshop_material_order",
      targetCode: targetDocumentNoCandidate,
      target,
      lines: linePlans,
      archivedPayload: buildOrderArchivedPayload(
        order,
        targetDocumentNoCandidate,
        auditRow,
      ),
    });
  }

  const counts = buildCounts(snapshot, migratedOrders, excludedDocuments);

  return {
    migrationBatch: WORKSHOP_PICK_MIGRATION_BATCH,
    migratedOrders: migratedOrders.sort(
      (left, right) => left.legacyId - right.legacyId,
    ),
    excludedDocuments: excludedDocuments.sort(
      (left, right) => left.legacyId - right.legacyId,
    ),
    documentNoRewrites: rewrites.sort(
      (left, right) =>
        left.originalDocumentNo.localeCompare(right.originalDocumentNo) ||
        left.keptLegacyId - right.keptLegacyId,
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
      nullWorkshopFallbackCount,
      priceDerivationFailureCount,
    },
  };
}

export function hasExecutionBlockers(plan: WorkshopPickMigrationPlan): boolean {
  return plan.globalBlockers.length > 0;
}

export function buildDryRunSummary(
  plan: WorkshopPickMigrationPlan,
): Record<string, unknown> {
  return {
    migrationBatch: plan.migrationBatch,
    counts: plan.counts,
    documentNoRewrites: plan.documentNoRewrites,
    globalBlockers: plan.globalBlockers,
    warnings: plan.warnings,
    nullWorkshopFallbackCount: plan.context.nullWorkshopFallbackCount,
    priceDerivationFailureCount: plan.context.priceDerivationFailureCount,
    excludedDocuments: plan.excludedDocuments.map((document) => ({
      legacyTable: document.legacyTable,
      legacyId: document.legacyId,
      exclusionReason: document.exclusionReason,
      sourceDocumentNo:
        typeof document.payload.sourceDocumentNo === "string"
          ? document.payload.sourceDocumentNo
          : null,
      targetDocumentNoCandidate:
        typeof document.payload.targetDocumentNoCandidate === "string"
          ? document.payload.targetDocumentNoCandidate
          : null,
      excludedLineCount: Array.isArray(document.payload.lines)
        ? document.payload.lines.length
        : 0,
    })),
    migratedDocuments: plan.migratedOrders.map((order) => ({
      legacyTable: order.legacyTable,
      legacyId: order.legacyId,
      sourceDocumentNo: order.sourceDocumentNo,
      documentNo: order.target.documentNo,
      orderType: order.target.orderType,
      workshopId: order.target.workshopId,
      lineCount: order.lines.length,
      lifecycleStatus: order.target.lifecycleStatus,
      auditStatusSnapshot: order.target.auditStatusSnapshot,
      inventoryEffectStatus: order.target.inventoryEffectStatus,
      sourceDocumentTypeValues: order.lines.map(
        (line) => line.target.sourceDocumentType,
      ),
    })),
    context: plan.context,
  };
}
