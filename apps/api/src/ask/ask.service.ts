import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ASK_DAILY_LIMITS,
  type AskRequest,
  type AskResponse,
  type AskSource,
  type AskSuggestion,
  type AskTier,
  type AskUsage,
} from "@influential-minds/contracts";
import { PrismaService } from "../prisma/prisma.module";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";
import { ASK_PROVIDER, type AskProvider } from "./ask.provider";
import { RetrievalService } from "./retrieval.service";
import {
  nextUtcMidnight,
  sha256,
  utcDayBucket,
} from "../common/request-context";

export interface AskSubject {
  /** Stable per-day identity: hashed IP for visitors, `user:<id>` for accounts. */
  key: string;
  tier: AskTier;
}

@Injectable()
export class AskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retrieval: RetrievalService,
    @Inject(ASK_PROVIDER) private readonly provider: AskProvider,
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig
  ) {}

  /** Read-only view used by the UI to render the remaining-questions counter. */
  async getUsage(subject: AskSubject): Promise<AskUsage> {
    const dayBucket = utcDayBucket();
    const row = await this.prisma.aIQueryUsage.findUnique({
      where: { subjectKey_dayBucket: { subjectKey: subject.key, dayBucket } },
    });
    return this.buildUsage(subject.tier, row?.queryCount ?? 0);
  }

  async ask(request: AskRequest, subject: AskSubject): Promise<AskResponse> {
    const startedAt = Date.now();

    if (this.provider.mode === "disabled") {
      return {
        question: request.question,
        answer: "",
        noMatch: true,
        sources: [],
        suggestions: await this.suggestions(),
        usage: await this.getUsage(subject),
        mode: "disabled",
        latencyMs: Date.now() - startedAt,
      };
    }

    // Quota is consumed before retrieval so a cheap no-match cannot be farmed.
    const usage = await this.consumeQuota(subject);

    const passages = await this.retrieval.retrieve(request.question, {
      episodeId: request.episodeId,
      minScore: this.config.AI_MIN_SCORE,
      limit: this.config.AI_MAX_SOURCES,
    });

    let answer = "";
    if (passages.length > 0) {
      const result = await this.provider.answer({
        question: request.question,
        passages,
      });
      answer = result.answer;
    }

    const noMatch = passages.length === 0 || answer.trim().length === 0;
    const sources: AskSource[] = noMatch
      ? []
      : passages.map(({ context: _context, ...source }) => source);
    const latencyMs = Date.now() - startedAt;

    await this.log({
      request,
      subject,
      resultCount: sources.length,
      noMatch,
      latencyMs,
    });

    return {
      question: request.question,
      answer: noMatch
        ? "I could not find that in the archive yet. The answer only ever comes from conversations that have been published and transcribed."
        : answer,
      noMatch,
      sources,
      suggestions: noMatch ? await this.suggestions() : [],
      usage,
      mode: this.provider.mode,
      latencyMs,
    };
  }

  private buildUsage(tier: AskTier, used: number): AskUsage {
    const dailyLimit = ASK_DAILY_LIMITS[tier];
    return {
      tier,
      dailyLimit,
      used,
      remaining: dailyLimit === null ? null : Math.max(dailyLimit - used, 0),
      resetsAt: nextUtcMidnight().toISOString(),
    };
  }

  /**
   * Atomically increments the daily counter and rejects over-limit requests.
   * Enforcement is server-side only; the client counter is advisory.
   */
  private async consumeQuota(subject: AskSubject): Promise<AskUsage> {
    const dailyLimit = ASK_DAILY_LIMITS[subject.tier];
    const dayBucket = utcDayBucket();

    if (dailyLimit === null) {
      await this.prisma.aIQueryUsage.upsert({
        where: { subjectKey_dayBucket: { subjectKey: subject.key, dayBucket } },
        create: {
          subjectKey: subject.key,
          dayBucket,
          tier: subject.tier,
          queryCount: 1,
        },
        update: {
          queryCount: { increment: 1 },
          tier: subject.tier,
          lastQueryAt: new Date(),
        },
      });
      return this.buildUsage(subject.tier, 0);
    }

    const row = await this.prisma.aIQueryUsage.upsert({
      where: { subjectKey_dayBucket: { subjectKey: subject.key, dayBucket } },
      create: {
        subjectKey: subject.key,
        dayBucket,
        tier: subject.tier,
        queryCount: 1,
      },
      update: {
        queryCount: { increment: 1 },
        tier: subject.tier,
        lastQueryAt: new Date(),
      },
    });

    if (row.queryCount > dailyLimit) {
      const usage = this.buildUsage(subject.tier, dailyLimit);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests",
          message:
            subject.tier === "ANONYMOUS"
              ? "You have used today's free questions. Create a free account for ten a day."
              : "You have reached today's question limit. It resets at midnight UTC.",
          usage,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return this.buildUsage(subject.tier, row.queryCount);
  }

  /** Adjacent routes offered when retrieval finds nothing, so the user is never stranded. */
  private async suggestions(): Promise<AskSuggestion[]> {
    const [topics, episodes] = await Promise.all([
      this.prisma.topic.findMany({
        where: { episodes: { some: { episode: { status: "PUBLISHED" } } } },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
        take: 3,
        select: { name: true, slug: true },
      }),
      this.prisma.episode.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ publishedAt: "desc" }],
        take: 2,
        select: { title: true, slug: true },
      }),
    ]);

    return [
      ...topics.map((topic): AskSuggestion => ({
        label: topic.name,
        href: `/topics/${topic.slug}`,
        kind: "topic",
      })),
      ...episodes.map((episode): AskSuggestion => ({
        label: episode.title,
        href: `/episodes/${episode.slug}`,
        kind: "episode",
      })),
    ];
  }

  /** Logged without IP or email; the question hash supports dedupe analytics. */
  private async log(input: {
    request: AskRequest;
    subject: AskSubject;
    resultCount: number;
    noMatch: boolean;
    latencyMs: number;
  }): Promise<void> {
    try {
      await this.prisma.aIQueryLog.create({
        data: {
          questionHash: sha256(input.request.question.toLowerCase().trim()),
          question: input.request.question,
          tier: input.subject.tier,
          episodeId: input.request.episodeId ?? null,
          resultCount: input.resultCount,
          noMatch: input.noMatch,
          latencyMs: input.latencyMs,
          provider: this.config.AI_PROVIDER,
        },
      });
    } catch {
      // Analytics must never break the answer path.
    }
  }
}
