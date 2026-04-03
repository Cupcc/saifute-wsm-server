import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";

const CANONICAL_WORKSHOPS: Prisma.WorkshopCreateManyInput[] = [
  {
    workshopCode: "MAIN",
    workshopName: "主仓",
    status: "ACTIVE",
    createdBy: "system-bootstrap",
    updatedBy: "system-bootstrap",
  },
  {
    workshopCode: "RD",
    workshopName: "研发小仓",
    status: "ACTIVE",
    createdBy: "system-bootstrap",
    updatedBy: "system-bootstrap",
  },
];

const CANONICAL_STOCK_SCOPES: Prisma.StockScopeCreateManyInput[] = [
  {
    scopeCode: "MAIN",
    scopeName: "主仓",
    status: "ACTIVE",
    createdBy: "system-bootstrap",
    updatedBy: "system-bootstrap",
  },
  {
    scopeCode: "RD_SUB",
    scopeName: "研发小仓",
    status: "ACTIVE",
    createdBy: "system-bootstrap",
    updatedBy: "system-bootstrap",
  },
];

@Injectable()
export class MasterDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCanonicalWorkshops() {
    await this.prisma.workshop.createMany({
      data: CANONICAL_WORKSHOPS,
      skipDuplicates: true,
    });
  }

  async ensureCanonicalStockScopes() {
    await this.prisma.stockScope.createMany({
      data: CANONICAL_STOCK_SCOPES,
      skipDuplicates: true,
    });
  }

  // ─── MaterialCategory ───────────────────────────────────────────────────────

  async findMaterialCategories(params: {
    keyword?: string;
    limit: number;
    offset: number;
    status?: Prisma.MaterialCategoryWhereInput["status"];
  }) {
    const where: Prisma.MaterialCategoryWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.keyword) {
      where.OR = [
        { categoryCode: { contains: params.keyword } },
        { categoryName: { contains: params.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.materialCategory.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
      }),
      this.prisma.materialCategory.count({ where }),
    ]);

    return { items, total };
  }

  async findMaterialCategoryById(id: number) {
    return this.prisma.materialCategory.findUnique({
      where: { id },
      include: { children: true },
    });
  }

  async findMaterialCategoryByCode(categoryCode: string) {
    return this.prisma.materialCategory.findUnique({
      where: { categoryCode },
    });
  }

  async createMaterialCategory(
    data: Pick<
      Prisma.MaterialCategoryUncheckedCreateInput,
      "categoryCode" | "categoryName" | "parentId" | "sortOrder"
    >,
    createdBy?: string,
  ) {
    return this.prisma.materialCategory.create({
      data: {
        ...data,
        status: "ACTIVE",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async updateMaterialCategory(
    id: number,
    data: Prisma.MaterialCategoryUncheckedUpdateInput,
    updatedBy?: string,
  ) {
    return this.prisma.materialCategory.update({
      where: { id },
      data: { ...data, updatedBy },
    });
  }

  async countActiveChildCategories(parentId: number) {
    return this.prisma.materialCategory.count({
      where: { parentId, status: "ACTIVE" },
    });
  }

  async countActiveMaterialsByCategory(categoryId: number) {
    return this.prisma.material.count({
      where: { categoryId, status: "ACTIVE" },
    });
  }

  // ─── Material ────────────────────────────────────────────────────────────────

  async findMaterials(params: {
    keyword?: string;
    limit: number;
    offset: number;
    status?: Prisma.MaterialWhereInput["status"];
  }) {
    const where: Prisma.MaterialWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.keyword) {
      where.OR = [
        { materialCode: { contains: params.keyword } },
        { materialName: { contains: params.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { materialCode: "asc" },
        include: { category: true },
      }),
      this.prisma.material.count({ where }),
    ]);

    return { items, total };
  }

  async findMaterialById(id: number) {
    return this.prisma.material.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  async findMaterialByCode(materialCode: string) {
    return this.prisma.material.findUnique({
      where: { materialCode },
    });
  }

  async createMaterial(
    data: Prisma.MaterialUncheckedCreateInput,
    createdBy?: string,
  ) {
    return this.prisma.material.create({
      data: {
        ...data,
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async createAutoMaterial(
    data: Pick<
      Prisma.MaterialUncheckedCreateInput,
      | "materialCode"
      | "materialName"
      | "unitCode"
      | "specModel"
      | "categoryId"
      | "sourceDocumentType"
      | "sourceDocumentId"
    >,
    createdBy?: string,
  ) {
    return this.prisma.material.create({
      data: {
        ...data,
        status: "ACTIVE",
        creationMode: "AUTO_CREATED",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async updateMaterial(
    id: number,
    data: Prisma.MaterialUncheckedUpdateInput,
    updatedBy?: string,
  ) {
    return this.prisma.material.update({
      where: { id },
      data: { ...data, updatedBy },
    });
  }

  async countPositiveInventoryBalanceRows(materialId: number): Promise<number> {
    return this.prisma.inventoryBalance.count({
      where: { materialId, quantityOnHand: { gt: 0 } },
    });
  }

  async countEffectiveDocumentReferences(materialId: number): Promise<number> {
    const [
      stockIn,
      customerStock,
      workshopMaterial,
      project,
      rdHandoff,
      rdProcurement,
      rdStocktake,
    ] = await Promise.all([
      this.prisma.stockInOrderLine.count({
        where: { materialId, order: { lifecycleStatus: "EFFECTIVE" } },
      }),
      this.prisma.customerStockOrderLine.count({
        where: { materialId, order: { lifecycleStatus: "EFFECTIVE" } },
      }),
      this.prisma.workshopMaterialOrderLine.count({
        where: { materialId, order: { lifecycleStatus: "EFFECTIVE" } },
      }),
      this.prisma.projectMaterialLine.count({
        where: { materialId, project: { lifecycleStatus: "EFFECTIVE" } },
      }),
      this.prisma.rdHandoffOrderLine.count({
        where: { materialId, order: { lifecycleStatus: "EFFECTIVE" } },
      }),
      this.prisma.rdProcurementRequestLine.count({
        where: { materialId, request: { lifecycleStatus: "EFFECTIVE" } },
      }),
      this.prisma.rdStocktakeOrderLine.count({
        where: { materialId, order: { lifecycleStatus: "EFFECTIVE" } },
      }),
    ]);

    return (
      stockIn +
      customerStock +
      workshopMaterial +
      project +
      rdHandoff +
      rdProcurement +
      rdStocktake
    );
  }

  // ─── Customer ────────────────────────────────────────────────────────────────

  async findCustomers(params: {
    keyword?: string;
    limit: number;
    offset: number;
    status?: Prisma.CustomerWhereInput["status"];
  }) {
    const where: Prisma.CustomerWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.keyword) {
      where.OR = [
        { customerCode: { contains: params.keyword } },
        { customerName: { contains: params.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { customerCode: "asc" },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total };
  }

  async findCustomerById(id: number) {
    return this.prisma.customer.findUnique({
      where: { id },
    });
  }

  async findCustomerByCode(customerCode: string) {
    return this.prisma.customer.findUnique({
      where: { customerCode },
    });
  }

  async createCustomer(
    data: Pick<
      Prisma.CustomerUncheckedCreateInput,
      "customerCode" | "customerName" | "parentId"
    >,
    createdBy?: string,
  ) {
    return this.prisma.customer.create({
      data: {
        ...data,
        status: "ACTIVE",
        creationMode: "MANUAL",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async createAutoCustomer(
    data: Pick<
      Prisma.CustomerUncheckedCreateInput,
      | "customerCode"
      | "customerName"
      | "parentId"
      | "sourceDocumentType"
      | "sourceDocumentId"
    >,
    createdBy?: string,
  ) {
    return this.prisma.customer.create({
      data: {
        ...data,
        status: "ACTIVE",
        creationMode: "AUTO_CREATED",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async updateCustomer(
    id: number,
    data: Prisma.CustomerUncheckedUpdateInput,
    updatedBy?: string,
  ) {
    return this.prisma.customer.update({
      where: { id },
      data: { ...data, updatedBy },
    });
  }

  async countActiveChildCustomers(parentId: number) {
    return this.prisma.customer.count({
      where: { parentId, status: "ACTIVE" },
    });
  }

  // ─── Supplier ────────────────────────────────────────────────────────────────

  async findSupplierById(id: number) {
    return this.prisma.supplier.findUnique({
      where: { id },
    });
  }

  async findSupplierByCode(supplierCode: string) {
    return this.prisma.supplier.findUnique({
      where: { supplierCode },
    });
  }

  async findSuppliers(params: {
    keyword?: string;
    limit: number;
    offset: number;
    status?: Prisma.SupplierWhereInput["status"];
  }) {
    const where: Prisma.SupplierWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.keyword) {
      where.OR = [
        { supplierCode: { contains: params.keyword } },
        { supplierName: { contains: params.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { supplierCode: "asc" },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { items, total };
  }

  async createSupplier(
    data: Pick<
      Prisma.SupplierUncheckedCreateInput,
      "supplierCode" | "supplierName"
    >,
    createdBy?: string,
  ) {
    return this.prisma.supplier.create({
      data: {
        ...data,
        status: "ACTIVE",
        creationMode: "MANUAL",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async createAutoSupplier(
    data: Pick<
      Prisma.SupplierUncheckedCreateInput,
      | "supplierCode"
      | "supplierName"
      | "sourceDocumentType"
      | "sourceDocumentId"
    >,
    createdBy?: string,
  ) {
    return this.prisma.supplier.create({
      data: {
        ...data,
        status: "ACTIVE",
        creationMode: "AUTO_CREATED",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async updateSupplier(
    id: number,
    data: Prisma.SupplierUncheckedUpdateInput,
    updatedBy?: string,
  ) {
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...data,
        updatedBy,
      },
    });
  }

  // ─── Personnel ───────────────────────────────────────────────────────────────

  async findPersonnel(params: {
    keyword?: string;
    limit: number;
    offset: number;
    status?: Prisma.PersonnelWhereInput["status"];
  }) {
    const where: Prisma.PersonnelWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.keyword) {
      where.OR = [
        { personnelCode: { contains: params.keyword } },
        { personnelName: { contains: params.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.personnel.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { personnelCode: "asc" },
      }),
      this.prisma.personnel.count({ where }),
    ]);

    return { items, total };
  }

  async findPersonnelById(id: number) {
    return this.prisma.personnel.findUnique({
      where: { id },
    });
  }

  async findPersonnelByCode(personnelCode: string) {
    return this.prisma.personnel.findUnique({
      where: { personnelCode },
    });
  }

  async createPersonnel(
    data: Pick<
      Prisma.PersonnelUncheckedCreateInput,
      "personnelCode" | "personnelName"
    >,
    createdBy?: string,
  ) {
    return this.prisma.personnel.create({
      data: {
        ...data,
        status: "ACTIVE",
        creationMode: "MANUAL",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async createAutoPersonnel(
    data: Pick<
      Prisma.PersonnelUncheckedCreateInput,
      | "personnelCode"
      | "personnelName"
      | "sourceDocumentType"
      | "sourceDocumentId"
    >,
    createdBy?: string,
  ) {
    return this.prisma.personnel.create({
      data: {
        ...data,
        status: "ACTIVE",
        creationMode: "AUTO_CREATED",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async updatePersonnel(
    id: number,
    data: Prisma.PersonnelUncheckedUpdateInput,
    updatedBy?: string,
  ) {
    return this.prisma.personnel.update({
      where: { id },
      data: { ...data, updatedBy },
    });
  }

  // ─── Workshop ────────────────────────────────────────────────────────────────

  async findWorkshops(params: {
    keyword?: string;
    limit: number;
    offset: number;
    status?: Prisma.WorkshopWhereInput["status"];
  }) {
    const where: Prisma.WorkshopWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.keyword) {
      where.OR = [
        { workshopCode: { contains: params.keyword } },
        { workshopName: { contains: params.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.workshop.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { workshopCode: "asc" },
      }),
      this.prisma.workshop.count({ where }),
    ]);

    return { items, total };
  }

  async findWorkshopById(id: number) {
    return this.prisma.workshop.findUnique({
      where: { id },
    });
  }

  async findWorkshopByCode(workshopCode: string) {
    return this.prisma.workshop.findUnique({
      where: { workshopCode },
    });
  }

  async findWorkshopByName(workshopName: string) {
    return this.prisma.workshop.findFirst({
      where: {
        workshopName: {
          contains: workshopName,
        },
      },
      orderBy: {
        id: "asc",
      },
    });
  }

  async createWorkshop(
    data: Pick<
      Prisma.WorkshopUncheckedCreateInput,
      "workshopCode" | "workshopName"
    >,
    createdBy?: string,
  ) {
    return this.prisma.workshop.create({
      data: {
        ...data,
        status: "ACTIVE",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async updateWorkshop(
    id: number,
    data: Prisma.WorkshopUncheckedUpdateInput,
    updatedBy?: string,
  ) {
    return this.prisma.workshop.update({
      where: { id },
      data: { ...data, updatedBy },
    });
  }

  // ─── StockScope ──────────────────────────────────────────────────────────────

  async findStockScopes(params: {
    keyword?: string;
    limit: number;
    offset: number;
    status?: Prisma.StockScopeWhereInput["status"];
  }) {
    const where: Prisma.StockScopeWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.keyword) {
      where.OR = [
        { scopeCode: { contains: params.keyword } },
        { scopeName: { contains: params.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.stockScope.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { scopeCode: "asc" },
      }),
      this.prisma.stockScope.count({ where }),
    ]);

    return { items, total };
  }

  async findStockScopeById(id: number) {
    return this.prisma.stockScope.findUnique({
      where: { id },
    });
  }

  async findStockScopeByCode(scopeCode: string) {
    return this.prisma.stockScope.findUnique({
      where: { scopeCode },
    });
  }

  async createStockScope(
    data: Pick<
      Prisma.StockScopeUncheckedCreateInput,
      "scopeCode" | "scopeName"
    >,
    createdBy?: string,
  ) {
    return this.prisma.stockScope.create({
      data: {
        ...data,
        status: "ACTIVE",
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async updateStockScope(
    id: number,
    data: Prisma.StockScopeUncheckedUpdateInput,
    updatedBy?: string,
  ) {
    return this.prisma.stockScope.update({
      where: { id },
      data: { ...data, updatedBy },
    });
  }

  async countPositiveStockScopeBalanceRows(
    stockScopeId: number,
  ): Promise<number> {
    return this.prisma.inventoryBalance.count({
      where: { stockScopeId, quantityOnHand: { gt: 0 } },
    });
  }
}
