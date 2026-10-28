import { z } from "zod";
import { seoSchema, slugSchema, type Seo } from "./common.js";

export interface TopicSummary {
  id: string;
  slug: string;
  name: string;
  episodeCount: number;
}

export interface Topic extends TopicSummary, Seo {
  description: string | null;
  imageUrl: string | null;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const topicWriteSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema.optional(),
  description: z.string().max(4000).nullish(),
  imageUrl: z.string().max(1024).nullish(),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  ...seoSchema.partial().shape,
});
export type TopicWriteInput = z.input<typeof topicWriteSchema>;

export interface CollectionSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  featured: boolean;
  episodeCount: number;
}

export interface Collection extends CollectionSummary, Seo {
  curatorNote: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const collectionWriteSchema = z.object({
  title: z.string().min(1).max(160),
  slug: slugSchema.optional(),
  description: z.string().max(4000).nullish(),
  curatorNote: z.string().max(2000).nullish(),
  coverUrl: z.string().max(1024).nullish(),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  episodeIds: z.array(z.string().min(1)).max(200).optional(),
  ...seoSchema.partial().shape,
});
export type CollectionWriteInput = z.input<typeof collectionWriteSchema>;

export type TopicWrite = z.output<typeof topicWriteSchema>;
export type CollectionWrite = z.output<typeof collectionWriteSchema>;
