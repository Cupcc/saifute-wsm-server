import { Injectable } from "@nestjs/common";
import type { StockScopeCode } from "../../session/domain/user-session";
import {
  MonthlyReportCatalogService,
  type MonthlyReportDocumentTypeCatalogItem,
} from "./monthly-report-catalog.service";
import {
  MonthlyReportItemMapperService,
  type MonthlyReportMaterialCategoryDetailItem,
} from "./monthly-report-item-mapper.service";
import {
  buildBalanceMaterialKey,
  buildMonthlyMaterialCategoryBalanceTotals,
  buildMonthlyMaterialCategoryBalanceTotalsByKey,
  collectMonthlyMaterialCategoryGroups,
  collectMonthlyMaterialGroups,
  compareMaterialCategoryItems,
  compareMaterialItems,
  createEmptyMonthlyMaterialCategoryBalanceTotals,
  filterMonthlyMaterialCategoryBalanceSnapshots,
  resolveBalanceCategoryNodeKey,
} from "./monthly-report-material-category-balance.helper";
import {
  type MonthlyReportQuery,
  MonthlyReportSourceService,
} from "./monthly-report-source.service";
import {
  formatMoney,
  formatQuantity,
  type MonthlyMaterialCategoryBalanceSnapshot,
  type MonthlyMaterialCategoryEntry,
  MonthlyReportingDirection,
  MonthlyReportingViewMode,
  sumDecimals,
} from "./monthly-reporting.shared";

export interface MonthlyReportMaterialCategorySummaryTotals {
  categoryCount: number;
  lineCount: number;
  documentCount: number;
  abnormalDocumentCount: number;
  acceptanceInboundAmount: string;
  productionReceiptAmount: string;
  supplierReturnAmount: string;
  salesOutboundAmount: string;
  salesReturnAmount: string;
  netAmount: string;
  totalCost: string;
  openingQuantity: string;
  openingAmount: string;
  closingQuantity: string;
  closingAmount: string;
}

export interface MonthlyReportMaterialCategorySummaryItem {
  nodeKey: string;
  categoryId: number | null;
  categoryCode: string | null;
  categoryName: string;
  lineCount: number;
  documentCount: number;
  abnormalDocumentCount: number;
  acceptanceInboundAmount: string;
  productionReceiptAmount: string;
  supplierReturnAmount: string;
  salesOutboundAmount: string;
  salesReturnAmount: string;
  netAmount: string;
  totalCost: string;
  openingQuantity: string;
  openingAmount: string;
  closingQuantity: string;
  closingAmount: string;
}

export type MonthlyReportMaterialCategoryCatalogItem = Pick<
  MonthlyReportMaterialCategorySummaryItem,
  "nodeKey" | "categoryId" | "categoryCode" | "categoryName"
>;

export interface MonthlyReportMaterialSummaryItem {
  materialKey: string;
  categoryNodeKey: string;
  categoryId: number | null;
  categoryCode: string | null;
  categoryName: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec: string | null;
  unitCode: string;
  lineCount: number;
  documentCount: number;
  abnormalDocumentCount: number;
  inQuantity: string;
  outQuantity: string;
  netQuantity: string;
  openingQuantity: string;
  openingAmount: string;
  closingQuantity: string;
  closingAmount: string;
  acceptanceInboundAmount: string;
  productionReceiptAmount: string;
  supplierReturnAmount: string;
  salesOutboundAmount: string;
  salesReturnAmount: string;
  netAmount: string;
  totalCost: string;
}

export interface MonthlyReportMaterialCategoryFilters {
  viewMode: MonthlyReportingViewMode.MATERIAL_CATEGORY;
  stockScope: StockScopeCode | null;
  workshopId: number | null;
  documentTypeLabel: string | null;
  categoryId: number | null;
  categoryNodeKey: string | null;
  abnormalOnly: boolean;
  keyword: string | null;
}

export interface MonthlyReportMaterialCategorySummaryResult {
  yearMonth: string;
  filters: MonthlyReportMaterialCategoryFilters;
  viewMode: MonthlyReportingViewMode.MATERIAL_CATEGORY;
  documentTypeCatalog: MonthlyReportDocumentTypeCatalogItem[];
  categoryCatalog: MonthlyReportMaterialCategoryCatalogItem[];
  categories: MonthlyReportMaterialCategorySummaryItem[];
  materials: MonthlyReportMaterialSummaryItem[];
  summary: MonthlyReportMaterialCategorySummaryTotals;
}

export interface MonthlyReportMaterialCategoryDocumentsResult {
  yearMonth: string;
  viewMode: MonthlyReportingViewMode.MATERIAL_CATEGORY;
  total: number;
  items: MonthlyReportMaterialCategoryDetailItem[];
  summary: Omit<MonthlyReportMaterialCategorySummaryTotals, "categoryCount">;
}

