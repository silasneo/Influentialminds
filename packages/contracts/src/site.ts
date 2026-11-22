import { z } from "zod";
import type { EpisodeSummary } from "./episode.js";
import type { GuestSummary } from "./guest.js";
import type { LeadMagnet } from "./lead.js";
import type { CollectionSummary, TopicSummary } from "./taxonomy.js";

/**
 * Editable brand/host copy. The brief requires the tagline and host text to be
 * CMS-managed rather than locked into the markup.
 */
export interface SiteSettings {
  siteTitle: string;
  tagline: string;
  heroEyebrow: string;
  heroDeck: string;
  heroBody: string;
  heroImageUrl: string;
  hostName: string;
  hostRole: string;
  hostPortraitUrl: string;
  hostBio: string;
  hostQuote: string | null;
  hostLongBio: string | null;
  youtubePlaylistUrl: string | null;
  newsletterHeading: string;
  newsletterBody: string;
  metaDescription: string;
  updatedAt: string;
}

/** Host copy and portrait supplied by the site owner. Editable through Site settings. */
export const DEFAULT_HOST_PROFILE = {
  hostName: "Dr. Lawrence Jones",
  hostRole: "Host",
  hostPortraitUrl: "/assets/Lawrence-Jones.webp",
  hostBio:
    "Dr. Lawrence Jones is a polymathic thought leader, award-winning author, keynote speaker, and accomplished practitioner with over thirty years of global experience in the energy industry. He is the Co-Founder, President, and Chief Empowerment and Futures Officer of the Energy Plexus Institute (EPI), and the founder and host of Global Circuit Exchange and Influential Minds.",
  hostLongBio: [
    "Dr. Lawrence Jones is a polymathic thought leader, award-winning author, keynote speaker, and accomplished practitioner with over thirty years of global experience in the energy industry. Renowned for his interdisciplinary and cross-sectoral approach, he brings a distinctive lens to complex global challenges, focusing on the intersection of energy, water, mining, brain economy, food systems, AI, urbanization, deep tech, and adjacent sectors. He champions a strategic framework grounded in hindsight, insight, and foresight to unlock opportunities and address emerging global challenges. A leading advocate for electricity diplomacy and mentorship for future leaders, he emphasizes the role of technology, demographics, geopolitics, and geoeconomics in shaping global energy futures. He is the Co-Founder, President, and Chief Empowerment and Futures Officer of the Energy Plexus Institute (EPI), headquartered in Geneva, Switzerland. EPI is a global platform enabling energy system-centric collaboration by convening the broader energy ecosystem—including critical industries, investors, policymakers, and technology leaders—to navigate complex interdependencies between energy, water, transport, digital infrastructure, and industrial sectors, while accounting for regional differences.",
    "Dr. Jones also founded and is host of Global Circuit Exchange and Influential Minds, two global conversation series spotlighting prominent voices from across energy, finance, governments, and adjacent industries. Guests have included Nobel Laureates as guests, leading philanthropists, and best-selling authors. In 2024, Dr. Jones was inducted as an International Fellow of the Royal Swedish Academy of Engineering Sciences. He serves on the global board of the World Resources Institute, is a Senior Associate (non-resident) at the Center for Strategic and International Studies, and advises several organizations, including Lyten Inc., Radix LLC, and Geneva Energy Forum.",
    "From 2015 to 2025, he served as Vice President and later Senior Vice President of International Programs at the Edison Electric Institute (EEI), where he significantly expanded the international reach, growing membership to more than 70 electric companies with operations in over 90 countries and collectively providing electricity to more than 3.5 billion people. Prior to joining EEI in 2015, Dr. Jones held leadership roles at Alstom USA, serving as the Vice President of Utility, Innovation, and Infrastructure Resilience, and as the Vice President of Policy, Regulatory Affairs, and Industry Relations in North America. He was a visiting researcher at Électricité de France and work on several special projects for ABB Power Systems in Sweden.",
    "Born in Monrovia, Liberia, Dr. Jones earned his MSc, Licentiate and Ph.D. degrees in Electrical Engineering from the Royal Institute of Technology in Stockholm, Sweden. His recognition includes the Gen X Leaders in Energy Award (2021) and being named among Africa’s most influential power sector leaders (2020) by Africa Power and Energy Elites.",
  ].join("\n\n"),
} satisfies Pick<
  SiteSettings,
  "hostName" | "hostRole" | "hostPortraitUrl" | "hostBio" | "hostLongBio"
>;

/** Admin-facing settings payload; the console also edits the Ask prompt suggestions. */
export interface EditableSiteSettings extends SiteSettings {
  askSuggestions: string[];
}

export interface HomepagePayload {
  settings: SiteSettings;
  featuredEpisode: EpisodeSummary | null;
  latestEpisodes: EpisodeSummary[];
  topics: TopicSummary[];
  guests: GuestSummary[];
  collections: CollectionSummary[];
  leadMagnet: LeadMagnet | null;
  askSuggestions: string[];
  stats: {
    episodeCount: number;
    guestCount: number;
    topicCount: number;
    askableEpisodeCount: number;
  };
}

export const siteSettingsWriteSchema = z.object({
  siteTitle: z.string().min(1).max(160),
  tagline: z.string().min(1).max(240),
  heroEyebrow: z.string().min(1).max(240),
  heroDeck: z.string().min(1).max(600),
  heroBody: z.string().min(1).max(2000),
  heroImageUrl: z.string().min(1).max(1024),
  hostName: z.string().min(1).max(160),
  hostRole: z.string().min(1).max(200),
  hostPortraitUrl: z.string().min(1).max(1024),
  hostBio: z.string().min(1).max(8000),
  hostQuote: z.string().max(1200).nullish(),
  hostLongBio: z.string().max(20000).nullish(),
  youtubePlaylistUrl: z.string().max(1024).nullish(),
  newsletterHeading: z.string().min(1).max(240),
  newsletterBody: z.string().min(1).max(2000),
  metaDescription: z.string().min(1).max(400),
  askSuggestions: z.array(z.string().min(1).max(200)).max(12).default([]),
});
export type SiteSettingsWriteInput = z.input<typeof siteSettingsWriteSchema>;

export type SiteSettingsWrite = z.output<typeof siteSettingsWriteSchema>;
