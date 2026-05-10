import { buildPostAdmissionMigrationPlan } from "../../scripts/migration/return-post-admission/planner";
import type {
  AdmittedLineRow,
  AdmittedOrderRow,
  PostAdmissionBaseline,
  UpstreamOutboundLineRow,
  UpstreamPickLineRow,
} from "../../scripts/migration/return-post-admission/types";

function buildSalesReturnOrder(
  overrides: Partial<AdmittedOrderRow> = {},
): AdmittedOrderRow {
  return {
    id: 1001,
    documentNo: "SR-001",
    orderType: "SALES_RETURN",
    bizDate: "2024-01-15",
    workshopId: 1,
    customerId: 201,
    lifecycleStatus: "EFFECTIVE",
    auditStatusSnapshot: "PENDING",
    inventoryEffectStatus: "POSTED",
    ...overrides,
  };
}

function buildWorkshopReturnOrder(
  overrides: Partial<AdmittedOrderRow> = {},
): AdmittedOrderRow {
  return {
    id: 2001,
    documentNo: "WR-001",
    orderType: "RETURN",
    bizDate: "2024-01-16",
    workshopId: 1,
    customerId: null,
    lifecycleStatus: "EFFECTIVE",
    auditStatusSnapshot: "PENDING",
    inventoryEffectStatus: "POSTED",
    ...overrides,
  };
}

function buildOutboundLine(
  overrides: Partial<UpstreamOutboundLineRow> = {},
): UpstreamOutboundLineRow {
  return {
    id: 3001,
    orderId: 3000,
    lineNo: 1,
    materialId: 701,
    quantity: "10.000000",
    stockScopeId: 1,
    documentNo: "OUT-001",
    bizDate: "2024-01-10",
    workshopId: 1,
    customerId: 201,
    lifecycleStatus: "EFFECTIVE",
    inventoryEffectStatus: "POSTED",
    ...overrides,
  };
}

function buildPickLine(
  overrides: Partial<UpstreamPickLineRow> = {},
): UpstreamPickLineRow {
  return {
    id: 4001,
    orderId: 4000,
    lineNo: 1,
    materialId: 701,
    quantity: "5.000000",
    stockScopeId: 1,
    documentNo: "PICK-001",
    bizDate: "2024-01-10",
    workshopId: 1,
    lifecycleStatus: "EFFECTIVE",
    inventoryEffectStatus: "POSTED",
    ...overrides,
  };
}

function buildSalesReturnLine(
  overrides: Partial<AdmittedLineRow> = {},
): AdmittedLineRow {
  return {
    id: 5001,
    orderId: 1001,
    lineNo: 1,
    materialId: 701,
    quantity: "10.000000",
    stockScopeId: 1,
    sourceDocumentType: null,
    sourceDocumentId: null,
    sourceDocumentLineId: null,
    documentNo: "SR-001",
    orderType: "SALES_RETURN",
    bizDate: "2024-01-15",
    workshopId: 1,
    customerId: 201,
    lifecycleStatus: "EFFECTIVE",
    inventoryEffectStatus: "POSTED",
    ...overrides,
  };
}

function buildWorkshopReturnLine(
  overrides: Partial<AdmittedLineRow> = {},
): AdmittedLineRow {
  return {
    id: 6001,
    orderId: 2001,
    lineNo: 1,
    materialId: 701,
    quantity: "5.000000",
    stockScopeId: 1,
    sourceDocumentType: null,
    sourceDocumentId: null,
    sourceDocumentLineId: null,
    documentNo: "WR-001",
    orderType: "RETURN",
    bizDate: "2024-01-16",
    workshopId: 1,
    customerId: null,
    lifecycleStatus: "EFFECTIVE",
    inventoryEffectStatus: "POSTED",
    ...overrides,
  };
}

function buildMinimalBaseline(
  overrides: Partial<PostAdmissionBaseline> = {},
): PostAdmissionBaseline {
  return {
    salesReturnOrders: [],
    salesReturnLines: [],
    workshopReturnOrders: [],
    workshopReturnLines: [],
    outboundLines: [],
    pickLines: [],
    stockInLines: [],
    outboundOrders: [],
    pickOrders: [],
    stockInOrders: [],
    ...overrides,
  };
}

