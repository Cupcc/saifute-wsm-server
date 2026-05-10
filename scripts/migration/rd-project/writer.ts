import type { MigrationConnectionLike, QueryResultWithInsertId } from "../db";
import { stableJsonStringify } from "../shared/deterministic";
import type {
  ArchivedFieldPayloadRecord,
  ExcludedRdProjectPlanRecord,
  PendingLinePlanRecord,
  PendingRdProjectPlanRecord,
  RdProjectAutoCreatedMaterialPlanRecord,
  RdProjectExecutionResult,
  RdProjectLinePlanRecord,
  RdProjectMigrationPlan,
  RdProjectPlanRecord,
} from "./types";
import {
  PENDING_RELATION_TYPE_RD_PROJECT_LINE_MATERIAL,
  RD_PROJECT_AUTO_CREATED_MATERIAL_SOURCE_DOCUMENT_TYPE,
} from "./types";

export const TARGET_TABLES = {
  project: "rd_project",
  line: "rd_project_material_line",
} as const;

export const MAP_TABLES = {
  project: "map_project",
  line: "map_project_material_line",
} as const;

async function runUpsert(
  connection: MigrationConnectionLike,
  sql: string,
  values: readonly unknown[],
): Promise<number> {
  const result =
    (await connection.query<QueryResultWithInsertId>(sql, values)) ?? {};
  const insertId = Number(result.insertId ?? 0);

  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new Error("Upsert did not yield a valid target id.");
  }

  return insertId;
}

