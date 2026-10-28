import { z } from "zod";
import {
  editorialStatusSchema,
  seoSchema,
  slugSchema,
  type EditorialStatus,
  type Seo,
} from "./common.js";
import type { GuestSummary } from "./guest.js";
import type { CollectionSummary, TopicSummary } from "./taxonomy.js";
import { youTubeUrlSchema } from "./youtube.js";

/** A YouTube multi-language audio / lipsync track flagged by the editorial team. */
export interface LipsyncTrack {
  languageCode: string;
  languageName: string;
  kind: "DUBBED_AUDIO" | "LIPSYNC";
}

export interface EpisodeSummary {
  id: string;
  slug: string;
  title: string;
  episodeNumber: number | null;
  season: number | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  youtubeVideoId: string;
  thumbnailUrl: string;
  watchUrl: string;
  excerpt: string | null;
  guests: GuestSummary[];
  topics: TopicSummary[];
}

export interface EpisodeTakeaway {
  id: string;
  text: string;
  sortOrder: number;
}

export interface EpisodeQuote {
  id: string;
  text: string;
  attribution: string | null;
  timestampSeconds: number | null;
  /** Deep link to the exact moment, present only when a timestamp exists. */
  momentUrl: string | null;
  sortOrder: number;
}

export interface TranscriptSegment {
  id: string;
  startSeconds: number;
  endSeconds: number | null;
  text: string;
  speaker: string | null;
  /** YouTube `?t=` deep link for this exact passage. */
  momentUrl: string;
}

export interface EpisodeTranscript {
  id: string;
  language: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  indexedAt: string | null;
  segmentCount: number;
  segments: TranscriptSegment[];
}

export interface Episode extends EpisodeSummary, Seo {
  description: string | null;
  summary: string | null;
  youtubeUrl: string;
  youtubePlaylistId: string | null;
  embedUrl: string;
  spotifyUrl: string | null;
  applePodcastsUrl: string | null;
  lipsyncTracks: LipsyncTrack[];
  status: EditorialStatus;
  collections: CollectionSummary[];
  takeaways: EpisodeTakeaway[];
  quotes: EpisodeQuote[];
  transcript: EpisodeTranscript | null;
  /** True only when indexed transcript segments exist for this episode. */
  isAskable: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Listing shape for the editorial console, which must see unpublished work. */
export interface AdminEpisodeSummary extends EpisodeSummary {
  status: EditorialStatus;
  updatedAt: string;
}

export interface EpisodeDetailResponse {
  episode: Episode;
  relatedEpisodes: EpisodeSummary[];
}

export const EPISODE_SORTS = ["newest", "oldest", "episodeNumber"] as const;
export type EpisodeSort = (typeof EPISODE_SORTS)[number];

export const episodeListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  guest: slugSchema.optional(),
  topic: slugSchema.optional(),
  collection: slugSchema.optional(),
  sort: z.enum(EPISODE_SORTS).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(48).default(12),
});
export type EpisodeListQuery = z.infer<typeof episodeListQuerySchema>;

export const lipsyncTrackSchema = z.object({
  languageCode: z.string().min(2).max(12),
  languageName: z.string().min(1).max(80),
  kind: z.enum(["DUBBED_AUDIO", "LIPSYNC"]).default("DUBBED_AUDIO"),
});

export const episodeWriteSchema = z.object({
  title: z.string().min(1).max(240),
  slug: slugSchema.optional(),
  episodeNumber: z.coerce.number().int().min(0).max(100000).nullish(),
  season: z.coerce.number().int().min(0).max(100).nullish(),
  description: z.string().max(20000).nullish(),
  summary: z.string().max(20000).nullish(),
  publishedAt: z.string().datetime().nullish(),
  durationSeconds: z.coerce.number().int().min(0).max(86400).nullish(),
  status: editorialStatusSchema.default("DRAFT"),
  youtubeUrl: youTubeUrlSchema,
  youtubePlaylistId: z.string().max(64).nullish(),
  thumbnailUrl: z.string().max(1024).nullish(),
  spotifyUrl: z.string().url().max(1024).nullish().or(z.literal("")),
  applePodcastsUrl: z.string().url().max(1024).nullish().or(z.literal("")),
  lipsyncTracks: z.array(lipsyncTrackSchema).max(40).default([]),
  guestIds: z.array(z.string().min(1)).max(12).default([]),
  topicIds: z.array(z.string().min(1)).max(24).default([]),
  collectionIds: z.array(z.string().min(1)).max(24).default([]),
  takeaways: z.array(z.string().min(1).max(600)).max(24).default([]),
  quotes: z
    .array(
      z.object({
        text: z.string().min(1).max(1200),
        attribution: z.string().max(160).nullish(),
        timestampSeconds: z.coerce.number().int().min(0).max(86400).nullish(),
      })
    )
    .max(24)
    .default([]),
  ...seoSchema.partial().shape,
});
export type EpisodeWriteInput = z.input<typeof episodeWriteSchema>;

export const episodeStatusChangeSchema = z.object({
  status: editorialStatusSchema,
});

/** One line of an uploaded transcript, before persistence. */
export const transcriptSegmentInputSchema = z.object({
  startSeconds: z.coerce.number().min(0).max(86400),
  endSeconds: z.coerce.number().min(0).max(86400).nullish(),
  speaker: z.string().max(120).nullish(),
  text: z.string().min(1).max(8000),
});

export const transcriptUploadSchema = z.object({
  language: z.string().min(2).max(12).default("en"),
  sourceFileName: z.string().max(260).nullish(),
  /** Raw WebVTT/SRT/plain-timestamp text. Parsed and validated server-side. */
  content: z.string().min(1).max(4_000_000),
});
export type TranscriptUploadInput = z.input<typeof transcriptUploadSchema>;

export type EpisodeWrite = z.output<typeof episodeWriteSchema>;
export type TranscriptUpload = z.output<typeof transcriptUploadSchema>;
export type TranscriptSegmentInput = z.output<
  typeof transcriptSegmentInputSchema
>;
