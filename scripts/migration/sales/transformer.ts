import {
  DEFAULT_WORKSHOP_CODE,
  DEFAULT_WORKSHOP_NAME,
  normalizeOptionalText,
} from "../shared/deterministic";
import type {
  ArchivedFieldPayloadRecord,
  AuditStatusSnapshotValue,
  DocumentLifecycleStatusValue,
  DocumentNoRewriteSummary,
  ExcludedOutboundPlanRecord,
  LegacyAuditDocumentRow,
  LegacyOutboundLineRow,
  LegacyOutboundOrderRow,
  LegacyOutboundSnapshot,
  OutboundDependencySnapshot,
  OutboundGlobalBlocker,
  OutboundLinePlanRecord,
  OutboundMigrationPlan,
  OutboundOrderPlanRecord,
  OutboundPlanCounts,
  OutboundWarning,
  ResolvedCustomerDependency,
  ResolvedMaterialDependency,
  ResolvedPersonnelDependency,
  ResolvedWorkshopDependency,
  SalesStockOrderTargetInsert,
} from "./types";
import { OUTBOUND_MIGRATION_BATCH } from "./types";

const DOCUMENT_NO_MAX_LENGTH = 64;

interface ParsedDecimal {
  sign: 1 | -1;
  digits: string;
  scale: number;
}

interface PreparedLine {
  source: LegacyOutboundLineRow;
  material: ResolvedMaterialDependency;
  quantity: string;
  unitPrice: string;
  amount: string;
}

interface PreparedHeaderDependencies {
  customer: ResolvedCustomerDependency | null;
  customerCodeSnapshot: string | null;
  customerNameSnapshot: string | null;
  handler: ResolvedPersonnelDependency | null;
  handlerNameSnapshot: string | null;
  workshop: ResolvedWorkshopDependency;
}

function buildLegacyKey(legacyTable: string, legacyId: number): string {
  return `${legacyTable}::${legacyId}`;
}

function buildOrderKey(
  order: Pick<LegacyOutboundOrderRow, "legacyTable" | "legacyId">,
): string {
  return buildLegacyKey(order.legacyTable, order.legacyId);
}

function normalizePersonnelLookupName(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replace(/\s+/gu, " ") : null;
}

function normalizeDocumentKey(value: string): string {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en-US");
}

function buildTrimmedDocumentNoWithSuffix(
  baseDocumentNo: string,
  suffix: string,
): string {
  const maxBaseLength = DOCUMENT_NO_MAX_LENGTH - suffix.length;

  if (maxBaseLength <= 0) {
    throw new Error(
      `Document number suffix ${suffix} exceeds the target length limit.`,
    );
  }

  return `${baseDocumentNo.slice(0, maxBaseLength)}${suffix}`;
}

function allocateUniqueDocumentNo(
  seedDocumentNo: string,
  reservedKeys: ReadonlySet<string>,
  assignedKeys: Set<string>,
): string {
  let attempt = 0;

  while (true) {
    const candidate =
      attempt === 0
        ? seedDocumentNo
        : buildTrimmedDocumentNoWithSuffix(seedDocumentNo, `-DUP-${attempt}`);
    const candidateKey = normalizeDocumentKey(candidate);

    if (!reservedKeys.has(candidateKey) && !assignedKeys.has(candidateKey)) {
      assignedKeys.add(candidateKey);
      return candidate;
    }

    attempt += 1;
  }
}

function sortByActiveFirstThenLegacyId(
  left: LegacyOutboundOrderRow,
  right: LegacyOutboundOrderRow,
): number {
  const leftRank = String(left.delFlag ?? "0") === "2" ? 1 : 0;
  const rightRank = String(right.delFlag ?? "0") === "2" ? 1 : 0;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.legacyId - right.legacyId;
}

