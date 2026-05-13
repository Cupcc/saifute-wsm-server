import {
  assertExpectedDatabaseName,
  EXPECTED_TARGET_DATABASE_NAME,
} from "../../scripts/migration/config";

describe("migration config", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("uses the active DATABASE_URL database name for target checks", () => {
    process.env.DATABASE_URL =
      "mysql://migration:secret@127.0.0.1:3306/custom_target";

    expect(
      assertExpectedDatabaseName(
        process.env.DATABASE_URL,
        EXPECTED_TARGET_DATABASE_NAME,
        "Target",
      ),
    ).toBe("custom_target");
  });

  it("rejects a target URL that does not match active DATABASE_URL", () => {
    process.env.DATABASE_URL =
      "mysql://migration:secret@127.0.0.1:3306/custom_target";

    expect(() =>
      assertExpectedDatabaseName(
        "mysql://migration:secret@127.0.0.1:3306/saifute-wms",
        EXPECTED_TARGET_DATABASE_NAME,
        "Target",
      ),
    ).toThrow("Target database must match DATABASE_URL database custom_target");
  });
});