async function cleanupSliceStagingRows(
  connection: MigrationConnectionLike,
  migrationBatch: string,
): Promise<void> {
  await connection.query(
    `
      DELETE line_row
      FROM ${TARGET_TABLES.line} line_row
      INNER JOIN migration_staging.${MAP_TABLES.line} map_row
        ON map_row.target_id = line_row.id
      WHERE map_row.migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE project_row
      FROM ${TARGET_TABLES.project} project_row
      INNER JOIN migration_staging.${MAP_TABLES.project} map_row
        ON map_row.target_id = project_row.id
      WHERE map_row.migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.${MAP_TABLES.project}
      WHERE migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.${MAP_TABLES.line}
      WHERE migration_batch = ?
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.archived_field_payload
      WHERE migration_batch = ?
        AND target_table IN ('material', 'rd_project', 'rd_project_material_line')
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM material
      WHERE creation_mode = 'AUTO_CREATED'
        AND source_document_type = ?
    `,
    [RD_PROJECT_AUTO_CREATED_MATERIAL_SOURCE_DOCUMENT_TYPE],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.excluded_documents
      WHERE migration_batch = ?
        AND legacy_table = 'saifute_composite_product'
    `,
    [migrationBatch],
  );
  await connection.query(
    `
      DELETE FROM migration_staging.pending_relations
      WHERE migration_batch = ?
        AND legacy_table = 'saifute_composite_product'
    `,
    [migrationBatch],
  );
}

async function upsertAutoCreatedMaterial(
  connection: MigrationConnectionLike,
  record: RdProjectAutoCreatedMaterialPlanRecord,
): Promise<number> {
  return runUpsert(
    connection,
    `
      INSERT INTO material (
        material_code,
        material_name,
        spec_model,
        category_id,
        unit_code,
        warning_min_qty,
        warning_max_qty,
        status,
        creation_mode,
        source_document_type,
        source_document_id,
        created_by,
        created_at,
        updated_by,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, COALESCE(?, CURRENT_TIMESTAMP)
      )
      ON DUPLICATE KEY UPDATE
        material_name = VALUES(material_name),
        spec_model = VALUES(spec_model),
        category_id = VALUES(category_id),
        unit_code = VALUES(unit_code),
        warning_min_qty = VALUES(warning_min_qty),
        warning_max_qty = VALUES(warning_max_qty),
        status = VALUES(status),
        creation_mode = VALUES(creation_mode),
        source_document_type = VALUES(source_document_type),
        source_document_id = VALUES(source_document_id),
        created_by = VALUES(created_by),
        created_at = COALESCE(VALUES(created_at), created_at),
        updated_by = VALUES(updated_by),
        updated_at = COALESCE(VALUES(updated_at), updated_at),
        id = LAST_INSERT_ID(id)
    `,
    [
      record.target.materialCode,
      record.target.materialName,
      record.target.specModel,
      null,
      record.target.unitCode,
      record.target.warningMinQty,
      record.target.warningMaxQty,
      record.target.status,
      record.target.creationMode,
      record.target.sourceDocumentType,
      record.target.sourceDocumentId,
      record.target.createdBy,
      record.target.createdAt,
      record.target.updatedBy,
      record.target.updatedAt,
    ],
  );
}

async function upsertProject(
  connection: MigrationConnectionLike,
  record: RdProjectPlanRecord,
): Promise<number> {
  return runUpsert(
    connection,
    `
      INSERT INTO rd_project (
        project_code,
        project_name,
        biz_date,
        customer_id,
        supplier_id,
        manager_personnel_id,
        workshop_id,
        stock_scope_id,
        lifecycle_status,
        audit_status_snapshot,
        inventory_effect_status,
        revision_no,
        customer_code_snapshot,
        customer_name_snapshot,
        supplier_code_snapshot,
        supplier_name_snapshot,
        manager_name_snapshot,
        workshop_name_snapshot,
        total_qty,
        total_amount,
        remark,
        void_reason,
        voided_by,
        voided_at,
        created_by,
        created_at,
        updated_by,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        CASE
          WHEN ? = '研发小仓' THEN (SELECT id FROM stock_scope WHERE scope_code = 'RD_SUB' LIMIT 1)
          ELSE (SELECT id FROM stock_scope WHERE scope_code = 'MAIN' LIMIT 1)
        END,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, COALESCE(?, CURRENT_TIMESTAMP)
      )
      ON DUPLICATE KEY UPDATE
        project_name = VALUES(project_name),
        biz_date = VALUES(biz_date),
        customer_id = VALUES(customer_id),
        supplier_id = VALUES(supplier_id),
        manager_personnel_id = VALUES(manager_personnel_id),
        workshop_id = VALUES(workshop_id),
        stock_scope_id = VALUES(stock_scope_id),
        lifecycle_status = VALUES(lifecycle_status),
        audit_status_snapshot = VALUES(audit_status_snapshot),
        inventory_effect_status = VALUES(inventory_effect_status),
        revision_no = VALUES(revision_no),
        customer_code_snapshot = VALUES(customer_code_snapshot),
        customer_name_snapshot = VALUES(customer_name_snapshot),
        supplier_code_snapshot = VALUES(supplier_code_snapshot),
        supplier_name_snapshot = VALUES(supplier_name_snapshot),
        manager_name_snapshot = VALUES(manager_name_snapshot),
        workshop_name_snapshot = VALUES(workshop_name_snapshot),
        total_qty = VALUES(total_qty),
        total_amount = VALUES(total_amount),
        remark = VALUES(remark),
        void_reason = VALUES(void_reason),
        voided_by = VALUES(voided_by),
        voided_at = VALUES(voided_at),
        created_by = VALUES(created_by),
        created_at = COALESCE(VALUES(created_at), created_at),
        updated_by = VALUES(updated_by),
        updated_at = COALESCE(VALUES(updated_at), updated_at),
        id = LAST_INSERT_ID(id)
    `,
    [
      record.target.projectCode,
      record.target.projectName,
      record.target.bizDate,
      record.target.customerId,
      record.target.supplierId,
      record.target.managerPersonnelId,
      record.target.workshopId,
      record.target.workshopNameSnapshot,
      record.target.lifecycleStatus,
      record.target.auditStatusSnapshot,
      record.target.inventoryEffectStatus,
      record.target.revisionNo,
      record.target.customerCodeSnapshot,
      record.target.customerNameSnapshot,
      record.target.supplierCodeSnapshot,
      record.target.supplierNameSnapshot,
      record.target.managerNameSnapshot,
      record.target.workshopNameSnapshot,
      record.target.totalQty,
      record.target.totalAmount,
      record.target.remark,
      record.target.voidReason,
      record.target.voidedBy,
      record.target.voidedAt,
      record.target.createdBy,
      record.target.createdAt,
      record.target.updatedBy,
      record.target.updatedAt,
    ],
  );
}

async function upsertProjectMaterialLine(
  connection: MigrationConnectionLike,
  projectId: number,
  record: RdProjectLinePlanRecord,
  materialId: number,
): Promise<number> {
  return runUpsert(
    connection,
    `
      INSERT INTO rd_project_material_line (
        project_id,
        line_no,
        material_id,
        material_code_snapshot,
        material_name_snapshot,
        material_spec_snapshot,
        unit_code_snapshot,
        quantity,
        unit_price,
        amount,
        remark,
        created_by,
        created_at,
        updated_by,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, COALESCE(?, CURRENT_TIMESTAMP)
      )
      ON DUPLICATE KEY UPDATE
        material_id = VALUES(material_id),
        material_code_snapshot = VALUES(material_code_snapshot),
        material_name_snapshot = VALUES(material_name_snapshot),
        material_spec_snapshot = VALUES(material_spec_snapshot),
        unit_code_snapshot = VALUES(unit_code_snapshot),
        quantity = VALUES(quantity),
        unit_price = VALUES(unit_price),
        amount = VALUES(amount),
        remark = VALUES(remark),
        created_by = VALUES(created_by),
        created_at = COALESCE(VALUES(created_at), created_at),
        updated_by = VALUES(updated_by),
        updated_at = COALESCE(VALUES(updated_at), updated_at),
        id = LAST_INSERT_ID(id)
    `,
    [
      projectId,
      record.target.lineNo,
      materialId,
      record.target.materialCodeSnapshot,
      record.target.materialNameSnapshot,
      record.target.materialSpecSnapshot,
      record.target.unitCodeSnapshot,
      record.target.quantity,
      record.target.unitPrice,
      record.target.amount,
      record.target.remark,
      record.target.createdBy,
      record.target.createdAt,
      record.target.updatedBy,
      record.target.updatedAt,
    ],
  );
}

async function upsertMapRow(
  connection: MigrationConnectionLike,
  mapTable: string,
  migrationBatch: string,
  record: {
    legacyTable: string;
    legacyId: number;
    targetTable: string;
    targetCode: string;
  },
  targetId: number,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.${mapTable} (
        legacy_table,
        legacy_id,
        target_table,
        target_id,
        target_code,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        target_table = VALUES(target_table),
        target_id = VALUES(target_id),
        target_code = VALUES(target_code),
        migration_batch = VALUES(migration_batch)
    `,
    [
      record.legacyTable,
      record.legacyId,
      record.targetTable,
      targetId,
      record.targetCode,
      migrationBatch,
    ],
  );
}

