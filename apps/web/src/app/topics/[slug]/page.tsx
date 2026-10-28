import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, SITE_URL } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { EpisodeCard } from "@/components/EpisodeCard";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await api.topic(slug);
  if (!topic) return { title: "Idea not found" };

  const description =
    topic.seoDescription ??
    topic.description ??
    `Conversations about ${topic.name}.`;
  return {
    title: topic.seoTitle ?? topic.name,
    description,
    alternates: { canonical: `/topics/${topic.slug}` },
    openGraph: {
      title: topic.name,
      description,
      url: `${SITE_URL}/topics/${topic.slug}`,
    },
  };
}

export default async function TopicPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const topic = await api.topic(slug);
  if (!topic) notFound();

  const raw = query.page;
  const page =
    Number.parseInt((Array.isArray(raw) ? raw[0] : raw) || "1", 10) || 1;
  const episodes = await api.topicEpisodes(topic.slug, page);

  return (
    <PageShell>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Archive</Link> / <Link href="/topics">Ideas</Link> /{" "}
          <span>{topic.name}</span>
        </nav>
        <h1>{topic.name}</h1>
        <p>
          {topic.description ??
            `${topic.episodeCount} conversation${topic.episodeCount === 1 ? "" : "s"} in the archive.`}
        </p>
      </div>

      <div className="page-body">
        {episodes.items.length === 0 ? (
          <EmptyState
            title="Nothing filed here yet"
            body="Conversations are tagged as editorial reviews them."
            action={{ href: "/episodes", label: "Browse the archive" }}
          />
        ) : (
          <div className="episode-grid">
            {episodes.items.map(episode => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        )}

        <Pagination meta={episodes.meta} basePath={`/topics/${topic.slug}`} />
      </div>
    </PageShell>
  );
}
