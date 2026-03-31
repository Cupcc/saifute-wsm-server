import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { RbacService } from "../../modules/rbac/application/rbac.service";
import { SessionService } from "../../modules/session/application/session.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & {
        user?: unknown;
        session?: unknown;
        accessToken?: string;
      }
    >();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("缺少访问令牌");
    }

    const session = await this.sessionService.resolveSessionFromToken(token);
    const latestUser = await this.rbacService.getCurrentUser(
      session.user.userId,
    );
    await this.sessionService.syncSessionUser(session, latestUser);
    request.user = session.user;
    request.session = session;
    request.accessToken = token;
    return true;
  }

  private extractToken(request: Request): string | null {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(" ");
    if (type !== "Bearer" || !token) {
      return null;
    }

    return token;
  }
}
