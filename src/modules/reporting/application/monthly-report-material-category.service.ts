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
  type MonthlyReportQuery,
  MonthlyReportSourceService,
} from "./monthly-report-source.service";
import {
  buildMonthlyMaterialCategoryNodeKey,
  resolveMonthlyMaterialCategoryLeaf,
} from "./monthly-reporting.formatters";
import {
  formatMoney,
  type MonthlyMaterialCategoryEntry,
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
}

export type MonthlyReportMaterialCategoryCatalogItem = Pick<
  MonthlyReportMaterialCategorySummaryItem,
  "nodeKey" | "categoryId" | "categoryCode" | "categoryName"
>;

interface MonthlyReportMaterialCategoryGroup
  extends MonthlyReportMaterialCategoryCatalogItem {
  entries: MonthlyMaterialCategoryEntry[];
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
    const entries =
      await this.sourceService.loadMaterialCategorySourceData(query);
    const filteredEntries = this.sourceService.filterMaterialCategoryEntries(
      entries,
      query,
    );
    const categoryItems = this.buildMaterialCategoryItems(filteredEntries);

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
      categoryCatalog: this.buildMaterialCategoryCatalog(entries),
      categories: categoryItems,
      summary: {
        categoryCount: categoryItems.length,
        ...this.buildMaterialCategoryTotals(filteredEntries),
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
  ): MonthlyReportMaterialCategoryCatalogItem[] {
    return this.collectMaterialCategoryGroups(entries)
      .map(({ entries: _entries, ...category }) => category)
      .sort((left, right) => this.compareMaterialCategoryItems(left, right));
  }

  buildMaterialCategoryItems(
    entries: MonthlyMaterialCategoryEntry[],
  ): MonthlyReportMaterialCategorySummaryItem[] {
    return this.collectMaterialCategoryGroups(entries)
      .map((item) => {
        const acceptanceRows = item.entries.filter(
          (entry) => entry.topicKey === "ACCEPTANCE_INBOUND",
        );
        const productionRows = item.entries.filter(
          (entry) => entry.topicKey === "PRODUCTION_RECEIPT",
        );
        const supplierReturnRows = item.entries.filter(
          (entry) => entry.topicKey === "SUPPLIER_RETURN",
        );
        const outboundRows = item.entries.filter(
          (entry) => entry.topicKey === "SALES_OUTBOUND",
        );
        const returnRows = item.entries.filter(
          (entry) => entry.topicKey === "SALES_RETURN",
        );
        const documentKeys = new Set(
          item.entries.map(
            (entry) => `${entry.documentType}:${entry.documentId}`,
          ),
        );
        const abnormalDocumentKeys = new Set(
          item.entries
            .filter((entry) => entry.abnormalFlags.length > 0)
            .map((entry) => `${entry.documentType}:${entry.documentId}`),
        );
        const acceptanceInboundAmount = sumDecimals(
          acceptanceRows.map((entry) => entry.amount),
        );
        const productionReceiptAmount = sumDecimals(
          productionRows.map((entry) => entry.amount),
        );
        const supplierReturnAmount = sumDecimals(
          supplierReturnRows.map((entry) => entry.amount),
        );
        const salesOutboundAmount = sumDecimals(
          outboundRows.map((entry) => entry.amount),
        );
        const salesReturnAmount = sumDecimals(
          returnRows.map((entry) => entry.amount),
        );

        return {
          nodeKey: item.nodeKey,
          categoryId: item.categoryId,
          categoryCode: item.categoryCode,
          categoryName: item.categoryName,
          lineCount: item.entries.length,
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
          totalCost: formatMoney(
            sumDecimals(item.entries.map((entry) => entry.cost)),
          ),
        };
      })
      .sort((left, right) => this.compareMaterialCategoryItems(left, right));
  }

  buildMaterialCategoryTotals(
    entries: MonthlyMaterialCategoryEntry[],
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
    };
  }

  private collectMaterialCategoryGroups(
    entries: MonthlyMaterialCategoryEntry[],
  ): MonthlyReportMaterialCategoryGroup[] {
    const grouped = new Map<string, MonthlyReportMaterialCategoryGroup>();

    for (const entry of entries) {
      const leafCategory = resolveMonthlyMaterialCategoryLeaf(entry);
      const nodeKey = buildMonthlyMaterialCategoryNodeKey(leafCategory);
      const current = grouped.get(nodeKey) ?? {
        nodeKey,
        categoryId: leafCategory.id,
        categoryCode: leafCategory.categoryCode,
        categoryName: leafCategory.categoryName,
        entries: [],
      };
      current.entries.push(entry);
      grouped.set(nodeKey, current);
    }

    return [...grouped.values()];
  }

  private compareMaterialCategoryItems(
    left: MonthlyReportMaterialCategoryCatalogItem,
    right: MonthlyReportMaterialCategoryCatalogItem,
  ): number {
    if (left.categoryName !== right.categoryName) {
      return left.categoryName.localeCompare(right.categoryName, "zh-Hans-CN");
    }

    if ((left.categoryCode ?? "") !== (right.categoryCode ?? "")) {
      return (left.categoryCode ?? "").localeCompare(
        right.categoryCode ?? "",
        "zh-Hans-CN",
      );
    }

    return left.nodeKey.localeCompare(right.nodeKey, "zh-Hans-CN");
  }
}
