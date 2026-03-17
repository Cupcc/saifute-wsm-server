import type { Pool, PoolConnection } from "mariadb";
import * as mariadb from "mariadb";

export interface QueryResultWithInsertId {
  insertId?: number;
}

export interface MigrationConnectionLike {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export function createMariaDbPool(connectionString: string): Pool {
  const url = new URL(connectionString);

  return mariadb.createPool({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\/+/, ""),
    connectionLimit: 4,
    bigIntAsNumber: true,
    insertIdAsNumber: true,
    decimalAsNumber: false,
    dateStrings: true,
  });
}

export async function withPoolConnection<T>(
  pool: Pool,
  handler: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();

  try {
    return await handler(connection);
  } finally {
    connection.release();
  }
}

export async function closePools(
  ...pools: Array<Pool | null | undefined>
): Promise<void> {
  await Promise.all(
    pools
      .filter((pool): pool is Pool => pool !== null && pool !== undefined)
      .map((pool) => pool.end()),
  );
}

export function splitSqlStatements(sql: string): string[] {
  const withoutBlockComments = sql.replace(/\/\*[\s\S]*?\*\//gu, "");
  const withoutLineComments = withoutBlockComments
    .split(/\r?\n/u)
    .filter((line) => {
      const trimmedLine = line.trim();
      return !trimmedLine.startsWith("--") && !trimmedLine.startsWith("#");
    })
    .join("\n");

  return withoutLineComments
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