@Injectable()
export class MonthlyReportMaterialCategoryService {
  constructor(
    private readonly sourceService: MonthlyReportSourceService,
    private readonly catalogService: MonthlyReportCatalogService,
    private readonly itemMapperService: MonthlyReportItemMapperService,
  ) {}

  async getMaterialCategorySummary(
    query: MonthlyReportQuery,
  ): Promise<MonthlyReportMaterialCategorySummaryResult> {
    const [entries, balanceSnapshots] = await Promise.all([
      this.sourceService.loadMaterialCategorySourceData(query),
      this.sourceService.loadMaterialCategoryBalanceSnapshots(query),
    ]);
    const filteredEntries = this.sourceService.filterMaterialCategoryEntries(
      entries,
      query,
    );
    const filteredBalanceSnapshots =
      filterMonthlyMaterialCategoryBalanceSnapshots(balanceSnapshots, query);
    const categoryItems = this.buildMaterialCategoryItems(
      filteredEntries,
      filteredBalanceSnapshots,
    );
    const materialItems = this.buildMaterialItems(
      filteredEntries,
      filteredBalanceSnapshots,
    );

    return {
      yearMonth: query.yearMonth,
      viewMode: MonthlyReportingViewMode.MATERIAL_CATEGORY,
      filters: {
        viewMode: MonthlyReportingViewMode.MATERIAL_CATEGORY,
        stockScope: query.stockScope ?? null,
        workshopId: query.workshopId ?? null,
        documentTypeLabel: query.documentTypeLabel?.trim() || null,
        categoryId: query.categoryId ?? null,
        categoryNodeKey: query.categoryNodeKey?.trim() || null,
        abnormalOnly: query.abnormalOnly ?? false,
        keyword: query.keyword?.trim() || null,
      },
      documentTypeCatalog:
        this.catalogService.buildMaterialCategoryDocumentTypeCatalog(entries),
      categoryCatalog: this.buildMaterialCategoryCatalog(
        entries,
        balanceSnapshots,
      ),
      categories: categoryItems,
      materials: materialItems,
      summary: {
        categoryCount: categoryItems.length,
        ...this.buildMaterialCategoryTotals(
          filteredEntries,
          filteredBalanceSnapshots,
        ),
      },
    };
  }

  async getMaterialCategoryDocuments(
    query: MonthlyReportQuery,
  ): Promise<MonthlyReportMaterialCategoryDocumentsResult> {
    const entries =
      await this.sourceService.loadMaterialCategorySourceData(query);
    const filteredEntries = this.sourceService.filterMaterialCategoryEntries(
      entries,
      query,
    );
    const offset = query.offset ?? 0;
    const limit = Math.min(query.limit ?? 50, 200);

    return {
      yearMonth: query.yearMonth,
      viewMode: MonthlyReportingViewMode.MATERIAL_CATEGORY,
      total: filteredEntries.length,
      items: filteredEntries
        .slice(offset, offset + limit)
        .map((entry) =>
          this.itemMapperService.toMaterialCategoryDetailItem(entry),
        ),
      summary: this.buildMaterialCategoryTotals(filteredEntries),
    };
  }

  buildMaterialCategoryCatalog(
    entries: MonthlyMaterialCategoryEntry[],
    balanceSnapshots: MonthlyMaterialCategoryBalanceSnapshot[] = [],
  ): MonthlyReportMaterialCategoryCatalogItem[] {
    return collectMonthlyMaterialCategoryGroups(entries, balanceSnapshots)
      .map(({ entries: _entries, ...category }) => category)
      .sort(compareMaterialCategoryItems);
  }

  buildMaterialItems(
    entries: MonthlyMaterialCategoryEntry[],
    balanceSnapshots: MonthlyMaterialCategoryBalanceSnapshot[] = [],
  ): MonthlyReportMaterialSummaryItem[] {
    const balanceTotalsByMaterial =
      buildMonthlyMaterialCategoryBalanceTotalsByKey(
        balanceSnapshots,
        buildBalanceMaterialKey,
      );

    return collectMonthlyMaterialGroups(entries, balanceSnapshots)
      .map((item) => {
        const commonTotals = this.buildCommonMaterialCategoryTotals(
          item.entries,
        );
        const inQuantity = sumDecimals(
          item.entries
            .filter((entry) => entry.direction === MonthlyReportingDirection.IN)
            .map((entry) => entry.quantity),
        );
        const outQuantity = sumDecimals(
          item.entries
            .filter(
              (entry) => entry.direction === MonthlyReportingDirection.OUT,
            )
            .map((entry) => entry.quantity),
        );

        return {
          materialKey: item.materialKey,
          categoryNodeKey: item.categoryNodeKey,
          categoryId: item.categoryId,
          categoryCode: item.categoryCode,
          categoryName: item.categoryName,
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          materialSpec: item.materialSpec,
          unitCode: item.unitCode,
          ...commonTotals,
          ...(balanceTotalsByMaterial.get(item.materialKey) ??
            createEmptyMonthlyMaterialCategoryBalanceTotals()),
          inQuantity: formatQuantity(inQuantity),
          outQuantity: formatQuantity(outQuantity),
          netQuantity: formatQuantity(inQuantity.sub(outQuantity)),
        };
      })
      .sort(compareMaterialItems);
  }

