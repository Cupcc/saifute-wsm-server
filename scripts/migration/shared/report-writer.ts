import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { stableJsonStringify } from "./deterministic";

export function writeStableReport(reportPath: string, report: unknown): void {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${stableJsonStringify(report)}\n`, "utf8");
}
