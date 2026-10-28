import { z } from "zod";
import type { EpisodeSummary } from "./episode.js";
import type { GuestSummary } from "./guest.js";
import type { LeadMagnet } from "./lead.js";
import type { CollectionSummary, TopicSummary } from "./taxonomy.js";

/**
 * Editable brand/host copy. The brief requires the tagline and host text to be
 * CMS-managed rather than locked into the markup.
 */
export interface SiteSettings {
  siteTitle: string;
  tagline: string;
  heroEyebrow: string;
  heroDeck: string;
  heroBody: string;
  heroImageUrl: string;
  hostName: string;
  hostRole: string;
  hostPortraitUrl: string;
  hostBio: string;
  hostQuote: string | null;
  hostLongBio: string | null;
  youtubePlaylistUrl: string | null;
  newsletterHeading: string;
  newsletterBody: string;
  metaDescription: string;
  updatedAt: string;
}

/** Admin-facing settings payload; the console also edits the Ask prompt suggestions. */
export interface EditableSiteSettings extends SiteSettings {
  askSuggestions: string[];
}

export interface HomepagePayload {
  settings: SiteSettings;
  featuredEpisode: EpisodeSummary | null;
  latestEpisodes: EpisodeSummary[];
  topics: TopicSummary[];
  guests: GuestSummary[];
  collections: CollectionSummary[];
  leadMagnet: LeadMagnet | null;
  askSuggestions: string[];
  stats: {
    episodeCount: number;
    guestCount: number;
    topicCount: number;
    askableEpisodeCount: number;
  };
}

export const siteSettingsWriteSchema = z.object({
  siteTitle: z.string().min(1).max(160),
  tagline: z.string().min(1).max(240),
  heroEyebrow: z.string().min(1).max(240),
  heroDeck: z.string().min(1).max(600),
  heroBody: z.string().min(1).max(2000),
  heroImageUrl: z.string().min(1).max(1024),
  hostName: z.string().min(1).max(160),
  hostRole: z.string().min(1).max(200),
  hostPortraitUrl: z.string().min(1).max(1024),
  hostBio: z.string().min(1).max(8000),
  hostQuote: z.string().max(1200).nullish(),
  hostLongBio: z.string().max(20000).nullish(),
  youtubePlaylistUrl: z.string().max(1024).nullish(),
  newsletterHeading: z.string().min(1).max(240),
  newsletterBody: z.string().min(1).max(2000),
  metaDescription: z.string().min(1).max(400),
  askSuggestions: z.array(z.string().min(1).max(200)).max(12).default([]),
});
export type SiteSettingsWriteInput = z.input<typeof siteSettingsWriteSchema>;

export type SiteSettingsWrite = z.output<typeof siteSettingsWriteSchema>;