  buildMaterialCategoryItems(
    entries: MonthlyMaterialCategoryEntry[],
    balanceSnapshots: MonthlyMaterialCategoryBalanceSnapshot[] = [],
  ): MonthlyReportMaterialCategorySummaryItem[] {
    const balanceTotalsByCategory =
      buildMonthlyMaterialCategoryBalanceTotalsByKey(
        balanceSnapshots,
        resolveBalanceCategoryNodeKey,
      );

    return collectMonthlyMaterialCategoryGroups(entries, balanceSnapshots)
      .map((item) => {
        return {
          nodeKey: item.nodeKey,
          categoryId: item.categoryId,
          categoryCode: item.categoryCode,
          categoryName: item.categoryName,
          ...this.buildCommonMaterialCategoryTotals(item.entries),
          ...(balanceTotalsByCategory.get(item.nodeKey) ??
            createEmptyMonthlyMaterialCategoryBalanceTotals()),
        };
      })
      .sort(compareMaterialCategoryItems);
  }

  buildMaterialCategoryTotals(
    entries: MonthlyMaterialCategoryEntry[],
    balanceSnapshots: MonthlyMaterialCategoryBalanceSnapshot[] = [],
  ): Omit<MonthlyReportMaterialCategorySummaryTotals, "categoryCount"> {
    return this.buildCommonMaterialCategoryTotals(entries, balanceSnapshots);
  }

  private buildCommonMaterialCategoryTotals(
    entries: MonthlyMaterialCategoryEntry[],
    balanceSnapshots: MonthlyMaterialCategoryBalanceSnapshot[] = [],
  ): Omit<MonthlyReportMaterialCategorySummaryTotals, "categoryCount"> {
    const documentKeys = new Set(
      entries.map((entry) => `${entry.documentType}:${entry.documentId}`),
    );
    const abnormalDocumentKeys = new Set(
      entries
        .filter((entry) => entry.abnormalFlags.length > 0)
        .map((entry) => `${entry.documentType}:${entry.documentId}`),
    );
    const acceptanceInboundAmount = sumDecimals(
      entries
        .filter((entry) => entry.topicKey === "ACCEPTANCE_INBOUND")
        .map((entry) => entry.amount),
    );
    const productionReceiptAmount = sumDecimals(
      entries
        .filter((entry) => entry.topicKey === "PRODUCTION_RECEIPT")
        .map((entry) => entry.amount),
    );
    const salesOutboundAmount = sumDecimals(
      entries
        .filter((entry) => entry.topicKey === "SALES_OUTBOUND")
        .map((entry) => entry.amount),
    );
    const supplierReturnAmount = sumDecimals(
      entries
        .filter((entry) => entry.topicKey === "SUPPLIER_RETURN")
        .map((entry) => entry.amount),
    );
    const salesReturnAmount = sumDecimals(
      entries
        .filter((entry) => entry.topicKey === "SALES_RETURN")
        .map((entry) => entry.amount),
    );

    return {
      lineCount: entries.length,
      documentCount: documentKeys.size,
      abnormalDocumentCount: abnormalDocumentKeys.size,
      acceptanceInboundAmount: formatMoney(acceptanceInboundAmount),
      productionReceiptAmount: formatMoney(productionReceiptAmount),
      supplierReturnAmount: formatMoney(supplierReturnAmount),
      salesOutboundAmount: formatMoney(salesOutboundAmount),
      salesReturnAmount: formatMoney(salesReturnAmount),
      netAmount: formatMoney(
        acceptanceInboundAmount
          .add(productionReceiptAmount)
          .add(salesReturnAmount)
          .sub(supplierReturnAmount)
          .sub(salesOutboundAmount),
      ),
      totalCost: formatMoney(sumDecimals(entries.map((entry) => entry.cost))),
      ...buildMonthlyMaterialCategoryBalanceTotals(balanceSnapshots),
    };
  }
}
