import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseMigrationCliOptions,
  resolveReportPath,
} from "../config";
import { closePools, createMariaDbPool, withPoolConnection } from "../db";
import { writeStableReport } from "../shared/report-writer";
import { buildInventoryReplayPlan } from "./planner";
import { readAllInventoryEvents } from "./reader";

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(
    cliOptions,
    "inventory-replay-validate-report.json",
  );
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: false });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );

  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    const report = await withPoolConnection(
      targetPool,
      async (targetConnection) => {
        const events = await readAllInventoryEvents(targetConnection);
        const plan = buildInventoryReplayPlan(events);

        const validationIssues: Array<Record<string, unknown>> = [];

        const balanceRows = await targetConnection.query<
          Array<{
            materialId: number;
            workshopId: number;
            quantityOnHand: string;
          }>
        >(
          `SELECT materialId, workshopId, quantityOnHand FROM inventory_balance ORDER BY materialId ASC, workshopId ASC`,
        );

        const logCount = await targetConnection.query<Array<{ total: number }>>(
          `SELECT COUNT(*) AS total FROM inventory_log WHERE reversalOfLogId IS NULL`,
        );
        const actualLogCount = Number(logCount[0]?.total ?? 0);

        if (balanceRows.length !== plan.plannedBalances.length) {
          validationIssues.push({
            severity: "blocker",
            reason:
              "inventory_balance row count does not match the replay plan.",
            expected: plan.plannedBalances.length,
            actual: balanceRows.length,
          });
        }

        if (actualLogCount !== plan.plannedLogs.length) {
          validationIssues.push({
            severity: "blocker",
            reason: "inventory_log row count does not match the replay plan.",
            expected: plan.plannedLogs.length,
            actual: actualLogCount,
          });
        }

        const balanceMap = new Map(
          balanceRows.map((row) => [
            `${row.materialId}::${row.workshopId}`,
            row.quantityOnHand,
          ]),
        );

        let balanceMismatches = 0;
        for (const planned of plan.plannedBalances) {
          const key = `${planned.materialId}::${planned.workshopId}`;
          const actual = balanceMap.get(key);
          if (actual === undefined) {
            validationIssues.push({
              severity: "blocker",
              reason: "Expected inventory_balance row is missing.",
              materialId: planned.materialId,
              workshopId: planned.workshopId,
              expectedQty: planned.quantityOnHand,
            });
            balanceMismatches += 1;
          } else {
            const plannedNorm = normalizeDecimal(planned.quantityOnHand);
            const actualNorm = normalizeDecimal(actual);
            if (plannedNorm !== actualNorm) {
              validationIssues.push({
                severity: "blocker",
                reason:
                  "inventory_balance quantityOnHand does not match the replay plan.",
                materialId: planned.materialId,
                workshopId: planned.workshopId,
                expected: planned.quantityOnHand,
                actual,
              });
              balanceMismatches += 1;
            }
          }
        }

        const idempotencyKeyCount = await targetConnection.query<
          Array<{ total: number }>
        >(`SELECT COUNT(DISTINCT idempotencyKey) AS total FROM inventory_log`);
        const actualUniqueKeys = Number(idempotencyKeyCount[0]?.total ?? 0);

        if (actualUniqueKeys !== plan.plannedLogs.length) {
          validationIssues.push({
            severity: "warning",
            reason:
              "inventory_log unique idempotency key count does not match the replay plan (may include reversal entries).",
            expected: plan.plannedLogs.length,
            actual: actualUniqueKeys,
          });
        }

        return {
          mode: "validate",
          targetDatabaseName,
          migrationBatch: plan.migrationBatch,
          totalEvents: plan.events.length,
          eventCounts: plan.eventCounts,
          expectedBalances: plan.plannedBalances.length,
          expectedLogs: plan.plannedLogs.length,
          actualBalances: balanceRows.length,
          actualLogs: actualLogCount,
          balanceMismatches,
          warnings: plan.warnings,
          validationIssues,
        };
      },
    );

    writeStableReport(reportPath, report);
    console.log(`Inventory-replay validation completed. report=${reportPath}`);

    if (report.validationIssues.some((issue) => issue.severity === "blocker")) {
      process.exitCode = 1;
    }
  } finally {
    await closePools(targetPool);
  }
}

function normalizeDecimal(value: string): string {
  const trimmed = String(value).trim();
  const match = trimmed.match(/^([+-])?(\d+)(?:\.(\d+))?$/u);
  if (!match) return trimmed;
  const [, sign = "", intPart, fracPart = ""] = match;
  const normalizedInt = intPart.replace(/^0+(?=\d)/u, "") || "0";
  const normalizedFrac = fracPart.replace(/0+$/u, "");
  const prefix =
    sign === "-" && (normalizedInt !== "0" || normalizedFrac) ? "-" : "";
  return normalizedFrac
    ? `${prefix}${normalizedInt}.${normalizedFrac}`
    : `${prefix}${normalizedInt}`;
}

void main();
