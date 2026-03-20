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
    options.admittedSalesReturnOrders !== 9 ||
    options.admittedSalesReturnLines !== 13
  ) {
    blockers.push({
      reason:
        "Admitted sales-return baseline does not match the reviewed-no-findings expectation.",
      expectedOrders: 9,
      expectedLines: 13,
      actualOrders: options.admittedSalesReturnOrders,
      actualLines: options.admittedSalesReturnLines,
    });
  }

  if (
    options.admittedWorkshopReturnOrders !== 3 ||
    options.admittedWorkshopReturnLines !== 4
  ) {
    blockers.push({
      reason:
        "Admitted workshop-return baseline does not match the reviewed-no-findings expectation.",
      expectedOrders: 3,
      expectedLines: 4,
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
