import type { Episode, LipsyncTrack } from "@influential-minds/contracts";
import { toLines } from "./ui";

/** Mirrors a `quotes` row while it is being edited, so inputs stay free-text. */
export interface QuoteDraft {
  text: string;
  attribution: string;
  timestamp: string;
}

export interface FormState {
  title: string;
  slug: string;
  episodeNumber: string;
  season: string;
  youtubeUrl: string;
  youtubePlaylistId: string;
  thumbnailUrl: string;
  durationSeconds: string;
  publishedAt: string;
  status: string;
  summary: string;
  description: string;
  spotifyUrl: string;
  applePodcastsUrl: string;
  guestIds: string[];
  topicIds: string[];
  collectionIds: string[];
  takeaways: string;
  quotes: QuoteDraft[];
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  /** No editor UI; carried so saving cannot discard it. */
  lipsyncTracks: LipsyncTrack[];
}

export const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  episodeNumber: "",
  season: "",
  youtubeUrl: "",
  youtubePlaylistId: "",
  thumbnailUrl: "",
  durationSeconds: "",
  publishedAt: "",
  status: "DRAFT",
  summary: "",
  description: "",
  spotifyUrl: "",
  applePodcastsUrl: "",
  guestIds: [],
  topicIds: [],
  collectionIds: [],
  takeaways: "",
  quotes: [],
  seoTitle: "",
  seoDescription: "",
  ogImageUrl: "",
  lipsyncTracks: [],
};

/** Accepts `mm:ss`, `hh:mm:ss` or a plain second count. */
export function parseTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(":")) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) && seconds >= 0
      ? Math.round(seconds)
      : null;
  }
  const parts = trimmed.split(":").map(part => Number(part));
  if (parts.some(part => !Number.isFinite(part) || part < 0)) return null;
  return Math.round(parts.reduce((total, part) => total * 60 + part, 0));
}

export function formatTimestamp(seconds: number | null): string {
  if (seconds === null) return "";
  const pad = (value: number) => `${value}`.padStart(2, "0");
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`;
}

export function toForm(episode: Episode): FormState {
  return {
    title: episode.title,
    slug: episode.slug,
    episodeNumber:
      episode.episodeNumber === null ? "" : `${episode.episodeNumber}`,
    season: episode.season === null ? "" : `${episode.season}`,
    youtubeUrl: episode.youtubeUrl,
    youtubePlaylistId: episode.youtubePlaylistId ?? "",
    thumbnailUrl: episode.thumbnailUrl,
    durationSeconds:
      episode.durationSeconds === null ? "" : `${episode.durationSeconds}`,
    publishedAt: episode.publishedAt ? episode.publishedAt.slice(0, 10) : "",
    status: episode.status,
    summary: episode.summary ?? "",
    description: episode.description ?? "",
    spotifyUrl: episode.spotifyUrl ?? "",
    applePodcastsUrl: episode.applePodcastsUrl ?? "",
    guestIds: episode.guests.map(guest => guest.id),
    topicIds: episode.topics.map(topic => topic.id),
    collectionIds: episode.collections.map(collection => collection.id),
    takeaways: episode.takeaways.map(takeaway => takeaway.text).join("\n"),
    quotes: episode.quotes.map(quote => ({
      text: quote.text,
      attribution: quote.attribution ?? "",
      timestamp: formatTimestamp(quote.timestampSeconds),
    })),
    seoTitle: episode.seoTitle ?? "",
    seoDescription: episode.seoDescription ?? "",
    ogImageUrl: episode.ogImageUrl ?? "",
    lipsyncTracks: episode.lipsyncTracks,
  };
}

/**
 * `PUT /admin/episodes/:id` replaces the episode wholesale: related rows are
 * deleted and recreated from this payload, and absent scalars are nulled. Any
 * field missing here is therefore destroyed on save, not left alone — which is
 * why fields with no editor UI are still round-tripped through `FormState`.
 */
export function toPayload(form: FormState) {
  return {
    title: form.title,
    slug: form.slug || undefined,
    episodeNumber: form.episodeNumber ? Number(form.episodeNumber) : null,
    season: form.season ? Number(form.season) : null,
    youtubeUrl: form.youtubeUrl,
    youtubePlaylistId: form.youtubePlaylistId || null,
    thumbnailUrl: form.thumbnailUrl || null,
    durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : null,
    publishedAt: form.publishedAt
      ? new Date(`${form.publishedAt}T12:00:00.000Z`).toISOString()
      : null,
    status: form.status,
    summary: form.summary || null,
    description: form.description || null,
    spotifyUrl: form.spotifyUrl || null,
    applePodcastsUrl: form.applePodcastsUrl || null,
    guestIds: form.guestIds,
    topicIds: form.topicIds,
    collectionIds: form.collectionIds,
    takeaways: toLines(form.takeaways),
    quotes: form.quotes
      .filter(quote => quote.text.trim())
      .map(quote => ({
        text: quote.text.trim(),
        attribution: quote.attribution.trim() || null,
        timestampSeconds: parseTimestamp(quote.timestamp),
      })),
    lipsyncTracks: form.lipsyncTracks,
    seoTitle: form.seoTitle || null,
    seoDescription: form.seoDescription || null,
    ogImageUrl: form.ogImageUrl || null,
  };
}
