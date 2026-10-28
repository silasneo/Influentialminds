import Link from "next/link";
import { Play } from "lucide-react";
import type { EpisodeSummary } from "@influential-minds/contracts";
import {
  durationLabel,
  episodeLabel,
  guestNames,
  truncate,
} from "@/lib/format";

interface EpisodeCardProps {
  episode: EpisodeSummary;
  /** The first card on the homepage shelf is given double width by the grid. */
  lead?: boolean;
}

export function EpisodeCard({ episode, lead = false }: EpisodeCardProps) {
  const duration = durationLabel(episode.durationSeconds);

  return (
    <article className={`episode-card${lead ? " episode-card--lead" : ""}`}>
      <Link
        href={`/episodes/${episode.slug}`}
        className="episode-art episode-art--photo"
        aria-label={`Open ${episode.title}`}
      >
        <img src={episode.thumbnailUrl} alt="" loading="lazy" />
        <small>{episodeLabel(episode)}</small>
        <i aria-hidden="true">
          <Play size={15} fill="currentColor" />
        </i>
      </Link>

      <div className="episode-card-copy">
        <p className="editorial-label">{guestNames(episode.guests)}</p>
        <h3>
          <Link href={`/episodes/${episode.slug}`}>{episode.title}</Link>
        </h3>
        {episode.excerpt ? <p>{truncate(episode.excerpt, 150)}</p> : null}
        <div className="story-meta">
          {episode.topics.slice(0, 2).map(topic => (
            <span key={topic.id}>{topic.name}</span>
          ))}
          {duration ? <span>{duration}</span> : null}
        </div>
      </div>
    </article>
  );
}
