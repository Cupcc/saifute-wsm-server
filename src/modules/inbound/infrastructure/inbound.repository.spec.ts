import { DocumentFamily } from "../../../../generated/prisma/client";
import { BusinessDocumentType } from "../../../shared/domain/business-document-type";
import { InboundRepository } from "./inbound.repository";

describe("InboundRepository", () => {
  function createRepository() {
    const prisma = {
      documentRelation: {
        count: jest.fn().mockResolvedValue(0),
      },
      documentLineRelation: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      stockInOrder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    return {
      prisma,
      repository: new InboundRepository(prisma as never),
    };
  }

  it("ignores line relations whose downstream stock-in order has been voided", async () => {
    const { repository, prisma } = createRepository();
    prisma.documentLineRelation.findMany.mockResolvedValue([
      {
        downstreamFamily: DocumentFamily.STOCK_IN,
        downstreamDocumentType: BusinessDocumentType.StockInOrder,
        downstreamDocumentId: 2,
      },
    ]);
    prisma.stockInOrder.findMany.mockResolvedValue([{ id: 2 }]);

    await expect(repository.hasActiveDownstreamDependencies(1)).resolves.toBe(
      false,
    );
  });

  it("keeps active line relations as downstream dependencies", async () => {
    const { repository, prisma } = createRepository();
    prisma.documentLineRelation.findMany.mockResolvedValue([
      {
        downstreamFamily: DocumentFamily.STOCK_IN,
        downstreamDocumentType: BusinessDocumentType.StockInOrder,
        downstreamDocumentId: 2,
      },
    ]);
    prisma.stockInOrder.findMany.mockResolvedValue([]);

    await expect(repository.hasActiveDownstreamDependencies(1)).resolves.toBe(
      true,
    );
  });
});
