import { z } from "zod";

/**
 * YouTube helpers live in the shared package so the admin URL parser, the API
 * ingestion path and the public deep links all derive IDs and timestamps the
 * same way.
 */

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const candidate = url.pathname.split("/").filter(Boolean)[0];
    return candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
  }

  if (
    host !== "youtube.com" &&
    host !== "m.youtube.com" &&
    host !== "youtube-nocookie.com"
  ) {
    return null;
  }

  const fromQuery = url.searchParams.get("v");
  if (fromQuery && YOUTUBE_ID_PATTERN.test(fromQuery)) return fromQuery;

  const segments = url.pathname.split("/").filter(Boolean);
  const prefixed = ["embed", "v", "shorts", "live"];
  if (segments.length >= 2 && prefixed.includes(segments[0]!)) {
    const candidate = segments[1]!;
    return YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
  }

  return null;
}

export function parseYouTubePlaylistId(input: string): string | null {
  try {
    const value = new URL(input.trim()).searchParams.get("list");
    return value && /^[A-Za-z0-9_-]{2,64}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

/** Canonical high-resolution thumbnail for a video ID. */
export function youTubeThumbnailUrl(
  videoId: string,
  quality: "hq" | "maxres" = "hq"
): string {
  const file = quality === "maxres" ? "maxresdefault" : "hqdefault";
  return `https://i.ytimg.com/vi/${videoId}/${file}.jpg`;
}

export function youTubeWatchUrl(
  videoId: string,
  options?: { playlistId?: string | null; startSeconds?: number | null }
): string {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);
  if (options?.playlistId) url.searchParams.set("list", options.playlistId);
  if (
    typeof options?.startSeconds === "number" &&
    Number.isFinite(options.startSeconds) &&
    options.startSeconds > 0
  ) {
    url.searchParams.set("t", `${Math.floor(options.startSeconds)}`);
  }
  return url.toString();
}

export function youTubeEmbedUrl(
  videoId: string,
  startSeconds?: number | null
): string {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  if (
    typeof startSeconds === "number" &&
    Number.isFinite(startSeconds) &&
    startSeconds > 0
  ) {
    url.searchParams.set("start", `${Math.floor(startSeconds)}`);
  }
  return url.toString();
}

/** `3725` -> `01:02:05`; `185` -> `03:05`. */
export function formatTimecode(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** Accepts `01:02:05`, `1:02:05`, `02:05` or a raw second count. */
export function parseTimecode(value: string): number | null {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);

  const match = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(
    trimmed
  );
  if (!match) return null;

  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  const minutes = Number.parseInt(match[2]!, 10);
  const seconds = Number.parseInt(match[3]!, 10);
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export const youTubeUrlSchema = z
  .string()
  .refine(value => parseYouTubeVideoId(value) !== null, {
    message: "Must be a valid YouTube video URL or 11-character video ID",
  });
