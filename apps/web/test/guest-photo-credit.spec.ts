import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GuestPhotoCredit } from "../src/components/GuestPhotoCredit";

describe("guest photo attribution", () => {
  it("keeps credits inside linked cards free of nested links", () => {
    const html = renderToStaticMarkup(
      createElement(GuestPhotoCredit, {
        headshotUrl: "/assets/guests/rana-foroohar.webp",
      })
    );
    expect(html).toContain("RaquelFlorez");
    expect(html).toContain("CC BY-SA 4.0");
    expect(html).toContain("Cropped, resized and converted to WebP.");
    expect(html).not.toContain("<a ");
  });

  it("links the source and derivative license on the profile", () => {
    const html = renderToStaticMarkup(
      createElement(GuestPhotoCredit, {
        headshotUrl: "/assets/guests/michael-spence.webp",
        linked: true,
      })
    );
    expect(html).toContain("Niccolò Caranti");
    expect(html).toContain(
      'href="https://commons.wikimedia.org/wiki/File:Michael_Spence_-_Trento_2013_01.JPG"'
    );
    expect(html).toContain(
      'href="https://creativecommons.org/licenses/by-sa/3.0/"'
    );
    expect(html).toContain("Cropped, resized, padded and converted to WebP.");
  });

  it("does not assign a license or creator to a supplied or missing portrait", () => {
    for (const headshotUrl of ["/assets/DrAnn.jpeg", null]) {
      expect(
        renderToStaticMarkup(createElement(GuestPhotoCredit, { headshotUrl }))
      ).toBe("");
    }
  });
});
