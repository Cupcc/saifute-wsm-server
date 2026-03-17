import {
  buildMissingMapTargetBlockers,
  buildSliceDirtyTargetBlockers,
} from "../../scripts/migration/stock-in/execute-guard";

describe("stock-in execute guard", () => {
  it("should allow a clean first run", () => {
    expect(
      buildSliceDirtyTargetBlockers({
        targetTable: "stock_in_order",
        targetRows: 0,
        batchMapRows: 0,
      }),
    ).toEqual([]);
  });

  it("should allow a clean rerun when target rows match batch map rows", () => {
    expect(
      buildSliceDirtyTargetBlockers({
        targetTable: "stock_in_order_line",
        targetRows: 12,
        batchMapRows: 12,
      }),
    ).toEqual([]);
  });

  it("should block execute when extra target rows exist", () => {
    expect(
      buildSliceDirtyTargetBlockers({
        targetTable: "stock_in_order",
        targetRows: 5,
        batchMapRows: 4,
      }),
    ).toEqual([
      expect.objectContaining({
        targetTable: "stock_in_order",
        targetRows: 5,
        batchMapRows: 4,
      }),
    ]);
  });

  it("should block execute when stale batch maps remain without matching target rows", () => {
    expect(
      buildSliceDirtyTargetBlockers({
        targetTable: "stock_in_order_line",
        targetRows: 0,
        batchMapRows: 3,
      }),
    ).toEqual([
      expect.objectContaining({
        targetTable: "stock_in_order_line",
        targetRows: 0,
        batchMapRows: 3,
      }),
    ]);
  });

  it("should block execute when staging maps point at missing target rows", () => {
    expect(
      buildMissingMapTargetBlockers({
        targetTable: "stock_in_order",
        missingMappedTargets: 2,
      }),
    ).toEqual([
      expect.objectContaining({
        targetTable: "stock_in_order",
        missingMappedTargets: 2,
      }),
    ]);
  });

  it("should allow execute when all staging map targets still exist", () => {
    expect(
      buildMissingMapTargetBlockers({
        targetTable: "stock_in_order_line",
        missingMappedTargets: 0,
      }),
    ).toEqual([]);
  });
});
