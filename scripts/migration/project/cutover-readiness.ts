import type { ProjectMigrationPlan } from "./types";

/**
 * Build the cutover readiness assessment for the project migration slice.
 *
 * Structural exclusions block cutover by default. Once all excluded projects have
 * been intentionally reviewed and accepted, set the environment variable
 * PROJECT_STRUCTURAL_EXCLUSIONS_ACKNOWLEDGED=true to clear that specific blocker.
 * The acknowledgement is explicit and auditable: it appears in the validate report
 * under cutoverReadiness.structuralExclusionsAcknowledged.
 *
 * Only unsigned (unacknowledged) structural exclusions block cutover; acknowledged
 * exclusions do not. Inventory replay completion is inferred from objective
 * evidence in downstream consumers instead of an out-of-band acknowledgement
 * flag. Downstream consumer counts remain visible in the validate report for
 * operator awareness, but rerun-safety enforcement belongs to the execute
 * guard rather than the final cutover readiness gate.
 */
export function buildCutoverReadiness(
  plan: ProjectMigrationPlan,
  downstreamConsumerCounts: Record<string, number>,
  structuralExclusionsAcknowledged: boolean,
): {
  cutoverReady: boolean;
  cutoverBlockers: string[];
  pendingProjectCount: number;
  pendingLineCount: number;
  structuralExcludedProjectCount: number;
  requiresInventoryReplay: boolean;
  inventoryReplayCompleted: boolean;
  expectedInventoryReplayLogCount: number;
  actualInventoryReplayLogCount: number;
  structuralExclusionsAcknowledged: boolean;
  downstreamConsumerCounts: Record<string, number>;
} {
  const cutoverBlockers: string[] = [];
  const pendingProjectCount = plan.pendingProjects.length;
  const pendingLineCount = plan.pendingProjects.reduce(
    (total, project) => total + project.pendingLineCount,
    0,
  );
  const structuralExcludedProjectCount = plan.excludedProjects.length;
  const expectedInventoryReplayLogCount = plan.migratedProjects.reduce(
    (total, project) => total + project.lines.length,
    0,
  );
  const actualInventoryReplayLogCount = Number(
    downstreamConsumerCounts.inventory_log ?? 0,
  );
  const requiresInventoryReplay = expectedInventoryReplayLogCount > 0;
  const inventoryReplayCompleted =
    !requiresInventoryReplay ||
    actualInventoryReplayLogCount >= expectedInventoryReplayLogCount;

  if (pendingProjectCount > 0) {
    cutoverBlockers.push(
      `${pendingProjectCount} project(s) have unresolved material backlog (${pendingLineCount} pending line(s)); must be resolved before cutover.`,
    );
  }

  if (structuralExcludedProjectCount > 0 && !structuralExclusionsAcknowledged) {
    cutoverBlockers.push(
      `${structuralExcludedProjectCount} project(s) are structurally excluded and require explicit acknowledgement before cutover. Set PROJECT_STRUCTURAL_EXCLUSIONS_ACKNOWLEDGED=true to acknowledge once exclusions are accepted.`,
    );
  }

  if (!inventoryReplayCompleted) {
    cutoverBlockers.push(
      `Inventory replay is incomplete for project slice: expected at least ${expectedInventoryReplayLogCount} project inventory log(s), found ${actualInventoryReplayLogCount}.`,
    );
  }

  return {
    cutoverReady: cutoverBlockers.length === 0,
    cutoverBlockers,
    pendingProjectCount,
    pendingLineCount,
    structuralExcludedProjectCount,
    requiresInventoryReplay,
    inventoryReplayCompleted,
    expectedInventoryReplayLogCount,
    actualInventoryReplayLogCount,
    structuralExclusionsAcknowledged,
    downstreamConsumerCounts,
  };
}
