import { z } from "zod";
import { adminRoleSchema, type AdminRole } from "./common.js";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
}

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
});
export type AdminLoginInput = z.input<typeof adminLoginSchema>;

export const adminUserWriteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().min(1).max(160),
  password: z.string().min(12).max(200).optional(),
  role: adminRoleSchema.default("CONTENT_EDITOR"),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});

export interface MediaAsset {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: "IMAGE" | "DOCUMENT" | "TRANSCRIPT";
  alt: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  createdAt: string;
}

export interface AdminDashboard {
  counts: {
    publishedEpisodes: number;
    draftEpisodes: number;
    inReviewEpisodes: number;
    archivedEpisodes: number;
    guests: number;
    topics: number;
    collections: number;
    leads: number;
    leadsLast30Days: number;
    transcriptsIndexed: number;
    transcriptsPending: number;
    askQueriesLast30Days: number;
  };
  recentActivity: AuditLogEntry[];
  recentLeads: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    sourcePage: string | null;
  }>;
  aiProvider: {
    mode: "live" | "mock" | "disabled";
    providerName: string;
    indexedSegmentCount: number;
  };
}

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type AdminLogin = z.output<typeof adminLoginSchema>;
export type AdminUserWrite = z.output<typeof adminUserWriteSchema>;