function resolveDeterministicDocumentNumbers(
  orders: readonly LegacyOutboundOrderRow[],
): {
  documentNoByOrderKey: Map<string, string>;
  rewrites: DocumentNoRewriteSummary[];
} {
  const groupedOrders = new Map<
    string,
    Array<LegacyOutboundOrderRow & { normalizedDocumentNo: string }>
  >();

  for (const order of orders) {
    const sourceDocumentNo = normalizeOptionalText(order.sourceDocumentNo);

    if (!sourceDocumentNo) {
      continue;
    }

    const groupKey = normalizeDocumentKey(sourceDocumentNo);
    const existingOrders = groupedOrders.get(groupKey) ?? [];
    existingOrders.push({
      ...order,
      normalizedDocumentNo: sourceDocumentNo,
    });
    groupedOrders.set(groupKey, existingOrders);
  }

  const reservedSourceKeys = new Set(groupedOrders.keys());
  const sortedGroupKeys = Array.from(groupedOrders.keys()).sort((left, right) =>
    left.localeCompare(right),
  );
  const documentNoByOrderKey = new Map<string, string>();
  const rewrites: DocumentNoRewriteSummary[] = [];
  const assignedKeys = new Set<string>();

  for (const groupKey of sortedGroupKeys) {
    const groupedCandidates = [...(groupedOrders.get(groupKey) ?? [])].sort(
      sortByActiveFirstThenLegacyId,
    );
    const [keeper, ...duplicates] = groupedCandidates;

    if (!keeper) {
      continue;
    }

    documentNoByOrderKey.set(
      buildOrderKey(keeper),
      keeper.normalizedDocumentNo,
    );
    assignedKeys.add(groupKey);

    if (duplicates.length === 0) {
      continue;
    }

    const rewritten = duplicates.map((duplicate) => {
      const rewrittenDocumentNo = allocateUniqueDocumentNo(
        buildTrimmedDocumentNoWithSuffix(
          keeper.normalizedDocumentNo,
          `-LEGACY-${duplicate.legacyId}`,
        ),
        reservedSourceKeys,
        assignedKeys,
      );
      documentNoByOrderKey.set(buildOrderKey(duplicate), rewrittenDocumentNo);

      return {
        legacyTable: duplicate.legacyTable,
        legacyId: duplicate.legacyId,
        rewrittenDocumentNo,
      };
    });

    rewrites.push({
      originalDocumentNo: keeper.normalizedDocumentNo,
      keptLegacyTable: keeper.legacyTable,
      keptLegacyId: keeper.legacyId,
      rewritten,
    });
  }

  return {
    documentNoByOrderKey,
    rewrites: rewrites.sort(
      (left, right) =>
        left.originalDocumentNo.localeCompare(right.originalDocumentNo) ||
        left.keptLegacyId - right.keptLegacyId,
    ),
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
    case "1":
      return "APPROVED";
    case "2":
      return "REJECTED";
    default:
      return "PENDING";
  }
}

function buildAuditByDocumentKey(
  audits: readonly LegacyAuditDocumentRow[],
): Map<string, LegacyAuditDocumentRow> {
  const auditByDocumentKey = new Map<string, LegacyAuditDocumentRow>();

  for (const audit of [...audits].sort(
    (left, right) =>
      left.documentId - right.documentId || left.legacyId - right.legacyId,
  )) {
    auditByDocumentKey.set(
      buildLegacyKey(String(audit.documentType), audit.documentId),
      audit,
    );
  }

  return auditByDocumentKey;
}

function buildLinesByOrderKey(
  lines: readonly LegacyOutboundLineRow[],
): Map<string, LegacyOutboundLineRow[]> {
  const linesByOrderKey = new Map<string, LegacyOutboundLineRow[]>();

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
  order: LegacyOutboundOrderRow,
  targetDocumentNo: string,
  auditRow: LegacyAuditDocumentRow | null,
): ArchivedFieldPayloadRecord {
  return {
    legacyTable: order.legacyTable,
    legacyId: order.legacyId,
    targetTable: "sales_stock_order",
    targetCode: targetDocumentNo,
    payloadKind: "legacy-unmapped-fields",
    archiveReason:
      "Archive source-only outbound order fields and original document number.",
    payload: {
      bookkeeping: normalizeOptionalText(order.bookkeeping),
      chargeBy: normalizeOptionalText(order.chargeBy),
      customerLegacyId: normalizePositiveLegacyId(order.customerLegacyId),
      legacyAudit: auditRow
        ? {
            auditOpinion: normalizeOptionalText(auditRow.auditOpinion),
            auditStatus: normalizeOptionalText(auditRow.auditStatus),
            auditTime: normalizeDateTime(auditRow.auditTime),
            auditor: normalizeOptionalText(auditRow.auditor),
          }
        : null,
      originalDocumentNo: normalizeOptionalText(order.sourceDocumentNo),
    },
  };
}

function buildLineArchivedPayload(
  line: LegacyOutboundLineRow,
  targetCode: string,
): ArchivedFieldPayloadRecord | null {
  const rawInterval = normalizeOptionalText(line.interval);

  if (!rawInterval) {
    return null;
  }

  return {
    legacyTable: line.legacyTable,
    legacyId: line.legacyId,
    targetTable: "sales_stock_order_line",
    targetCode,
    payloadKind: "legacy-unmapped-fields",
    archiveReason:
      "Archive legacy raw outbound interval text until reservation reconstruction is implemented.",
    payload: {
      interval: rawInterval,
    },
  };
}

