import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  slugify,
  type Collection,
  type CollectionSummary,
  type CollectionWrite,
  type Topic,
  type TopicSummary,
  type TopicWrite,
} from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";
import {
  collectionSummaryInclude,
  mapCollection,
  mapCollectionSummary,
  mapTopic,
  mapTopicSummary,
  topicSummaryInclude,
} from "../common/mappers";

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  /* --------------------------------- topics -------------------------------- */

  async listTopics(options?: { onlyWithEpisodes?: boolean }): Promise<Topic[]> {
    const rows = await this.prisma.topic.findMany({
      where: options?.onlyWithEpisodes
        ? { episodes: { some: { episode: { status: "PUBLISHED" } } } }
        : {},
      include: topicSummaryInclude,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(mapTopic);
  }

  async listTopicSummaries(limit?: number): Promise<TopicSummary[]> {
    const rows = await this.prisma.topic.findMany({
      where: { episodes: { some: { episode: { status: "PUBLISHED" } } } },
      include: topicSummaryInclude,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      ...(limit ? { take: limit } : {}),
    });
    return rows.map(mapTopicSummary);
  }

  async findTopicBySlug(slug: string): Promise<Topic> {
    const row = await this.prisma.topic.findUnique({
      where: { slug },
      include: topicSummaryInclude,
    });
    if (!row) throw new NotFoundException(`No topic exists at "${slug}".`);
    return mapTopic(row);
  }

  async findTopicById(id: string): Promise<Topic> {
    const row = await this.prisma.topic.findUnique({
      where: { id },
      include: topicSummaryInclude,
    });
    if (!row) throw new NotFoundException(`Topic "${id}" was not found.`);
    return mapTopic(row);
  }

  async createTopic(input: TopicWrite): Promise<Topic> {
    const slug = await this.uniqueSlug("topic", input.slug ?? input.name);
    const row = await this.prisma.topic.create({
      data: { ...this.topicData(input), slug },
      include: topicSummaryInclude,
    });
    return mapTopic(row);
  }

  async updateTopic(id: string, input: TopicWrite): Promise<Topic> {
    const existing = await this.prisma.topic.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!existing) throw new NotFoundException(`Topic "${id}" was not found.`);
    const slug =
      input.slug && input.slug !== existing.slug
        ? await this.uniqueSlug("topic", input.slug, id)
        : existing.slug;
    const row = await this.prisma.topic.update({
      where: { id },
      data: { ...this.topicData(input), slug },
      include: topicSummaryInclude,
    });
    return mapTopic(row);
  }

  async removeTopic(id: string): Promise<void> {
    await this.prisma.topic.delete({ where: { id } });
  }

  async topicSlugs(): Promise<Array<{ slug: string; updatedAt: Date }>> {
    return this.prisma.topic.findMany({
      select: { slug: true, updatedAt: true },
    });
  }

  private topicData(input: TopicWrite) {
    return {
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      featured: input.featured,
      sortOrder: input.sortOrder,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
    };
  }

  /* ------------------------------ collections ------------------------------ */

  async listCollections(options?: {
    featuredOnly?: boolean;
    limit?: number;
  }): Promise<Collection[]> {
    const rows = await this.prisma.collection.findMany({
      where: options?.featuredOnly ? { featured: true } : {},
      include: collectionSummaryInclude,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
      ...(options?.limit ? { take: options.limit } : {}),
    });
    return rows.map(mapCollection);
  }

  async listCollectionSummaries(limit?: number): Promise<CollectionSummary[]> {
    const rows = await this.prisma.collection.findMany({
      include: collectionSummaryInclude,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
      ...(limit ? { take: limit } : {}),
    });
    return rows.map(mapCollectionSummary);
  }

  async findCollectionBySlug(slug: string): Promise<Collection> {
    const row = await this.prisma.collection.findUnique({
      where: { slug },
      include: collectionSummaryInclude,
    });
    if (!row) throw new NotFoundException(`No collection exists at "${slug}".`);
    return mapCollection(row);
  }

  async findCollectionById(id: string): Promise<Collection> {
    const row = await this.prisma.collection.findUnique({
      where: { id },
      include: collectionSummaryInclude,
    });
    if (!row) throw new NotFoundException(`Collection "${id}" was not found.`);
    return mapCollection(row);
  }

  async createCollection(input: CollectionWrite): Promise<Collection> {
    const slug = await this.uniqueSlug("collection", input.slug ?? input.title);
    const row = await this.prisma.collection.create({
      data: {
        ...this.collectionData(input),
        slug,
        episodes: {
          create: (input.episodeIds ?? []).map((episodeId, index) => ({
            episodeId,
            sortOrder: index,
          })),
        },
      },
      include: collectionSummaryInclude,
    });
    return mapCollection(row);
  }

  async updateCollection(
    id: string,
    input: CollectionWrite
  ): Promise<Collection> {
    const existing = await this.prisma.collection.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!existing)
      throw new NotFoundException(`Collection "${id}" was not found.`);
    const slug =
      input.slug && input.slug !== existing.slug
        ? await this.uniqueSlug("collection", input.slug, id)
        : existing.slug;

    const row = await this.prisma.$transaction(async tx => {
      // Membership is only rewritten when the caller sends it, so metadata-only
      // edits from the taxonomy screen cannot silently empty a collection.
      if (input.episodeIds) {
        await tx.collectionEpisode.deleteMany({ where: { collectionId: id } });
      }
      return tx.collection.update({
        where: { id },
        data: {
          ...this.collectionData(input),
          slug,
          ...(input.episodeIds
            ? {
                episodes: {
                  create: input.episodeIds.map((episodeId, index) => ({
                    episodeId,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: collectionSummaryInclude,
      });
    });
    return mapCollection(row);
  }

  async removeCollection(id: string): Promise<void> {
    await this.prisma.collection.delete({ where: { id } });
  }

  async collectionSlugs(): Promise<Array<{ slug: string; updatedAt: Date }>> {
    return this.prisma.collection.findMany({
      select: { slug: true, updatedAt: true },
    });
  }

  /** Ordered episode IDs, so a collection page can preserve the curator's sequence. */
  async collectionEpisodeIds(collectionId: string): Promise<string[]> {
    const rows = await this.prisma.collectionEpisode.findMany({
      where: { collectionId },
      orderBy: { sortOrder: "asc" },
      select: { episodeId: true },
    });
    return rows.map(row => row.episodeId);
  }

  private collectionData(input: CollectionWrite) {
    return {
      title: input.title,
      description: input.description ?? null,
      curatorNote: input.curatorNote ?? null,
      coverUrl: input.coverUrl ?? null,
      featured: input.featured,
      sortOrder: input.sortOrder,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
    };
  }

  /* -------------------------------- helpers -------------------------------- */

  private async uniqueSlug(
    kind: "topic" | "collection",
    desired: string,
    ignoreId?: string
  ): Promise<string> {
    const base = slugify(desired) || kind;
    let candidate = base;
    let suffix = 2;
    for (;;) {
      const where = {
        slug: candidate,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      };
      const clash =
        kind === "topic"
          ? await this.prisma.topic.findFirst({
              where: where as Prisma.TopicWhereInput,
              select: { id: true },
            })
          : await this.prisma.collection.findFirst({
              where: where as Prisma.CollectionWhereInput,
              select: { id: true },
            });
      if (!clash) return candidate;
      candidate = `${base}-${suffix++}`;
    }
  }
}
