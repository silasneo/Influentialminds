import { z } from "zod";
import {
  editorialStatusSchema,
  seoSchema,
  slugSchema,
  type EditorialStatus,
  type Seo,
} from "./common.js";

export interface GuestSocialLinks {
  x?: string;
  linkedin?: string;
  youtube?: string;
  instagram?: string;
  other?: string;
}

/** Trimmed guest shape used inside episode cards and listings. */
export interface GuestSummary {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  company: string | null;
  headshotUrl: string | null;
}

export interface Guest extends GuestSummary, Seo {
  bio: string | null;
  expertise: string[];
  websiteUrl: string | null;
  socialLinks: GuestSocialLinks;
  status: EditorialStatus;
  episodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export const guestSocialLinksSchema = z
  .object({
    x: z.string().url().optional().or(z.literal("")),
    linkedin: z.string().url().optional().or(z.literal("")),
    youtube: z.string().url().optional().or(z.literal("")),
    instagram: z.string().url().optional().or(z.literal("")),
    other: z.string().url().optional().or(z.literal("")),
  })
  .partial();

export const guestWriteSchema = z.object({
  name: z.string().min(1).max(160),
  slug: slugSchema.optional(),
  role: z.string().max(160).nullish(),
  company: z.string().max(160).nullish(),
  bio: z.string().max(8000).nullish(),
  headshotUrl: z.string().max(1024).nullish(),
  websiteUrl: z.string().url().max(1024).nullish().or(z.literal("")),
  expertise: z.array(z.string().min(1).max(80)).max(24).default([]),
  socialLinks: guestSocialLinksSchema.default({}),
  status: editorialStatusSchema.default("DRAFT"),
  ...seoSchema.partial().shape,
});
export type GuestWriteInput = z.input<typeof guestWriteSchema>;

export const guestListQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  topic: slugSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(60).default(24),
});

export type GuestWrite = z.output<typeof guestWriteSchema>;
export type GuestListQuery = z.output<typeof guestListQuerySchema>;
