import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RbacRuntimeRepository } from "../infrastructure/rbac-runtime.repository";

type CsvExportColumn = {
  header: string;
  value: (row: Record<string, unknown>) => unknown;
};
type CsvExportResult = {
  fileName: string;
  content: string;
  contentType: string;
};

@Injectable()
export class SystemDictConfigService {
  constructor(private readonly rbacRepository: RbacRuntimeRepository) {}

  async listDictTypes(query: Record<string, string | undefined>) {
    return this.rbacRepository.listDictTypes(query);
  }
  async exportDictTypes(
    query: Record<string, string | undefined>,
  ): Promise<CsvExportResult> {
    return this.buildCsvExport(
      "system-dict-types",
      this.extractRows(await this.listDictTypes(this.withoutPagination(query))),
      [
        { header: "字典编号", value: (row) => row.dictId },
        { header: "字典名称", value: (row) => row.dictName },
        { header: "字典类型", value: (row) => row.dictType },
        { header: "状态", value: (row) => row.status },
        { header: "备注", value: (row) => row.remark },
        { header: "创建时间", value: (row) => row.createdAt },
      ],
    );
  }
  async getDictType(dictId: number) {
    return {
      data: await this.wrapQuery(() => this.rbacRepository.getDictType(dictId)),
    };
  }
  async createDictType(data: Record<string, unknown>) {
    return this.wrapPersistentMutation(() =>
      this.rbacRepository.createDictType(data),
    );
  }
  async updateDictType(data: Record<string, unknown>) {
    return this.wrapPersistentMutation(() =>
      this.rbacRepository.updateDictType(data),
    );
  }
  async deleteDictTypes(dictIds: number[]) {
    return this.wrapPersistentMutation(async () => {
      await this.rbacRepository.deleteDictTypes(dictIds);
      return { msg: "删除成功" };
    });
  }
  refreshDictCache() {
    return { msg: "刷新成功" };
  }
  async listDictTypeOptions() {
    return { data: await this.rbacRepository.listDictTypeOptions() };
  }

  async listDictData(query: Record<string, string | undefined>) {
    return this.rbacRepository.listDictData(query);
  }
  async exportDictData(
    query: Record<string, string | undefined>,
  ): Promise<CsvExportResult> {
    return this.buildCsvExport(
      "system-dict-data",
      this.extractRows(await this.listDictData(this.withoutPagination(query))),
      [
        { header: "字典编码", value: (row) => row.dictCode },
        { header: "字典标签", value: (row) => row.dictLabel },
        { header: "字典键值", value: (row) => row.dictValue },
        { header: "字典类型", value: (row) => row.dictType },
        { header: "排序", value: (row) => row.dictSort },
        { header: "默认", value: (row) => row.isDefault },
        { header: "状态", value: (row) => row.status },
        { header: "备注", value: (row) => row.remark },
        { header: "创建时间", value: (row) => row.createdAt },
      ],
    );
  }
  async getDictData(dictCode: number) {
    return {
      data: await this.wrapQuery(() =>
        this.rbacRepository.getDictData(dictCode),
      ),
    };
  }
  async getDicts(dictType: string) {
    return {
      data: await this.wrapQuery(() =>
        this.rbacRepository.getDictDataByType(dictType),
      ),
    };
  }
  async createDictData(data: Record<string, unknown>) {
    return this.wrapPersistentMutation(() =>
      this.rbacRepository.createDictData(data),
    );
  }
  async updateDictData(data: Record<string, unknown>) {
    return this.wrapPersistentMutation(() =>
      this.rbacRepository.updateDictData(data),
    );
  }
  async deleteDictData(dictCodes: number[]) {
    return this.wrapPersistentMutation(async () => {
      await this.rbacRepository.deleteDictData(dictCodes);
      return { msg: "删除成功" };
    });
  }

