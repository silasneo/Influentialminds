import { z } from "zod";

export const ASK_TIERS = ["ANONYMOUS", "REGISTERED", "SUBSCRIBER"] as const;
export type AskTier = (typeof ASK_TIERS)[number];

/**
 * Daily allowances from the Statement of Work. `null` means unlimited.
 * The V2 paid tier is modelled now but billing is intentionally not implemented.
 */
export const ASK_DAILY_LIMITS: Record<AskTier, number | null> = {
  ANONYMOUS: 2,
  REGISTERED: 10,
  SUBSCRIBER: null,
};

export interface AskUsage {
  tier: AskTier;
  /** `null` when the tier is unlimited. */
  dailyLimit: number | null;
  used: number;
  remaining: number | null;
  /** ISO timestamp at which the daily bucket resets. */
  resetsAt: string;
}

/** A single grounded retrieval hit. Never parsed out of model prose. */
export interface AskSource {
  episodeId: string;
  episodeSlug: string;
  episodeTitle: string;
  guestName: string | null;
  guestSlug: string | null;
  topicName: string | null;
  topicSlug: string | null;
  excerpt: string;
  startSeconds: number;
  timecode: string;
  /** YouTube deep link including the exact `?t=` second offset. */
  momentUrl: string;
  score: number;
}

export interface AskSuggestion {
  label: string;
  href: string;
  kind: "topic" | "episode" | "guest" | "collection";
}

export const ASK_MODES = ["live", "mock", "disabled"] as const;
export type AskMode = (typeof ASK_MODES)[number];

export interface AskResponse {
  question: string;
  /** Synthesised answer, kept visually distinct from the source list in the UI. */
  answer: string;
  /** True when no indexed passage met the relevance threshold. */
  noMatch: boolean;
  sources: AskSource[];
  /** Adjacent paths offered when `noMatch` is true. */
  suggestions: AskSuggestion[];
  usage: AskUsage;
  /** `mock` is only ever returned by a deliberately configured development provider. */
  mode: AskMode;
  latencyMs: number;
}

export const askRequestSchema = z.object({
  question: z.string().trim().min(4, "Ask a slightly longer question").max(500),
  /** Scopes retrieval to a single episode for the "Ask AI about this episode" module. */
  episodeId: z.string().min(1).optional(),
});
export type AskRequest = z.infer<typeof askRequestSchema>;

export interface AskRateLimitedBody {
  statusCode: 429;
  error: "Too Many Requests";
  message: string;
  usage: AskUsage;
}
