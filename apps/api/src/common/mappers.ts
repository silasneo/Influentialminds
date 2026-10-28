import { Prisma } from "@prisma/client";
import {
  formatTimecode,
  youTubeEmbedUrl,
  youTubeThumbnailUrl,
  youTubeWatchUrl,
  type Collection,
  type CollectionSummary,
  type Episode,
  type EpisodeSummary,
  type EpisodeTranscript,
  type Guest,
  type GuestSocialLinks,
  type GuestSummary,
  type Lead,
  type LeadMagnet,
  type LipsyncTrack,
  type SiteSettings,
  type Topic,
  type TopicSummary,
  type TranscriptSegment,
} from "@influential-minds/contracts";

/* -------------------------------------------------------------------------- */
/* Prisma selection shapes                                                     */
/* -------------------------------------------------------------------------- */

export const guestSummarySelect = Prisma.validator<Prisma.GuestSelect>()({
  id: true,
  slug: true,
  name: true,
  role: true,
  company: true,
  headshotUrl: true,
});

export const topicSummaryInclude = Prisma.validator<Prisma.TopicInclude>()({
  _count: { select: { episodes: true } },
});

export const collectionSummaryInclude =
  Prisma.validator<Prisma.CollectionInclude>()({
    _count: { select: { episodes: true } },
  });

export const guestWithCountInclude = Prisma.validator<Prisma.GuestInclude>()({
  _count: { select: { episodes: true } },
});

export const episodeSummaryInclude = Prisma.validator<Prisma.EpisodeInclude>()({
  guests: {
    include: { guest: { select: guestSummarySelect } },
    orderBy: { sortOrder: "asc" },
  },
  topics: { include: { topic: { include: topicSummaryInclude } } },
});

export const episodeDetailInclude = Prisma.validator<Prisma.EpisodeInclude>()({
  guests: {
    include: { guest: { select: guestSummarySelect } },
    orderBy: { sortOrder: "asc" },
  },
  topics: { include: { topic: { include: topicSummaryInclude } } },
  collections: {
    include: { collection: { include: collectionSummaryInclude } },
    orderBy: { sortOrder: "asc" },
  },
  takeaways: { orderBy: { sortOrder: "asc" } },
  quotes: { orderBy: { sortOrder: "asc" } },
  transcripts: { include: { segments: { orderBy: { startSeconds: "asc" } } } },
});

export type EpisodeSummaryRow = Prisma.EpisodeGetPayload<{
  include: typeof episodeSummaryInclude;
}>;
export type EpisodeDetailRow = Prisma.EpisodeGetPayload<{
  include: typeof episodeDetailInclude;
}>;
export type GuestSummaryRow = Prisma.GuestGetPayload<{
  select: typeof guestSummarySelect;
}>;
export type GuestRow = Prisma.GuestGetPayload<{
  include: typeof guestWithCountInclude;
}>;
export type TopicRow = Prisma.TopicGetPayload<{
  include: typeof topicSummaryInclude;
}>;
export type CollectionRow = Prisma.CollectionGetPayload<{
  include: typeof collectionSummaryInclude;
}>;

/* -------------------------------------------------------------------------- */
/* JSON column helpers                                                         */
/* -------------------------------------------------------------------------- */

function asStringArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function asSocialLinks(value: Prisma.JsonValue | null): GuestSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value).filter(
    ([, link]) => typeof link === "string" && link.length > 0
  );
  return Object.fromEntries(entries) as GuestSocialLinks;
}

function asLipsyncTracks(value: Prisma.JsonValue | null): LipsyncTrack[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const record = entry as Record<string, unknown>;
    if (
      typeof record.languageCode !== "string" ||
      typeof record.languageName !== "string"
    )
      return [];
    const kind = record.kind === "LIPSYNC" ? "LIPSYNC" : "DUBBED_AUDIO";
    return [
      {
        languageCode: record.languageCode,
        languageName: record.languageName,
        kind,
      },
    ];
  });
}

const iso = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

/** First paragraph (or a trimmed slice) used for cards and meta descriptions. */
export function buildExcerpt(
  source: string | null,
  limit = 200
): string | null {
  if (!source) return null;
  const flattened = source.replace(/\s+/g, " ").trim();
  if (!flattened) return null;
  if (flattened.length <= limit) return flattened;
  const cut = flattened.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/* -------------------------------------------------------------------------- */
/* Mappers                                                                     */
/* -------------------------------------------------------------------------- */

export function mapGuestSummary(row: GuestSummaryRow): GuestSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role,
    company: row.company,
    headshotUrl: row.headshotUrl,
  };
}

export function mapGuest(row: GuestRow): Guest {
  return {
    ...mapGuestSummary(row),
    bio: row.bio,
    expertise: asStringArray(row.expertise),
    websiteUrl: row.websiteUrl,
    socialLinks: asSocialLinks(row.socialLinks),
    status: row.status,
    episodeCount: row._count.episodes,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageUrl: row.ogImageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapTopicSummary(row: TopicRow): TopicSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    episodeCount: row._count.episodes,
  };
}

export function mapTopic(row: TopicRow): Topic {
  return {
    ...mapTopicSummary(row),
    description: row.description,
    imageUrl: row.imageUrl,
    featured: row.featured,
    sortOrder: row.sortOrder,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageUrl: row.ogImageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapCollectionSummary(row: CollectionRow): CollectionSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverUrl: row.coverUrl,
    featured: row.featured,
    episodeCount: row._count.episodes,
  };
}

