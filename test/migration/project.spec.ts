import { buildProjectMigrationPlan } from "../../scripts/migration/project/transformer";
import type {
  LegacyProjectSnapshot,
  ProjectDependencySnapshot,
} from "../../scripts/migration/project/types";

function buildLegacyKey(legacyTable: string, legacyId: number): string {
  return `${legacyTable}::${legacyId}`;
}

function buildDependencies(): ProjectDependencySnapshot {
  return {
    materialByLegacyKey: new Map([
      [
        buildLegacyKey("saifute_material", 701),
        {
          targetId: 1701,
          materialCode: "MAT-701",
          materialName: "壳体",
          specModel: "S-701",
          unitCode: "件",
        },
      ],
      [
        buildLegacyKey("saifute_material", 702),
        {
          targetId: 1702,
          materialCode: "MAT-702",
          materialName: "滤芯",
          specModel: null,
          unitCode: "套",
        },
      ],
      [
        buildLegacyKey("saifute_material", 703),
        {
          targetId: 1703,
          materialCode: "MAT-703",
          materialName: "整机",
          specModel: "P-703",
          unitCode: "台",
        },
      ],
    ]),
    customerByLegacyKey: new Map([
      [
        buildLegacyKey("saifute_customer", 201),
        {
          targetId: 5201,
          customerCode: "CUS-201",
          customerName: "华电集团",
        },
      ],
    ]),
    defaultWorkshop: {
      targetId: 7000,
      workshopCode: "WS-LEGACY-DEFAULT",
      workshopName: "历史默认车间",
    },
    personnelByNormalizedName: new Map([
      [
        "王工",
        {
          targetId: 610,
          personnelCode: "PERS-610",
          personnelName: "王工",
        },
      ],
    ]),
    ambiguousPersonnelNames: new Set(["张三"]),
    blockedMaterialLegacyIds: new Set([999]),
    batch1Baseline: {
      expectedMapCounts: {
        materialCategory: 8,
        workshop: 13,
        supplier: 93,
        personnel: 51,
        customer: 184,
        material: 437,
      },
      actualMapCounts: {
        materialCategory: 8,
        workshop: 13,
        supplier: 93,
        personnel: 51,
        customer: 184,
        material: 437,
      },
      expectedBlockedMaterialCount: 21,
      actualBlockedMaterialCount: 21,
      issues: [],
    },
  };
}

