"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CornerDownLeft } from "lucide-react";
import type { AskResponse } from "@influential-minds/contracts";
import { ApiError, submitAsk } from "@/lib/api";

interface AskPanelProps {
  suggestions: string[];
  /** Scopes retrieval to one conversation on episode pages. */
  episodeId?: string;
  heading?: string;
}

export function AskPanel({
  suggestions,
  episodeId,
  heading = "Archive Search",
}: AskPanelProps) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function run(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 4) {
      setError("Ask a slightly longer question.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPending(true);
    setError(null);
    try {
      const response = await submitAsk(
        { question: trimmed, ...(episodeId ? { episodeId } : {}) },
        controller.signal
      );
      setResult(response);
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 429) {
        setError(
          cause.message ||
            "You have reached today's free question limit. Subscribe for unlimited access."
        );
      } else if (cause instanceof ApiError && cause.status === 503) {
        setError(
          "Ask the Archive is temporarily unavailable. The transcripts are still browsable below."
        );
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again."
        );
      }
      setResult(null);
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <div className="ask-tool">
      <div className="ask-tool-head">
        <span className="archive-symbol" aria-hidden="true">
          ¶
        </span>
        {heading}
        {result?.mode === "mock" ? (
          <span className="ask-mode-flag ask-mode-flag--mock">
            Development preview
          </span>
        ) : null}
        {result?.mode === "disabled" ? (
          <span className="ask-mode-flag">Sources only</span>
        ) : null}
      </div>

      <form
        onSubmit={event => {
          event.preventDefault();
          void run(question);
        }}
      >
        <label htmlFor="ask-question">Ask a question of the archive</label>
        <textarea
          id="ask-question"
          name="question"
          rows={2}
          maxLength={500}
          placeholder="What did the guests say about the limits of growth?"
          value={question}
          onChange={event => setQuestion(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void run(question);
            }
          }}
        />

        <div className="ask-submit-row">
          <span>Answers are grounded in indexed transcripts only.</span>
          <button
            type="submit"
            className="button button--cobalt"
            disabled={pending}
          >
            {pending ? "Searching…" : "Search the archive"}
            <CornerDownLeft size={12} aria-hidden="true" />
          </button>
        </div>

        {error ? (
          <p className="ask-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {suggestions.length > 0 && !result ? (
        <div className="suggestions">
          <span>Try one of these</span>
          {suggestions.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuestion(suggestion);
                void run(suggestion);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {result ? <AskResult result={result} /> : null}
    </div>
  );
}

function AskResult({ result }: { result: AskResponse }) {
  return (
    <div className="search-results" aria-live="polite">
      <div className="answer">
        <p className="result-label">
          {result.noMatch ? "No grounded match" : "Answer"}
        </p>
        <p>{result.answer}</p>
      </div>

      {result.noMatch && result.suggestions.length > 0 ? (
        <div className="suggestions" style={{ padding: "0 0 22px 43px" }}>
          <span>Where to look instead</span>
          {result.suggestions.map(suggestion => (
            <Link
              key={`${suggestion.kind}-${suggestion.href}`}
              href={suggestion.href}
            >
              {suggestion.label}
            </Link>
          ))}
        </div>
      ) : null}

      {result.sources.map((source, index) => (
        <article
          className="result-row"
          key={`${source.episodeId}-${source.startSeconds}`}
        >
          <span className="result-number">
            {`${index + 1}`.padStart(2, "0")}
          </span>
          <div className="result-main">
            <h4>
              <Link href={`/episodes/${source.episodeSlug}`}>
                {source.episodeTitle}
              </Link>
            </h4>
            {source.guestName ? (
              <p className="result-title">{source.guestName}</p>
            ) : null}
            <p className="result-excerpt">“{source.excerpt}”</p>
          </div>
          <div className="result-time">
            <span>{source.timecode}</span>
            <a
              href={source.momentUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Watch this moment <ArrowUpRight size={11} aria-hidden="true" />
            </a>
          </div>
        </article>
      ))}

      {result.usage.dailyLimit !== null ? (
        <p className="ask-usage">
          {result.usage.remaining ?? 0} of {result.usage.dailyLimit} free
          questions left today
        </p>
      ) : null}
    </div>
  );
}
