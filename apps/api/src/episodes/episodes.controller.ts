import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  episodeListQuerySchema,
  type EpisodeDetailResponse,
  type EpisodeListQuery,
  type EpisodeSummary,
  type Paginated,
} from "@influential-minds/contracts";
import { EpisodesService } from "./episodes.service";
import { zodPipe } from "../common/zod-validation.pipe";

@Controller("episodes")
export class EpisodesController {
  constructor(private readonly episodes: EpisodesService) {}

  @Get()
  list(
    @Query(zodPipe(episodeListQuerySchema)) query: EpisodeListQuery
  ): Promise<Paginated<EpisodeSummary>> {
    return this.episodes.listPublic(query);
  }

  @Get(":slug")
  detail(@Param("slug") slug: string): Promise<EpisodeDetailResponse> {
    return this.episodes.findPublicBySlug(slug);
  }
}