async function upsertArchivedPayload(
  connection: MigrationConnectionLike,
  migrationBatch: string,
  payload: ArchivedFieldPayloadRecord,
  targetId: number | null,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.archived_field_payload (
        legacy_table,
        legacy_id,
        target_table,
        target_id,
        target_code,
        payload_kind,
        archive_reason,
        payload_json,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        target_id = VALUES(target_id),
        target_code = VALUES(target_code),
        payload_kind = VALUES(payload_kind),
        archive_reason = VALUES(archive_reason),
        payload_json = VALUES(payload_json),
        migration_batch = VALUES(migration_batch)
    `,
    [
      payload.legacyTable,
      payload.legacyId,
      payload.targetTable,
      targetId,
      payload.targetCode,
      payload.payloadKind,
      payload.archiveReason,
      stableJsonStringify(payload.payload),
      migrationBatch,
    ],
  );
}

async function insertExcludedProject(
  connection: MigrationConnectionLike,
  migrationBatch: string,
  record: ExcludedRdProjectPlanRecord,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO migration_staging.excluded_documents (
        legacy_table,
        legacy_id,
        exclusion_reason,
        payload_json,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?)
    `,
    [
      record.legacyTable,
      record.legacyId,
      record.exclusionReason,
      stableJsonStringify(record.payload),
      migrationBatch,
    ],
  );
}

