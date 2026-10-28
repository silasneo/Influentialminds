/**
 * Seeds the database with the only episode metadata that has been verified
 * against the public YouTube playlist (see `youtube_playlist_findings.md`).
 *
 * Nothing here is invented. Where a fact has not been confirmed — biographies,
 * recording dates, topic taxonomy — the record carries an explicit
 * "Pending editorial review" marker for the editorial team to replace in the
 * admin console. Running this script repeatedly is safe.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  slugify,
  youTubeThumbnailUrl,
  youTubeWatchUrl,
} from "@influential-minds/contracts";

const prisma = new PrismaClient();

const PLAYLIST_ID = "PLaqXzRqTnPvCncnQM6zvC2vafHKg9a_bV";
const PENDING = "Pending editorial review.";

interface VerifiedEpisode {
  playlistPosition: number;
  guestName: string;
  videoId: string;
  /** Null where the playlist listing did not expose a duration. */
  durationSeconds: number | null;
}

const toSeconds = (clock: string): number =>
  clock
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);

/** Every entry below was read directly from the playlist; see the findings doc. */
const VERIFIED_EPISODES: VerifiedEpisode[] = [
  {
    playlistPosition: 1,
    guestName: "Rana Foroohar",
    videoId: "cughCiJVw1E",
    durationSeconds: toSeconds("46:30"),
  },
  {
    playlistPosition: 2,
    guestName: "Harmeet Sawhney",
    videoId: "tA-Yt0Ji6R0",
    durationSeconds: toSeconds("1:08:50"),
  },
  {
    playlistPosition: 3,
    guestName: "Steven, Bob, and Jay Novella",
    videoId: "LvUy5EekZNc",
    durationSeconds: toSeconds("59:00"),
  },
  {
    playlistPosition: 4,
    guestName: "Jennifer Sciubba",
    videoId: "X8I8IvY_JHA",
    durationSeconds: toSeconds("1:02:24"),
  },
  {
    playlistPosition: 5,
    guestName: "Steve Hamm",
    videoId: "MeRNbk-f4ZY",
    durationSeconds: toSeconds("1:01:33"),
  },
  {
    playlistPosition: 6,
    guestName: "Michael Spence",
    videoId: "ACqnpVmmRFo",
    durationSeconds: toSeconds("1:11:02"),
  },
  {
    playlistPosition: 7,
    guestName: "Sebastian Mallaby",
    videoId: "Kjgv_MY2OzE",
    durationSeconds: toSeconds("55:53"),
  },
  {
    playlistPosition: 8,
    guestName: "Julio M. Ottino",
    videoId: "qcjQK7-wovg",
    durationSeconds: toSeconds("1:01:44"),
  },
  {
    playlistPosition: 12,
    guestName: "Jesper Brodin",
    videoId: "S2nj2IKXE4Y",
    durationSeconds: null,
  },
  {
    playlistPosition: 16,
    guestName: "Ann Christine Duhaime",
    videoId: "vPJhbI81jSw",
    durationSeconds: null,
  },
];

async function seedSiteSettings(): Promise<void> {
  const data = {
    siteTitle: "Influential Minds",
    tagline: "Conversations with the people shaping how we think.",
    heroEyebrow: "A conversation series",
    heroDeck: "Influential Minds",
    heroBody:
      "Long-form conversations with researchers, founders and writers about the ideas changing how we live and work. Every answer in this archive is drawn from something a guest actually said on the record.",
    heroImageUrl: "/assets/hero.png",
    hostName: "Lawrence",
    hostRole: "Host",
    hostPortraitUrl: "/assets/HostDrJones.png",
    hostBio: PENDING,
    hostQuote: null,
    hostLongBio: PENDING,
    youtubePlaylistUrl: `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`,
    newsletterHeading: "Join the room",
    newsletterBody:
      "One email per conversation, with the notes and references that did not make the edit.",
    metaDescription:
      "Long-form conversations with the researchers, founders and writers shaping how we think.",
    askSuggestions: [
      "What have guests said about the limits of economic growth?",
      "Which conversations touch on technology and public trust?",
      "What did guests say about how institutions change?",
    ],
  };

  await prisma.siteSetting.upsert({
    where: { id: "site" },
    create: { id: "site", ...data },
    update: data,
  });
}

