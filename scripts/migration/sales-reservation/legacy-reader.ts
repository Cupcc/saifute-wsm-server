import type { MigrationConnectionLike } from "../db";
import type {
  ExcludedOutboundDocumentRecord,
  LegacyIntervalRow,
  LegacyIntervalSnapshot,
  LegacyOutboundDetailReferenceRow,
  MappedOutboundLineRecord,
  MappedOutboundOrderRecord,
  OutboundBaseBaselineSummary,
  OutboundReservationDependencySnapshot,
} from "./types";
import { OUTBOUND_BASE_MIGRATION_BATCH } from "./types";

async function readLegacyIntervals(
  connection: MigrationConnectionLike,
): Promise<LegacyIntervalRow[]> {
  return connection.query<LegacyIntervalRow[]>(
    `
      SELECT
        'saifute_interval' AS legacyTable,
        interval_id AS legacyId,
        order_type AS orderType,
        detail_id AS detailLegacyId,
        start_num AS startNum,
        end_num AS endNum
      FROM saifute_interval
      ORDER BY interval_id ASC
    `,
  );
}

async function readLegacyOutboundDetailReferences(
  connection: MigrationConnectionLike,
): Promise<LegacyOutboundDetailReferenceRow[]> {
  return connection.query<LegacyOutboundDetailReferenceRow[]>(
    `
      SELECT
        detail_id AS legacyId,
        outbound_id AS parentLegacyId
      FROM saifute_outbound_detail
      ORDER BY detail_id ASC
    `,
  );
}

export async function readLegacyIntervalSnapshot(
  connection: MigrationConnectionLike,
): Promise<LegacyIntervalSnapshot> {
  const [intervals, outboundDetailReferences] = await Promise.all([
    readLegacyIntervals(connection),
    readLegacyOutboundDetailReferences(connection),
  ]);

  return {
    intervals,
    outboundDetailReferences,
  };
}

async function readOutboundOrderMaps(
  connection: MigrationConnectionLike,
): Promise<Map<number, MappedOutboundOrderRecord>> {
  const rows = await connection.query<MappedOutboundOrderRecord[]>(
    `
      SELECT
        map_row.legacy_table AS legacyTable,
        map_row.legacy_id AS legacyId,
        map_row.target_table AS targetTable,
        map_row.target_id AS targetId,
        map_row.target_code AS targetCode,
        order_row.document_no AS actualTargetCode,
        order_row.lifecycle_status AS lifecycleStatus,
        order_row.workshop_id AS workshopId,
        order_row.biz_date AS bizDate,
        order_row.created_at AS createdAt,
        order_row.updated_at AS updatedAt,
        order_row.voided_at AS voidedAt
      FROM migration_staging.map_sales_stock_order map_row
      LEFT JOIN sales_stock_order order_row
        ON order_row.id = map_row.target_id
      WHERE map_row.migration_batch = ?
      ORDER BY map_row.legacy_id ASC
    `,
    [OUTBOUND_BASE_MIGRATION_BATCH],
  );

  return new Map(rows.map((row) => [row.legacyId, row] as const));
}

async function readOutboundLineMaps(
  connection: MigrationConnectionLike,
): Promise<Map<number, MappedOutboundLineRecord>> {
  const rows = await connection.query<MappedOutboundLineRecord[]>(
    `
      SELECT
        map_row.legacy_table AS legacyTable,
        map_row.legacy_id AS legacyId,
        map_row.target_table AS targetTable,
        map_row.target_id AS targetId,
        map_row.target_code AS targetCode,
        CASE
          WHEN order_row.document_no IS NULL OR line_row.line_no IS NULL THEN NULL
          ELSE CONCAT(order_row.document_no, '#', line_row.line_no)
        END AS actualTargetCode,
        line_row.order_id AS orderTargetId,
        line_row.line_no AS lineNo,
        line_row.material_id AS materialId,
        line_row.start_number AS startNumber,
        line_row.end_number AS endNumber,
        line_row.source_document_type AS sourceDocumentType,
        line_row.source_document_id AS sourceDocumentId,
        line_row.source_document_line_id AS sourceDocumentLineId
      FROM migration_staging.map_sales_stock_order_line map_row
      LEFT JOIN sales_stock_order_line line_row
        ON line_row.id = map_row.target_id
      LEFT JOIN sales_stock_order order_row
        ON order_row.id = line_row.order_id
      WHERE map_row.migration_batch = ?
      ORDER BY map_row.legacy_id ASC
    `,
    [OUTBOUND_BASE_MIGRATION_BATCH],
  );

  return new Map(rows.map((row) => [row.legacyId, row] as const));
}

