export interface SharedTableEmptinessState {
  tableCounts: Record<string, number>;
  isRerun: boolean;
}

export interface FactoryNumberReservationSafetyState {
  currentCount: number;
  expectedCount: number;
}

export interface ValidationReadinessIssue {
  severity?: unknown;
  warningType?: unknown;
  [key: string]: unknown;
}

export const ACCEPTED_NEGATIVE_BALANCE_WARNING =
  "accepted-historical-negative-balance";

export function buildSharedTableBlockers(
  state: SharedTableEmptinessState,
): Array<Record<string, unknown>> {
  if (state.isRerun) {
    return [];
  }

  const nonEmptyTables = Object.entries(state.tableCounts).filter(
    ([tableName, count]) =>
      tableName !== "factory_number_reservation" && count > 0,
  );

  if (nonEmptyTables.length === 0) {
    return [];
  }

  return [
    {
      reason:
        "Shared downstream tables are not empty and this is not a rerun. Execute would overwrite data not owned by this phase.",
      nonEmptyTables: Object.fromEntries(nonEmptyTables),
    },
  ];
}

export function buildFactoryNumberReservationBlockers(
  state: FactoryNumberReservationSafetyState,
): Array<Record<string, unknown>> {
  if (state.currentCount === state.expectedCount) {
    return [];
  }

  return [
    {
      reason:
        "factory_number_reservation count has changed from the known live baseline. This phase must not touch reservations.",
      expectedCount: state.expectedCount,
      currentCount: state.currentCount,
    },
  ];
}

export function buildAdmissionBaselineBlockers(options: {
  admittedSalesReturnOrders: number;
  admittedSalesReturnLines: number;
  admittedWorkshopReturnOrders: number;
  admittedWorkshopReturnLines: number;
}): Array<Record<string, unknown>> {
  const blockers: Array<Record<string, unknown>> = [];

  if (
    options.admittedSalesReturnOrders <= 0 ||
    options.admittedSalesReturnLines <= 0
  ) {
    blockers.push({
      reason:
        "Admitted sales-return baseline is empty; run sales-return execute before this phase.",
      expectedOrders: ">0",
      expectedLines: ">0",
      actualOrders: options.admittedSalesReturnOrders,
      actualLines: options.admittedSalesReturnLines,
    });
  }

  if (
    options.admittedWorkshopReturnOrders <= 0 ||
    options.admittedWorkshopReturnLines <= 0
  ) {
    blockers.push({
      reason:
        "Admitted workshop-return baseline is empty; run workshop-return execute before this phase.",
      expectedOrders: ">0",
      expectedLines: ">0",
      actualOrders: options.admittedWorkshopReturnOrders,
      actualLines: options.admittedWorkshopReturnLines,
    });
  }

  return blockers;
}

export function buildValidationReadiness(options: {
  validationIssues: ValidationReadinessIssue[];
}): {
  manualReviewRequired: boolean;
  cutoverReady: boolean;
} {
  const hasBlockingIssues = options.validationIssues.some(
    (issue) => issue.severity === "blocker",
  );
  const hasManualReviewWarnings = options.validationIssues.some(
    (issue) =>
      issue.severity === "warning" &&
      issue.warningType !== ACCEPTED_NEGATIVE_BALANCE_WARNING,
  );

  return {
    manualReviewRequired: hasManualReviewWarnings,
    cutoverReady: !hasBlockingIssues && !hasManualReviewWarnings,
  };
}
