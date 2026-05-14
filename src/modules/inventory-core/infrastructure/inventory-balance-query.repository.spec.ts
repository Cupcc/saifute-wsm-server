import { Prisma } from "../../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { InventoryBalanceQueryRepository } from "./inventory-balance-query.repository";

describe("InventoryBalanceQueryRepository", () => {
  it("lists balances by natural material-code order with structured filters", async () => {
    const $queryRaw = jest.fn().mockResolvedValue([{ id: 3 }, { id: 24 }]);
    const findMany = jest.fn().mockResolvedValue([
      { id: 24, material: { materialCode: "bg24" } },
      { id: 3, material: { materialCode: "bg3" } },
    ]);
    const count = jest.fn().mockResolvedValue(2);
    const repository = new InventoryBalanceQueryRepository({
      $queryRaw,
      inventoryBalance: {
        findMany,
        count,
      },
    } as unknown as PrismaService);

    const result = await repository.findBalances({
      materialId: 7,
      stockScopeIds: [1, 2],
      keyword: " bg ",
      categoryIds: [9],
      limit: 20,
      offset: 5,
    });

    const where = count.mock.calls[0][0].where;
    expect(where).toEqual({
      materialId: 7,
      stockScopeId: { in: [1, 2] },
      material: {
        OR: [
          { materialCode: { contains: "bg" } },
          { materialName: { contains: "bg" } },
          { specModel: { contains: "bg" } },
        ],
        categoryId: 9,
      },
    });
    const [query] = $queryRaw.mock.calls[0] as [Prisma.Sql];
    expect(query.sql).toContain("FROM inventory_balance");
    expect(query.sql).toContain("INNER JOIN material");
    expect(query.sql).toContain("REGEXP_REPLACE(material.material_code");
    expect(query.sql).toContain("REGEXP_SUBSTR(material.material_code");
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: [3, 24] } },
      include: { material: true, stockScope: true },
    });
    expect(result.items.map((item) => item.material.materialCode)).toEqual([
      "bg3",
      "bg24",
    ]);
  });
});