function build9SalesReturnOrders(): AdmittedOrderRow[] {
  return Array.from({ length: 9 }, (_, i) =>
    buildSalesReturnOrder({
      id: 1001 + i,
      documentNo: `SR-${String(i + 1).padStart(3, "0")}`,
    }),
  );
}

function build13SalesReturnLines(
  orders: AdmittedOrderRow[],
): AdmittedLineRow[] {
  const lines: AdmittedLineRow[] = [];

  for (let i = 0; i < 13; i += 1) {
    const order = orders[Math.min(i, orders.length - 1)] ?? orders[0];
    if (!order) throw new Error("build13SalesReturnLines: no orders provided");
    lines.push(
      buildSalesReturnLine({
        id: 5001 + i,
        orderId: order.id,
        lineNo: i + 1,
        documentNo: order.documentNo,
        materialId: 701 + (i % 3),
      }),
    );
  }

  return lines;
}

function build3WorkshopReturnOrders(): AdmittedOrderRow[] {
  return Array.from({ length: 3 }, (_, i) =>
    buildWorkshopReturnOrder({
      id: 2001 + i,
      documentNo: `WR-${String(i + 1).padStart(3, "0")}`,
    }),
  );
}

function build4WorkshopReturnLines(
  orders: AdmittedOrderRow[],
): AdmittedLineRow[] {
  const lines: AdmittedLineRow[] = [];

  for (let i = 0; i < 4; i += 1) {
    const order = orders[Math.min(i, orders.length - 1)] ?? orders[0];
    if (!order)
      throw new Error("build4WorkshopReturnLines: no orders provided");
    lines.push(
      buildWorkshopReturnLine({
        id: 6001 + i,
        orderId: order.id,
        lineNo: i + 1,
        documentNo: order.documentNo,
        materialId: 701 + (i % 2),
      }),
    );
  }

  return lines;
}

function buildValidBaseline(
  salesReturnLines: AdmittedLineRow[],
  outboundLines: UpstreamOutboundLineRow[],
): ReturnType<typeof buildMinimalBaseline> {
  const salesReturnOrders = build9SalesReturnOrders();
  const workshopReturnOrders = build3WorkshopReturnOrders();
  const workshopReturnLines = build4WorkshopReturnLines(workshopReturnOrders);

  return buildMinimalBaseline({
    salesReturnOrders,
    salesReturnLines,
    workshopReturnOrders,
    workshopReturnLines,
    outboundLines,
  });
}

