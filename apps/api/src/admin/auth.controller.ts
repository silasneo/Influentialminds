import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import {
  adminLoginSchema,
  type AdminLogin,
  type AdminUser,
} from "@influential-minds/contracts";
import { AuthService } from "./auth.service";
import { AdminGuard, CurrentAdmin } from "./admin.guard";
import type { AdminSession } from "./auth.service";
import { zodPipe } from "../common/zod-validation.pipe";
import { AuditService } from "../common/audit.service";

@Controller("admin/auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService
  ) {}

  /** Sets an httpOnly session cookie; the token is never exposed to scripts. */
  @Post("login")
  @HttpCode(200)
  async login(
    @Body(zodPipe(adminLoginSchema)) body: AdminLogin,
    @Res({ passthrough: true }) response: Response
  ): Promise<AdminUser> {
    const { token, user } = await this.auth.login(body);
    const cookie = this.auth.cookieOptions();
    response.cookie(cookie.name, token, cookie.options);
    await this.audit.record(
      { id: user.id, email: user.email },
      "login",
      "admin_user",
      user.id
    );
    return user;
  }

  @Post("logout")
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    const cookie = this.auth.cookieOptions();
    response.clearCookie(cookie.name, { ...cookie.options, maxAge: undefined });
  }

  @Get("me")
  @UseGuards(AdminGuard)
  me(@CurrentAdmin() session: AdminSession): Promise<AdminUser> {
    return this.auth.currentUser(session);
  }
}
