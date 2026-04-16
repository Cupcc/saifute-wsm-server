import { readFileSync } from "node:fs";
import * as path from "node:path";

describe("sales web component wiring", () => {
  const rootDir = process.cwd();

  it("mounts the sales order dialogs with the imported component names", () => {
    const filePath = path.join(
      rootDir,
      "web/src/views/sales/components/SalesOrderPage.vue",
    );
    const content = readFileSync(filePath, "utf8");

    expect(content).toContain(
      'import SalesOrderDetailDialog from "./SalesOrderDetailDialog.vue";',
    );
    expect(content).toContain(
      'import SalesOrderEditorDialog from "./SalesOrderEditorDialog.vue";',
    );
    expect(content).toContain("<sales-order-detail-dialog");
    expect(content).toContain("<sales-order-editor-dialog");
    expect(content).not.toContain("<customer-order-detail-dialog");
    expect(content).not.toContain("<customer-order-editor-dialog");
  });

  it("mounts the sales detail dialog with the imported component name", () => {
    const filePath = path.join(
      rootDir,
      "web/src/views/sales/components/SalesDetailPage.vue",
    );
    const content = readFileSync(filePath, "utf8");

    expect(content).toContain(
      'import SalesOrderDetailDialog from "./SalesOrderDetailDialog.vue";',
    );
    expect(content).toContain("<sales-order-detail-dialog");
    expect(content).not.toContain("<customer-order-detail-dialog");
  });
});
