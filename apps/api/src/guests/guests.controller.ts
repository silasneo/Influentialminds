import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  episodeListQuerySchema,
  guestListQuerySchema,
  type EpisodeSummary,
  type Guest,
  type GuestListQuery,
  type Paginated,
} from "@influential-minds/contracts";
import { GuestsService } from "./guests.service";
import { EpisodesService } from "../episodes/episodes.service";
import { zodPipe } from "../common/zod-validation.pipe";

@Controller("guests")
export class GuestsController {
  constructor(
    private readonly guests: GuestsService,
    private readonly episodes: EpisodesService
  ) {}

  @Get()
  list(
    @Query(zodPipe(guestListQuerySchema)) query: GuestListQuery
  ): Promise<Paginated<Guest>> {
    return this.guests.listPublic(query);
  }

  @Get(":slug")
  detail(@Param("slug") slug: string): Promise<Guest> {
    return this.guests.findPublicBySlug(slug);
  }

  /** Conversations featuring this guest, so profiles are never a dead end. */
  @Get(":slug/episodes")
  episodesForGuest(
    @Param("slug") slug: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string
  ): Promise<Paginated<EpisodeSummary>> {
    const query = episodeListQuerySchema.parse({
      guest: slug,
      page: page ?? 1,
      perPage: perPage ?? 12,
    });
    return this.episodes.listPublic(query);
  }
}
