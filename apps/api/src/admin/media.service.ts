import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { MediaAsset } from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/epub+zip",
  "text/plain",
  "text/vtt",
  "application/x-subrip",
]);

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig
  ) {}

  private root(): string {
    return resolve(process.cwd(), this.config.STORAGE_LOCAL_ROOT);
  }

  private toDto(row: {
    id: string;
    fileName: string;
    storageKey: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    kind: string;
    alt: string | null;
    createdAt: Date;
  }): MediaAsset {
    return {
      id: row.id,
      fileName: row.fileName,
      url: row.url,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      kind: row.kind as MediaAsset["kind"],
      alt: row.alt,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(kind?: MediaAsset["kind"]): Promise<MediaAsset[]> {
    const rows = await this.prisma.mediaAsset.findMany({
      where: kind ? { kind } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map(row => this.toDto(row));
  }

  /** Writes to local disk and records the asset. Filenames are never trusted. */
  async upload(file: UploadedFile, alt?: string): Promise<MediaAsset> {
    const maxBytes = this.config.STORAGE_MAX_UPLOAD_MB * 1024 * 1024;
    if (file.size > maxBytes)
      throw new BadRequestException(
        `Files must be ${this.config.STORAGE_MAX_UPLOAD_MB}MB or smaller.`
      );

    const isImage = IMAGE_TYPES.has(file.mimetype);
    if (!isImage && !DOCUMENT_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "That file type is not supported. Upload an image, PDF, EPUB, or transcript file."
      );
    }

    const extension =
      extname(file.originalname).toLowerCase().slice(0, 10) ||
      (isImage ? ".bin" : ".dat");
    const storageKey = `${new Date().getUTCFullYear()}/${randomUUID()}${extension}`;
    const destination = join(this.root(), storageKey);

    await mkdir(join(destination, ".."), { recursive: true });
    await writeFile(destination, file.buffer);

    const row = await this.prisma.mediaAsset.create({
      data: {
        fileName: file.originalname.slice(0, 260),
        storageKey,
        url: `${this.config.STORAGE_PUBLIC_PATH}/${storageKey}`,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        kind: isImage
          ? "IMAGE"
          : file.mimetype === "application/pdf" ||
              file.mimetype === "application/epub+zip"
            ? "DOCUMENT"
            : "TRANSCRIPT",
        alt: alt?.slice(0, 400) ?? null,
      },
    });

    return this.toDto(row);
  }

  async updateAlt(id: string, alt: string | null): Promise<MediaAsset> {
    const row = await this.prisma.mediaAsset.update({
      where: { id },
      data: { alt: alt?.slice(0, 400) ?? null },
    });
    return this.toDto(row);
  }

  async remove(id: string): Promise<void> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Media asset "${id}" was not found.`);
    await this.prisma.mediaAsset.delete({ where: { id } });
    // A missing file on disk must not block removing the record.
    await unlink(join(this.root(), row.storageKey)).catch(() => undefined);
  }
}