async function insertPendingRelation(
  connection: MigrationConnectionLike,
  migrationBatch: string,
  projectLegacyId: number,
  lineRecord: PendingLinePlanRecord,
): Promise<void> {
  const payloadJson = stableJsonStringify({
    ...lineRecord.sourcePayload,
    resolutionEvidence: lineRecord.resolutionEvidence,
  });
  await connection.query(
    `
      INSERT INTO migration_staging.pending_relations (
        legacy_table,
        legacy_id,
        legacy_line_id,
        relation_type,
        pending_reason,
        payload_json,
        migration_batch
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      "saifute_composite_product",
      projectLegacyId,
      lineRecord.legacyId,
      PENDING_RELATION_TYPE_RD_PROJECT_LINE_MATERIAL,
      lineRecord.pendingReason.slice(0, 255),
      payloadJson,
      migrationBatch,
    ],
  );
}

async function writePendingProjectEvidence(
  connection: MigrationConnectionLike,
  migrationBatch: string,
  pendingProjects: readonly PendingRdProjectPlanRecord[],
  counts: { pendingRelationCount: number; pendingArchivedPayloadCount: number },
): Promise<void> {
  for (const pendingProject of pendingProjects) {
    await upsertArchivedPayload(
      connection,
      migrationBatch,
      pendingProject.summaryArchivedPayload,
      null,
    );
    counts.pendingArchivedPayloadCount += 1;

    for (const pendingLine of pendingProject.pendingLines) {
      await insertPendingRelation(
        connection,
        migrationBatch,
        pendingProject.legacyId,
        pendingLine,
      );
      counts.pendingRelationCount += 1;
    }
  }
}

function resolveLineMaterialId(
  record: RdProjectLinePlanRecord,
  autoCreatedMaterialIdsByCode: ReadonlyMap<string, number>,
): number {
  const autoCreatedMaterialId =
    autoCreatedMaterialIdsByCode.get(record.target.materialCodeSnapshot) ??
    null;
  if (autoCreatedMaterialId !== null) {
    return autoCreatedMaterialId;
  }

  if (record.target.materialId !== null) {
    return record.target.materialId;
  }

  throw new Error(
    `Project line ${record.legacyTable}#${record.legacyId} references auto-created material ${record.target.materialCodeSnapshot}, but no target material id was available during execute.`,
  );
}

export async function executeRdProjectPlan(
  connection: MigrationConnectionLike,
  plan: RdProjectMigrationPlan,
): Promise<RdProjectExecutionResult> {
  let insertedOrUpdatedAutoCreatedMaterials = 0;
  let insertedOrUpdatedProjects = 0;
  let insertedOrUpdatedLines = 0;
  let archivedPayloadCount = 0;
  let excludedDocumentCount = 0;
  const pendingCounts = {
    pendingRelationCount: 0,
    pendingArchivedPayloadCount: 0,
  };
  const autoCreatedMaterialIdsByCode = new Map<string, number>();

  await connection.beginTransaction();

  try {
    await cleanupSliceStagingRows(connection, plan.migrationBatch);

    for (const record of plan.autoCreatedMaterials) {
      const materialId = await upsertAutoCreatedMaterial(connection, record);
      insertedOrUpdatedAutoCreatedMaterials += 1;
      autoCreatedMaterialIdsByCode.set(record.target.materialCode, materialId);
      await upsertArchivedPayload(
        connection,
        plan.migrationBatch,
        record.archivedPayload,
        materialId,
      );
      archivedPayloadCount += 1;
    }

    for (const record of plan.migratedProjects) {
      const projectId = await upsertProject(connection, record);
      insertedOrUpdatedProjects += 1;

      await upsertMapRow(
        connection,
        MAP_TABLES.project,
        plan.migrationBatch,
        record,
        projectId,
      );
      await upsertArchivedPayload(
        connection,
        plan.migrationBatch,
        record.archivedPayload,
        projectId,
      );
      archivedPayloadCount += 1;

      for (const lineRecord of record.lines) {
        const materialId = resolveLineMaterialId(
          lineRecord,
          autoCreatedMaterialIdsByCode,
        );
        const lineId = await upsertProjectMaterialLine(
          connection,
          projectId,
          lineRecord,
          materialId,
        );
        insertedOrUpdatedLines += 1;

        await upsertMapRow(
          connection,
          MAP_TABLES.line,
          plan.migrationBatch,
          lineRecord,
          lineId,
        );
        await upsertArchivedPayload(
          connection,
          plan.migrationBatch,
          lineRecord.archivedPayload,
          lineId,
        );
        archivedPayloadCount += 1;
      }
    }

    for (const record of plan.excludedProjects) {
      await insertExcludedProject(connection, plan.migrationBatch, record);
      excludedDocumentCount += 1;
    }

    await writePendingProjectEvidence(
      connection,
      plan.migrationBatch,
      plan.pendingProjects,
      pendingCounts,
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  return {
    insertedOrUpdatedAutoCreatedMaterials,
    insertedOrUpdatedProjects,
    insertedOrUpdatedLines,
    archivedPayloadCount,
    excludedDocumentCount,
    pendingRelationCount: pendingCounts.pendingRelationCount,
    pendingArchivedPayloadCount: pendingCounts.pendingArchivedPayloadCount,
  };
}
