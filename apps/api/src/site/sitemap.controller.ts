import { Controller, Get } from "@nestjs/common";
import { EpisodesService } from "../episodes/episodes.service";
import { GuestsService } from "../guests/guests.service";
import { TaxonomyService } from "../taxonomy/taxonomy.service";

export interface SitemapEntry {
  path: string;
  updatedAt: string;
}

/** Feeds the Next.js `sitemap.ts` so route discovery stays database-driven. */
@Controller("sitemap")
export class SitemapController {
  constructor(
    private readonly episodes: EpisodesService,
    private readonly guests: GuestsService,
    private readonly taxonomy: TaxonomyService
  ) {}

  @Get()
  async entries(): Promise<SitemapEntry[]> {
    const [episodes, guests, topics, collections] = await Promise.all([
      this.episodes.publishedSlugs(),
      this.guests.publishedSlugs(),
      this.taxonomy.topicSlugs(),
      this.taxonomy.collectionSlugs(),
    ]);

    return [
      ...episodes.map(row => ({
        path: `/episodes/${row.slug}`,
        updatedAt: row.updatedAt.toISOString(),
      })),
      ...guests.map(row => ({
        path: `/guests/${row.slug}`,
        updatedAt: row.updatedAt.toISOString(),
      })),
      ...topics.map(row => ({
        path: `/topics/${row.slug}`,
        updatedAt: row.updatedAt.toISOString(),
      })),
      ...collections.map(row => ({
        path: `/collections/${row.slug}`,
        updatedAt: row.updatedAt.toISOString(),
      })),
    ];
  }
}
