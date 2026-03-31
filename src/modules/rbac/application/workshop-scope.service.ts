import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MasterDataService } from "../../master-data/application/master-data.service";
import {
  type ResolvedStockScopeContext,
  resolveStockScopeFromWorkshopIdentity,
  resolveWorkshopCodeFromStockScope,
  type SessionStockScopeSnapshot,
  type SessionUserSnapshot,
  type SessionWorkshopScopeSnapshot,
  toSessionStockScopeSnapshotFromWorkshopScope,
  toSessionWorkshopScopeSnapshotFromStockScope,
} from "../../session/domain/user-session";

@Injectable()
export class WorkshopScopeService {
  constructor(private readonly masterDataService: MasterDataService) {}

  async getResolvedStockScope(
    user?: SessionUserSnapshot | null,
  ): Promise<ResolvedStockScopeContext | null> {
    const scope = this.getCandidateStockScope(user);
    if (!scope || scope.mode !== "FIXED") {
      return null;
    }

    if (
      scope.stockScope &&
      scope.workshopId &&
      scope.workshopCode &&
      scope.workshopName
    ) {
      const stockScopeRecord = await this.masterDataService.getStockScopeByCode(
        scope.stockScope,
      );
      return {
        stockScopeId: stockScopeRecord.id,
        stockScope: scope.stockScope,
        workshopId: scope.workshopId,
        workshopCode: scope.workshopCode,
        workshopName: scope.workshopName,
      };
    }

    return this.resolveFixedWorkshopForScope(scope, user?.workshopScope);
  }

  async getResolvedScope(
    user?: SessionUserSnapshot | null,
  ): Promise<SessionWorkshopScopeSnapshot | null> {
    const scope = await this.getResolvedStockScope(user);
    return scope
      ? {
          mode: "FIXED",
          workshopId: scope.workshopId,
          workshopCode: scope.workshopCode,
          workshopName: scope.workshopName,
        }
      : null;
  }

  async resolveInventoryQueryScope(
    user: SessionUserSnapshot | undefined,
    requestedWorkshopId?: number,
  ): Promise<ResolvedStockScopeContext | null> {
    const [fixedScope, requestedScope] = await Promise.all([
      this.getResolvedStockScope(user),
      requestedWorkshopId
        ? this.resolveInventoryScopeByWorkshopId(requestedWorkshopId)
        : Promise.resolve(null),
    ]);

    if (
      fixedScope &&
      requestedScope &&
      fixedScope.stockScope !== requestedScope.stockScope
    ) {
      throw new ForbiddenException("当前用户只能访问研发小仓数据");
    }

    return fixedScope ?? requestedScope;
  }

  async resolveInventoryQueryWorkshopId(
    user: SessionUserSnapshot | undefined,
    requestedWorkshopId?: number,
  ): Promise<number | undefined> {
    return (await this.resolveInventoryQueryScope(user, requestedWorkshopId))
      ?.workshopId;
  }

  async resolveQueryWorkshopId(
    user: SessionUserSnapshot | undefined,
    requestedWorkshopId?: number,
  ): Promise<number | undefined> {
    const scope = await this.getResolvedScope(user);
    if (!scope) {
      return requestedWorkshopId;
    }

    if (requestedWorkshopId && requestedWorkshopId !== scope.workshopId) {
      throw new ForbiddenException("当前用户只能访问研发小仓数据");
    }

    return scope.workshopId ?? undefined;
  }

  async applyFixedWorkshopScope<T extends { workshopId?: number }>(
    user: SessionUserSnapshot | undefined,
    payload: T,
  ): Promise<T> {
    const scope = await this.getResolvedScope(user);
    if (!scope) {
      return payload;
    }

    if (payload.workshopId && payload.workshopId !== scope.workshopId) {
      throw new ForbiddenException("当前用户只能操作研发小仓单据");
    }

    return {
      ...payload,
      workshopId: scope.workshopId ?? undefined,
    };
  }

  async assertWorkshopAccess(
    user: SessionUserSnapshot | undefined,
    workshopId: number | null | undefined,
  ): Promise<void> {
    if (!workshopId) {
      return;
    }

    const scope = await this.getResolvedScope(user);
    if (!scope) {
      return;
    }

    if (scope.workshopId !== workshopId) {
      throw new ForbiddenException("当前用户只能访问研发小仓数据");
    }
  }

  async assertInventoryWorkshopAccess(
    user: SessionUserSnapshot | undefined,
    workshopId: number | null | undefined,
  ): Promise<void> {
    if (!workshopId) {
      return;
    }

    const fixedScope = await this.getResolvedStockScope(user);
    if (!fixedScope) {
      return;
    }

    const requestedScope =
      await this.resolveInventoryScopeByWorkshopId(workshopId);
    if (requestedScope.stockScope !== fixedScope.stockScope) {
      throw new ForbiddenException("当前用户只能访问研发小仓数据");
    }
  }

