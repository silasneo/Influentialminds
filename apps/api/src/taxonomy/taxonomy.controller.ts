import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  episodeListQuerySchema,
  type Collection,
  type EpisodeSummary,
  type Paginated,
  type Topic,
} from "@influential-minds/contracts";
import { TaxonomyService } from "./taxonomy.service";
import { EpisodesService } from "../episodes/episodes.service";

@Controller("topics")
export class TopicsController {
  constructor(
    private readonly taxonomy: TaxonomyService,
    private readonly episodes: EpisodesService
  ) {}

  @Get()
  list(): Promise<Topic[]> {
    return this.taxonomy.listTopics({ onlyWithEpisodes: true });
  }

  @Get(":slug")
  detail(@Param("slug") slug: string): Promise<Topic> {
    return this.taxonomy.findTopicBySlug(slug);
  }

  @Get(":slug/episodes")
  episodesForTopic(
    @Param("slug") slug: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string
  ): Promise<Paginated<EpisodeSummary>> {
    const query = episodeListQuerySchema.parse({
      topic: slug,
      page: page ?? 1,
      perPage: perPage ?? 12,
    });
    return this.episodes.listPublic(query);
  }
}

@Controller("collections")
export class CollectionsController {
  constructor(
    private readonly taxonomy: TaxonomyService,
    private readonly episodes: EpisodesService
  ) {}

  @Get()
  list(): Promise<Collection[]> {
    return this.taxonomy.listCollections();
  }

  @Get(":slug")
  detail(@Param("slug") slug: string): Promise<Collection> {
    return this.taxonomy.findCollectionBySlug(slug);
  }

  /** Returned in the curator's order rather than by date. */
  @Get(":slug/episodes")
  async episodesForCollection(
    @Param("slug") slug: string
  ): Promise<EpisodeSummary[]> {
    const collection = await this.taxonomy.findCollectionBySlug(slug);
    const orderedIds = await this.taxonomy.collectionEpisodeIds(collection.id);
    const page = await this.episodes.listPublic(
      episodeListQuerySchema.parse({
        collection: slug,
        page: 1,
        perPage: Math.max(orderedIds.length, 1),
      })
    );
    const byId = new Map(page.items.map(episode => [episode.id, episode]));
    return orderedIds.flatMap(id => {
      const episode = byId.get(id);
      return episode ? [episode] : [];
    });
  }
}
