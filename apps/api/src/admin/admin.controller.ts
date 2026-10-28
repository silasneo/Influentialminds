import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  auditLogQuerySchema,
  collectionWriteSchema,
  episodeListQuerySchema,
  episodeStatusChangeSchema,
  guestWriteSchema,
  leadListQuerySchema,
  leadMagnetWriteSchema,
  paginationQuerySchema,
  siteSettingsWriteSchema,
  topicWriteSchema,
  transcriptUploadSchema,
  adminUserWriteSchema,
  episodeWriteSchema,
  type AdminDashboard,
  type AdminEpisodeSummary,
  type AdminUser,
  type AdminUserWrite,
  type AuditLogEntry,
  type Collection,
  type CollectionWrite,
  type Episode,
  type EpisodeSummary,
  type EpisodeTranscript,
  type EpisodeWrite,
  type Guest,
  type GuestWrite,
  type Lead,
  type LeadListQuery,
  type LeadMagnet,
  type LeadMagnetWrite,
  type MediaAsset,
  type Paginated,
  type EditableSiteSettings,
  type SiteSettingsWrite,
  type Topic,
  type TopicWrite,
  type TranscriptUpload,
} from "@influential-minds/contracts";
import { AdminGuard, CurrentAdmin, Roles } from "./admin.guard";
import type { AdminSession } from "./auth.service";
import { AuthService } from "./auth.service";
import { DashboardService } from "./dashboard.service";
import {
  MediaService,
  type UploadedFile as MediaUpload,
} from "./media.service";
import { TranscriptService } from "./transcript.service";
import { EpisodesService } from "../episodes/episodes.service";
import { GuestsService } from "../guests/guests.service";
import { TaxonomyService } from "../taxonomy/taxonomy.service";
import { LeadsService } from "../leads/leads.service";
import { SiteService } from "../site/site.service";
import { AuditService } from "../common/audit.service";
import { zodPipe } from "../common/zod-validation.pipe";