function buildSnapshot(): LegacyProjectSnapshot {
  return {
    projects: [
      {
        legacyTable: "saifute_composite_product",
        legacyId: 10,
        projectName: "白龙山硐室",
        customerLegacyId: 201,
        customerName: "旧华电集团",
        classification: "硐室",
        salesman: "王工",
        totalAmount: "88.50",
        orderDate: "2026-01-02",
        outBoundDate: "2026-01-09",
        remark: "首批项目",
        delFlag: 0,
        createdBy: "admin",
        createdAt: "2026-01-02 08:00:00",
        updatedBy: "admin",
        updatedAt: "2026-01-02 09:00:00",
      },
      {
        legacyTable: "saifute_composite_product",
        legacyId: 11,
        projectName: "雨汪硐室",
        customerLegacyId: null,
        customerName: null,
        classification: "硐室",
        salesman: "张三",
        totalAmount: "20.00",
        orderDate: null,
        outBoundDate: "2026-01-12",
        remark: "已作废",
        delFlag: 2,
        createdBy: "admin",
        createdAt: "2026-01-11 08:00:00",
        updatedBy: "checker",
        updatedAt: "2026-01-12 11:00:00",
      },
      {
        legacyTable: "saifute_composite_product",
        legacyId: 12,
        projectName: "旋转支护",
        customerLegacyId: 202,
        customerName: "未映射客户",
        classification: "支护",
        salesman: "李四",
        totalAmount: null,
        orderDate: null,
        outBoundDate: null,
        remark: null,
        delFlag: 0,
        createdBy: "builder",
        createdAt: "2026-01-15 08:30:00",
        updatedBy: null,
        updatedAt: null,
      },
      {
        legacyTable: "saifute_composite_product",
        legacyId: 13,
        projectName: "阻断项目",
        customerLegacyId: null,
        customerName: null,
        classification: null,
        salesman: null,
        totalAmount: "3.00",
        orderDate: "2026-01-16",
        outBoundDate: null,
        remark: null,
        delFlag: 0,
        createdBy: "admin",
        createdAt: "2026-01-16 08:00:00",
        updatedBy: null,
        updatedAt: null,
      },
      {
        legacyTable: "saifute_composite_product",
        legacyId: 14,
        projectName: "缺料项目",
        customerLegacyId: null,
        customerName: null,
        classification: null,
        salesman: null,
        totalAmount: "1.00",
        orderDate: "2026-01-17",
        outBoundDate: null,
        remark: null,
        delFlag: 0,
        createdBy: "admin",
        createdAt: "2026-01-17 08:00:00",
        updatedBy: null,
        updatedAt: null,
      },
    ],
    lines: [
      {
        legacyTable: "saifute_product_material",
        legacyId: 1002,
        parentLegacyTable: "saifute_composite_product",
        parentLegacyId: 10,
        materialLegacyId: 702,
        materialName: "滤芯",
        materialSpec: null,
        quantity: "5",
        unitPrice: null,
        instruction: null,
        interval: null,
        remark: "辅料",
        acceptanceDate: "2026-01-04",
        supplierLegacyId: 302,
        unit: "套",
        taxIncludedPrice: null,
      },
      {
        legacyTable: "saifute_product_material",
        legacyId: 1001,
        parentLegacyTable: "saifute_composite_product",
        parentLegacyId: 10,
        materialLegacyId: 701,
        materialName: "旧壳体快照",
        materialSpec: "S-701-OLD",
        quantity: "3.5",
        unitPrice: "10.00",
        instruction: "主料",
        interval: "A01-A03",
        remark: "主料备注",
        acceptanceDate: "2026-01-03",
        supplierLegacyId: 301,
        unit: "件",
        taxIncludedPrice: "11.20",
      },
      {
        legacyTable: "saifute_product_material",
        legacyId: 1003,
        parentLegacyTable: "saifute_composite_product",
        parentLegacyId: 11,
        materialLegacyId: 703,
        materialName: "整机",
        materialSpec: "P-703",
        quantity: "2",
        unitPrice: "10.00",
        instruction: "整机",
        interval: "B01-B02",
        remark: null,
        acceptanceDate: "2026-01-12",
        supplierLegacyId: 303,
        unit: "台",
        taxIncludedPrice: "11.00",
      },
      {
        legacyTable: "saifute_product_material",
        legacyId: 1004,
        parentLegacyTable: "saifute_composite_product",
        parentLegacyId: 12,
        materialLegacyId: 701,
        materialName: "壳体",
        materialSpec: "S-701",
        quantity: "1",
        unitPrice: "5.00",
        instruction: null,
        interval: null,
        remark: null,
        acceptanceDate: null,
        supplierLegacyId: 304,
        unit: "个",
        taxIncludedPrice: null,
      },
      {
        legacyTable: "saifute_product_material",
        legacyId: 1005,
        parentLegacyTable: "saifute_composite_product",
        parentLegacyId: 13,
        materialLegacyId: 999,
        materialName: "阻断物料",
        materialSpec: null,
        quantity: "1",
        unitPrice: "3.00",
        instruction: null,
        interval: null,
        remark: null,
        acceptanceDate: null,
        supplierLegacyId: null,
        unit: "件",
        taxIncludedPrice: null,
      },
      {
        legacyTable: "saifute_product_material",
        legacyId: 1006,
        parentLegacyTable: "saifute_composite_product",
        parentLegacyId: 14,
        materialLegacyId: null,
        materialName: "缺料",
        materialSpec: null,
        quantity: "1",
        unitPrice: "1.00",
        instruction: null,
        interval: null,
        remark: null,
        acceptanceDate: null,
        supplierLegacyId: null,
        unit: "件",
        taxIncludedPrice: null,
      },
    ],
  };
}