describe("return-post-admission relation classification", () => {
  describe("baseline enforcement", () => {
    it("should fail with a global blocker if sales-return order count is wrong", () => {
      const baseline = buildMinimalBaseline({
        salesReturnOrders: [buildSalesReturnOrder()],
        salesReturnLines: [buildSalesReturnLine()],
        workshopReturnOrders: build3WorkshopReturnOrders(),
        workshopReturnLines: build4WorkshopReturnLines(
          build3WorkshopReturnOrders(),
        ),
      });

      const plan = buildPostAdmissionMigrationPlan(baseline);

      expect(plan.globalBlockers.length).toBeGreaterThan(0);
      expect(
        plan.globalBlockers.some((b) =>
          b.reason.includes("sales-return baseline"),
        ),
      ).toBe(true);
    });

    it("should fail with a global blocker if workshop-return order count is wrong", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders: [buildWorkshopReturnOrder()],
        workshopReturnLines: [buildWorkshopReturnLine()],
      });

      const plan = buildPostAdmissionMigrationPlan(baseline);

      expect(plan.globalBlockers.length).toBeGreaterThan(0);
      expect(
        plan.globalBlockers.some((b) =>
          b.reason.includes("workshop-return baseline"),
        ),
      ).toBe(true);
    });

    it("should pass baseline check for full-import counts (37 SR orders, 46 SR lines, 23 WR orders, 32 WR lines)", () => {
      const salesReturnOrders = Array.from({ length: 37 }, (_, i) =>
        buildSalesReturnOrder({
          id: 1001 + i,
          documentNo: `SR-${String(i + 1).padStart(3, "0")}`,
        }),
      );
      const salesReturnLines = Array.from({ length: 46 }, (_, i) => {
        const order =
          salesReturnOrders[Math.min(i, salesReturnOrders.length - 1)] ??
          salesReturnOrders[0];
        if (!order) throw new Error("full-import sales-return orders missing");
        return buildSalesReturnLine({
          id: 5001 + i,
          orderId: order.id,
          lineNo: i + 1,
          documentNo: order.documentNo,
          materialId: 701 + (i % 3),
        });
      });
      const workshopReturnOrders = Array.from({ length: 23 }, (_, i) =>
        buildWorkshopReturnOrder({
          id: 2001 + i,
          documentNo: `WR-${String(i + 1).padStart(3, "0")}`,
        }),
      );
      const workshopReturnLines = Array.from({ length: 32 }, (_, i) => {
        const order =
          workshopReturnOrders[Math.min(i, workshopReturnOrders.length - 1)] ??
          workshopReturnOrders[0];
        if (!order)
          throw new Error("full-import workshop-return orders missing");
        return buildWorkshopReturnLine({
          id: 6001 + i,
          orderId: order.id,
          lineNo: i + 1,
          documentNo: order.documentNo,
          materialId: 701 + (i % 2),
        });
      });

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders,
        workshopReturnLines,
      });

      const plan = buildPostAdmissionMigrationPlan(baseline);

      expect(plan.globalBlockers).toHaveLength(0);
      expect(plan.counts.admittedSalesReturnOrders).toBe(37);
      expect(plan.counts.admittedSalesReturnLines).toBe(46);
      expect(plan.counts.admittedWorkshopReturnOrders).toBe(23);
      expect(plan.counts.admittedWorkshopReturnLines).toBe(32);
    });
  });

  describe("sales-return line relation classification", () => {
    it("should classify as proven when exactly one outbound line matches by materialId and same workshopId", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);
      const firstMaterialId = salesReturnLines[0]?.materialId ?? 701;

      const outboundLines: UpstreamOutboundLineRow[] = [
        buildOutboundLine({ materialId: firstMaterialId }),
      ];

      for (let i = 1; i < salesReturnLines.length; i += 1) {
        const line = salesReturnLines[i];
        if (!line) continue;

        if (line.materialId !== firstMaterialId) {
          outboundLines.push(
            buildOutboundLine({ id: 3001 + i, materialId: line.materialId }),
          );
        }
      }

      const baseline = buildValidBaseline(salesReturnLines, outboundLines);
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const provenLines = plan.relation.salesReturnClassifications.filter(
        (c) => c.classification === "proven",
      );

      expect(provenLines.length).toBeGreaterThan(0);
    });

    it("should classify as unresolved when no outbound line matches by materialId", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const baseline = buildValidBaseline(salesReturnLines, []);
      const plan = buildPostAdmissionMigrationPlan(baseline);

      expect(
        plan.relation.salesReturnClassifications.every(
          (c) => c.classification === "unresolved",
        ),
      ).toBe(true);
      expect(plan.counts.unresolvedRelations).toBeGreaterThan(0);
    });

    it("should classify as ambiguous when multiple outbound lines match by materialId and quantity", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const targetMaterialId = salesReturnLines[0]?.materialId ?? 701;
      const targetQty = salesReturnLines[0]?.quantity ?? "10.000000";
      const outboundLines: UpstreamOutboundLineRow[] = [
        buildOutboundLine({
          id: 3001,
          materialId: targetMaterialId,
          quantity: targetQty,
        }),
        buildOutboundLine({
          id: 3002,
          materialId: targetMaterialId,
          quantity: targetQty,
        }),
      ];

      const baseline = buildValidBaseline(salesReturnLines, outboundLines);
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const ambiguousForMaterial =
        plan.relation.salesReturnClassifications.filter(
          (c) =>
            c.classification === "ambiguous" &&
            c.materialId === targetMaterialId,
        );

      expect(ambiguousForMaterial.length).toBeGreaterThan(0);
    });

    it("should classify pre-linked line as proven only if the referenced upstream exists with matching quantity", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      const preLinkedLine: AdmittedLineRow = {
        ...firstLine,
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      const matchingUpstreamLine = buildOutboundLine({
        id: 3001,
        orderId: 3000,
        materialId: firstLine.materialId,
        quantity: firstLine.quantity,
      });

      const baselineWithUpstream = buildValidBaseline(
        [preLinkedLine, ...salesReturnLines.slice(1)],
        [matchingUpstreamLine],
      );
      const planWithUpstream =
        buildPostAdmissionMigrationPlan(baselineWithUpstream);

      const provenClassification =
        planWithUpstream.relation.salesReturnClassifications.find(
          (c) => c.lineId === preLinkedLine.id,
        );

      expect(provenClassification?.classification).toBe("proven");
      expect(planWithUpstream.counts.alreadyLinkedLines).toBeGreaterThanOrEqual(
        1,
      );
    });

    it("should classify pre-linked line as unresolved when the referenced upstream is absent from the baseline", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      const preLinkedLine: AdmittedLineRow = {
        ...firstLine,
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      const baselineNoUpstream = buildValidBaseline(
        [preLinkedLine, ...salesReturnLines.slice(1)],
        [],
      );
      const planNoUpstream =
        buildPostAdmissionMigrationPlan(baselineNoUpstream);

      const classification =
        planNoUpstream.relation.salesReturnClassifications.find(
          (c) => c.lineId === preLinkedLine.id,
        );

      expect(classification?.classification).not.toBe("proven");
    });

    it("should classify pre-linked line as unresolved when the referenced upstream has a quantity mismatch", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      const preLinkedLine: AdmittedLineRow = {
        ...firstLine,
        quantity: "500.000000",
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      const mismatchedUpstreamLine = buildOutboundLine({
        id: 3001,
        orderId: 3000,
        materialId: firstLine.materialId,
        quantity: "1.000000",
      });

      const baselineMismatch = buildValidBaseline(
        [preLinkedLine, ...salesReturnLines.slice(1)],
        [mismatchedUpstreamLine],
      );
      const planMismatch = buildPostAdmissionMigrationPlan(baselineMismatch);

      const classification =
        planMismatch.relation.salesReturnClassifications.find(
          (c) => c.lineId === preLinkedLine.id,
        );

      expect(classification?.classification).not.toBe("proven");
    });

    it("should classify pre-linked sales-return line as unresolved when the referenced upstream bizDate is after the return bizDate", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      const preLinkedLine: AdmittedLineRow = {
        ...firstLine,
        bizDate: "2024-01-10",
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      const futureDatedUpstreamLine = buildOutboundLine({
        id: 3001,
        orderId: 3000,
        materialId: firstLine.materialId,
        quantity: firstLine.quantity,
        bizDate: "2024-01-20",
      });

      const baseline = buildValidBaseline(
        [preLinkedLine, ...salesReturnLines.slice(1)],
        [futureDatedUpstreamLine],
      );
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const classification = plan.relation.salesReturnClassifications.find(
        (c) => c.lineId === preLinkedLine.id,
      );

      expect(classification?.classification).not.toBe("proven");
    });

    it("should exclude future-dated outbound candidates from fresh sales-return matching", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      const returnLineEarlyDate: AdmittedLineRow = {
        ...firstLine,
        bizDate: "2024-01-05",
        sourceDocumentType: null,
        sourceDocumentId: null,
        sourceDocumentLineId: null,
      };

      const futureDateOutbound = buildOutboundLine({
        id: 3001,
        orderId: 3000,
        materialId: firstLine.materialId,
        quantity: firstLine.quantity,
        bizDate: "2024-01-10",
      });

      const baseline = buildValidBaseline(
        [returnLineEarlyDate, ...salesReturnLines.slice(1)],
        [futureDateOutbound],
      );
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const classification = plan.relation.salesReturnClassifications.find(
        (c) => c.lineId === returnLineEarlyDate.id,
      );

      expect(classification?.classification).not.toBe("proven");
    });
  });

  describe("workshop-return chronology rejection", () => {
    it("should classify pre-linked workshop-return line as unresolved when the referenced pick bizDate is after the return bizDate", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);
      const workshopReturnOrders = build3WorkshopReturnOrders();
      const workshopReturnLines =
        build4WorkshopReturnLines(workshopReturnOrders);

      const firstWrLine = workshopReturnLines[0];
      if (!firstWrLine)
        throw new Error("expected at least one workshop return line");

      const preLinkedWrLine: AdmittedLineRow = {
        ...firstWrLine,
        bizDate: "2024-01-08",
        sourceDocumentType: "WorkshopMaterialOrder",
        sourceDocumentId: 4000,
        sourceDocumentLineId: 4001,
      };

      const futureDatedPickLine = buildPickLine({
        id: 4001,
        orderId: 4000,
        materialId: firstWrLine.materialId,
        quantity: firstWrLine.quantity,
        bizDate: "2024-01-15",
      });

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders,
        workshopReturnLines: [preLinkedWrLine, ...workshopReturnLines.slice(1)],
        pickLines: [futureDatedPickLine],
      });
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const classification = plan.relation.workshopReturnClassifications.find(
        (c) => c.lineId === preLinkedWrLine.id,
      );

      expect(classification?.classification).not.toBe("proven");
    });
  });

  describe("workshop-return line relation classification", () => {
    it("should classify as proven when exactly one pick line matches by materialId and workshopId", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);
      const workshopReturnOrders = build3WorkshopReturnOrders();
      const workshopReturnLines =
        build4WorkshopReturnLines(workshopReturnOrders);

      const pickLines: UpstreamPickLineRow[] = workshopReturnLines
        .map((line, i) =>
          buildPickLine({ id: 4001 + i, materialId: line.materialId }),
        )
        .filter(
          (pl, i, arr) =>
            arr.findIndex((p) => p.materialId === pl.materialId) === i,
        );

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders,
        workshopReturnLines,
        pickLines,
      });

      const plan = buildPostAdmissionMigrationPlan(baseline);

      const provenLines = plan.relation.workshopReturnClassifications.filter(
        (c) => c.classification === "proven",
      );

      expect(provenLines.length).toBeGreaterThan(0);
    });

    it("should classify as unresolved when no pick line matches", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);
      const workshopReturnOrders = build3WorkshopReturnOrders();
      const workshopReturnLines =
        build4WorkshopReturnLines(workshopReturnOrders);

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders,
        workshopReturnLines,
        pickLines: [],
      });

      const plan = buildPostAdmissionMigrationPlan(baseline);

      expect(
        plan.relation.workshopReturnClassifications.every(
          (c) => c.classification === "unresolved",
        ),
      ).toBe(true);
    });
  });

  describe("document relation and backfill projection", () => {
    it("should produce document_relation and document_line_relation rows for proven links", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const uniqueMaterialIds = [
        ...new Set(salesReturnLines.map((l) => l.materialId)),
      ];
      const outboundLines: UpstreamOutboundLineRow[] = uniqueMaterialIds.map(
        (materialId, i) => buildOutboundLine({ id: 3001 + i, materialId }),
      );

      const workshopReturnOrders = build3WorkshopReturnOrders();
      const workshopReturnLines =
        build4WorkshopReturnLines(workshopReturnOrders);

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders,
        workshopReturnLines,
        outboundLines,
      });

      const plan = buildPostAdmissionMigrationPlan(baseline);

      expect(plan.counts.documentRelationsToInsert).toBeGreaterThan(0);
      expect(plan.counts.documentLineRelationsToInsert).toBeGreaterThan(0);

      for (const rel of plan.backfill.documentRelations) {
        expect(rel.relationType).toBe("SALES_RETURN_FROM_OUTBOUND");
        expect(rel.upstreamFamily).toBe("SALES_STOCK");
        expect(rel.downstreamFamily).toBe("SALES_STOCK");
      }

      for (const lineRel of plan.backfill.documentLineRelations) {
        expect(lineRel.relationType).toBe("SALES_RETURN_FROM_OUTBOUND");
        expect(lineRel.linkedQty).toBeDefined();
      }
    });

    it("should not produce relation rows for unresolved or ambiguous lines", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);
      const workshopReturnOrders = build3WorkshopReturnOrders();
      const workshopReturnLines =
        build4WorkshopReturnLines(workshopReturnOrders);

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders,
        workshopReturnLines,
        outboundLines: [],
        pickLines: [],
      });

      const plan = buildPostAdmissionMigrationPlan(baseline);

      expect(plan.counts.documentRelationsToInsert).toBe(0);
      expect(plan.counts.documentLineRelationsToInsert).toBe(0);
      expect(plan.counts.sourceBackfillsToApply).toBe(0);
    });

    it("should not include backfill records for lines that already have sourceDocumentId", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);
      const workshopReturnOrders = build3WorkshopReturnOrders();
      const workshopReturnLines =
        build4WorkshopReturnLines(workshopReturnOrders);

      const baseLine = salesReturnLines[0];
      if (!baseLine) throw new Error("expected sales return lines");

      const alreadyLinked: AdmittedLineRow = {
        ...baseLine,
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      const outboundLines: UpstreamOutboundLineRow[] = [
        buildOutboundLine({
          id: 3001,
          orderId: 3000,
          materialId: alreadyLinked.materialId,
          quantity: alreadyLinked.quantity,
        }),
      ];

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines: [alreadyLinked, ...salesReturnLines.slice(1)],
        workshopReturnOrders,
        workshopReturnLines,
        outboundLines,
      });

      const plan = buildPostAdmissionMigrationPlan(baseline);

      const backfillForAlreadyLinked = plan.backfill.backfillRecords.find(
        (r) => r.lineId === alreadyLinked.id,
      );

      expect(backfillForAlreadyLinked).toBeUndefined();
    });
  });

  describe("stale source field clearing plan", () => {
    it("should add a stale clear record for a sales-return line that is prelinked but quantity-mismatched (non-proven)", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      const staleLine: AdmittedLineRow = {
        ...firstLine,
        quantity: "500.000000",
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      const mismatchedUpstream = buildOutboundLine({
        id: 3001,
        orderId: 3000,
        materialId: firstLine.materialId,
        quantity: "1.000000",
      });

      const baseline = buildValidBaseline(
        [staleLine, ...salesReturnLines.slice(1)],
        [mismatchedUpstream],
      );
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const clearRecord = plan.backfill.staleClearRecords.find(
        (r) => r.lineId === staleLine.id,
      );

      expect(clearRecord).toBeDefined();
      expect(clearRecord?.documentTable).toBe("sales_stock_order_line");
      expect(plan.counts.staleSourceFieldsToClean).toBeGreaterThanOrEqual(1);
    });

    it("should add a stale clear record for a sales-return line that is prelinked to a future-dated outbound (non-proven after chronology fix)", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      const staleLine: AdmittedLineRow = {
        ...firstLine,
        bizDate: "2024-01-10",
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      const futureDatedUpstream = buildOutboundLine({
        id: 3001,
        orderId: 3000,
        materialId: firstLine.materialId,
        quantity: firstLine.quantity,
        bizDate: "2024-01-20",
      });

      const baseline = buildValidBaseline(
        [staleLine, ...salesReturnLines.slice(1)],
        [futureDatedUpstream],
      );
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const clearRecord = plan.backfill.staleClearRecords.find(
        (r) => r.lineId === staleLine.id,
      );

      expect(clearRecord).toBeDefined();
      expect(plan.counts.staleSourceFieldsToClean).toBeGreaterThanOrEqual(1);
    });

    it("should NOT add a stale clear record for a proven prelinked sales-return line", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      const provenPreLinkedLine: AdmittedLineRow = {
        ...firstLine,
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      const matchingUpstream = buildOutboundLine({
        id: 3001,
        orderId: 3000,
        materialId: firstLine.materialId,
        quantity: firstLine.quantity,
        bizDate: "2024-01-10",
      });

      const baseline = buildValidBaseline(
        [provenPreLinkedLine, ...salesReturnLines.slice(1)],
        [matchingUpstream],
      );
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const classification = plan.relation.salesReturnClassifications.find(
        (c) => c.lineId === provenPreLinkedLine.id,
      );
      expect(classification?.classification).toBe("proven");

      const clearRecord = plan.backfill.staleClearRecords.find(
        (r) => r.lineId === provenPreLinkedLine.id,
      );
      expect(clearRecord).toBeUndefined();
    });

    it("should not include null-source lines in stale clear records", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);
      const workshopReturnOrders = build3WorkshopReturnOrders();
      const workshopReturnLines =
        build4WorkshopReturnLines(workshopReturnOrders);

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders,
        workshopReturnLines,
        outboundLines: [],
        pickLines: [],
      });
      const plan = buildPostAdmissionMigrationPlan(baseline);

      expect(plan.backfill.staleClearRecords).toHaveLength(0);
      expect(plan.counts.staleSourceFieldsToClean).toBe(0);
    });
  });

  describe("stale-prelinked-reproven-to-different-upstream", () => {
    it("should emit a stale-clear AND a backfill to B when a sales-return line is prelinked to stale A that fails revalidation but unique candidate B is proven", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      // line is prelinked to A (id=3001, orderId=3000), but A has wrong quantity
      const stalePrelinkedLine: AdmittedLineRow = {
        ...firstLine,
        quantity: "10.000000",
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      // A (id=3001) is present but with wrong quantity → prelink fails revalidation
      const staleSourceA = buildOutboundLine({
        id: 3001,
        orderId: 3000,
        materialId: firstLine.materialId,
        quantity: "999.000000",
      });

      // B (id=3002, orderId=3100) has matching quantity → becomes the proven candidate
      const provenCandidateB = buildOutboundLine({
        id: 3002,
        orderId: 3100,
        materialId: firstLine.materialId,
        quantity: "10.000000",
      });

      const baseline = buildValidBaseline(
        [stalePrelinkedLine, ...salesReturnLines.slice(1)],
        [staleSourceA, provenCandidateB],
      );
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const classification = plan.relation.salesReturnClassifications.find(
        (c) => c.lineId === stalePrelinkedLine.id,
      );

      // should be proven via B, not A
      expect(classification?.classification).toBe("proven");
      expect(classification?.provenUpstreamLineId).toBe(3002);

      // stale-clear record must exist for this line
      const clearRecord = plan.backfill.staleClearRecords.find(
        (r) => r.lineId === stalePrelinkedLine.id,
      );
      expect(clearRecord).toBeDefined();
      expect(clearRecord?.documentTable).toBe("sales_stock_order_line");

      // backfill record must exist pointing to B (not A)
      const backfillRecord = plan.backfill.backfillRecords.find(
        (r) => r.lineId === stalePrelinkedLine.id,
      );
      expect(backfillRecord).toBeDefined();
      expect(backfillRecord?.sourceDocumentId).toBe(3100);
      expect(backfillRecord?.sourceDocumentLineId).toBe(3002);

      // document_line_relation must point to B as well
      const lineRelation = plan.backfill.documentLineRelations.find(
        (r) => r.downstreamLineId === stalePrelinkedLine.id,
      );
      expect(lineRelation).toBeDefined();
      expect(lineRelation?.upstreamLineId).toBe(3002);
      expect(lineRelation?.upstreamDocumentId).toBe(3100);
    });

    it("should NOT emit stale-clear or extra backfill when a prelinked line is proven to the same source it already points to", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);

      const firstLine = salesReturnLines[0];
      if (!firstLine)
        throw new Error("expected at least one sales return line");

      const alreadyCorrectLine: AdmittedLineRow = {
        ...firstLine,
        sourceDocumentType: "SalesStockOrder",
        sourceDocumentId: 3000,
        sourceDocumentLineId: 3001,
      };

      const matchingUpstream = buildOutboundLine({
        id: 3001,
        orderId: 3000,
        materialId: firstLine.materialId,
        quantity: firstLine.quantity,
        bizDate: "2024-01-10",
      });

      const baseline = buildValidBaseline(
        [alreadyCorrectLine, ...salesReturnLines.slice(1)],
        [matchingUpstream],
      );
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const classification = plan.relation.salesReturnClassifications.find(
        (c) => c.lineId === alreadyCorrectLine.id,
      );
      expect(classification?.classification).toBe("proven");
      expect(classification?.provenUpstreamLineId).toBe(3001);

      const clearRecord = plan.backfill.staleClearRecords.find(
        (r) => r.lineId === alreadyCorrectLine.id,
      );
      expect(clearRecord).toBeUndefined();

      const backfillRecord = plan.backfill.backfillRecords.find(
        (r) => r.lineId === alreadyCorrectLine.id,
      );
      expect(backfillRecord).toBeUndefined();
    });

    it("should emit stale-clear AND backfill to B when a workshop-return line is prelinked to stale A but unique pick candidate B is proven", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);
      const workshopReturnOrders = build3WorkshopReturnOrders();
      const workshopReturnLines =
        build4WorkshopReturnLines(workshopReturnOrders);

      const firstWrLine = workshopReturnLines[0];
      if (!firstWrLine)
        throw new Error("expected at least one workshop return line");

      // line is prelinked to A (id=4001, orderId=4000), but A has wrong quantity
      const stalePrelinkedWrLine: AdmittedLineRow = {
        ...firstWrLine,
        quantity: "5.000000",
        sourceDocumentType: "WorkshopMaterialOrder",
        sourceDocumentId: 4000,
        sourceDocumentLineId: 4001,
      };

      // A (id=4001) present but wrong quantity → prelink fails
      const stalePickA = buildPickLine({
        id: 4001,
        orderId: 4000,
        materialId: firstWrLine.materialId,
        quantity: "999.000000",
      });

      // B (id=4002, orderId=4100) matching quantity → proven candidate
      const provenPickB = buildPickLine({
        id: 4002,
        orderId: 4100,
        materialId: firstWrLine.materialId,
        quantity: "5.000000",
      });

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders,
        workshopReturnLines: [
          stalePrelinkedWrLine,
          ...workshopReturnLines.slice(1),
        ],
        pickLines: [stalePickA, provenPickB],
      });
      const plan = buildPostAdmissionMigrationPlan(baseline);

      const classification = plan.relation.workshopReturnClassifications.find(
        (c) => c.lineId === stalePrelinkedWrLine.id,
      );

      expect(classification?.classification).toBe("proven");
      expect(classification?.provenUpstreamLineId).toBe(4002);

      const clearRecord = plan.backfill.staleClearRecords.find(
        (r) => r.lineId === stalePrelinkedWrLine.id,
      );
      expect(clearRecord).toBeDefined();
      expect(clearRecord?.documentTable).toBe("workshop_material_order_line");

      const backfillRecord = plan.backfill.backfillRecords.find(
        (r) => r.lineId === stalePrelinkedWrLine.id,
      );
      expect(backfillRecord).toBeDefined();
      expect(backfillRecord?.sourceDocumentId).toBe(4100);
      expect(backfillRecord?.sourceDocumentLineId).toBe(4002);

      const lineRelation = plan.backfill.documentLineRelations.find(
        (r) => r.downstreamLineId === stalePrelinkedWrLine.id,
      );
      expect(lineRelation).toBeDefined();
      expect(lineRelation?.upstreamLineId).toBe(4002);
      expect(lineRelation?.upstreamDocumentId).toBe(4100);
    });
  });

  describe("plan count consistency", () => {
    it("should preserve the correct total classification count across all return lines", () => {
      const salesReturnOrders = build9SalesReturnOrders();
      const salesReturnLines = build13SalesReturnLines(salesReturnOrders);
      const workshopReturnOrders = build3WorkshopReturnOrders();
      const workshopReturnLines =
        build4WorkshopReturnLines(workshopReturnOrders);

      const baseline = buildMinimalBaseline({
        salesReturnOrders,
        salesReturnLines,
        workshopReturnOrders,
        workshopReturnLines,
      });

      const plan = buildPostAdmissionMigrationPlan(baseline);
      const totalLines =
        plan.relation.salesReturnClassifications.length +
        plan.relation.workshopReturnClassifications.length;

      expect(totalLines).toBe(17);

      const classifiedTotal =
        plan.counts.provenRelations +
        plan.counts.unresolvedRelations +
        plan.counts.ambiguousRelations;

      expect(classifiedTotal).toBe(17);
    });
  });
});
