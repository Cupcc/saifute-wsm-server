import { BadRequestException } from "@nestjs/common";
import type { OutboundLineWriteData } from "./sales-snapshots.service";

export function assertNoDuplicateOutboundPriceLayers(
  lines: OutboundLineWriteData[],
) {
  const keys = new Set<string>();
  for (const line of lines) {
    const key = `${line.materialId}:${line.selectedUnitCost.toString()}`;
    if (keys.has(key)) {
      throw new BadRequestException(
        `同一单据内不允许重复的物料+价格层: materialId=${line.materialId}, selectedUnitCost=${line.selectedUnitCost.toString()}`,
      );
    }
    keys.add(key);
  }
}