const actorOf = (session: AdminSession) => ({
  id: session.sub,
  email: session.email,
});

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly episodes: EpisodesService,
    private readonly guests: GuestsService,
    private readonly taxonomy: TaxonomyService,
    private readonly leads: LeadsService,
    private readonly site: SiteService,
    private readonly media: MediaService,
    private readonly transcripts: TranscriptService,
    private readonly auth: AuthService,
    private readonly audit: AuditService
  ) {}

  /* ------------------------------- dashboard ------------------------------- */

  @Get("dashboard")
  overview(): Promise<AdminDashboard> {
    return this.dashboard.overview();
  }

  @Get("audit-log")
  auditLog(
    @Query(zodPipe(auditLogQuerySchema))
    query: {
      page: number;
      perPage: number;
    }
  ): Promise<Paginated<AuditLogEntry>> {
    return this.dashboard.auditLog(query);
  }

  /* -------------------------------- episodes ------------------------------- */

  @Get("episodes")
  listEpisodes(
    @Query(zodPipe(episodeListQuerySchema))
    query: ReturnType<typeof episodeListQuerySchema.parse>
  ): Promise<Paginated<AdminEpisodeSummary>> {
    return this.episodes.listForAdmin(query);
  }

  @Get("episodes/:id")
  getEpisode(@Param("id") id: string): Promise<Episode> {
    return this.episodes.findByIdForAdmin(id);
  }

  @Post("episodes")
  async createEpisode(
    @Body(zodPipe(episodeWriteSchema)) body: EpisodeWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<Episode> {
    const episode = await this.episodes.create(body);
    await this.audit.record(
      actorOf(session),
      "create",
      "episode",
      episode.id,
      episode.title
    );
    return episode;
  }

  @Put("episodes/:id")
  async updateEpisode(
    @Param("id") id: string,
    @Body(zodPipe(episodeWriteSchema)) body: EpisodeWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<Episode> {
    const episode = await this.episodes.update(id, body);
    await this.audit.record(
      actorOf(session),
      "update",
      "episode",
      id,
      episode.title
    );
    return episode;
  }

  /** Draft â†’ In review â†’ Published â†’ Archived, driven entirely from the console. */
  @Post("episodes/:id/status")
  async changeEpisodeStatus(
    @Param("id") id: string,
    @Body(zodPipe(episodeStatusChangeSchema))
    body: ReturnType<typeof episodeStatusChangeSchema.parse>,
    @CurrentAdmin() session: AdminSession
  ): Promise<Episode> {
    const episode = await this.episodes.changeStatus(id, body.status);
    await this.audit.record(
      actorOf(session),
      "status",
      "episode",
      id,
      `${episode.title} â†’ ${body.status}`
    );
    return episode;
  }

  @Delete("episodes/:id")
  @HttpCode(204)
  async deleteEpisode(
    @Param("id") id: string,
    @CurrentAdmin() session: AdminSession
  ): Promise<void> {
    await this.episodes.remove(id);
    await this.audit.record(actorOf(session), "delete", "episode", id);
  }

  /* ------------------------------- transcripts ------------------------------ */

  @Post("episodes/:id/transcript")
  async uploadTranscript(
    @Param("id") id: string,
    @Body(zodPipe(transcriptUploadSchema)) body: TranscriptUpload,
    @CurrentAdmin() session: AdminSession
  ): Promise<EpisodeTranscript> {
    const transcript = await this.transcripts.upload(id, body);
    await this.audit.record(
      actorOf(session),
      "upload",
      "transcript",
      id,
      `${transcript.segmentCount} segments indexed`
    );
    return transcript;
  }

  @Delete("episodes/:id/transcript/:language")
  @HttpCode(204)
  async deleteTranscript(
    @Param("id") id: string,
    @Param("language") language: string,
    @CurrentAdmin() session: AdminSession
  ): Promise<void> {
    await this.transcripts.remove(id, language);
    await this.audit.record(
      actorOf(session),
      "delete",
      "transcript",
      id,
      language
    );
  }

  /* --------------------------------- guests -------------------------------- */

  @Get("guests")
  listGuests(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string
  ): Promise<Paginated<Guest>> {
    const parsed = paginationQuerySchema.parse({
      page: page ?? 1,
      perPage: perPage ?? 25,
    });
    return this.guests.listForAdmin({ search, ...parsed });
  }

  @Get("guests/:id")
  getGuest(@Param("id") id: string): Promise<Guest> {
    return this.guests.findByIdForAdmin(id);
  }

  @Post("guests")
  async createGuest(
    @Body(zodPipe(guestWriteSchema)) body: GuestWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<Guest> {
    const guest = await this.guests.create(body);
    await this.audit.record(
      actorOf(session),
      "create",
      "guest",
      guest.id,
      guest.name
    );
    return guest;
  }

  @Put("guests/:id")
  async updateGuest(
    @Param("id") id: string,
    @Body(zodPipe(guestWriteSchema)) body: GuestWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<Guest> {
    const guest = await this.guests.update(id, body);
    await this.audit.record(
      actorOf(session),
      "update",
      "guest",
      id,
      guest.name
    );
    return guest;
  }

  @Delete("guests/:id")
  @HttpCode(204)
  async deleteGuest(
    @Param("id") id: string,
    @CurrentAdmin() session: AdminSession
  ): Promise<void> {
    await this.guests.remove(id);
    await this.audit.record(actorOf(session), "delete", "guest", id);
  }

  /* --------------------------------- topics -------------------------------- */

  @Get("topics")
  listTopics(): Promise<Topic[]> {
    return this.taxonomy.listTopics();
  }

  @Get("topics/:id")
  getTopic(@Param("id") id: string): Promise<Topic> {
    return this.taxonomy.findTopicById(id);
  }

  @Post("topics")
  async createTopic(
    @Body(zodPipe(topicWriteSchema)) body: TopicWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<Topic> {
    const topic = await this.taxonomy.createTopic(body);
    await this.audit.record(
      actorOf(session),
      "create",
      "topic",
      topic.id,
      topic.name
    );
    return topic;
  }

  @Put("topics/:id")
  async updateTopic(
    @Param("id") id: string,
    @Body(zodPipe(topicWriteSchema)) body: TopicWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<Topic> {
    const topic = await this.taxonomy.updateTopic(id, body);
    await this.audit.record(
      actorOf(session),
      "update",
      "topic",
      id,
      topic.name
    );
    return topic;
  }

  @Delete("topics/:id")
  @HttpCode(204)
  async deleteTopic(
    @Param("id") id: string,
    @CurrentAdmin() session: AdminSession
  ): Promise<void> {
    await this.taxonomy.removeTopic(id);
    await this.audit.record(actorOf(session), "delete", "topic", id);
  }

  /* ------------------------------ collections ------------------------------ */

  @Get("collections")
  listCollections(): Promise<Collection[]> {
    return this.taxonomy.listCollections();
  }

  @Get("collections/:id")
  getCollection(@Param("id") id: string): Promise<Collection> {
    return this.taxonomy.findCollectionById(id);
  }

  @Post("collections")
  async createCollection(
    @Body(zodPipe(collectionWriteSchema)) body: CollectionWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<Collection> {
    const collection = await this.taxonomy.createCollection(body);
    await this.audit.record(
      actorOf(session),
      "create",
      "collection",
      collection.id,
      collection.title
    );
    return collection;
  }

  @Put("collections/:id")
  async updateCollection(
    @Param("id") id: string,
    @Body(zodPipe(collectionWriteSchema)) body: CollectionWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<Collection> {
    const collection = await this.taxonomy.updateCollection(id, body);
    await this.audit.record(
      actorOf(session),
      "update",
      "collection",
      id,
      collection.title
    );
    return collection;
  }

  @Delete("collections/:id")
  @HttpCode(204)
  async deleteCollection(
    @Param("id") id: string,
    @CurrentAdmin() session: AdminSession
  ): Promise<void> {
    await this.taxonomy.removeCollection(id);
    await this.audit.record(actorOf(session), "delete", "collection", id);
  }

  /* ---------------------------------- leads --------------------------------- */

  @Get("leads")
  listLeads(
    @Query(zodPipe(leadListQuerySchema)) query: LeadListQuery
  ): Promise<Paginated<Lead>> {
    return this.leads.listLeads(query);
  }

  @Get("leads/export")
  async exportLeads(
    @Res({ passthrough: true }) response: Response,
    @CurrentAdmin() session: AdminSession
  ): Promise<string> {
    const csv = await this.leads.exportCsv();
    await this.audit.record(
      actorOf(session),
      "export",
      "lead",
      null,
      "CSV export"
    );
    response.setHeader("content-type", "text/csv; charset=utf-8");
    response.setHeader(
      "content-disposition",
      `attachment; filename="influential-minds-leads-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return csv;
  }

  @Get("lead-magnets")
  listLeadMagnets(): Promise<LeadMagnet[]> {
    return this.leads.listLeadMagnets();
  }

  @Post("lead-magnets")
  async createLeadMagnet(
    @Body(zodPipe(leadMagnetWriteSchema)) body: LeadMagnetWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<LeadMagnet> {
    const magnet = await this.leads.createLeadMagnet(body);
    await this.audit.record(
      actorOf(session),
      "create",
      "lead_magnet",
      magnet.id,
      magnet.title
    );
    return magnet;
  }

  @Put("lead-magnets/:id")
  async updateLeadMagnet(
    @Param("id") id: string,
    @Body(zodPipe(leadMagnetWriteSchema)) body: LeadMagnetWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<LeadMagnet> {
    const magnet = await this.leads.updateLeadMagnet(id, body);
    await this.audit.record(
      actorOf(session),
      "update",
      "lead_magnet",
      id,
      magnet.title
    );
    return magnet;
  }

  @Delete("lead-magnets/:id")
  @HttpCode(204)
  async deleteLeadMagnet(
    @Param("id") id: string,
    @CurrentAdmin() session: AdminSession
  ): Promise<void> {
    await this.leads.removeLeadMagnet(id);
    await this.audit.record(actorOf(session), "delete", "lead_magnet", id);
  }

  /* --------------------------------- media ---------------------------------- */

  @Get("media")
  listMedia(@Query("kind") kind?: MediaAsset["kind"]): Promise<MediaAsset[]> {
    return this.media.list(kind);
  }

  @Post("media")
  @UseInterceptors(FileInterceptor("file"))
  async uploadMedia(
    @UploadedFile() file: MediaUpload,
    @Body("alt") alt: string | undefined,
    @CurrentAdmin() session: AdminSession
  ): Promise<MediaAsset> {
    const asset = await this.media.upload(file, alt);
    await this.audit.record(
      actorOf(session),
      "upload",
      "media",
      asset.id,
      asset.fileName
    );
    return asset;
  }

  @Put("media/:id")
  updateMedia(
    @Param("id") id: string,
    @Body("alt") alt: string | null
  ): Promise<MediaAsset> {
    return this.media.updateAlt(id, alt ?? null);
  }

  @Delete("media/:id")
  @HttpCode(204)
  async deleteMedia(
    @Param("id") id: string,
    @CurrentAdmin() session: AdminSession
  ): Promise<void> {
    await this.media.remove(id);
    await this.audit.record(actorOf(session), "delete", "media", id);
  }

  /* -------------------------------- settings -------------------------------- */

  @Get("settings")
  getSettings(): Promise<EditableSiteSettings> {
    return this.site.getEditableSettings();
  }

  @Put("settings")
  async updateSettings(
    @Body(zodPipe(siteSettingsWriteSchema)) body: SiteSettingsWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<EditableSiteSettings> {
    const settings = await this.site.updateSettings(body);
    await this.audit.record(
      actorOf(session),
      "update",
      "site_settings",
      "site"
    );
    return settings;
  }

  /* ------------------------------ admin users ------------------------------- */

  @Get("users")
  @Roles("SUPER_ADMIN")
  listUsers(): Promise<AdminUser[]> {
    return this.auth.listUsers();
  }

  @Post("users")
  @Roles("SUPER_ADMIN")
  async createUser(
    @Body(zodPipe(adminUserWriteSchema)) body: AdminUserWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<AdminUser> {
    const user = await this.auth.createUser(body);
    await this.audit.record(
      actorOf(session),
      "create",
      "admin_user",
      user.id,
      user.email
    );
    return user;
  }

  @Put("users/:id")
  @Roles("SUPER_ADMIN")
  async updateUser(
    @Param("id") id: string,
    @Body(zodPipe(adminUserWriteSchema)) body: AdminUserWrite,
    @CurrentAdmin() session: AdminSession
  ): Promise<AdminUser> {
    const user = await this.auth.updateUser(id, body);
    await this.audit.record(
      actorOf(session),
      "update",
      "admin_user",
      id,
      user.email
    );
    return user;
  }

  @Delete("users/:id")
  @Roles("SUPER_ADMIN")
  @HttpCode(204)
  async deleteUser(
    @Param("id") id: string,
    @CurrentAdmin() session: AdminSession
  ): Promise<void> {
    await this.auth.removeUser(id);
    await this.audit.record(actorOf(session), "delete", "admin_user", id);
  }
}