  async assertInventoryStockScopeAccess(
    user: SessionUserSnapshot | undefined,
    stockScopeId: number | null | undefined,
  ): Promise<void> {
    if (!stockScopeId) {
      return;
    }

    const fixedScope = await this.getResolvedStockScope(user);
    if (!fixedScope) {
      return;
    }

    if (fixedScope.stockScopeId !== stockScopeId) {
      throw new ForbiddenException("当前用户只能访问研发小仓数据");
    }
  }

  async getVisibleWorkshops(user: SessionUserSnapshot | undefined): Promise<{
    items: Array<{
      id: number;
      workshopCode: string;
      workshopName: string;
    }>;
    total: number;
  } | null> {
    const scope = await this.getResolvedScope(user);
    if (
      !scope ||
      !scope.workshopId ||
      !scope.workshopCode ||
      !scope.workshopName
    ) {
      return null;
    }

    return {
      items: [
        {
          id: scope.workshopId,
          workshopCode: scope.workshopCode,
          workshopName: scope.workshopName,
        },
      ],
      total: 1,
    };
  }

  private getCandidateStockScope(
    user?: SessionUserSnapshot | null,
  ): SessionStockScopeSnapshot | null {
    if (!user) {
      return null;
    }

    return (
      user.stockScope ??
      toSessionStockScopeSnapshotFromWorkshopScope(user.workshopScope)
    );
  }

  private async resolveFixedWorkshopForScope(
    scope: SessionStockScopeSnapshot,
    legacyScope?: SessionWorkshopScopeSnapshot,
  ): Promise<ResolvedStockScopeContext> {
    if (scope.stockScope) {
      const [stockScopeRecord, workshop] = await Promise.all([
        this.masterDataService.getStockScopeByCode(scope.stockScope),
        this.masterDataService.getWorkshopByCode(
          resolveWorkshopCodeFromStockScope(scope.stockScope),
        ),
      ]);
      return this.toResolvedInventoryScope(workshop, stockScopeRecord.id);
    }

    const candidateLegacyScope =
      legacyScope ?? toSessionWorkshopScopeSnapshotFromStockScope(scope);
    if (candidateLegacyScope.workshopId) {
      return this.resolveInventoryScopeByWorkshopId(
        candidateLegacyScope.workshopId,
      );
    }

    try {
      if (candidateLegacyScope.workshopCode) {
        const workshop = await this.masterDataService.getWorkshopByCode(
          candidateLegacyScope.workshopCode,
        );
        const stockScope = resolveStockScopeFromWorkshopIdentity({
          workshopCode: workshop.workshopCode,
          workshopName: workshop.workshopName,
        });
        if (!stockScope) {
          throw new BadRequestException("真实库存范围只允许主仓或研发小仓");
        }
        const stockScopeRecord =
          await this.masterDataService.getStockScopeByCode(stockScope);
        return this.toResolvedInventoryScope(workshop, stockScopeRecord.id);
      }

      if (candidateLegacyScope.workshopName) {
        const workshop = await this.masterDataService.getWorkshopByName(
          candidateLegacyScope.workshopName,
        );
        const stockScope = resolveStockScopeFromWorkshopIdentity({
          workshopCode: workshop.workshopCode,
          workshopName: workshop.workshopName,
        });
        if (!stockScope) {
          throw new BadRequestException("真实库存范围只允许主仓或研发小仓");
        }
        const stockScopeRecord =
          await this.masterDataService.getStockScopeByCode(stockScope);
        return this.toResolvedInventoryScope(workshop, stockScopeRecord.id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException("当前用户绑定的库存范围不存在");
      }
      throw error;
    }

    throw new BadRequestException("当前用户未绑定库存范围");
  }

  private async resolveInventoryScopeByWorkshopId(
    workshopId: number,
  ): Promise<ResolvedStockScopeContext> {
    const workshop = await this.masterDataService.getWorkshopById(workshopId);
    const stockScope = resolveStockScopeFromWorkshopIdentity({
      workshopCode: workshop.workshopCode,
      workshopName: workshop.workshopName,
    });
    if (!stockScope) {
      throw new BadRequestException("真实库存范围只允许主仓或研发小仓");
    }
    const stockScopeRecord =
      await this.masterDataService.getStockScopeByCode(stockScope);
    return this.toResolvedInventoryScope(workshop, stockScopeRecord.id);
  }

  private toResolvedInventoryScope(
    workshop: {
      id: number;
      workshopCode: string;
      workshopName: string;
    },
    stockScopeId: number,
  ): ResolvedStockScopeContext {
    const stockScope = resolveStockScopeFromWorkshopIdentity({
      workshopCode: workshop.workshopCode,
      workshopName: workshop.workshopName,
    });
    if (!stockScope) {
      throw new BadRequestException("真实库存范围只允许主仓或研发小仓");
    }

    return {
      stockScopeId,
      stockScope,
      workshopId: workshop.id,
      workshopCode: workshop.workshopCode,
      workshopName: workshop.workshopName,
    };
  }
}
