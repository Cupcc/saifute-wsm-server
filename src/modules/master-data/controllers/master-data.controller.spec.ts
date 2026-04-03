import { Test } from "@nestjs/testing";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import { MasterDataService } from "../application/master-data.service";
import { MasterDataController } from "./master-data.controller";

describe("MasterDataController", () => {
  let controller: MasterDataController;
  let masterDataService: {
    listSuppliers: jest.Mock;
    createSupplier: jest.Mock;
    updateSupplier: jest.Mock;
    deactivateSupplier: jest.Mock;
  };

  const adminUser: SessionUserSnapshot = {
    userId: 1,
    username: "admin",
    displayName: "管理员",
    roles: ["admin"],
    permissions: ["*:*:*"],
    department: null,
    consoleMode: "default",
    workshopScope: {
      mode: "ALL",
      workshopId: null,
      workshopCode: null,
      workshopName: null,
    },
  };

  beforeEach(async () => {
    masterDataService = {
      listSuppliers: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      createSupplier: jest.fn().mockResolvedValue({ id: 1 }),
      updateSupplier: jest.fn().mockResolvedValue({ id: 1 }),
      deactivateSupplier: jest.fn().mockResolvedValue({ id: 1 }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [MasterDataController],
      providers: [
        {
          provide: MasterDataService,
          useValue: masterDataService,
        },
      ],
    }).compile();

    controller = moduleRef.get(MasterDataController);
  });

  it("forwards supplier list queries to the service", async () => {
    await controller.listSuppliers({
      keyword: "赛福特",
      limit: 20,
      offset: 10,
    });

    expect(masterDataService.listSuppliers).toHaveBeenCalledWith({
      keyword: "赛福特",
      limit: 20,
      offset: 10,
    });
  });

  it("creates suppliers with the current user id", async () => {
    await controller.createSupplier(
      {
        supplierCode: "SUP-001",
        supplierName: "赛福特供应商",
      },
      adminUser,
    );

    expect(masterDataService.createSupplier).toHaveBeenCalledWith(
      {
        supplierCode: "SUP-001",
        supplierName: "赛福特供应商",
      },
      "1",
    );
  });

  it("updates suppliers with the current user id", async () => {
    await controller.updateSupplier(
      9,
      {
        supplierName: "已更新供应商",
      },
      adminUser,
    );

    expect(masterDataService.updateSupplier).toHaveBeenCalledWith(
      9,
      {
        supplierName: "已更新供应商",
      },
      "1",
    );
  });

  it("deactivates suppliers with the current user id", async () => {
    await controller.deactivateSupplier(9, adminUser);

    expect(masterDataService.deactivateSupplier).toHaveBeenCalledWith(9, "1");
  });
});