async function seedAdminUser(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@influentialminds.local";
  const password =
    process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeImmediately!2026";

  await prisma.adminUser.upsert({
    where: { email },
    create: {
      email,
      name: "Site administrator",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      passwordHash: await bcrypt.hash(password, 12),
    },
    update: {},
  });

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      `\n  Seeded administrator ${email} with the default password. Change it before deploying.\n`
    );
  }
}

async function main(): Promise<void> {
  await seedSiteSettings();
  await seedAdminUser();

  // A single honest placeholder topic: real taxonomy is an editorial decision.
  const topic = await prisma.topic.upsert({
    where: { slug: "pending-editorial-review" },
    create: {
      slug: "pending-editorial-review",
      name: "Awaiting curation",
      description:
        "Topics have not been assigned yet. An editor can create the real taxonomy and reassign every conversation from the admin console.",
      featured: true,
      sortOrder: 0,
    },
    update: {},
  });

  const episodeIds: string[] = [];

  for (const entry of VERIFIED_EPISODES) {
    const title = `Influential Minds: A Conversation with ${entry.guestName}`;
    const slug = slugify(`conversation-with-${entry.guestName}`);
    const guestSlug = slugify(entry.guestName);

    const guest = await prisma.guest.upsert({
      where: { slug: guestSlug },
      create: {
        slug: guestSlug,
        name: entry.guestName,
        role: null,
        company: null,
        bio: PENDING,
        headshotUrl: null,
        expertise: [],
        socialLinks: {},
        status: "PUBLISHED",
      },
      update: {},
    });

    const episodeData = {
      title,
      episodeNumber: entry.playlistPosition,
      description: PENDING,
      summary: null,
      // The playlist listing does not expose publication dates, so this stays
      // null rather than guessing; the archive sorts on episode number instead.
      publishedAt: null,
      durationSeconds: entry.durationSeconds,
      status: "PUBLISHED" as const,
      youtubeVideoId: entry.videoId,
      youtubeUrl: youTubeWatchUrl(entry.videoId, { playlistId: PLAYLIST_ID }),
      youtubePlaylistId: PLAYLIST_ID,
      thumbnailUrl: youTubeThumbnailUrl(entry.videoId),
      lipsyncTracks: [],
      seoDescription: `Watch the full Influential Minds conversation with ${entry.guestName}.`,
    };

    const episode = await prisma.episode.upsert({
      where: { slug },
      create: { slug, ...episodeData },
      update: episodeData,
    });
    episodeIds.push(episode.id);

    await prisma.episodeGuest.upsert({
      where: {
        episodeId_guestId: { episodeId: episode.id, guestId: guest.id },
      },
      create: { episodeId: episode.id, guestId: guest.id, sortOrder: 0 },
      update: {},
    });

    await prisma.episodeTopic.upsert({
      where: {
        episodeId_topicId: { episodeId: episode.id, topicId: topic.id },
      },
      create: { episodeId: episode.id, topicId: topic.id },
      update: {},
    });
  }

  // Playlist order is itself a verified fact, so it makes a defensible collection.
  const collection = await prisma.collection.upsert({
    where: { slug: "the-complete-playlist" },
    create: {
      slug: "the-complete-playlist",
      title: "The complete playlist",
      description:
        "Every verified conversation, in the order it appears on the public YouTube playlist.",
      curatorNote: PENDING,
      featured: true,
      sortOrder: 0,
    },
    update: {},
  });

  await prisma.collectionEpisode.deleteMany({
    where: { collectionId: collection.id },
  });
  await prisma.collectionEpisode.createMany({
    data: episodeIds.map((episodeId, index) => ({
      collectionId: collection.id,
      episodeId,
      sortOrder: index,
    })),
  });

  await prisma.leadMagnet.upsert({
    where: { id: "seed-lead-magnet" },
    create: {
      id: "seed-lead-magnet",
      title: "The Influential Minds reading list",
      description:
        "Upload the PDF in the admin console under Lead magnets, then activate it to start capturing subscribers.",
      fileUrl: null,
      fileName: null,
      active: true,
    },
    update: {},
  });

  console.log(
    `Seeded ${VERIFIED_EPISODES.length} verified conversations, ${VERIFIED_EPISODES.length} guests, 1 topic and 1 collection.`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
