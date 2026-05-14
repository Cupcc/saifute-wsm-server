import { Prisma } from "../../../generated/prisma/client";

export function buildSqlWhere(conditions: Prisma.Sql[]): Prisma.Sql {
  if (conditions.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export function naturalCodeOrderBySql(
  codeColumn: Prisma.Sql,
  tieBreakerColumn: Prisma.Sql = Prisma.sql`id`,
): Prisma.Sql {
  return Prisma.sql`
    LOWER(REGEXP_REPLACE(${codeColumn}, '[0-9]+$', '')) ASC,
    CASE
      WHEN ${codeColumn} REGEXP '[0-9]+$'
      THEN CAST(REGEXP_SUBSTR(${codeColumn}, '[0-9]+$') AS UNSIGNED)
      ELSE 0
    END ASC,
    LOWER(${codeColumn}) ASC,
    ${tieBreakerColumn} ASC
  `;
}

export function orderByIds<T extends { id: number }>(
  items: T[],
  sortedIds: number[],
): T[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  return sortedIds.flatMap((id) => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
}
