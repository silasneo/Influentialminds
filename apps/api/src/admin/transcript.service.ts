import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  EpisodeTranscript,
  TranscriptSegmentInput,
  TranscriptUpload,
} from "@influential-minds/contracts";
import { youTubeWatchUrl } from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";

/** `00:01:02.500`, `00:01:02,500`, `01:02.500` or `62` (bare seconds). */
const TIMESTAMP = /(?:(\d{1,3}):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?/;
const CUE_LINE = /^\s*(.+?)\s*-->\s*(.+?)\s*(?:\s+.*)?$/;
const SPEAKER_PREFIX = /^([A-Z][\w .'-]{1,60}):\s+/;

export interface ParsedTranscript {
  segments: TranscriptSegmentInput[];
  warnings: string[];
}

@Injectable()
export class TranscriptService {
  constructor(private readonly prisma: PrismaService) {}

  private parseTimestamp(raw: string): number | null {
    const trimmed = raw.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    const match = TIMESTAMP.exec(trimmed);
    if (!match) return null;
    const [, hours, minutes, seconds, millis] = match;
    const h = hours ? Number(hours) : 0;
    const m = Number(minutes ?? 0);
    const s = Number(seconds ?? 0);
    const ms = millis ? Number(millis.padEnd(3, "0")) : 0;
    return h * 3600 + m * 60 + s + ms / 1000;
  }

  /**
   * Accepts WebVTT, SRT, and plain `[00:01:02] Speaker: text` transcripts.
   * Timestamps are validated here so a malformed file is rejected before it
   * can produce broken "watch this moment" links.
   */
  parse(content: string): ParsedTranscript {
    const normalised = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const warnings: string[] = [];
    const segments: TranscriptSegmentInput[] = [];

    const blocks = normalised.split(/\n{2,}/);
    for (const block of blocks) {
      const lines = block.split("\n").filter(line => line.trim().length > 0);
      if (lines.length === 0) continue;
      if (/^WEBVTT/i.test(lines[0] ?? "")) continue;

      const cueIndex = lines.findIndex(
        line => CUE_LINE.test(line) && line.includes("-->")
      );
      if (cueIndex >= 0) {
        const cue = CUE_LINE.exec(lines[cueIndex] ?? "");
        const start = cue ? this.parseTimestamp(cue[1] ?? "") : null;
        const end = cue ? this.parseTimestamp(cue[2] ?? "") : null;
        const body = lines
          .slice(cueIndex + 1)
          .join(" ")
          .trim();
        if (start === null || body.length === 0) {
          warnings.push(
            `Skipped a cue with an unreadable timestamp or empty text near "${(lines[cueIndex] ?? "").slice(0, 40)}".`
          );
          continue;
        }
        segments.push(this.buildSegment(start, end, body));
        continue;
      }

      // Plain-text transcripts: one timestamped line per utterance.
      for (const line of lines) {
        const bracketed =
          /^\s*[\[(]?\s*((?:\d{1,3}:)?\d{1,2}:\d{1,2}(?:[.,]\d{1,3})?)\s*[\])]?\s*(.*)$/.exec(
            line
          );
        if (!bracketed) continue;
        const start = this.parseTimestamp(bracketed[1] ?? "");
        const body = (bracketed[2] ?? "").trim();
        if (start === null || body.length === 0) continue;
        segments.push(this.buildSegment(start, null, body));
      }
    }

    if (segments.length === 0) {
      throw new BadRequestException(
        "No timestamped lines were found. Upload WebVTT, SRT, or a transcript where each line begins with a timestamp."
      );
    }

    // Disorder has to be detected before sorting, otherwise the check is dead code.
    let previous = -1;
    for (const segment of segments) {
      if (segment.startSeconds < previous) {
        warnings.push("Timestamps were out of order and have been re-sorted.");
        break;
      }
      previous = segment.startSeconds;
    }

    segments.sort((a, b) => a.startSeconds - b.startSeconds);

    return { segments, warnings: [...new Set(warnings)] };
  }

  private buildSegment(
    start: number,
    end: number | null,
    body: string
  ): TranscriptSegmentInput {
    const speakerMatch = SPEAKER_PREFIX.exec(body);
    const speaker = speakerMatch?.[1] ?? null;
    const text = speakerMatch
      ? body.slice(speakerMatch[0].length).trim()
      : body;
    return {
      startSeconds: Math.max(0, Math.floor(start)),
      endSeconds: end === null ? null : Math.max(0, Math.floor(end)),
      speaker,
      text: text.replace(/<[^>]+>/g, "").slice(0, 8000),
    };
  }

  /** Replaces any existing transcript for the episode/language pair. */
  async upload(
    episodeId: string,
    input: TranscriptUpload
  ): Promise<EpisodeTranscript> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, youtubeVideoId: true },
    });
    if (!episode)
      throw new NotFoundException(`Episode "${episodeId}" was not found.`);

    const { segments } = this.parse(input.content);

    const transcript = await this.prisma.$transaction(async tx => {
      const existing = await tx.transcript.findUnique({
        where: { episodeId_language: { episodeId, language: input.language } },
        select: { id: true },
      });
      if (existing) await tx.transcript.delete({ where: { id: existing.id } });

      return tx.transcript.create({
        data: {
          episodeId,
          language: input.language,
          sourceFileName: input.sourceFileName ?? null,
          status: "READY",
          indexedAt: new Date(),
          segments: {
            create: segments.map((segment, index) => ({
              startSeconds: segment.startSeconds,
              endSeconds: segment.endSeconds ?? null,
              speaker: segment.speaker ?? null,
              text: segment.text,
              sortOrder: index,
            })),
          },
        },
        include: { segments: { orderBy: { sortOrder: "asc" } } },
      });
    });

    return {
      id: transcript.id,
      language: transcript.language,
      status: transcript.status,
      indexedAt: transcript.indexedAt
        ? transcript.indexedAt.toISOString()
        : null,
      segmentCount: transcript.segments.length,
      segments: transcript.segments.map(segment => ({
        id: segment.id,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        text: segment.text,
        speaker: segment.speaker,
        momentUrl: episode.youtubeVideoId
          ? youTubeWatchUrl(episode.youtubeVideoId, {
              startSeconds: segment.startSeconds,
            })
          : "",
      })),
    };
  }

  async remove(episodeId: string, language: string): Promise<void> {
    const existing = await this.prisma.transcript.findUnique({
      where: { episodeId_language: { episodeId, language } },
      select: { id: true },
    });
    if (!existing)
      throw new NotFoundException(
        "No transcript exists for that episode and language."
      );
    await this.prisma.transcript.delete({ where: { id: existing.id } });
  }
}