  async listConfigs(query: Record<string, string | undefined>) {
    return this.rbacRepository.listConfigs(query);
  }
  async exportConfigs(
    query: Record<string, string | undefined>,
  ): Promise<CsvExportResult> {
    return this.buildCsvExport(
      "system-configs",
      this.extractRows(await this.listConfigs(this.withoutPagination(query))),
      [
        { header: "参数主键", value: (row) => row.configId },
        { header: "参数名称", value: (row) => row.configName },
        { header: "参数键名", value: (row) => row.configKey },
        { header: "参数键值", value: (row) => row.configValue },
        { header: "系统内置", value: (row) => row.configType },
        { header: "备注", value: (row) => row.remark },
        { header: "创建时间", value: (row) => row.createdAt },
      ],
    );
  }
  async getConfig(configId: number) {
    return {
      data: await this.wrapQuery(() => this.rbacRepository.getConfig(configId)),
    };
  }
  async getConfigByKey(configKey: string) {
    const config = await this.wrapQuery(() =>
      this.rbacRepository.getConfigByKey(configKey),
    );
    return { msg: config?.configValue ?? "" };
  }
  async createConfig(data: Record<string, unknown>) {
    return this.wrapPersistentMutation(() =>
      this.rbacRepository.createConfig(data),
    );
  }
  async updateConfig(data: Record<string, unknown>) {
    return this.wrapPersistentMutation(() =>
      this.rbacRepository.updateConfig(data),
    );
  }
  async deleteConfigs(configIds: number[]) {
    return this.wrapPersistentMutation(async () => {
      await this.rbacRepository.deleteConfigs(configIds);
      return { msg: "删除成功" };
    });
  }
  refreshConfigCache() {
    return { msg: "刷新成功" };
  }

  async listNotices(query: Record<string, string | undefined>) {
    return this.rbacRepository.listNotices(query);
  }
  async getNotice(noticeId: number) {
    return {
      data: await this.wrapQuery(() => this.rbacRepository.getNotice(noticeId)),
    };
  }
  async createNotice(data: Record<string, unknown>) {
    return this.wrapPersistentMutation(() =>
      this.rbacRepository.createNotice(data),
    );
  }
  async updateNotice(data: Record<string, unknown>) {
    return this.wrapPersistentMutation(() =>
      this.rbacRepository.updateNotice(data),
    );
  }
  async deleteNotices(noticeIds: number[]) {
    return this.wrapPersistentMutation(async () => {
      await this.rbacRepository.deleteNotices(noticeIds);
      return { msg: "删除成功" };
    });
  }

  private async wrapQuery<T>(action: () => T | Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      throw this.toHttpException(error);
    }
  }
  private async wrapPersistentMutation<T>(
    action: () => T | Promise<T>,
  ): Promise<T> {
    const result = await this.wrapQuery(action);
    await this.rbacRepository.flushPersistence();
    return result;
  }
  private toHttpException(error: unknown) {
    const msg =
      error instanceof Error && error.message
        ? error.message
        : "系统管理操作失败";
    if (msg.includes("不存在")) return new NotFoundException(msg);
    return new BadRequestException(msg);
  }
  private withoutPagination(query: Record<string, string | undefined>) {
    return { ...query, pageNum: undefined, pageSize: undefined };
  }
  private extractRows(result: unknown): Record<string, unknown>[] {
    if (!result || typeof result !== "object") return [];
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows))
      return rows.filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === "object",
      );
    return [];
  }
  private buildCsvExport(
    fileBaseName: string,
    rows: Record<string, unknown>[],
    columns: CsvExportColumn[],
  ): CsvExportResult {
    const csvLines = [
      columns.map((c) => this.escapeCsvValue(c.header)).join(","),
      ...rows.map((row) =>
        columns.map((c) => this.escapeCsvValue(c.value(row))).join(","),
      ),
    ];
    return {
      fileName: `${fileBaseName}-${new Date().toISOString().slice(0, 10)}.csv`,
      content: `﻿${csvLines.join("\n")}`,
      contentType: "text/csv; charset=utf-8",
    };
  }
  private escapeCsvValue(value: unknown): string {
    const s =
      value === null || typeof value === "undefined" ? "" : String(value);
    const e = s.replace(/"/g, '""');
    return /[",\n]/.test(e) ? `"${e}"` : e;
  }
}
