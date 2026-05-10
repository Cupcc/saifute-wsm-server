import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
  loadMigrationEnvironment,
  parseMigrationCliOptions,
  resolveReportPath,
} from "../config";
import { closePools, createMariaDbPool, withPoolConnection } from "../db";
import { writeStableReport } from "../shared/report-writer";
import {
  CANONICAL_APPROVAL_DOCUMENT_TABLE,
  readApprovalDocumentCutoverState,
} from "./shared";

type CountRow = { total: number };
type ApprovalProbeRow = {
  auditStatus: string;
  decidedBy: string | null;
  rejectReason: string | null;
};

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const reportPath = resolveReportPath(
    cliOptions,
    "approval-document-phase2-rehearsal-report.json",
  );
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: false });
  const targetDatabaseName = assertExpectedDatabaseName(
    env.databaseUrl,
    EXPECTED_TARGET_DATABASE_NAME,
    "Target",
  );
  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    await withPoolConnection(targetPool, async (connection) => {
      const stateBefore = await readApprovalDocumentCutoverState(connection);
      if (
        stateBefore.canonical.type !== "BASE TABLE" ||
        stateBefore.legacy.type !== null
      ) {
        throw new Error(
          "Rehearsal requires approval_document base table and no legacy audit_document object.",
        );
      }

      const rehearsalDocumentType = "ApprovalDocumentCutoverRehearsal";
      const rehearsalDocumentId = Math.trunc(Date.now() / 1000);
      const rehearsalDocumentNumber = `APR-REHEARSAL-${rehearsalDocumentId}`;
      const rehearsalCreatedBy = "approval-cutover-rehearsal";
      let insertedCountViaCanonical = 0;
      let updatedAuditStatus: string | null = null;
      let updatedDecisionBy: string | null = null;
      let deletedCountViaCanonical = 0;
      let transactionStarted = false;

      try {
        await connection.beginTransaction();
        transactionStarted = true;

        await connection.query(
          `
            INSERT INTO \`${CANONICAL_APPROVAL_DOCUMENT_TABLE}\` (
              document_family,
              document_type,
              document_id,
              document_number,
              audit_status,
              reset_count,
              submitted_by,
              submitted_at,
              created_by,
              created_at,
              updated_by,
              updated_at
            )
            VALUES (?, ?, ?, ?, 'PENDING', 0, ?, NOW(), ?, NOW(), ?, NOW())
          `,
          [
            "STOCK_IN",
            rehearsalDocumentType,
            rehearsalDocumentId,
            rehearsalDocumentNumber,
            rehearsalCreatedBy,
            rehearsalCreatedBy,
            rehearsalCreatedBy,
          ],
        );

        const [insertCountRow] = await connection.query<CountRow[]>(
          `
            SELECT COUNT(*) AS total
            FROM \`${CANONICAL_APPROVAL_DOCUMENT_TABLE}\`
            WHERE document_type = ?
              AND document_id = ?
          `,
          [rehearsalDocumentType, rehearsalDocumentId],
        );
        insertedCountViaCanonical = Number(insertCountRow?.total ?? 0);

        await connection.query(
          `
            UPDATE \`${CANONICAL_APPROVAL_DOCUMENT_TABLE}\`
            SET audit_status = 'APPROVED',
                decided_by = ?,
                decided_at = NOW(),
                reject_reason = NULL,
                updated_by = ?
            WHERE document_type = ?
              AND document_id = ?
          `,
          [
            rehearsalCreatedBy,
            rehearsalCreatedBy,
            rehearsalDocumentType,
            rehearsalDocumentId,
          ],
        );

        const [approvalRow] = await connection.query<ApprovalProbeRow[]>(
          `
            SELECT audit_status AS auditStatus, decided_by AS decidedBy, reject_reason AS rejectReason
            FROM \`${CANONICAL_APPROVAL_DOCUMENT_TABLE}\`
            WHERE document_type = ?
              AND document_id = ?
          `,
          [rehearsalDocumentType, rehearsalDocumentId],
        );
        updatedAuditStatus = approvalRow?.auditStatus ?? null;
        updatedDecisionBy = approvalRow?.decidedBy ?? null;

        await connection.query(
          `
            DELETE FROM \`${CANONICAL_APPROVAL_DOCUMENT_TABLE}\`
            WHERE document_type = ?
              AND document_id = ?
          `,
          [rehearsalDocumentType, rehearsalDocumentId],
        );

        const [deleteCountRow] = await connection.query<CountRow[]>(
          `
            SELECT COUNT(*) AS total
            FROM \`${CANONICAL_APPROVAL_DOCUMENT_TABLE}\`
            WHERE document_type = ?
              AND document_id = ?
          `,
          [rehearsalDocumentType, rehearsalDocumentId],
        );
        deletedCountViaCanonical = Number(deleteCountRow?.total ?? 0);
      } finally {
        if (transactionStarted) {
          await connection.rollback();
        }
      }

      const stateAfterRollback =
        await readApprovalDocumentCutoverState(connection);
      const rollbackCountParity =
        stateBefore.canonical.rowCount ===
          stateAfterRollback.canonical.rowCount &&
        stateBefore.legacy.rowCount === stateAfterRollback.legacy.rowCount;
      const rehearsalPassed =
        insertedCountViaCanonical === 1 &&
        updatedAuditStatus === "APPROVED" &&
        updatedDecisionBy === rehearsalCreatedBy &&
        deletedCountViaCanonical === 0 &&
        rollbackCountParity;

      const report = {
        scope: "approval-document-phase2-rehearsal",
        targetDatabaseName,
        rehearsalDocumentType,
        rehearsalDocumentId,
        rehearsalDocumentNumber,
        stateBefore,
        insertedCountViaCanonical,
        updatedAuditStatus,
        updatedDecisionBy,
        deletedCountViaCanonical,
        stateAfterRollback,
        rollbackCountParity,
        rehearsalPassed,
      };

      writeStableReport(reportPath, report);

      if (!rehearsalPassed) {
        throw new Error(
          "approval-document phase2 rehearsal failed; inspect the rehearsal report for details.",
        );
      }

      console.log(
        `approval-document phase2 rehearsal passed. report=${reportPath}`,
      );
    });
  } finally {
    await closePools(targetPool);
  }
}

void main();
