import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  EditableSiteSettings,
  HomepagePayload,
  SiteSettings,
  SiteSettingsWrite,
} from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";
import { mapSiteSettings } from "../common/mappers";
import { EpisodesService } from "../episodes/episodes.service";
import { GuestsService } from "../guests/guests.service";
import { TaxonomyService } from "../taxonomy/taxonomy.service";
import { LeadsService } from "../leads/leads.service";

const SETTINGS_ID = "site";

/** Shipped defaults so a fresh database still renders a complete, non-empty homepage. */
const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  siteTitle: "Influential Minds",
  tagline: "Conversations with the people shaping how we think.",
  heroEyebrow: "A conversation series",
  heroDeck: "Influential Minds",
  heroBody:
    "Long-form conversations with researchers, founders and writers about the ideas changing how we live and work.",
  heroImageUrl: "/assets/hero.png",
  hostName: "Lawrence",
  hostRole: "Host",
  hostPortraitUrl: "/assets/HostDrJones.png",
  hostBio: "Pending editorial review.",
  hostQuote: null,
  hostLongBio: null,
  youtubePlaylistUrl: null,
  newsletterHeading: "Join the room",
  newsletterBody:
    "Get each new conversation, plus the notes that did not make the edit.",
  metaDescription:
    "Long-form conversations with the researchers, founders and writers shaping how we think.",
  askSuggestions: [] as Prisma.JsonValue,
  updatedAt: new Date(0),
};

@Injectable()
export class SiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly episodes: EpisodesService,
    private readonly guests: GuestsService,
    private readonly taxonomy: TaxonomyService,
    private readonly leads: LeadsService
  ) {}

  async getSettings(): Promise<SiteSettings> {
    const row = await this.prisma.siteSetting.findUnique({
      where: { id: SETTINGS_ID },
    });
    return mapSiteSettings(row ?? DEFAULT_SETTINGS);
  }

  async getAskSuggestions(): Promise<string[]> {
    const row = await this.prisma.siteSetting.findUnique({
      where: { id: SETTINGS_ID },
      select: { askSuggestions: true },
    });
    const raw = row?.askSuggestions;
    return Array.isArray(raw)
      ? raw.filter((value): value is string => typeof value === "string")
      : [];
  }

  async updateSettings(
    input: SiteSettingsWrite
  ): Promise<EditableSiteSettings> {
    const { askSuggestions, ...rest } = input;
    const data = {
      ...rest,
      hostQuote: rest.hostQuote ?? null,
      hostLongBio: rest.hostLongBio ?? null,
      youtubePlaylistUrl: rest.youtubePlaylistUrl ?? null,
      askSuggestions: askSuggestions as unknown as object,
    };
    const row = await this.prisma.siteSetting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
    return { ...mapSiteSettings(row), askSuggestions };
  }

  /** The console edits the Ask prompts alongside the brand copy, so they travel together. */
  async getEditableSettings(): Promise<EditableSiteSettings> {
    const [settings, askSuggestions] = await Promise.all([
      this.getSettings(),
      this.getAskSuggestions(),
    ]);
    return { ...settings, askSuggestions };
  }

  /** One request powers the entire homepage, so the shell never waterfalls. */
  async getHomepage(): Promise<HomepagePayload> {
    const [
      settings,
      askSuggestions,
      latest,
      topics,
      guests,
      collections,
      leadMagnet,
      episodeCount,
      guestCount,
      topicCount,
      askableEpisodeCount,
    ] = await Promise.all([
      this.getSettings(),
      this.getAskSuggestions(),
      this.episodes.listLatest(7),
      this.taxonomy.listTopicSummaries(8),
      this.guests.listFeatured(6),
      this.taxonomy.listCollectionSummaries(4),
      this.leads.getActiveLeadMagnet(),
      this.prisma.episode.count({ where: { status: "PUBLISHED" } }),
      this.prisma.guest.count({
        where: {
          status: "PUBLISHED",
          episodes: { some: { episode: { status: "PUBLISHED" } } },
        },
      }),
      this.prisma.topic.count({
        where: { episodes: { some: { episode: { status: "PUBLISHED" } } } },
      }),
      this.prisma.episode.count({
        where: {
          status: "PUBLISHED",
          transcripts: { some: { status: "READY" } },
        },
      }),
    ]);

    const [featuredEpisode, ...rest] = latest;

    return {
      settings,
      featuredEpisode: featuredEpisode ?? null,
      latestEpisodes: rest.slice(0, 6),
      topics,
      guests: guests.map(guest => ({
        id: guest.id,
        slug: guest.slug,
        name: guest.name,
        role: guest.role,
        company: guest.company,
        headshotUrl: guest.headshotUrl,
        episodeCount: guest.episodeCount,
      })),
      collections,
      leadMagnet,
      askSuggestions,
      stats: { episodeCount, guestCount, topicCount, askableEpisodeCount },
    };
  }
}
