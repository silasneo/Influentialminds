import Link from "next/link";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import type { HomepagePayload } from "@influential-minds/contracts";
import { api } from "@/lib/api";
import { FALLBACK_SETTINGS } from "@/lib/settings";
import {
  durationLabel,
  episodeLabel,
  guestLine,
  guestNames,
  initials,
  truncate,
} from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { EpisodeCard } from "@/components/EpisodeCard";
import { AskPanel } from "@/components/AskPanel";
import { LeadForm } from "@/components/LeadForm";
import { EmptyState } from "@/components/EmptyState";

export default async function HomePage() {
  let payload: HomepagePayload | null = null;
  try {
    payload = await api.homepage();
  } catch {
    payload = null;
  }

  if (!payload) {
    return (
      <PageShell>
        <div className="page-header">
          <h1>{FALLBACK_SETTINGS.siteTitle}</h1>
          <p>{FALLBACK_SETTINGS.tagline}</p>
        </div>
        <div className="page-body">
          <EmptyState
            title="The archive is warming up"
            body="We could not reach the content service. Please refresh in a moment — nothing has been lost."
            action={{ href: "/episodes", label: "Try the archive" }}
          />
        </div>
      </PageShell>
    );
  }

  const {
    settings,
    featuredEpisode,
    latestEpisodes,
    topics,
    guests,
    collections,
    leadMagnet,
    askSuggestions,
    stats,
  } = payload;
  const shelf = latestEpisodes
    .filter(episode => episode.id !== featuredEpisode?.id)
    .slice(0, 5);
  const collectionTones = [
    "collection-card--dark",
    "collection-card--blue",
    "collection-card--paper",
  ] as const;

  return (
    <PageShell overHero>
      {/* Hero */}
      <section
        className="hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(1,1,1,.86) 0%, rgba(1,1,1,.45) 55%, rgba(1,1,1,.2) 100%), url(${settings.heroImageUrl})`,
        }}
      >
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-brand">
              <img src="/assets/logo-small.png" alt="" aria-hidden="true" />
              <span>
                <strong>INFLUENTIAL MINDS</strong>
                <small>{settings.heroEyebrow}</small>
              </span>
            </div>
            <h1>
              The <em>archive</em> of ideas
            </h1>
            <p className="hero-deck">{settings.heroDeck}</p>
            <p className="hero-body">{settings.heroBody}</p>
            <div className="hero-ctas">
              <Link href="/episodes" className="button button--cobalt">
                Browse conversations <ArrowRight size={12} aria-hidden="true" />
              </Link>
              <Link href="/ask" className="text-link text-link--light">
                Ask the archive
              </Link>
            </div>
          </div>

          <div className="hero-index">
            <span>{`${stats.episodeCount}`.padStart(2, "0")}</span>
            <div>
              <b>Conversations</b>
              <small>
                {stats.guestCount} thinkers · {stats.topicCount} ideas
                <br />
                {stats.askableEpisodeCount} indexed for search
              </small>
            </div>
          </div>
        </div>
        <p className="hero-caption">{settings.tagline}</p>
      </section>

      {/* Featured conversation */}
      {featuredEpisode ? (
        <section
          className="feature-section section-paper"
          aria-labelledby="featured-heading"
        >
          <div className="section-heading">
            <div>
              <p className="section-kicker">This week in the room</p>
              <h2 id="featured-heading">
                Featured <em>conversation</em>
              </h2>
            </div>
            <p className="section-intro">
              The conversation we would start with if you only had one evening.
            </p>
          </div>

          <div className="feature-story">
            <div className="feature-image-wrap">
              <Link
                href={`/episodes/${featuredEpisode.slug}`}
                className="feature-video-link"
                aria-label={`Open ${featuredEpisode.title}`}
              >
                <img
                  className="feature-image"
                  src={featuredEpisode.thumbnailUrl}
                  alt=""
                />
                <span className="play-button" aria-hidden="true">
                  <Play size={22} fill="currentColor" />
                </span>
                <span className="image-note">
                  {episodeLabel(featuredEpisode)}
                </span>
              </Link>
            </div>

            <div className="feature-copy">
              <p className="editorial-label">{episodeLabel(featuredEpisode)}</p>
              <h3>{featuredEpisode.title}</h3>
              <p className="guest-line">
                with <strong>{guestNames(featuredEpisode.guests)}</strong>
              </p>
              {featuredEpisode.excerpt ? (
                <p className="feature-description">
                  {truncate(featuredEpisode.excerpt, 260)}
                </p>
              ) : null}
              <div className="story-meta">
                {featuredEpisode.topics.slice(0, 3).map(topic => (
                  <span key={topic.id}>{topic.name}</span>
                ))}
                {durationLabel(featuredEpisode.durationSeconds) ? (
                  <span>{durationLabel(featuredEpisode.durationSeconds)}</span>
                ) : null}
              </div>
              <Link
                href={`/episodes/${featuredEpisode.slug}`}
                className="text-link"
              >
                Read and watch <ArrowUpRight size={11} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Ask the Archive */}
      <section className="ask-section" id="ask" aria-labelledby="ask-heading">
        <div className="ask-layout">
          <div className="ask-lede">
            <p className="section-kicker section-kicker--blue">
              Ask the archive
            </p>
            <h2 id="ask-heading">
              Search the <em>transcripts</em>
            </h2>
            <p>
              Every answer is grounded in an indexed passage and links to the
              exact moment on video.
            </p>
            <small className="ask-note">
              {stats.askableEpisodeCount} of {stats.episodeCount} conversations
              are transcript-indexed. Free visitors get two questions a day.
            </small>
          </div>
          <AskPanel suggestions={askSuggestions} />
        </div>
      </section>

      {/* Latest conversations */}
      <section
        className="latest-section section-paper"
        aria-labelledby="latest-heading"
      >
        <div className="section-heading section-heading--latest">
          <div>
            <p className="section-kicker">The shelf</p>
            <h2 id="latest-heading">
              Latest <em>conversations</em>
            </h2>
          </div>
          <Link href="/episodes" className="text-link">
            All conversations <ArrowUpRight size={11} aria-hidden="true" />
          </Link>
        </div>

        {shelf.length === 0 ? (
          <EmptyState
            title="Nothing published yet"
            body="New conversations appear here as soon as the editorial team publishes them."
          />
        ) : (
          <div className="episode-shelf">
            {shelf.map((episode, index) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                lead={index === 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Explore by idea */}
      <section className="ideas-section" aria-labelledby="ideas-heading">
        <div className="ideas-inner">
          <div>
            <p className="section-kicker section-kicker--blue">
              Explore by idea
            </p>
            <h2 id="ideas-heading">
              The <em>index</em>
            </h2>
            <p className="ideas-copy">
              Themes the archive keeps returning to, each one a doorway into
              several conversations.
            </p>
          </div>

          {topics.length === 0 ? (
            <p className="ideas-copy">Topics are awaiting curation.</p>
          ) : (
            <div className="topic-list">
              {topics.slice(0, 8).map((topic, index) => (
                <Link key={topic.id} href={`/topics/${topic.slug}`}>
                  <span>{`${index + 1}`.padStart(2, "0")}</span>
                  {topic.name}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* People */}
      <section
        className="people-section section-paper"
        aria-labelledby="people-heading"
      >
        <div className="section-heading">
          <div>
            <p className="section-kicker">The people</p>
            <h2 id="people-heading">
              Who has been <em>in the room</em>
            </h2>
          </div>
          <Link href="/guests" className="text-link">
            Full directory <ArrowUpRight size={11} aria-hidden="true" />
          </Link>
        </div>

        {guests.length === 0 ? (
          <EmptyState
            title="The directory is being written"
            body="Guest profiles are published alongside their conversations."
          />
        ) : (
          <div className="guest-grid">
            {guests.slice(0, 8).map(guest => (
              <Link
                key={guest.id}
                href={`/guests/${guest.slug}`}
                className="guest-card"
              >
                {guest.headshotUrl ? (
                  <img src={guest.headshotUrl} alt="" loading="lazy" />
                ) : (
                  <span className="guest-placeholder">
                    {initials(guest.name)}
                  </span>
                )}
                <h3>{guest.name}</h3>
                <p>{guest.role ?? "Pending editorial review."}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* About the host */}
      <section className="about-section" aria-labelledby="about-heading">
        <div className="about-layout">
          <div>
            <p className="section-kicker section-kicker--blue">
              {settings.hostRole}
            </p>
            <h2 id="about-heading">
              About <em>{settings.hostName}</em>
            </h2>
            <div className="about-portrait-wrap">
              <img
                className="about-portrait"
                src={settings.hostPortraitUrl}
                alt={`Portrait of ${settings.hostName}`}
              />
            </div>
          </div>
          <div>
            {settings.hostQuote ? (
              <blockquote className="quote">“{settings.hostQuote}”</blockquote>
            ) : null}
            <p className="about-body">{settings.hostBio}</p>
            <Link href="/about" className="text-link text-link--light">
              More about the host <ArrowUpRight size={11} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section
        className="collections-section section-paper"
        aria-labelledby="collections-heading"
      >
        <div className="section-heading">
          <div>
            <p className="section-kicker">Curated paths</p>
            <h2 id="collections-heading">
              Where to <em>start</em>
            </h2>
          </div>
          <Link href="/collections" className="text-link">
            All collections <ArrowUpRight size={11} aria-hidden="true" />
          </Link>
        </div>

        {collections.length === 0 ? (
          <EmptyState
            title="Collections are being curated"
            body="Editor-picked routes through the archive will appear here."
          />
        ) : (
          <div className="collection-grid">
            {collections.slice(0, 3).map((collection, index) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.slug}`}
                className={`collection-card ${collectionTones[index % collectionTones.length]}`}
              >
                <span>Collection</span>
                <strong>{collection.title}</strong>
                <small>
                  {collection.episodeCount} conversation
                  {collection.episodeCount === 1 ? "" : "s"}{" "}
                  <ArrowUpRight size={11} aria-hidden="true" />
                </small>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Newsletter / lead magnet */}
      <section
        className="join-section"
        id="join"
        aria-labelledby="join-heading"
      >
        <div>
          <h2 id="join-heading">
            Join the <em>room</em>
          </h2>
          <LeadForm
            heading={settings.newsletterHeading}
            body={settings.newsletterBody}
            leadMagnet={leadMagnet}
            sourcePage="/"
          />
        </div>
        <div>
          {featuredEpisode ? <p>{guestLine(featuredEpisode.guests)}</p> : null}
          <p>
            No spam, no sponsorship inserts. Just a note when a new conversation
            lands, and the occasional reading list drawn from the archive.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
