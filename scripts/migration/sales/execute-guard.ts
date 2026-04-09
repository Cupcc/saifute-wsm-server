export interface SliceTargetState {
  targetTable: string;
  targetRows: number;
  batchMapRows: number;
}

export interface SliceMapIntegrityState {
  targetTable: string;
  missingMappedTargets: number;
}

export interface SliceMapConsistencyState {
  targetTable: string;
  missingExpectedMapRows: number;
  unexpectedMapRows: number;
  mismatchedTargetCodes: number;
  mismatchedActualTargetCodes: number;
}

export interface DownstreamConsumerState {
  isRerun: boolean;
  consumerCounts: Record<string, number>;
}

export function buildSliceDirtyTargetBlockers(
  state: SliceTargetState,
): Array<Record<string, unknown>> {
  if (state.targetRows === 0 && state.batchMapRows === 0) {
    return [];
  }

  if (state.targetRows === state.batchMapRows) {
    return [];
  }

  return [
    {
      reason:
        "Target table rows and this batch's staging map rows differ, so execute would run against a dirty slice target.",
      targetTable: state.targetTable,
      targetRows: state.targetRows,
      batchMapRows: state.batchMapRows,
    },
  ];
}

export function buildMissingMapTargetBlockers(
  state: SliceMapIntegrityState,
): Array<Record<string, unknown>> {
  if (state.missingMappedTargets === 0) {
    return [];
  }

  return [
    {
      reason:
        "This batch's staging map rows point at missing target rows, so execute would run against an inconsistent slice baseline.",
      targetTable: state.targetTable,
      missingMappedTargets: state.missingMappedTargets,
    },
  ];
}

export function buildMapConsistencyBlockers(
  state: SliceMapConsistencyState,
): Array<Record<string, unknown>> {
  if (
    state.missingExpectedMapRows === 0 &&
    state.unexpectedMapRows === 0 &&
    state.mismatchedTargetCodes === 0 &&
    state.mismatchedActualTargetCodes === 0
  ) {
    return [];
  }

  return [
    {
      reason:
        "This batch's staging map rows do not match the deterministic outbound plan, so rerun cleanup would be unsafe.",
      targetTable: state.targetTable,
      missingExpectedMapRows: state.missingExpectedMapRows,
      unexpectedMapRows: state.unexpectedMapRows,
      mismatchedTargetCodes: state.mismatchedTargetCodes,
      mismatchedActualTargetCodes: state.mismatchedActualTargetCodes,
    },
  ];
}

export function buildDownstreamConsumerBlockers(
  state: DownstreamConsumerState,
): Array<Record<string, unknown>> {
  if (!state.isRerun) {
    return [];
  }

  const activeConsumers = Object.entries(state.consumerCounts).filter(
    ([, count]) => count > 0,
  );

  if (activeConsumers.length === 0) {
    return [];
  }

  return [
    {
      reason:
        "Outbound rerun is blocked because downstream tables already reference SalesStockOrder rows or line ids.",
      downstreamConsumers: Object.fromEntries(activeConsumers),
    },
  ];
}