function buildExcludedDocumentPlan(
  order: LegacyOutboundOrderRow,
  auditRow: LegacyAuditDocumentRow | null,
  lines: readonly LegacyOutboundLineRow[],
  targetDocumentNoCandidate: string | null,
  exclusionReasons: string[],
): ExcludedOutboundPlanRecord {
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
      bookkeeping: normalizeOptionalText(order.bookkeeping),
      chargeBy: normalizeOptionalText(order.chargeBy),
      createdAt: normalizeDateTime(order.createdAt),
      createdBy: normalizeOptionalText(order.createdBy),
      customerLegacyId: normalizePositiveLegacyId(order.customerLegacyId),
      customerName: normalizeOptionalText(order.customerName),
      exclusionReasons,
      lifecycleStatus: toLifecycleStatus(order.delFlag),
      lines: lines.map((line) => ({
        interval: normalizeOptionalText(line.interval),
        legacyId: line.legacyId,
        legacyTable: line.legacyTable,
        materialLegacyId: normalizePositiveLegacyId(line.materialLegacyId),
        quantity: normalizeDecimalToScale(line.quantity, 6),
        remark: normalizeOptionalText(line.remark),
        unitPrice:
          normalizeDecimalToScale(line.unitPrice, 2) ??
          formatScaledInteger(0n, 2),
      })),
      sourceDocumentNo: normalizeOptionalText(order.sourceDocumentNo),
      targetDocumentNoCandidate,
      totalAmount: normalizeDecimalToScale(order.totalAmount, 2),
      updatedAt: normalizeDateTime(order.updatedAt),
      updatedBy: normalizeOptionalText(order.updatedBy),
      voidReason: normalizeOptionalText(order.voidReason),
    },
  };
}

function pushGlobalBlockers(
  globalBlockers: OutboundGlobalBlocker[],
  dependencies: OutboundDependencySnapshot,
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
  warnings: OutboundWarning[],
  dependencies: OutboundDependencySnapshot,
): void {
  for (const ambiguousName of Array.from(
    dependencies.ambiguousPersonnelNames,
  ).sort((left, right) => left.localeCompare(right))) {
    warnings.push({
      legacyTable: "personnel",
      legacyId: null,
      reason:
        "Target personnel snapshot contains ambiguous names; handler matches will preserve handlerNameSnapshot without handlerPersonnelId.",
      details: {
        personnelName: ambiguousName,
      },
    });
  }
}

function resolveHeaderDependencies(
  order: LegacyOutboundOrderRow,
  dependencies: OutboundDependencySnapshot,
  warnings: OutboundWarning[],
): PreparedHeaderDependencies | null {
  const customerLegacyId = normalizePositiveLegacyId(order.customerLegacyId);
  const legacyCustomerName = normalizeOptionalText(order.customerName);
  const normalizedChargeBy = normalizePersonnelLookupName(order.chargeBy);
  const workshop = dependencies.defaultWorkshop;

  if (!workshop) {
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
        legacyTable: order.legacyTable,
        legacyId: order.legacyId,
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

  let handler: ResolvedPersonnelDependency | null = null;
  let handlerNameSnapshot: string | null = normalizeOptionalText(
    order.chargeBy,
  );

  if (normalizedChargeBy !== null) {
    if (dependencies.ambiguousPersonnelNames.has(normalizedChargeBy)) {
      warnings.push({
        legacyTable: order.legacyTable,
        legacyId: order.legacyId,
        reason:
          "Handler personnel name is ambiguous in the migrated personnel snapshot; preserving handlerNameSnapshot without handlerPersonnelId.",
        details: {
          chargeBy: normalizedChargeBy,
        },
      });
    } else {
      handler =
        dependencies.personnelByNormalizedName.get(normalizedChargeBy) ?? null;

      if (!handler) {
        warnings.push({
          legacyTable: order.legacyTable,
          legacyId: order.legacyId,
          reason:
            "Handler personnel name is missing from the migrated personnel snapshot; preserving handlerNameSnapshot without handlerPersonnelId.",
          details: {
            chargeBy: normalizedChargeBy,
          },
        });
      } else {
        handlerNameSnapshot = handler.personnelName;
      }
    }
  }

  return {
    customer,
    customerCodeSnapshot,
    customerNameSnapshot,
    handler,
    handlerNameSnapshot,
    workshop,
  };
}

function prepareLines(
  lines: readonly LegacyOutboundLineRow[],
  dependencies: OutboundDependencySnapshot,
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
      quantity,
      unitPrice,
      amount,
    });
  }

  return preparedLines;
}

function buildCounts(
  snapshot: LegacyOutboundSnapshot,
  migratedOrders: readonly OutboundOrderPlanRecord[],
  excludedDocuments: readonly ExcludedOutboundPlanRecord[],
): OutboundPlanCounts {
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
      saifute_outbound_order: snapshot.orders.length,
    },
    sourceLineTables: {
      saifute_outbound_detail: snapshot.lines.length,
    },
  };
}