async function readExcludedOutboundOrders(
  connection: MigrationConnectionLike,
): Promise<Map<number, ExcludedOutboundDocumentRecord>> {
  const rows = await connection.query<
    Array<
      ExcludedOutboundDocumentRecord & {
        rowId: number;
      }
    >
  >(
    `
      SELECT
        id AS rowId,
        legacy_table AS legacyTable,
        legacy_id AS legacyId,
        exclusion_reason AS exclusionReason,
        payload_json AS payloadJson
      FROM migration_staging.excluded_documents
      WHERE migration_batch = ?
        AND legacy_table = 'saifute_outbound_order'
      ORDER BY legacy_id ASC, id ASC
    `,
    [OUTBOUND_BASE_MIGRATION_BATCH],
  );

  const excludedOrderByLegacyId = new Map<
    number,
    ExcludedOutboundDocumentRecord
  >();

  for (const row of rows) {
    if (!excludedOrderByLegacyId.has(row.legacyId)) {
      excludedOrderByLegacyId.set(row.legacyId, {
        legacyTable: row.legacyTable,
        legacyId: row.legacyId,
        exclusionReason: row.exclusionReason,
        payloadJson: row.payloadJson,
      });
    }
  }

  return excludedOrderByLegacyId;
}

async function readOutboundBaseBaseline(
  connection: MigrationConnectionLike,
): Promise<OutboundBaseBaselineSummary> {
  const [countRows, excludedRows] = await Promise.all([
    connection.query<Array<{ tableName: string; total: number }>>(
      `
        SELECT 'map_sales_stock_order' AS tableName, COUNT(*) AS total
        FROM migration_staging.map_sales_stock_order
        WHERE migration_batch = ?
        UNION ALL
        SELECT 'map_sales_stock_order_line' AS tableName, COUNT(*) AS total
        FROM migration_staging.map_sales_stock_order_line
        WHERE migration_batch = ?
      `,
      [OUTBOUND_BASE_MIGRATION_BATCH, OUTBOUND_BASE_MIGRATION_BATCH],
    ),
    connection.query<Array<{ total: number }>>(
      `
        SELECT COUNT(*) AS total
        FROM migration_staging.excluded_documents
        WHERE migration_batch = ?
          AND legacy_table = 'saifute_outbound_order'
      `,
      [OUTBOUND_BASE_MIGRATION_BATCH],
    ),
  ]);

  let actualOrderMapCount = 0;
  let actualLineMapCount = 0;

  for (const row of countRows) {
    if (row.tableName === "map_sales_stock_order") {
      actualOrderMapCount = Number(row.total);
    }
    if (row.tableName === "map_sales_stock_order_line") {
      actualLineMapCount = Number(row.total);
    }
  }

  const actualExcludedDocumentCount = Number(excludedRows[0]?.total ?? 0);
  const issues: string[] = [];

  if (actualOrderMapCount <= 0) {
    issues.push(
      "batch2c outbound order map is empty; run sales execute before this migration slice.",
    );
  }

  if (actualLineMapCount <= 0) {
    issues.push(
      "batch2c outbound line map is empty; run sales execute before this migration slice.",
    );
  }

  return {
    expectedOrderMapCount: actualOrderMapCount,
    actualOrderMapCount,
    expectedLineMapCount: actualLineMapCount,
    actualLineMapCount,
    expectedExcludedDocumentCount: actualExcludedDocumentCount,
    actualExcludedDocumentCount,
    issues,
  };
}

export async function readOutboundReservationDependencySnapshot(
  connection: MigrationConnectionLike,
): Promise<OutboundReservationDependencySnapshot> {
  const [
    orderMapByLegacyId,
    lineMapByLegacyId,
    excludedOrderByLegacyId,
    outboundBaseBaseline,
  ] = await Promise.all([
    readOutboundOrderMaps(connection),
    readOutboundLineMaps(connection),
    readExcludedOutboundOrders(connection),
    readOutboundBaseBaseline(connection),
  ]);

  return {
    orderMapByLegacyId,
    lineMapByLegacyId,
    excludedOrderByLegacyId,
    outboundBaseBaseline,
  };
}
