import { formatTimecode } from "@influential-minds/contracts";
import type {
  EpisodeSummary,
  GuestSummary,
} from "@influential-minds/contracts";

/** The design uses two ink-on-colour card treatments plus a paper card. */
export const CARD_TONES = ["--ink", "--ink-soft", "--cobalt"] as const;

export function guestLine(guests: GuestSummary[]): string {
  if (guests.length === 0) return "Guest pending editorial review";
  return guests
    .map(guest => [guest.name, guest.role].filter(Boolean).join(" — "))
    .join(" · ");
}

export function guestNames(guests: GuestSummary[]): string {
  return guests.length > 0
    ? guests.map(guest => guest.name).join(", ")
    : "Influential Minds";
}

export function episodeLabel(episode: EpisodeSummary): string {
  return episode.episodeNumber === null
    ? "Conversation"
    : `Episode ${episode.episodeNumber.toString().padStart(2, "0")}`;
}

export function durationLabel(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
    : `${minutes} min`;
}

export function timecode(seconds: number): string {
  return formatTimecode(seconds);
}

export function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join("");
}

/** Truncates on a word boundary so cards never cut mid-word. */
export function truncate(value: string | null, max = 160): string {
  if (!value) return "";
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", max))}…`;
}
