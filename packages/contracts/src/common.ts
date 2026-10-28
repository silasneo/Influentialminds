import { z } from "zod";

/** Editorial workflow states shared by every publishable record. */
export const EDITORIAL_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
] as const;
export const editorialStatusSchema = z.enum(EDITORIAL_STATUSES);
export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];

export const ADMIN_ROLES = ["SUPER_ADMIN", "CONTENT_EDITOR"] as const;
export const adminRoleSchema = z.enum(ADMIN_ROLES);
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Search-engine fields attached to every public entity. */
export const seoSchema = z.object({
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  ogImageUrl: z.string().nullable(),
});
export type Seo = z.infer<typeof seoSchema>;

export const slugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be a lowercase hyphenated slug");

export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(60).default(12),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Shape returned by every non-2xx API response. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

export const API_VERSION_PREFIX = "api/v1";

/** Converts a free-text title into a URL slug. Shared so admin UI previews match the server. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}
