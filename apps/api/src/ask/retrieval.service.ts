import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  formatTimecode,
  youTubeWatchUrl,
  type AskSource,
} from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";

/** Words carrying no retrieval signal; dropped before scoring. */
const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "get",
  "had",
  "has",
  "have",
  "he",
  "her",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "like",
  "me",
  "more",
  "most",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "our",
  "out",
  "over",
  "said",
  "say",
  "says",
  "she",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "up",
  "us",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

const MAX_CANDIDATES = 400;
const CONTEXT_SEGMENTS = 1;

/** Everything a source card needs, resolved in the candidate query. */
const segmentInclude = {
  transcript: {
    select: {
      episodeId: true,
      episode: {
        select: {
          id: true,
          slug: true,
          title: true,
          youtubeVideoId: true,
          guests: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { guest: { select: { name: true, slug: true } } },
          },
          topics: {
            take: 1,
            select: { topic: { select: { name: true, slug: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.TranscriptSegmentInclude;

type SegmentRow = Prisma.TranscriptSegmentGetPayload<{
  include: typeof segmentInclude;
}>;

export interface RetrievalPassage extends AskSource {
  /** Neighbouring text included so the model sees a coherent passage. */
  context: string;
}

@Injectable()
export class RetrievalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lowercased, de-duplicated content terms. */
  tokenize(question: string): string[] {
    const terms = question
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
      .split(/\s+/)
      .map(term => term.replace(/^['-]+|['-]+$/g, ""))
      .filter(term => term.length > 2 && !STOP_WORDS.has(term));
    return [...new Set(terms)];
  }

  /**
   * Keyword retrieval over indexed transcript segments. MySQL full-text is not
   * enabled, so candidates are gathered with LIKE and scored in process; this
   * keeps the pipeline deterministic and auditable for the MVP corpus.
   */
  async retrieve(
    question: string,
    options: { episodeId?: string; minScore: number; limit: number }
  ): Promise<RetrievalPassage[]> {
    const terms = this.tokenize(question);
    if (terms.length === 0) return [];

    const where: Prisma.TranscriptSegmentWhereInput = {
      OR: terms.map(term => ({ text: { contains: term } })),
      transcript: {
        status: "READY",
        episode: {
          status: "PUBLISHED",
          ...(options.episodeId ? { id: options.episodeId } : {}),
        },
      },
    };

    const candidates = await this.prisma.transcriptSegment.findMany({
      where,
      take: MAX_CANDIDATES,
      orderBy: { startSeconds: "asc" },
      include: segmentInclude,
    });

    const scored = candidates
      .map(segment => {
        const haystack = segment.text.toLowerCase();
        let hits = 0;
        let matchedTerms = 0;
        for (const term of terms) {
          const occurrences = haystack.split(term).length - 1;
          if (occurrences > 0) {
            matchedTerms += 1;
            hits += occurrences;
          }
        }
        // Coverage dominates raw frequency so a passage touching every term wins.
        const coverage = matchedTerms / terms.length;
        const density = Math.min(hits / Math.max(terms.length, 1), 3) / 3;
        const lengthPenalty = segment.text.length < 40 ? 0.6 : 1;
        return {
          segment,
          score: Number(
            ((coverage * 0.75 + density * 0.25) * lengthPenalty).toFixed(4)
          ),
        };
      })
      .filter(entry => entry.score >= options.minScore)
      .sort((a, b) => b.score - a.score);

    // One passage per episode keeps the source list diverse rather than
    // returning five near-identical lines from a single answer.
    const seenEpisodes = new Set<string>();
    const selected: typeof scored = [];
    for (const entry of scored) {
      const episodeId = entry.segment.transcript.episodeId;
      if (seenEpisodes.has(episodeId)) continue;
      seenEpisodes.add(episodeId);
      selected.push(entry);
      if (selected.length >= options.limit) break;
    }

    return Promise.all(
      selected.map(entry => this.toPassage(entry.segment, entry.score))
    );
  }

  private async toPassage(
    segment: SegmentRow,
    score: number
  ): Promise<RetrievalPassage> {
    const episode = segment.transcript.episode;
    const guest = episode.guests[0]?.guest ?? null;
    const topic = episode.topics[0]?.topic ?? null;

    const neighbours = await this.prisma.transcriptSegment.findMany({
      where: {
        transcriptId: segment.transcriptId,
        sortOrder: {
          gte: segment.sortOrder - CONTEXT_SEGMENTS,
          lte: segment.sortOrder + CONTEXT_SEGMENTS,
        },
      },
      orderBy: { sortOrder: "asc" },
      select: { text: true, speaker: true },
    });

    return {
      episodeId: episode.id,
      episodeSlug: episode.slug,
      episodeTitle: episode.title,
      guestName: guest?.name ?? null,
      guestSlug: guest?.slug ?? null,
      topicName: topic?.name ?? null,
      topicSlug: topic?.slug ?? null,
      excerpt: segment.text.trim(),
      startSeconds: segment.startSeconds,
      timecode: formatTimecode(segment.startSeconds),
      momentUrl: episode.youtubeVideoId
        ? youTubeWatchUrl(episode.youtubeVideoId, {
            startSeconds: segment.startSeconds,
          })
        : `/episodes/${episode.slug}?t=${segment.startSeconds}`,
      score,
      context: neighbours
        .map(row => (row.speaker ? `${row.speaker}: ${row.text}` : row.text))
        .join(" ")
        .trim(),
    };
  }
}
