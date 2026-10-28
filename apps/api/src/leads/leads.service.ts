import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  Lead,
  LeadListQuery,
  LeadMagnet,
  LeadMagnetWrite,
  LeadSubmission,
  LeadSubmissionResponse,
  Paginated,
} from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";
import { mapLead, mapLeadMagnet } from "../common/mappers";
import { paginate, skipTake } from "../common/pagination";

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveLeadMagnet(): Promise<LeadMagnet | null> {
    const row = await this.prisma.leadMagnet.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    });
    return row ? mapLeadMagnet(row) : null;
  }

  /**
   * Capture is idempotent on email: a repeat submission still returns the
   * download rather than erroring, which is what a visitor expects.
   */
  async submit(
    input: LeadSubmission,
    context: { ipHash: string | null }
  ): Promise<LeadSubmissionResponse> {
    if (input.company && input.company.trim().length > 0) {
      // Honeypot tripped: respond as success without persisting anything.
      return {
        created: false,
        downloadUrl: null,
        leadMagnet: null,
        message: "Thanks — check your inbox shortly.",
      };
    }

    const leadMagnet = await this.getActiveLeadMagnet();
    const existing = await this.prisma.lead.findFirst({
      where: { email: input.email, leadMagnetId: leadMagnet?.id ?? null },
    });

    if (existing) {
      await this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          consent: input.consent,
          sourcePage: input.sourcePage ?? existing.sourcePage,
          leadMagnetId: leadMagnet?.id ?? existing.leadMagnetId,
        },
      });
      return {
        created: false,
        downloadUrl: leadMagnet?.fileUrl ?? null,
        leadMagnet,
        message: "You are already on the list — here is your download again.",
      };
    }

    await this.prisma.lead.create({
      data: {
        name: input.name,
        email: input.email,
        consent: input.consent,
        sourcePage: input.sourcePage ?? null,
        leadMagnetId: leadMagnet?.id ?? null,
        ipHash: context.ipHash,
      },
    });

    return {
      created: true,
      downloadUrl: leadMagnet?.fileUrl ?? null,
      leadMagnet,
      message: leadMagnet?.fileUrl
        ? "You are in. Your download is ready."
        : "You are in. We will email the next conversation.",
    };
  }

  /* ------------------------------ admin surface ----------------------------- */

  async listLeads(query: LeadListQuery): Promise<Paginated<Lead>> {
    const where: Prisma.LeadWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        }
      : {};
    const { skip, take } = skipTake(query.page, query.perPage);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        include: { leadMagnet: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return paginate(rows.map(mapLead), total, query.page, query.perPage);
  }

  /** CSV export for the whole list; the admin UI streams this as a file download. */
  async exportCsv(): Promise<string> {
    const rows = await this.prisma.lead.findMany({
      include: { leadMagnet: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
    const header = [
      "name",
      "email",
      "consent",
      "sourcePage",
      "leadMagnet",
      "createdAt",
    ];
    const escape = (value: string | null): string =>
      `"${(value ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map(row =>
      [
        escape(row.name),
        escape(row.email),
        row.consent ? "true" : "false",
        escape(row.sourcePage),
        escape(row.leadMagnet?.title ?? null),
        row.createdAt.toISOString(),
      ].join(",")
    );
    return [header.join(","), ...lines].join("\r\n");
  }

  async listLeadMagnets(): Promise<LeadMagnet[]> {
    const rows = await this.prisma.leadMagnet.findMany({
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(mapLeadMagnet);
  }

  async findLeadMagnet(id: string): Promise<LeadMagnet> {
    const row = await this.prisma.leadMagnet.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Lead magnet "${id}" was not found.`);
    return mapLeadMagnet(row);
  }

  private magnetData(input: LeadMagnetWrite) {
    return {
      title: input.title,
      description: input.description ?? null,
      coverUrl: input.coverUrl ?? null,
      fileUrl: input.fileUrl ?? null,
      fileName: input.fileName ?? null,
      active: input.active,
    };
  }

  /** Only one magnet may be active, so activation deactivates the others atomically. */
  async createLeadMagnet(input: LeadMagnetWrite): Promise<LeadMagnet> {
    const row = await this.prisma.$transaction(async tx => {
      if (input.active)
        await tx.leadMagnet.updateMany({
          data: { active: false },
          where: { active: true },
        });
      return tx.leadMagnet.create({ data: this.magnetData(input) });
    });
    return mapLeadMagnet(row);
  }

  async updateLeadMagnet(
    id: string,
    input: LeadMagnetWrite
  ): Promise<LeadMagnet> {
    const row = await this.prisma.$transaction(async tx => {
      if (input.active)
        await tx.leadMagnet.updateMany({
          data: { active: false },
          where: { active: true, NOT: { id } },
        });
      return tx.leadMagnet.update({
        where: { id },
        data: this.magnetData(input),
      });
    });
    return mapLeadMagnet(row);
  }

  async removeLeadMagnet(id: string): Promise<void> {
    const leadCount = await this.prisma.lead.count({
      where: { leadMagnetId: id },
    });
    if (leadCount > 0)
      throw new BadRequestException(
        "Deactivate this lead magnet instead — leads are still attributed to it."
      );
    await this.prisma.leadMagnet.delete({ where: { id } });
  }
}
