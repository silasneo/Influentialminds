import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  slugify,
  type Guest,
  type GuestListQuery,
  type GuestWrite,
  type Paginated,
} from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";
import { guestWithCountInclude, mapGuest } from "../common/mappers";
import { paginate, skipTake } from "../common/pagination";

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public directory only shows published guests who appear in a published episode. */
  private publicWhere(): Prisma.GuestWhereInput {
    return {
      status: "PUBLISHED",
      episodes: { some: { episode: { status: "PUBLISHED" } } },
    };
  }

  async listPublic(query: GuestListQuery): Promise<Paginated<Guest>> {
    const where: Prisma.GuestWhereInput = { ...this.publicWhere() };
    const and: Prisma.GuestWhereInput[] = [];

    if (query.search) {
      and.push({
        OR: [
          { name: { contains: query.search } },
          { role: { contains: query.search } },
          { company: { contains: query.search } },
          { bio: { contains: query.search } },
        ],
      });
    }
    if (query.topic)
      and.push({
        episodes: {
          some: {
            episode: { topics: { some: { topic: { slug: query.topic } } } },
          },
        },
      });
    if (and.length > 0) where.AND = and;

    const { skip, take } = skipTake(query.page, query.perPage);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.guest.findMany({
        where,
        include: guestWithCountInclude,
        orderBy: [{ name: "asc" }],
        skip,
        take,
      }),
      this.prisma.guest.count({ where }),
    ]);

    return paginate(rows.map(mapGuest), total, query.page, query.perPage);
  }

  async findPublicBySlug(slug: string): Promise<Guest> {
    const row = await this.prisma.guest.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: guestWithCountInclude,
    });
    if (!row)
      throw new NotFoundException(`No published guest exists at "${slug}".`);
    return mapGuest(row);
  }

  async listFeatured(limit: number): Promise<Guest[]> {
    const rows = await this.prisma.guest.findMany({
      where: this.publicWhere(),
      include: guestWithCountInclude,
      orderBy: [{ episodes: { _count: "desc" } }, { name: "asc" }],
      take: limit,
    });
    return rows.map(mapGuest);
  }

  async publishedSlugs(): Promise<Array<{ slug: string; updatedAt: Date }>> {
    return this.prisma.guest.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });
  }

  /* ------------------------------ admin surface ----------------------------- */

  async listForAdmin(params: {
    search?: string;
    page: number;
    perPage: number;
  }): Promise<Paginated<Guest>> {
    const where: Prisma.GuestWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search } },
            { slug: { contains: params.search } },
          ],
        }
      : {};
    const { skip, take } = skipTake(params.page, params.perPage);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.guest.findMany({
        where,
        include: guestWithCountInclude,
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take,
      }),
      this.prisma.guest.count({ where }),
    ]);
    return paginate(rows.map(mapGuest), total, params.page, params.perPage);
  }

  async findByIdForAdmin(id: string): Promise<Guest> {
    const row = await this.prisma.guest.findUnique({
      where: { id },
      include: guestWithCountInclude,
    });
    if (!row) throw new NotFoundException(`Guest "${id}" was not found.`);
    return mapGuest(row);
  }

  private async uniqueSlug(
    desired: string,
    ignoreId?: string
  ): Promise<string> {
    const base = slugify(desired) || "guest";
    let candidate = base;
    let suffix = 2;
    for (;;) {
      const clash = await this.prisma.guest.findFirst({
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

  private data(input: GuestWrite) {
    return {
      name: input.name,
      role: input.role ?? null,
      company: input.company ?? null,
      bio: input.bio ?? null,
      headshotUrl: input.headshotUrl ?? null,
      websiteUrl: input.websiteUrl || null,
      expertise: input.expertise as unknown as Prisma.InputJsonValue,
      socialLinks: input.socialLinks as unknown as Prisma.InputJsonValue,
      status: input.status,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
    };
  }

  async create(input: GuestWrite): Promise<Guest> {
    const slug = await this.uniqueSlug(input.slug ?? input.name);
    const row = await this.prisma.guest.create({
      data: { ...this.data(input), slug },
      include: guestWithCountInclude,
    });
    return mapGuest(row);
  }

  async update(id: string, input: GuestWrite): Promise<Guest> {
    const existing = await this.prisma.guest.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!existing) throw new NotFoundException(`Guest "${id}" was not found.`);
    const slug =
      input.slug && input.slug !== existing.slug
        ? await this.uniqueSlug(input.slug, id)
        : existing.slug;
    const row = await this.prisma.guest.update({
      where: { id },
      data: { ...this.data(input), slug },
      include: guestWithCountInclude,
    });
    return mapGuest(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.guest.delete({ where: { id } });
  }
}