export function buildOutboundMigrationPlan(
  snapshot: LegacyOutboundSnapshot,
  dependencies: OutboundDependencySnapshot,
): OutboundMigrationPlan {
  const warnings: OutboundWarning[] = [];
  const globalBlockers: OutboundGlobalBlocker[] = [];
  const migratedOrders: OutboundOrderPlanRecord[] = [];
  const excludedDocuments: ExcludedOutboundPlanRecord[] = [];
  const auditByDocumentKey = buildAuditByDocumentKey(snapshot.audits);
  const linesByOrderKey = buildLinesByOrderKey(snapshot.lines);
  const { documentNoByOrderKey, rewrites } =
    resolveDeterministicDocumentNumbers(snapshot.orders);

  pushGlobalBlockers(globalBlockers, dependencies);
  pushDependencyWarnings(warnings, dependencies);

  for (const order of [...snapshot.orders].sort(
    (left, right) => left.legacyId - right.legacyId,
  )) {
    const orderKey = buildOrderKey(order);
    const auditRow =
      auditByDocumentKey.get(
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

    const resolvedDependencies = resolveHeaderDependencies(
      order,
      dependencies,
      warnings,
    );
    const preparedLines = prepareLines(lines, dependencies, exclusionReasons);

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

    const lifecycleStatus = toLifecycleStatus(order.delFlag);
    const createdAt = normalizeDateTime(order.createdAt);
    const updatedAt = normalizeDateTime(order.updatedAt) ?? createdAt;
    const target: SalesStockOrderTargetInsert = {
      documentNo: targetDocumentNoCandidate,
      orderType: "OUTBOUND",
      bizDate,
      customerId: resolvedDependencies.customer?.targetId ?? null,
      handlerPersonnelId: resolvedDependencies.handler?.targetId ?? null,
      workshopId: resolvedDependencies.workshop.targetId,
      lifecycleStatus,
      auditStatusSnapshot: toAuditStatusSnapshot(lifecycleStatus, auditRow),
      inventoryEffectStatus:
        lifecycleStatus === "VOIDED" ? "REVERSED" : "POSTED",
      revisionNo: 1,
      customerCodeSnapshot: resolvedDependencies.customerCodeSnapshot,
      customerNameSnapshot: resolvedDependencies.customerNameSnapshot,
      handlerNameSnapshot: resolvedDependencies.handlerNameSnapshot,
      workshopNameSnapshot: resolvedDependencies.workshop.workshopName,
      totalQty: sumDecimalValues(
        preparedLines.map((line) => line.quantity),
        6,
      ),
      totalAmount:
        normalizeDecimalToScale(order.totalAmount, 2) ??
        sumDecimalValues(
          preparedLines.map((line) => line.amount),
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
    const linePlans: OutboundLinePlanRecord[] = preparedLines.map(
      (preparedLine, index) => {
        const lineNo = index + 1;
        const targetCode = `${targetDocumentNoCandidate}#${lineNo}`;

        return {
          legacyTable: preparedLine.source.legacyTable,
          legacyId: preparedLine.source.legacyId,
          parentLegacyTable: preparedLine.source.parentLegacyTable,
          parentLegacyId: preparedLine.source.parentLegacyId,
          targetTable: "sales_stock_order_line",
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
            startNumber: null,
            endNumber: null,
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
          ),
        };
      },
    );

    migratedOrders.push({
      legacyTable: order.legacyTable,
      legacyId: order.legacyId,
      sourceDocumentNo: sourceDocumentNo ?? targetDocumentNoCandidate,
      targetTable: "sales_stock_order",
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
    migrationBatch: OUTBOUND_MIGRATION_BATCH,
    migratedOrders: migratedOrders.sort(
      (left, right) => left.legacyId - right.legacyId,
    ),
    excludedDocuments: excludedDocuments.sort(
      (left, right) => left.legacyId - right.legacyId,
    ),
    documentNoRewrites: rewrites,
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

export function hasExecutionBlockers(plan: OutboundMigrationPlan): boolean {
  return plan.globalBlockers.length > 0;
}

export function buildDryRunSummary(
  plan: OutboundMigrationPlan,
): Record<string, unknown> {
  return {
    migrationBatch: plan.migrationBatch,
    counts: plan.counts,
    documentNoRewrites: plan.documentNoRewrites,
    globalBlockers: plan.globalBlockers,
    warnings: plan.warnings,
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
      customerId: order.target.customerId,
      lineCount: order.lines.length,
      lifecycleStatus: order.target.lifecycleStatus,
      auditStatusSnapshot: order.target.auditStatusSnapshot,
      inventoryEffectStatus: order.target.inventoryEffectStatus,
    })),
    context: plan.context,
  };
}
