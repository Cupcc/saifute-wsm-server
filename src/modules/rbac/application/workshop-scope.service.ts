import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MasterDataService } from "../../master-data/application/master-data.service";
import type {
  SessionUserSnapshot,
  SessionWorkshopScopeSnapshot,
} from "../../session/domain/user-session";

@Injectable()
export class WorkshopScopeService {
  constructor(private readonly masterDataService: MasterDataService) {}

  async getResolvedScope(
    user?: SessionUserSnapshot | null,
  ): Promise<SessionWorkshopScopeSnapshot | null> {
    const scope = user?.workshopScope;
    if (!scope || scope.mode !== "FIXED") {
      return null;
    }

    if (scope.workshopId) {
      return scope;
    }

    if (!scope.workshopCode) {
      throw new BadRequestException("当前用户未绑定研发小仓");
    }

    try {
      const workshop = scope.workshopCode
        ? await this.masterDataService.getWorkshopByCode(scope.workshopCode)
        : await this.masterDataService.getWorkshopByName(
            scope.workshopName ?? "",
          );
      return {
        mode: "FIXED",
        workshopId: workshop.id,
        workshopCode: workshop.workshopCode,
        workshopName: workshop.workshopName,
      };
    } catch (error) {
      if (error instanceof NotFoundException && scope.workshopName) {
        try {
          const workshop = await this.masterDataService.getWorkshopByName(
            scope.workshopName,
          );
          return {
            mode: "FIXED",
            workshopId: workshop.id,
            workshopCode: workshop.workshopCode,
            workshopName: workshop.workshopName,
          };
        } catch {
          throw new BadRequestException("当前用户绑定的研发小仓不存在");
        }
      }

      if (error instanceof NotFoundException) {
        throw new BadRequestException("当前用户绑定的研发小仓不存在");
      }
      throw error;
    }
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
}
