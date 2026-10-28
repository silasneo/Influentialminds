import { Inject, Injectable } from "@nestjs/common";
import type {
  AdminDashboard,
  AuditLogEntry,
  Paginated,
} from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";
import { paginate, skipTake } from "../common/pagination";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig
  ) {}

  async overview(): Promise<AdminDashboard> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      publishedEpisodes,
      draftEpisodes,
      inReviewEpisodes,
      archivedEpisodes,
      guests,
      topics,
      collections,
      leads,
      leadsLast30Days,
      transcriptsIndexed,
      transcriptsPending,
      askQueriesLast30Days,
      indexedSegmentCount,
      activity,
      recentLeads,
    ] = await Promise.all([
      this.prisma.episode.count({ where: { status: "PUBLISHED" } }),
      this.prisma.episode.count({ where: { status: "DRAFT" } }),
      this.prisma.episode.count({ where: { status: "IN_REVIEW" } }),
      this.prisma.episode.count({ where: { status: "ARCHIVED" } }),
      this.prisma.guest.count(),
      this.prisma.topic.count(),
      this.prisma.collection.count(),
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.transcript.count({ where: { status: "READY" } }),
      this.prisma.transcript.count({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
      }),
      this.prisma.aIQueryLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.transcriptSegment.count({
        where: { transcript: { status: "READY" } },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      this.prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          sourcePage: true,
        },
      }),
    ]);

    return {
      counts: {
        publishedEpisodes,
        draftEpisodes,
        inReviewEpisodes,
        archivedEpisodes,
        guests,
        topics,
        collections,
        leads,
        leadsLast30Days,
        transcriptsIndexed,
        transcriptsPending,
        askQueriesLast30Days,
      },
      recentActivity: activity.map(entry => this.toAuditDto(entry)),
      recentLeads: recentLeads.map(lead => ({
        ...lead,
        createdAt: lead.createdAt.toISOString(),
      })),
      aiProvider: {
        mode:
          this.config.AI_PROVIDER === "mindstudio"
            ? "live"
            : this.config.AI_PROVIDER,
        providerName:
          this.config.AI_PROVIDER === "mindstudio"
            ? "MindStudio"
            : this.config.AI_PROVIDER === "mock"
              ? "Development mock"
              : "Disabled",
        indexedSegmentCount,
      },
    };
  }

  async auditLog(query: {
    page: number;
    perPage: number;
  }): Promise<Paginated<AuditLogEntry>> {
    const { skip, take } = skipTake(query.page, query.perPage);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.auditLog.count(),
    ]);
    return paginate(
      rows.map(row => this.toAuditDto(row)),
      total,
      query.page,
      query.perPage
    );
  }

  private toAuditDto(row: {
    id: string;
    actorEmail: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    summary: string | null;
    createdAt: Date;
  }): AuditLogEntry {
    return {
      id: row.id,
      actorEmail: row.actorEmail,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
