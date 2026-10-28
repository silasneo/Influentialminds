import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AskMode } from "@influential-minds/contracts";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";
import type { RetrievalPassage } from "./retrieval.service";

export interface AnswerRequest {
  question: string;
  passages: RetrievalPassage[];
}

export interface AnswerResult {
  answer: string;
  mode: AskMode;
}

/**
 * Providers only ever synthesise prose. Sources are assembled from retrieval
 * records by the service, so a citation can never be hallucinated.
 */
export interface AskProvider {
  readonly mode: AskMode;
  answer(request: AnswerRequest): Promise<AnswerResult>;
}

export const ASK_PROVIDER = "ASK_PROVIDER";

/** Returns a clearly labelled extractive summary without calling any model. */
@Injectable()
export class MockAskProvider implements AskProvider {
  readonly mode: AskMode = "mock";

  async answer({ passages }: AnswerRequest): Promise<AnswerResult> {
    const lead = passages[0];
    if (!lead) return { answer: "", mode: this.mode };

    const body = passages
      .slice(0, 3)
      .map(
        passage =>
          `In “${passage.episodeTitle}”${passage.guestName ? ` with ${passage.guestName}` : ""}, at ${passage.timecode}: “${passage.excerpt}”`
      )
      .join("\n\n");

    return {
      answer: `[Development preview — no language model was called.]\n\n${body}`,
      mode: this.mode,
    };
  }
}

/** Ask the Archive is switched off; the UI renders an explanatory state. */
@Injectable()
export class DisabledAskProvider implements AskProvider {
  readonly mode: AskMode = "disabled";

  async answer(): Promise<AnswerResult> {
    return { answer: "", mode: this.mode };
  }
}

@Injectable()
export class MindStudioAskProvider implements AskProvider {
  readonly mode: AskMode = "live";
  private readonly logger = new Logger(MindStudioAskProvider.name);

  constructor(@Inject(CONFIG_TOKEN) private readonly config: AppConfig) {}

  async answer({ question, passages }: AnswerRequest): Promise<AnswerResult> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.AI_PROVIDER_TIMEOUT_MS
    );

    const corpus = passages
      .map(
        (passage, index) =>
          `[${index + 1}] Episode: ${passage.episodeTitle}${passage.guestName ? ` (guest: ${passage.guestName})` : ""} @ ${passage.timecode}\n${passage.context || passage.excerpt}`
      )
      .join("\n\n");

    const prompt = [
      "You are the archivist for the Influential Minds conversation series.",
      "Answer the question using only the numbered passages below.",
      "If the passages do not contain the answer, reply with exactly: NO_ANSWER",
      "Write two or three sentences in the measured, editorial voice of the series. Do not invent names, dates or statistics.",
      "Do not output citations, links or timestamps — the interface renders those separately.",
      "",
      `Question: ${question}`,
      "",
      "Passages:",
      corpus,
    ].join("\n");

    try {
      const response = await fetch(
        `${this.config.AI_PROVIDER_BASE_URL.replace(/\/$/, "")}/v1/agents/${this.config.AI_PROVIDER_AGENT_ID ?? "default"}/run`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.config.AI_PROVIDER_API_KEY ?? ""}`,
          },
          body: JSON.stringify({ input: prompt, variables: { question } }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        this.logger.error(`AI provider returned ${response.status}`);
        return { answer: "", mode: this.mode };
      }

      const payload: unknown = await response.json();
      const text = this.extractText(payload);
      if (!text || text.trim().toUpperCase().startsWith("NO_ANSWER"))
        return { answer: "", mode: this.mode };
      return { answer: text.trim(), mode: this.mode };
    } catch (error) {
      this.logger.error(
        `AI provider request failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { answer: "", mode: this.mode };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Tolerates the common response envelopes rather than assuming one shape. */
  private extractText(payload: unknown): string | null {
    if (typeof payload === "string") return payload;
    if (!payload || typeof payload !== "object") return null;
    const record = payload as Record<string, unknown>;
    for (const key of [
      "result",
      "output",
      "response",
      "text",
      "answer",
      "message",
    ]) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) return value;
      if (value && typeof value === "object") {
        const nested = this.extractText(value);
        if (nested) return nested;
      }
    }
    return null;
  }
}
