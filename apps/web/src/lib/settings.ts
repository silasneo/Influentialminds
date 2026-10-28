import type { SiteSettings } from "@influential-minds/contracts";
import { api } from "./api";

/**
 * Chrome (header, footer, metadata) must still render if the API is unreachable,
 * otherwise a transient outage would take down every page rather than one panel.
 */
export const FALLBACK_SETTINGS: SiteSettings = {
  siteTitle: "Influential Minds",
  tagline:
    "Long-form conversations with the people shaping how we think about technology, economics and society.",
  heroEyebrow: "The Influential Minds Archive",
  heroDeck: "Conversations that take their time.",
  heroBody:
    "An editorial archive of long-form interviews, indexed so you can find the exact moment an idea was argued.",
  heroImageUrl: "/assets/hero.png",
  hostName: "Lawrence",
  hostRole: "Host",
  hostPortraitUrl: "/assets/HostDrJones.png",
  hostBio: "Pending editorial review.",
  hostQuote: null,
  hostLongBio: null,
  youtubePlaylistUrl: null,
  newsletterHeading: "Join the room",
  newsletterBody: "Occasional dispatches when a new conversation is published.",
  metaDescription:
    "Long-form conversations with the people shaping how we think about technology, economics and society.",
  updatedAt: new Date(0).toISOString(),
};

export async function getSettings(): Promise<SiteSettings> {
  try {
    return await api.settings();
  } catch {
    return FALLBACK_SETTINGS;
  }
}
