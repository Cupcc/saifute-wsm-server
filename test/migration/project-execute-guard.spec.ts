import {
  buildDownstreamConsumerBlockers,
  buildMissingMapTargetBlockers,
  buildSliceDirtyTargetBlockers,
} from "../../scripts/migration/project/execute-guard";

describe("project execute guard", () => {
  it("should allow a clean first run", () => {
    expect(
      buildSliceDirtyTargetBlockers({
        targetTable: "project",
        targetRows: 0,
        batchMapRows: 0,
      }),
    ).toEqual([]);
  });

  it("should allow a clean rerun when target rows match batch map rows", () => {
    expect(
      buildSliceDirtyTargetBlockers({
        targetTable: "project_material_line",
        targetRows: 12,
        batchMapRows: 12,
      }),
    ).toEqual([]);
  });

  it("should block execute when extra target rows exist", () => {
    expect(
      buildSliceDirtyTargetBlockers({
        targetTable: "project",
        targetRows: 5,
        batchMapRows: 4,
      }),
    ).toEqual([
      expect.objectContaining({
        targetTable: "project",
        targetRows: 5,
        batchMapRows: 4,
      }),
    ]);
  });

  it("should block execute when stale batch maps remain without matching target rows", () => {
    expect(
      buildSliceDirtyTargetBlockers({
        targetTable: "project_material_line",
        targetRows: 0,
        batchMapRows: 3,
      }),
    ).toEqual([
      expect.objectContaining({
        targetTable: "project_material_line",
        targetRows: 0,
        batchMapRows: 3,
      }),
    ]);
  });

  it("should block execute when staging maps point at missing target rows", () => {
    expect(
      buildMissingMapTargetBlockers({
        targetTable: "project",
        missingMappedTargets: 2,
      }),
    ).toEqual([
      expect.objectContaining({
        targetTable: "project",
        missingMappedTargets: 2,
      }),
    ]);
  });

  it("should allow execute when all staging map targets still exist", () => {
    expect(
      buildMissingMapTargetBlockers({
        targetTable: "project_material_line",
        missingMappedTargets: 0,
      }),
    ).toEqual([]);
  });

  it("should block rerun when downstream project consumers already exist", () => {
    expect(
      buildDownstreamConsumerBlockers({
        isRerun: true,
        consumerCounts: {
          document_relation: 1,
          document_line_relation: 0,
          factory_number_reservation: 0,
          inventory_log: 0,
          inventory_source_usage: 0,
          workflow_audit_document: 0,
        },
      }),
    ).toEqual([
      expect.objectContaining({
        downstreamConsumers: {
          document_relation: 1,
        },
      }),
    ]);
  });

  it("should allow first execute before downstream consumers exist", () => {
    expect(
      buildDownstreamConsumerBlockers({
        isRerun: false,
        consumerCounts: {
          document_relation: 3,
        },
      }),
    ).toEqual([]);
  });
});
