import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { MasterDataRepository } from "../infrastructure/master-data.repository";
import { MasterDataService } from "./master-data.service";

describe("MasterDataService", () => {
  function createRepositoryMock() {
    return {
      ensureCanonicalWorkshops: jest.fn().mockResolvedValue(undefined),
      ensureCanonicalStockScopes: jest.fn().mockResolvedValue(undefined),
      findSupplierByCode: jest.fn(),
      createSupplier: jest.fn(),
      findSupplierById: jest.fn(),
      updateSupplier: jest.fn(),
      createAutoSupplier: jest.fn(),
      findSuppliers: jest.fn(),
    };
  }

  it("ensures canonical workshops and stock scopes on module init", async () => {
    const repository = createRepositoryMock();
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    await service.onModuleInit();

    expect(repository.ensureCanonicalWorkshops).toHaveBeenCalledTimes(1);
    expect(repository.ensureCanonicalStockScopes).toHaveBeenCalledTimes(1);
  });

  it("creates a supplier after passing the unique-code check", async () => {
    const repository = createRepositoryMock();
    repository.findSupplierByCode.mockResolvedValue(null);
    repository.createSupplier.mockResolvedValue({
      id: 1,
      supplierCode: "SUP-001",
      supplierName: "赛福特供应商",
      status: "ACTIVE",
    });
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    const result = await service.createSupplier(
      {
        supplierCode: "SUP-001",
        supplierName: "赛福特供应商",
      },
      "1",
    );

    expect(repository.findSupplierByCode).toHaveBeenCalledWith("SUP-001");
    expect(repository.createSupplier).toHaveBeenCalledWith(
      {
        supplierCode: "SUP-001",
        supplierName: "赛福特供应商",
      },
      "1",
    );
    expect(result).toEqual(
      expect.objectContaining({
        supplierCode: "SUP-001",
        supplierName: "赛福特供应商",
      }),
    );
  });

  it("rejects duplicate supplier codes on create", async () => {
    const repository = createRepositoryMock();
    repository.findSupplierByCode.mockResolvedValue({
      id: 1,
      supplierCode: "SUP-001",
      supplierName: "已存在供应商",
    });
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    await expect(
      service.createSupplier({
        supplierCode: "SUP-001",
        supplierName: "重复供应商",
      }),
    ).rejects.toThrow(ConflictException);
    expect(repository.createSupplier).not.toHaveBeenCalled();
  });

  it("updates supplier code and name after checking for conflicts", async () => {
    const repository = createRepositoryMock();
    repository.findSupplierById.mockResolvedValue({
      id: 1,
      supplierCode: "SUP-001",
      supplierName: "旧供应商",
      status: "ACTIVE",
    });
    repository.findSupplierByCode.mockResolvedValue(null);
    repository.updateSupplier.mockResolvedValue({
      id: 1,
      supplierCode: "SUP-002",
      supplierName: "新供应商",
      status: "ACTIVE",
    });
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    const result = await service.updateSupplier(
      1,
      {
        supplierCode: "SUP-002",
        supplierName: "新供应商",
      },
      "2",
    );

    expect(repository.findSupplierById).toHaveBeenCalledWith(1);
    expect(repository.findSupplierByCode).toHaveBeenCalledWith("SUP-002");
    expect(repository.updateSupplier).toHaveBeenCalledWith(
      1,
      {
        supplierCode: "SUP-002",
        supplierName: "新供应商",
      },
      "2",
    );
    expect(result).toEqual(
      expect.objectContaining({
        supplierCode: "SUP-002",
      }),
    );
  });

  it("rejects supplier updates when the target record does not exist", async () => {
    const repository = createRepositoryMock();
    repository.findSupplierById.mockResolvedValue(null);
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    await expect(
      service.updateSupplier(404, {
        supplierName: "不存在供应商",
      }),
    ).rejects.toThrow(NotFoundException);
    expect(repository.updateSupplier).not.toHaveBeenCalled();
  });

  it("deactivates active suppliers and keeps detail reads status agnostic", async () => {
    const repository = createRepositoryMock();
    repository.findSupplierById.mockResolvedValue({
      id: 1,
      supplierCode: "SUP-001",
      supplierName: "赛福特供应商",
      status: "ACTIVE",
    });
    repository.updateSupplier.mockResolvedValue({
      id: 1,
      supplierCode: "SUP-001",
      supplierName: "赛福特供应商",
      status: "DISABLED",
    });
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    const result = await service.deactivateSupplier(1, "3");

    expect(repository.findSupplierById).toHaveBeenCalledWith(1);
    expect(repository.updateSupplier).toHaveBeenCalledWith(
      1,
      {
        status: "DISABLED",
      },
      "3",
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: "DISABLED",
      }),
    );
  });

  it("returns disabled suppliers directly when deactivation is requested twice", async () => {
    const repository = createRepositoryMock();
    repository.findSupplierById.mockResolvedValue({
      id: 1,
      supplierCode: "SUP-001",
      supplierName: "赛福特供应商",
      status: "DISABLED",
    });
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    const result = await service.deactivateSupplier(1, "3");

    expect(repository.updateSupplier).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: "DISABLED",
      }),
    );
  });

  it("lists suppliers with ACTIVE-only filtering by default", async () => {
    const repository = createRepositoryMock();
    repository.findSuppliers.mockResolvedValue({
      items: [],
      total: 0,
    });
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    await service.listSuppliers({
      keyword: "赛福特",
      limit: 20,
      offset: 5,
    });

    expect(repository.findSuppliers).toHaveBeenCalledWith({
      keyword: "赛福特",
      limit: 20,
      offset: 5,
      status: "ACTIVE",
    });
  });

  it("allows opt-in supplier queries to include disabled records", async () => {
    const repository = createRepositoryMock();
    repository.findSuppliers.mockResolvedValue({
      items: [],
      total: 0,
    });
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    await service.listSuppliers({
      keyword: "历史供应商",
      limit: 10,
      offset: 0,
      includeDisabled: true,
    });

    expect(repository.findSuppliers).toHaveBeenCalledWith({
      keyword: "历史供应商",
      limit: 10,
      offset: 0,
      status: undefined,
    });
  });

  it("creates AUTO_CREATED suppliers only when provenance is complete", async () => {
    const repository = createRepositoryMock();
    repository.findSupplierByCode.mockResolvedValue(null);
    repository.createAutoSupplier.mockResolvedValue({
      id: 9,
      supplierCode: "SUP-AUTO",
      supplierName: "自动补建供应商",
      status: "ACTIVE",
      creationMode: "AUTO_CREATED",
      sourceDocumentType: "StockInOrder",
      sourceDocumentId: 88,
    });
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    const result = await service.ensureSupplier(
      {
        supplierCode: "SUP-AUTO",
        supplierName: "自动补建供应商",
        sourceDocumentType: "StockInOrder",
        sourceDocumentId: 88,
      },
      "1",
    );

    expect(repository.createAutoSupplier).toHaveBeenCalledWith(
      {
        supplierCode: "SUP-AUTO",
        supplierName: "自动补建供应商",
        sourceDocumentType: "StockInOrder",
        sourceDocumentId: 88,
      },
      "1",
    );
    expect(result).toEqual(
      expect.objectContaining({
        creationMode: "AUTO_CREATED",
      }),
    );
  });

  it("rejects AUTO_CREATED suppliers without provenance", async () => {
    const repository = createRepositoryMock();
    repository.findSupplierByCode.mockResolvedValue(null);
    const service = new MasterDataService(
      repository as unknown as MasterDataRepository,
    );

    await expect(
      service.ensureSupplier({
        supplierCode: "SUP-AUTO",
        supplierName: "自动补建供应商",
        sourceDocumentType: "StockInOrder",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.createAutoSupplier).not.toHaveBeenCalled();
  });
});
