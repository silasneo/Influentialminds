import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type {
  AdminLogin,
  AdminRole,
  AdminUser,
  AdminUserWrite,
} from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";

export interface AdminSession {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig
  ) {}

  private toDto(row: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    status: AdminUser["status"];
    lastLoginAt: Date | null;
    createdAt: Date;
  }): AdminUser {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
      lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Verifies credentials in constant-ish time and returns a signed session token. */
  async login(input: AdminLogin): Promise<{ token: string; user: AdminUser }> {
    const row = await this.prisma.adminUser.findUnique({
      where: { email: input.email },
    });
    const hash =
      row?.passwordHash ??
      "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
    const valid = await bcrypt.compare(input.password, hash);

    if (!row || !valid || row.status !== "ACTIVE") {
      throw new UnauthorizedException(
        "That email and password combination was not recognised."
      );
    }

    await this.prisma.adminUser.update({
      where: { id: row.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: AdminSession = {
      sub: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
    };
    const token = jwt.sign(payload, this.config.AUTH_SECRET, {
      expiresIn: `${this.config.AUTH_SESSION_TTL_HOURS}h`,
    });
    return { token, user: this.toDto({ ...row, lastLoginAt: new Date() }) };
  }

  verify(token: string): AdminSession {
    try {
      const decoded = jwt.verify(token, this.config.AUTH_SECRET);
      if (typeof decoded === "string")
        throw new Error("Unexpected token payload");
      return {
        sub: String(decoded.sub),
        email: String(decoded.email),
        name: String(decoded.name),
        role: decoded.role as AdminRole,
      };
    } catch {
      throw new UnauthorizedException(
        "Your session has expired. Please sign in again."
      );
    }
  }

  /** Re-reads the user so a revoked or suspended account cannot keep a valid cookie. */
  async currentUser(session: AdminSession): Promise<AdminUser> {
    const row = await this.prisma.adminUser.findUnique({
      where: { id: session.sub },
    });
    if (!row || row.status !== "ACTIVE")
      throw new UnauthorizedException("This account is no longer active.");
    return this.toDto(row);
  }

  async listUsers(): Promise<AdminUser[]> {
    const rows = await this.prisma.adminUser.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return rows.map(row => this.toDto(row));
  }

  async createUser(input: AdminUserWrite): Promise<AdminUser> {
    if (!input.password)
      throw new UnauthorizedException(
        "A password is required when creating an administrator."
      );
    const row = await this.prisma.adminUser.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        status: input.status,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      },
    });
    return this.toDto(row);
  }

  async updateUser(id: string, input: AdminUserWrite): Promise<AdminUser> {
    const row = await this.prisma.adminUser.update({
      where: { id },
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        status: input.status,
        ...(input.password
          ? { passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS) }
          : {}),
      },
    });
    return this.toDto(row);
  }

  async removeUser(id: string): Promise<void> {
    await this.prisma.adminUser.delete({ where: { id } });
  }

  cookieOptions(): { name: string; options: Record<string, unknown> } {
    return {
      name: this.config.AUTH_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: this.config.AUTH_COOKIE_SECURE ? "none" : "lax",
        secure: this.config.AUTH_COOKIE_SECURE,
        path: "/",
        maxAge: this.config.AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000,
        ...(this.config.AUTH_COOKIE_DOMAIN
          ? { domain: this.config.AUTH_COOKIE_DOMAIN }
          : {}),
      },
    };
  }
}
