import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Play } from "lucide-react";
import { api, SITE_URL } from "@/lib/api";
import {
  durationLabel,
  episodeLabel,
  formatDate,
  guestNames,
  timecode,
  truncate,
} from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { EpisodeCard } from "@/components/EpisodeCard";
import { AskPanel } from "@/components/AskPanel";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await api.episodeOptional(slug);
  if (!payload) return { title: "Conversation not found" };

  const { episode } = payload;
  const description =
    episode.seoDescription ??
    truncate(episode.summary ?? episode.description, 200) ??
    `A conversation with ${guestNames(episode.guests)}.`;

  return {
    title: episode.seoTitle ?? episode.title,
    description,
    alternates: { canonical: `/episodes/${episode.slug}` },
    openGraph: {
      type: "video.episode",
      title: episode.seoTitle ?? episode.title,
      description,
      url: `${SITE_URL}/episodes/${episode.slug}`,
      images: [{ url: episode.ogImageUrl ?? episode.thumbnailUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: episode.seoTitle ?? episode.title,
      description,
      images: [episode.ogImageUrl ?? episode.thumbnailUrl],
    },
  };
}

export default async function EpisodePage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await api.episodeOptional(slug);
  if (!payload) notFound();

  const { episode, relatedEpisodes } = payload;
  const published = formatDate(episode.publishedAt);
  const duration = durationLabel(episode.durationSeconds);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    url: `${SITE_URL}/episodes/${episode.slug}`,
    description: episode.summary ?? episode.description ?? undefined,
    episodeNumber: episode.episodeNumber ?? undefined,
    datePublished: episode.publishedAt ?? undefined,
    timeRequired: episode.durationSeconds
      ? `PT${Math.round(episode.durationSeconds / 60)}M`
      : undefined,
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "Influential Minds",
      url: SITE_URL,
    },
    associatedMedia: {
      "@type": "VideoObject",
      name: episode.title,
      thumbnailUrl: episode.thumbnailUrl,
      embedUrl: episode.embedUrl,
      contentUrl: episode.youtubeUrl,
      uploadDate: episode.publishedAt ?? undefined,
    },
    author: episode.guests.map(guest => ({
      "@type": "Person",
      name: guest.name,
      jobTitle: guest.role ?? undefined,
      url: `${SITE_URL}/guests/${guest.slug}`,
    })),
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Archive</Link> /{" "}
          <Link href="/episodes">Conversations</Link> /{" "}
          <span>{episodeLabel(episode)}</span>
        </nav>
        <p className="section-kicker section-kicker--blue">
          {guestNames(episode.guests)}
        </p>
        <h1>{episode.title}</h1>
        {episode.summary ? <p>{episode.summary}</p> : null}
      </div>

      <div className="page-body">
        <div className="episode-detail">
          <div>
            <div className="video-frame">
              <iframe
                src={episode.embedUrl}
                title={`${episode.title} — video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>

            <div className="detail-meta">
              <span>{episodeLabel(episode)}</span>
              {published ? <span>{published}</span> : null}
              {duration ? <span>{duration}</span> : null}
              {episode.lipsyncTracks.length > 0 ? (
                <span>{episode.lipsyncTracks.length} dubbed audio tracks</span>
              ) : null}
              <a
                href={episode.watchUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                Watch on YouTube
              </a>
            </div>

            {episode.description ? (
              <section className="detail-section">
                <h2>About this conversation</h2>
                <div className="about-body" style={{ color: "var(--muted)" }}>
                  {episode.description}
                </div>
              </section>
            ) : null}

            {episode.takeaways.length > 0 ? (
              <section className="detail-section">
                <h2>Key takeaways</h2>
                <ul className="takeaway-list">
                  {episode.takeaways.map((takeaway, index) => (
                    <li key={takeaway.id}>
                      <span>{`${index + 1}`.padStart(2, "0")}</span>
                      <p style={{ margin: 0 }}>{takeaway.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {episode.quotes.length > 0 ? (
              <section className="detail-section">
                <h2>Moments worth quoting</h2>
                {episode.quotes.map(quote => (
                  <blockquote className="pull-quote" key={quote.id}>
                    “{quote.text}”
                    <footer>
                      {quote.attribution ?? guestNames(episode.guests)}
                      {quote.momentUrl ? (
                        <>
                          {" · "}
                          <a
                            href={quote.momentUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Watch this moment (
                            {timecode(quote.timestampSeconds ?? 0)})
                          </a>
                        </>
                      ) : null}
                    </footer>
                  </blockquote>
                ))}
              </section>
            ) : null}

            {episode.isAskable ? (
              <section
                className="detail-section ask-section"
                style={{ padding: "34px", marginTop: 50 }}
              >
                <p className="section-kicker section-kicker--blue">
                  Ask about this conversation
                </p>
                <AskPanel
                  suggestions={[]}
                  episodeId={episode.id}
                  heading="This conversation only"
                />
              </section>
            ) : null}

            {episode.transcript && episode.transcript.segments.length > 0 ? (
              <section className="detail-section">
                <h2>Transcript</h2>
                <div className="transcript-list">
                  {episode.transcript.segments.map(segment => (
                    <div className="transcript-line" key={segment.id}>
                      <a
                        href={segment.momentUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {timecode(segment.startSeconds)}
                      </a>
                      <p style={{ margin: 0 }}>
                        {segment.speaker ? <b>{segment.speaker}</b> : null}
                        {segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside>
            {episode.guests.length > 0 ? (
              <div className="sidebar-card">
                <h3>In this conversation</h3>
                <ul>
                  {episode.guests.map(guest => (
                    <li key={guest.id}>
                      <Link href={`/guests/${guest.slug}`}>
                        <strong>{guest.name}</strong>
                      </Link>
                      <br />
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>
                        {[guest.role, guest.company].filter(Boolean).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {episode.topics.length > 0 ? (
              <div className="sidebar-card">
                <h3>Ideas</h3>
                <div className="tag-row">
                  {episode.topics.map(topic => (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.slug}`}
                      className="tag"
                    >
                      {topic.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {episode.collections.length > 0 ? (
              <div className="sidebar-card">
                <h3>Part of</h3>
                <ul>
                  {episode.collections.map(collection => (
                    <li key={collection.id}>
                      <Link href={`/collections/${collection.slug}`}>
                        {collection.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="sidebar-card">
              <h3>Listen elsewhere</h3>
              <ul>
                <li>
                  <a
                    href={episode.watchUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    YouTube <Play size={11} aria-hidden="true" />
                  </a>
                </li>
                {episode.spotifyUrl ? (
                  <li>
                    <a
                      href={episode.spotifyUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Spotify <ArrowUpRight size={11} aria-hidden="true" />
                    </a>
                  </li>
                ) : null}
                {episode.applePodcastsUrl ? (
                  <li>
                    <a
                      href={episode.applePodcastsUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Apple Podcasts{" "}
                      <ArrowUpRight size={11} aria-hidden="true" />
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          </aside>
        </div>

        {relatedEpisodes.length > 0 ? (
          <section className="detail-section">
            <h2>Next in the archive</h2>
            <div className="episode-grid">
              {relatedEpisodes.map(related => (
                <EpisodeCard key={related.id} episode={related} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
