import { Injectable, UnauthorizedException } from "@nestjs/common";
import { MasterDataService } from "../../master-data/application/master-data.service";
import type { SessionUserSnapshot } from "../../session/domain/user-session";
import type { RbacUserRecord, RouteNode } from "../domain/rbac.types";
import { InMemoryRbacRepository } from "../infrastructure/in-memory-rbac.repository";

@Injectable()
export class RbacService {
  constructor(
    private readonly inMemoryRbacRepository: InMemoryRbacRepository,
    private readonly masterDataService: MasterDataService,
  ) {}

  async findUserForLogin(username: string): Promise<RbacUserRecord> {
    const user = await this.inMemoryRbacRepository.findUserByUsername(username);
    if (!user || user.deleted || user.status !== "active") {
      throw new UnauthorizedException("用户名或密码错误");
    }

    return user;
  }

  verifyPassword(rawPassword: string, passwordHash: string): boolean {
    return this.inMemoryRbacRepository.verifyPassword(
      rawPassword,
      passwordHash,
    );
  }

  toSessionUser(user: RbacUserRecord): SessionUserSnapshot {
    return {
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      roles: [...user.roles],
      permissions: [...user.permissions],
      department: user.department ? { ...user.department } : null,
      consoleMode: user.consoleMode ?? "default",
      workshopScope: user.workshopScope
        ? { ...user.workshopScope }
        : {
            mode: "ALL",
            workshopId: null,
            workshopCode: null,
            workshopName: null,
          },
    };
  }

  async getCurrentUser(userId: number): Promise<SessionUserSnapshot> {
    const user = await this.inMemoryRbacRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("当前用户不存在");
    }

    return this.enrichSessionUser(this.toSessionUser(user));
  }

  async getRoutesForUser(userId: number): Promise<RouteNode[]> {
    const user = await this.inMemoryRbacRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("当前用户不存在");
    }

    const allRoutes = await this.inMemoryRbacRepository.getRoutes();
    if (user.userId === 1) {
      return allRoutes;
    }

    const filteredRoutes = this.filterRoutesByPermissions(
      allRoutes,
      user.permissions,
    );
    return this.filterRoutesByConsoleMode(
      filteredRoutes,
      user.consoleMode ?? "default",
    );
  }

  async updateAvatar(
    userId: number,
    avatarUrl: string | null,
  ): Promise<{
    currentUser: SessionUserSnapshot;
    previousAvatarUrl: string | null;
  }> {
    const result = await this.inMemoryRbacRepository.updateUserAvatar(
      userId,
      avatarUrl,
    );

    return {
      currentUser: await this.enrichSessionUser(
        this.toSessionUser(result.user),
      ),
      previousAvatarUrl: result.previousAvatarUrl,
    };
  }

  async enrichSessionUser(
    user: SessionUserSnapshot,
  ): Promise<SessionUserSnapshot> {
    if (
      user.workshopScope.mode !== "FIXED" ||
      user.workshopScope.workshopId ||
      !user.workshopScope.workshopCode
    ) {
      return user;
    }

    try {
      const workshop = await this.masterDataService.getWorkshopByCode(
        user.workshopScope.workshopCode,
      );
      return {
        ...user,
        workshopScope: {
          mode: "FIXED",
          workshopId: workshop.id,
          workshopCode: workshop.workshopCode,
          workshopName: workshop.workshopName,
        },
      };
    } catch {
      if (!user.workshopScope.workshopName) {
        return user;
      }

      try {
        const workshop = await this.masterDataService.getWorkshopByName(
          user.workshopScope.workshopName,
        );
        return {
          ...user,
          workshopScope: {
            mode: "FIXED",
            workshopId: workshop.id,
            workshopCode: workshop.workshopCode,
            workshopName: workshop.workshopName,
          },
        };
      } catch {
        return user;
      }
    }
  }

  private filterRoutesByPermissions(
    routes: RouteNode[],
    permissions: string[],
  ): RouteNode[] {
    return routes.reduce<RouteNode[]>((result, route) => {
      const children = route.children
        ? this.filterRoutesByPermissions(route.children, permissions)
        : undefined;
      const hasOwnPermission =
        route.permissions.length === 0
          ? !route.children || route.children.length === 0
          : route.permissions.some((permission) =>
              permissions.includes(permission),
            );

      if (!hasOwnPermission && (!children || children.length === 0)) {
        return result;
      }

      result.push({
        ...route,
        ...(children ? { children } : {}),
      });
      return result;
    }, []);
  }

  private filterRoutesByConsoleMode(
    routes: RouteNode[],
    consoleMode: SessionUserSnapshot["consoleMode"],
  ): RouteNode[] {
    if (consoleMode !== "rd-subwarehouse") {
      return routes;
    }

    return routes.filter((route) => route.name === "RdSubwarehouse");
  }
}
