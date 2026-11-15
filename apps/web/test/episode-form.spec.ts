import { describe, expect, it } from "vitest";
import type { Episode } from "@influential-minds/contracts";
import {
  formatTimestamp,
  parseTimestamp,
  toForm,
  toPayload,
} from "../src/components/admin/episode-form";

/** An episode carrying every field the editor form has no input for. */
const episode = {
  id: "ep-1",
  slug: "conversation-with-rana-foroohar",
  title: "A Conversation with Rana Foroohar",
  episodeNumber: 3,
  season: 1,
  description: "Full description.",
  summary: "Short summary.",
  publishedAt: "2026-02-04T12:00:00.000Z",
  durationSeconds: 3600,
  status: "PUBLISHED",
  youtubeUrl: "https://www.youtube.com/watch?v=cughCiJVw1E",
  youtubeVideoId: "cughCiJVw1E",
  youtubePlaylistId: null,
  thumbnailUrl: "https://img.youtube.com/vi/cughCiJVw1E/hqdefault.jpg",
  spotifyUrl: null,
  applePodcastsUrl: null,
  lipsyncTracks: [
    { languageCode: "es", languageName: "Spanish", kind: "DUBBED_AUDIO" },
    { languageCode: "de", languageName: "German", kind: "LIPSYNC" },
  ],
  guests: [{ id: "guest-1" }],
  topics: [{ id: "topic-1" }],
  collections: [{ id: "collection-1" }],
  takeaways: [{ text: "Supply chains are political." }],
  quotes: [
    {
      text: "The supply chain is the story.",
      attribution: "Rana Foroohar",
      timestampSeconds: 754,
    },
    { text: "No attribution here.", attribution: null, timestampSeconds: null },
  ],
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  ogImageUrl: "https://cdn.example.com/og/rana.png",
} as unknown as Episode;

describe("episode form round-trip", () => {
  /**
   * The API replaces an episode wholesale, so a field the form drops is not
   * left alone — it is deleted. Loading and immediately saving must therefore
   * be a no-op for everything the editor cannot see.
   */
  it("preserves quotes, lipsync tracks and the share image on save", () => {
    const payload = toPayload(toForm(episode));

    expect(payload.quotes).toEqual([
      {
        text: "The supply chain is the story.",
        attribution: "Rana Foroohar",
        timestampSeconds: 754,
      },
      {
        text: "No attribution here.",
        attribution: null,
        timestampSeconds: null,
      },
    ]);
    expect(payload.lipsyncTracks).toEqual(episode.lipsyncTracks);
    expect(payload.ogImageUrl).toBe("https://cdn.example.com/og/rana.png");
  });

  it("keeps the rest of the episode intact", () => {
    const payload = toPayload(toForm(episode));

    expect(payload).toMatchObject({
      title: episode.title,
      guestIds: ["guest-1"],
      topicIds: ["topic-1"],
      collectionIds: ["collection-1"],
      takeaways: ["Supply chains are political."],
      seoTitle: "SEO title",
      status: "PUBLISHED",
    });
  });

  it("drops a quote the editor left blank", () => {
    const form = toForm(episode);
    form.quotes.push({ text: "   ", attribution: "Nobody", timestamp: "1:00" });

    expect(toPayload(form).quotes).toHaveLength(2);
  });
});

describe("parseTimestamp", () => {
  it.each([
    ["12:34", 754],
    ["1:02:03", 3723],
    ["90", 90],
    ["", null],
    ["not a time", null],
  ])("reads %j as %j", (input, expected) => {
    expect(parseTimestamp(input)).toBe(expected);
  });

  it("round-trips through formatTimestamp", () => {
    for (const seconds of [0, 59, 754, 3723]) {
      expect(parseTimestamp(formatTimestamp(seconds))).toBe(seconds);
    }
  });
});
