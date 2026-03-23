export interface SharedTargetMapIntegrityState {
  targetTable: string;
  missingMappedTargets: number;
}

export interface SharedTargetMapConsistencyState {
  targetTable: string;
  missingExpectedMapRows: number;
  unexpectedMapRows: number;
  mismatchedTargetCodes: number;
  mismatchedActualTargetCodes: number;
  allowMissingExpectedMapRows?: boolean;
  allowUnexpectedMapRows?: boolean;
}

export interface DocumentNoCollisionState {
  plannedDocumentNos: string[];
  existingUnownedDocumentNos: string[];
}

export interface DownstreamConsumerState {
  isRerun: boolean;
  consumerCounts: Record<string, number>;
}

export function buildMissingMapTargetBlockers(
  state: SharedTargetMapIntegrityState,
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
  state: SharedTargetMapConsistencyState,
): Array<Record<string, unknown>> {
  const effectiveMissingExpectedMapRows = state.allowMissingExpectedMapRows
    ? 0
    : state.missingExpectedMapRows;
  const effectiveUnexpectedMapRows = state.allowUnexpectedMapRows
    ? 0
    : state.unexpectedMapRows;

  if (
    effectiveMissingExpectedMapRows === 0 &&
    effectiveUnexpectedMapRows === 0 &&
    state.mismatchedTargetCodes === 0 &&
    state.mismatchedActualTargetCodes === 0
  ) {
    return [];
  }

  return [
    {
      reason:
        "This batch's staging map rows do not match the deterministic sales-return plan, so rerun cleanup would be unsafe.",
      targetTable: state.targetTable,
      missingExpectedMapRows: state.missingExpectedMapRows,
      unexpectedMapRows: state.unexpectedMapRows,
      mismatchedTargetCodes: state.mismatchedTargetCodes,
      mismatchedActualTargetCodes: state.mismatchedActualTargetCodes,
    },
  ];
}

export function buildDocumentNoCollisionBlockers(
  state: DocumentNoCollisionState,
): Array<Record<string, unknown>> {
  const plannedNormalized = state.plannedDocumentNos.map((no) =>
    no.trim().toLocaleLowerCase("en-US"),
  );
  const existingUnownedNormalized = new Set(
    state.existingUnownedDocumentNos.map((no) =>
      no.trim().toLocaleLowerCase("en-US"),
    ),
  );

  const collisions = plannedNormalized.filter((no) =>
    existingUnownedNormalized.has(no),
  );

  if (collisions.length === 0) {
    return [];
  }

  return [
    {
      reason:
        "Planned sales-return document numbers collide with existing target rows not owned by this batch.",
      collisionCount: collisions.length,
      collisions,
    },
  ];
}

export function buildDownstreamConsumerBlockers(
  state: DownstreamConsumerState,
): Array<Record<string, unknown>> {
  const activeConsumers = Object.entries(state.consumerCounts).filter(
    ([, count]) => count > 0,
  );

  if (activeConsumers.length === 0) {
    return [];
  }

  const reason = state.isRerun
    ? "Sales-return rerun is blocked because downstream tables already reference CustomerStockOrder rows or line ids created or modified by previous slices."
    : "Sales-return first execute is blocked because downstream tables that depend on the CustomerStockOrder baseline are already populated; executing would risk data corruption when the baseline is rebuilt.";

  return [
    {
      reason,
      downstreamConsumers: Object.fromEntries(activeConsumers),
    },
  ];
}