export function mapCollection(row: CollectionRow): Collection {
  return {
    ...mapCollectionSummary(row),
    curatorNote: row.curatorNote,
    sortOrder: row.sortOrder,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageUrl: row.ogImageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapEpisodeSummary(row: EpisodeSummaryRow): EpisodeSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    episodeNumber: row.episodeNumber,
    season: row.season,
    publishedAt: iso(row.publishedAt),
    durationSeconds: row.durationSeconds,
    youtubeVideoId: row.youtubeVideoId,
    thumbnailUrl: row.thumbnailUrl || youTubeThumbnailUrl(row.youtubeVideoId),
    watchUrl: youTubeWatchUrl(row.youtubeVideoId, {
      playlistId: row.youtubePlaylistId,
    }),
    excerpt: buildExcerpt(row.description ?? row.summary),
    guests: row.guests.map(link => mapGuestSummary(link.guest)),
    topics: row.topics.map(link => mapTopicSummary(link.topic)),
  };
}

export function mapTranscriptSegment(
  row: {
    id: string;
    startSeconds: number;
    endSeconds: number | null;
    text: string;
    speaker: string | null;
  },
  videoId: string,
  playlistId: string | null
): TranscriptSegment {
  return {
    id: row.id,
    startSeconds: row.startSeconds,
    endSeconds: row.endSeconds,
    text: row.text,
    speaker: row.speaker,
    momentUrl: youTubeWatchUrl(videoId, {
      playlistId,
      startSeconds: row.startSeconds,
    }),
  };
}

export function mapEpisode(row: EpisodeDetailRow): Episode {
  const transcriptRow =
    row.transcripts.find(entry => entry.status === "READY") ??
    row.transcripts[0] ??
    null;

  const transcript: EpisodeTranscript | null = transcriptRow
    ? {
        id: transcriptRow.id,
        language: transcriptRow.language,
        status: transcriptRow.status,
        indexedAt: iso(transcriptRow.indexedAt),
        segmentCount: transcriptRow.segments.length,
        segments: transcriptRow.segments.map(segment =>
          mapTranscriptSegment(
            segment,
            row.youtubeVideoId,
            row.youtubePlaylistId
          )
        ),
      }
    : null;

  return {
    ...mapEpisodeSummary(row),
    description: row.description,
    summary: row.summary,
    youtubeUrl: row.youtubeUrl,
    youtubePlaylistId: row.youtubePlaylistId,
    embedUrl: youTubeEmbedUrl(row.youtubeVideoId),
    spotifyUrl: row.spotifyUrl,
    applePodcastsUrl: row.applePodcastsUrl,
    lipsyncTracks: asLipsyncTracks(row.lipsyncTracks),
    status: row.status,
    collections: row.collections.map(link =>
      mapCollectionSummary(link.collection)
    ),
    takeaways: row.takeaways.map(takeaway => ({
      id: takeaway.id,
      text: takeaway.text,
      sortOrder: takeaway.sortOrder,
    })),
    quotes: row.quotes.map(quote => ({
      id: quote.id,
      text: quote.text,
      attribution: quote.attribution,
      timestampSeconds: quote.timestampSeconds,
      momentUrl:
        typeof quote.timestampSeconds === "number"
          ? youTubeWatchUrl(row.youtubeVideoId, {
              playlistId: row.youtubePlaylistId,
              startSeconds: quote.timestampSeconds,
            })
          : null,
      sortOrder: quote.sortOrder,
    })),
    transcript,
    isAskable:
      transcriptRow?.status === "READY" && transcriptRow.segments.length > 0,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageUrl: row.ogImageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapLeadMagnet(row: {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  active: boolean;
  updatedAt: Date;
}): LeadMagnet {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    coverUrl: row.coverUrl,
    fileUrl: row.fileUrl,
    fileName: row.fileName,
    active: row.active,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapLead(row: {
  id: string;
  name: string;
  email: string;
  consent: boolean;
  sourcePage: string | null;
  leadMagnetId: string | null;
  createdAt: Date;
  leadMagnet?: { title: string } | null;
}): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    consent: row.consent,
    sourcePage: row.sourcePage,
    leadMagnetId: row.leadMagnetId,
    leadMagnetTitle: row.leadMagnet?.title ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapSiteSettings(
  row: Prisma.SiteSettingGetPayload<object>
): SiteSettings {
  return {
    siteTitle: row.siteTitle,
    tagline: row.tagline,
    heroEyebrow: row.heroEyebrow,
    heroDeck: row.heroDeck,
    heroBody: row.heroBody,
    heroImageUrl: row.heroImageUrl,
    hostName: row.hostName,
    hostRole: row.hostRole,
    hostPortraitUrl: row.hostPortraitUrl,
    hostBio: row.hostBio,
    hostQuote: row.hostQuote,
    hostLongBio: row.hostLongBio,
    youtubePlaylistUrl: row.youtubePlaylistUrl,
    newsletterHeading: row.newsletterHeading,
    newsletterBody: row.newsletterBody,
    metaDescription: row.metaDescription,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function siteSettingsAskSuggestions(
  row: Prisma.SiteSettingGetPayload<object>
): string[] {
  return asStringArray(row.askSuggestions);
}

export { asStringArray, asSocialLinks, asLipsyncTracks, formatTimecode };