describe("project migration transformer", () => {
  it("should build deterministic project plans with frozen workshop, warnings, archived payloads, and whole-project exclusions", () => {
    const plan = buildProjectMigrationPlan(
      buildSnapshot(),
      buildDependencies(),
    );

    expect(plan.migrationBatch).toBe("batch2b-project");
    expect(plan.globalBlockers).toHaveLength(0);
    expect(plan.counts.projects).toEqual({
      source: 5,
      migrated: 3,
      excluded: 2,
    });
    expect(plan.counts.lines).toEqual({
      source: 6,
      migrated: 4,
      excluded: 2,
    });

    const primaryProject = plan.migratedProjects.find(
      (record) => record.legacyId === 10,
    );
    expect(primaryProject?.target.projectCode).toBe("PRJ-LEGACY-10");
    expect(primaryProject?.target.bizDate).toBe("2026-01-02");
    expect(primaryProject?.target.customerId).toBe(5201);
    expect(primaryProject?.target.customerCodeSnapshot).toBe("CUS-201");
    expect(primaryProject?.target.customerNameSnapshot).toBe("华电集团");
    expect(primaryProject?.target.supplierId).toBeNull();
    expect(primaryProject?.target.managerPersonnelId).toBe(610);
    expect(primaryProject?.target.managerNameSnapshot).toBe("王工");
    expect(primaryProject?.target.workshopId).toBe(7000);
    expect(primaryProject?.target.workshopNameSnapshot).toBe("历史默认车间");
    expect(primaryProject?.target.auditStatusSnapshot).toBe("NOT_REQUIRED");
    expect(primaryProject?.target.inventoryEffectStatus).toBe("POSTED");
    expect(primaryProject?.target.totalQty).toBe("8.500000");
    expect(primaryProject?.target.totalAmount).toBe("88.50");
    expect(
      primaryProject?.lines.map((line) => [line.legacyId, line.target.lineNo]),
    ).toEqual([
      [1001, 1],
      [1002, 2],
    ]);
    expect(primaryProject?.lines[0]?.target.unitCodeSnapshot).toBe("件");
    expect(primaryProject?.lines[0]?.target.materialNameSnapshot).toBe(
      "旧壳体快照",
    );
    expect(primaryProject?.lines[0]?.target.materialSpecSnapshot).toBe(
      "S-701-OLD",
    );
    expect(primaryProject?.lines[0]?.target.amount).toBe("35.00");
    expect(primaryProject?.lines[1]?.target.unitPrice).toBe("0.00");
    expect(primaryProject?.lines[1]?.target.amount).toBe("0.00");
    expect(primaryProject?.archivedPayload.payload).toEqual({
      classification: "硐室",
      outBoundDate: "2026-01-09",
      salesman: "王工",
    });
    expect(primaryProject?.lines[0]?.archivedPayload.payload).toEqual({
      acceptanceDate: "2026-01-03",
      instruction: "主料",
      interval: "A01-A03",
      supplierLegacyId: 301,
      taxIncludedPrice: "11.20",
    });

    const voidedProject = plan.migratedProjects.find(
      (record) => record.legacyId === 11,
    );
    expect(voidedProject?.target.bizDate).toBe("2026-01-12");
    expect(voidedProject?.target.lifecycleStatus).toBe("VOIDED");
    expect(voidedProject?.target.auditStatusSnapshot).toBe("NOT_REQUIRED");
    expect(voidedProject?.target.inventoryEffectStatus).toBe("REVERSED");
    expect(voidedProject?.target.voidedBy).toBe("checker");
    expect(voidedProject?.target.voidedAt).toBe("2026-01-12 11:00:00");
    expect(voidedProject?.target.managerPersonnelId).toBeNull();
    expect(voidedProject?.target.managerNameSnapshot).toBe("张三");

    const fallbackProject = plan.migratedProjects.find(
      (record) => record.legacyId === 12,
    );
    expect(fallbackProject?.target.bizDate).toBe("2026-01-15");
    expect(fallbackProject?.target.customerId).toBeNull();
    expect(fallbackProject?.target.customerNameSnapshot).toBe("未映射客户");
    expect(fallbackProject?.target.managerPersonnelId).toBeNull();
    expect(fallbackProject?.target.managerNameSnapshot).toBe("李四");
    expect(fallbackProject?.target.supplierId).toBeNull();
    expect(
      plan.warnings.some(
        (warning) =>
          warning.legacyId === 12 && warning.reason.includes("customer map"),
      ),
    ).toBe(true);
    expect(
      plan.warnings.some(
        (warning) =>
          warning.legacyId === 12 &&
          warning.reason.includes("managerNameSnapshot"),
      ),
    ).toBe(true);
    expect(
      plan.warnings.some(
        (warning) =>
          warning.legacyTable === "personnel" &&
          warning.reason.includes("ambiguous names"),
      ),
    ).toBe(true);

    expect(plan.excludedProjects).toEqual([
      expect.objectContaining({
        legacyTable: "saifute_composite_product",
        legacyId: 13,
      }),
      expect.objectContaining({
        legacyTable: "saifute_composite_product",
        legacyId: 14,
      }),
    ]);
    expect(plan.excludedProjects[0]?.exclusionReason).toContain(
      "references blocked batch1 material 999",
    );
    expect(plan.excludedProjects[1]?.exclusionReason).toContain(
      "is missing material_id",
    );
  });

  it("should surface global blockers when the frozen default workshop or batch1 baseline is unavailable", () => {
    const dependencies = buildDependencies();
    dependencies.defaultWorkshop = null;
    dependencies.batch1Baseline.issues = [
      "batch1 workshop map count mismatch: expected 13, received 12.",
    ];

    const plan = buildProjectMigrationPlan(buildSnapshot(), dependencies);

    expect(plan.globalBlockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason:
            "batch1 workshop map count mismatch: expected 13, received 12.",
        }),
        expect.objectContaining({
          reason:
            "Frozen default workshop is missing from the migrated workshop staging map.",
        }),
      ]),
    );
  });
});
