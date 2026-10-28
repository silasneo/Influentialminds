import { describe, expect, it } from "vitest";
import {
  formatTimecode,
  parseTimecode,
  parseYouTubePlaylistId,
  parseYouTubeVideoId,
  youTubeWatchUrl,
} from "@influential-minds/contracts";

describe("parseYouTubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=cughCiJVw1E", "cughCiJVw1E"],
    ["https://youtu.be/tA-Yt0Ji6R0", "tA-Yt0Ji6R0"],
    ["https://www.youtube.com/embed/LvUy5EekZNc", "LvUy5EekZNc"],
    [
      "https://m.youtube.com/watch?v=X8I8IvY_JHA&list=PLaqXzRqTnPvCncnQM6zvC2vafHKg9a_bV",
      "X8I8IvY_JHA",
    ],
    ["MeRNbk-f4ZY", "MeRNbk-f4ZY"],
  ])("extracts the ID from %s", (input, expected) => {
    expect(parseYouTubeVideoId(input)).toBe(expected);
  });

  it.each([
    "",
    "https://vimeo.com/123456",
    "https://www.youtube.com/watch?v=tooshort",
    "not a url",
  ])("rejects %s", input => {
    expect(parseYouTubeVideoId(input)).toBeNull();
  });
});

describe("parseYouTubePlaylistId", () => {
  it("reads the list parameter", () => {
    expect(
      parseYouTubePlaylistId(
        "https://www.youtube.com/playlist?list=PLaqXzRqTnPvCncnQM6zvC2vafHKg9a_bV"
      )
    ).toBe("PLaqXzRqTnPvCncnQM6zvC2vafHKg9a_bV");
  });

  it("returns null when no playlist is present", () => {
    expect(
      parseYouTubePlaylistId("https://www.youtube.com/watch?v=cughCiJVw1E")
    ).toBeNull();
  });
});

describe("youTubeWatchUrl", () => {
  it("adds a start offset so Ask sources deep-link to the moment", () => {
    expect(youTubeWatchUrl("cughCiJVw1E", { startSeconds: 2790 })).toBe(
      "https://www.youtube.com/watch?v=cughCiJVw1E&t=2790"
    );
  });

  it("omits a zero or missing offset", () => {
    expect(youTubeWatchUrl("cughCiJVw1E", { startSeconds: 0 })).toBe(
      "https://www.youtube.com/watch?v=cughCiJVw1E"
    );
    expect(youTubeWatchUrl("cughCiJVw1E")).toBe(
      "https://www.youtube.com/watch?v=cughCiJVw1E"
    );
  });
});

describe("timecodes", () => {
  it("formats with hours only when needed", () => {
    expect(formatTimecode(185)).toBe("03:05");
    expect(formatTimecode(3725)).toBe("01:02:05");
  });

  it("round-trips through parseTimecode", () => {
    expect(parseTimecode(formatTimecode(3725))).toBe(3725);
    expect(parseTimecode("02:05")).toBe(125);
    expect(parseTimecode("90")).toBe(90);
  });

  it("rejects impossible values", () => {
    expect(parseTimecode("01:75")).toBeNull();
    expect(parseTimecode("abc")).toBeNull();
  });
});
