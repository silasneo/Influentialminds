import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { AdminRole } from "@influential-minds/contracts";
import { AuthService, type AdminSession } from "./auth.service";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";

export const ROLES_KEY = "admin_roles";

/** Restricts a route to the listed roles. Absent metadata means any admin. */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthedRequest extends Request {
  admin?: AdminSession;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminSession => {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!request.admin)
      throw new UnauthorizedException("Authentication is required.");
    return request.admin;
  }
);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const cookies = (request.cookies ?? {}) as Record<
      string,
      string | undefined
    >;
    const bearer = request.get("authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookies[this.config.AUTH_COOKIE_NAME] ?? bearer;
    if (!token) throw new UnauthorizedException("Authentication is required.");

    const session = this.auth.verify(token);
    request.admin = session;

    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (required && required.length > 0 && !required.includes(session.role)) {
      throw new UnauthorizedException("Your role does not permit this action.");
    }
    return true;
  }
}
