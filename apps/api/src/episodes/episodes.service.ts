import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  parseYouTubePlaylistId,
  parseYouTubeVideoId,
  slugify,
  youTubeThumbnailUrl,
  youTubeWatchUrl,
  type Episode,
  type EpisodeDetailResponse,
  type EpisodeListQuery,
  type EpisodeSummary,
  type EpisodeWrite,
  type AdminEpisodeSummary,
  type EditorialStatus,
  type Paginated,
} from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";
import {
  episodeDetailInclude,
  episodeSummaryInclude,
  mapEpisode,
  mapEpisodeSummary,
} from "../common/mappers";
import { paginate, skipTake } from "../common/pagination";

@Injectable()
export class EpisodesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Only published episodes with a publication date are exposed publicly. */
  private publicWhere(): Prisma.EpisodeWhereInput {
    return { status: "PUBLISHED" };
  }

  private orderBy(
    sort: EpisodeListQuery["sort"]
  ): Prisma.EpisodeOrderByWithRelationInput[] {
    switch (sort) {
      case "oldest":
        return [{ publishedAt: "asc" }, { createdAt: "asc" }];
      case "episodeNumber":
        return [{ episodeNumber: "asc" }, { publishedAt: "asc" }];
      case "newest":
      default:
        return [{ publishedAt: "desc" }, { createdAt: "desc" }];
    }
  }

  async listPublic(
    query: EpisodeListQuery
  ): Promise<Paginated<EpisodeSummary>> {
    const where: Prisma.EpisodeWhereInput = { ...this.publicWhere() };
    const and: Prisma.EpisodeWhereInput[] = [];

    if (query.search) {
      const term = query.search;
      and.push({
        OR: [
          { title: { contains: term } },
          { description: { contains: term } },
          { summary: { contains: term } },
          { guests: { some: { guest: { name: { contains: term } } } } },
          { topics: { some: { topic: { name: { contains: term } } } } },
        ],
      });
    }
    if (query.guest)
      and.push({ guests: { some: { guest: { slug: query.guest } } } });
    if (query.topic)
      and.push({ topics: { some: { topic: { slug: query.topic } } } });
    if (query.collection)
      and.push({
        collections: { some: { collection: { slug: query.collection } } },
      });
    if (and.length > 0) where.AND = and;

    const { skip, take } = skipTake(query.page, query.perPage);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.episode.findMany({
        where,
        include: episodeSummaryInclude,
        orderBy: this.orderBy(query.sort),
        skip,
        take,
      }),
      this.prisma.episode.count({ where }),
    ]);

    return paginate(
      rows.map(mapEpisodeSummary),
      total,
      query.page,
      query.perPage
    );
  }

  async findPublicBySlug(slug: string): Promise<EpisodeDetailResponse> {
    const row = await this.prisma.episode.findFirst({
      where: { slug, ...this.publicWhere() },
      include: episodeDetailInclude,
    });
    if (!row)
      throw new NotFoundException(`No published episode exists at "${slug}".`);

    const episode = mapEpisode(row);
    return { episode, relatedEpisodes: await this.related(episode) };
  }

  /** Related by shared topic first, then shared guest, then recency. */
  private async related(
    episode: Episode,
    limit = 3
  ): Promise<EpisodeSummary[]> {
    const topicIds = episode.topics.map(topic => topic.id);
    const guestIds = episode.guests.map(guest => guest.id);

    const candidates = await this.prisma.episode.findMany({
      where: {
        ...this.publicWhere(),
        id: { not: episode.id },
        OR: [
          ...(topicIds.length > 0
            ? [{ topics: { some: { topicId: { in: topicIds } } } }]
            : []),
          ...(guestIds.length > 0
            ? [{ guests: { some: { guestId: { in: guestIds } } } }]
            : []),
        ],
      },
      include: episodeSummaryInclude,
      orderBy: [{ publishedAt: "desc" }],
      take: limit,
    });

    if (candidates.length >= limit) return candidates.map(mapEpisodeSummary);

    const filler = await this.prisma.episode.findMany({
      where: {
        ...this.publicWhere(),
        id: { notIn: [episode.id, ...candidates.map(row => row.id)] },
      },
      include: episodeSummaryInclude,
      orderBy: [{ publishedAt: "desc" }],
      take: limit - candidates.length,
    });

    return [...candidates, ...filler].map(mapEpisodeSummary);
  }

  async listLatest(limit: number): Promise<EpisodeSummary[]> {
    const rows = await this.prisma.episode.findMany({
      where: this.publicWhere(),
      include: episodeSummaryInclude,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
    return rows.map(mapEpisodeSummary);
  }

  async publishedSlugs(): Promise<Array<{ slug: string; updatedAt: Date }>> {
    return this.prisma.episode.findMany({
      where: this.publicWhere(),
      select: { slug: true, updatedAt: true },
    });
  }

  /* ------------------------------ admin surface ----------------------------- */

  async listForAdmin(params: {
    search?: string;
    status?: Prisma.EpisodeWhereInput["status"];
    page: number;
    perPage: number;
  }): Promise<Paginated<AdminEpisodeSummary>> {
    const where: Prisma.EpisodeWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search } },
        { slug: { contains: params.search } },
      ];
    }

    const { skip, take } = skipTake(params.page, params.perPage);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.episode.findMany({
        where,
        include: episodeSummaryInclude,
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take,
      }),
      this.prisma.episode.count({ where }),
    ]);

    const items = rows.map(row => ({
      ...mapEpisodeSummary(row),
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    }));
    return paginate(items, total, params.page, params.perPage);
  }

  async findByIdForAdmin(id: string): Promise<Episode> {
    const row = await this.prisma.episode.findUnique({
      where: { id },
      include: episodeDetailInclude,
    });
    if (!row) throw new NotFoundException(`Episode "${id}" was not found.`);
    return mapEpisode(row);
  }

  private async uniqueSlug(
    desired: string,
    ignoreId?: string
  ): Promise<string> {
    const base = slugify(desired) || "episode";
    let candidate = base;
    let suffix = 2;
    for (;;) {
      const clash = await this.prisma.episode.findFirst({
        where: {
          slug: candidate,
          ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
        },
        select: { id: true },
      });
      if (!clash) return candidate;
      candidate = `${base}-${suffix++}`;
    }
  }

  /** Derives video ID, playlist ID and thumbnail from the supplied YouTube URL. */
  private youtubeFields(input: EpisodeWrite): {
    youtubeVideoId: string;
    youtubeUrl: string;
    youtubePlaylistId: string | null;
    thumbnailUrl: string;
  } {
    const videoId = parseYouTubeVideoId(input.youtubeUrl);
    if (!videoId)
      throw new NotFoundException(
        "The supplied YouTube URL does not contain a video ID."
      );
    const playlistId =
      input.youtubePlaylistId ?? parseYouTubePlaylistId(input.youtubeUrl);
    return {
      youtubeVideoId: videoId,
      youtubeUrl: youTubeWatchUrl(videoId, { playlistId }),
      youtubePlaylistId: playlistId ?? null,
      thumbnailUrl: input.thumbnailUrl || youTubeThumbnailUrl(videoId),
    };
  }

  private scalarData(input: EpisodeWrite) {
    return {
      title: input.title,
      episodeNumber: input.episodeNumber ?? null,
      season: input.season ?? null,
      description: input.description ?? null,
      summary: input.summary ?? null,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      durationSeconds: input.durationSeconds ?? null,
      status: input.status,
      spotifyUrl: input.spotifyUrl || null,
      applePodcastsUrl: input.applePodcastsUrl || null,
      lipsyncTracks: input.lipsyncTracks as unknown as Prisma.InputJsonValue,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
      ...this.youtubeFields(input),
    };
  }

  async create(input: EpisodeWrite): Promise<Episode> {
    const slug = await this.uniqueSlug(input.slug ?? input.title);

    const created = await this.prisma.episode.create({
      data: {
        ...this.scalarData(input),
        slug,
        guests: {
          create: input.guestIds.map((guestId, index) => ({
            guestId,
            sortOrder: index,
          })),
        },
        topics: { create: input.topicIds.map(topicId => ({ topicId })) },
        collections: {
          create: input.collectionIds.map((collectionId, index) => ({
            collectionId,
            sortOrder: index,
          })),
        },
        takeaways: {
          create: input.takeaways.map((text, index) => ({
            text,
            sortOrder: index,
          })),
        },
        quotes: {
          create: input.quotes.map((quote, index) => ({
            text: quote.text,
            attribution: quote.attribution ?? null,
            timestampSeconds: quote.timestampSeconds ?? null,
            sortOrder: index,
          })),
        },
      },
      include: episodeDetailInclude,
    });

    return mapEpisode(created);
  }

  async update(id: string, input: EpisodeWrite): Promise<Episode> {
    const existing = await this.prisma.episode.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!existing)
      throw new NotFoundException(`Episode "${id}" was not found.`);

    const slug =
      input.slug && input.slug !== existing.slug
        ? await this.uniqueSlug(input.slug, id)
        : existing.slug;

    const updated = await this.prisma.$transaction(async tx => {
      await tx.episodeGuest.deleteMany({ where: { episodeId: id } });
      await tx.episodeTopic.deleteMany({ where: { episodeId: id } });
      await tx.collectionEpisode.deleteMany({ where: { episodeId: id } });
      await tx.takeaway.deleteMany({ where: { episodeId: id } });
      await tx.quote.deleteMany({ where: { episodeId: id } });

      return tx.episode.update({
        where: { id },
        data: {
          ...this.scalarData(input),
          slug,
          guests: {
            create: input.guestIds.map((guestId, index) => ({
              guestId,
              sortOrder: index,
            })),
          },
          topics: { create: input.topicIds.map(topicId => ({ topicId })) },
          collections: {
            create: input.collectionIds.map((collectionId, index) => ({
              collectionId,
              sortOrder: index,
            })),
          },
          takeaways: {
            create: input.takeaways.map((text, index) => ({
              text,
              sortOrder: index,
            })),
          },
          quotes: {
            create: input.quotes.map((quote, index) => ({
              text: quote.text,
              attribution: quote.attribution ?? null,
              timestampSeconds: quote.timestampSeconds ?? null,
              sortOrder: index,
            })),
          },
        },
        include: episodeDetailInclude,
      });
    });

    return mapEpisode(updated);
  }

  async changeStatus(id: string, status: EditorialStatus): Promise<Episode> {
    const resolved = status;
    const existing = await this.prisma.episode.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    if (!existing)
      throw new NotFoundException(`Episode "${id}" was not found.`);

    const row = await this.prisma.episode.update({
      where: { id },
      // Publishing stamps a date only when the editor has not already set one.
      data: {
        status: resolved,
        publishedAt:
          resolved === "PUBLISHED" && !existing.publishedAt
            ? new Date()
            : undefined,
      },
      include: episodeDetailInclude,
    });
    return mapEpisode(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.episode.delete({ where: { id } });
  }
}
