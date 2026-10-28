import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { TranscriptService } from "../src/admin/transcript.service";
import type { PrismaService } from "../src/prisma/prisma.module";

/** `parse` is pure, so the Prisma dependency is never touched here. */
const service = new TranscriptService({} as PrismaService);

describe("TranscriptService.parse", () => {
  it("reads WebVTT cues, including the header and speaker prefixes", () => {
    const vtt = [
      "WEBVTT",
      "",
      "1",
      "00:00:05.000 --> 00:00:09.500",
      "Rana Foroohar: The supply chain is the story.",
      "",
      "2",
      "00:01:02.000 --> 00:01:05.000",
      "And that changes everything.",
    ].join("\n");

    const { segments } = service.parse(vtt);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      startSeconds: 5,
      endSeconds: 9,
      speaker: "Rana Foroohar",
      text: "The supply chain is the story.",
    });
    expect(segments[1]).toMatchObject({
      startSeconds: 62,
      endSeconds: 65,
      speaker: null,
    });
  });

  it("reads SRT comma-millisecond timestamps and joins wrapped lines", () => {
    const srt = [
      "1",
      "00:00:01,000 --> 00:00:04,000",
      "A long sentence",
      "split over two lines.",
    ].join("\n");

    const { segments } = service.parse(srt);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toBe("A long sentence split over two lines.");
  });

  it("reads bracketed plain-text transcripts", () => {
    const plain = [
      "[00:00:10] Lawrence: Welcome back.",
      "[00:02:30] Guest: Thanks for having me.",
    ].join("\n");

    const { segments } = service.parse(plain);

    expect(segments.map(segment => segment.startSeconds)).toEqual([10, 150]);
    expect(segments[1]?.speaker).toBe("Guest");
  });

  it("re-sorts out-of-order cues and reports it once", () => {
    const vtt = [
      "00:00:30.000 --> 00:00:32.000",
      "Second.",
      "",
      "00:00:10.000 --> 00:00:12.000",
      "First.",
    ].join("\n");

    const { segments, warnings } = service.parse(vtt);

    expect(segments.map(segment => segment.text)).toEqual([
      "First.",
      "Second.",
    ]);
    expect(warnings).toHaveLength(1);
  });

  it("strips inline markup so timecoded links never render tags", () => {
    const { segments } = service.parse(
      "00:00:01.000 --> 00:00:02.000\nHello <b>there</b>."
    );

    expect(segments[0]?.text).toBe("Hello there.");
  });

  it("rejects a file with no timestamps rather than storing an unusable transcript", () => {
    expect(() =>
      service.parse("Just some prose with no timings at all.")
    ).toThrow(BadRequestException);
  });
});
