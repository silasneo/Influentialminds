import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, SITE_URL } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { EpisodeCard } from "@/components/EpisodeCard";
import { EmptyState } from "@/components/EmptyState";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await api.collection(slug);
  if (!collection) return { title: "Collection not found" };

  const description =
    collection.seoDescription ??
    collection.description ??
    `A curated route through the Influential Minds archive.`;
  return {
    title: collection.seoTitle ?? collection.title,
    description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: collection.title,
      description,
      url: `${SITE_URL}/collections/${collection.slug}`,
      images: collection.coverUrl ? [{ url: collection.coverUrl }] : undefined,
    },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const collection = await api.collection(slug);
  if (!collection) notFound();

  const episodes = await api.collectionEpisodes(collection.slug);

  return (
    <PageShell>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Archive</Link> /{" "}
          <Link href="/collections">Collections</Link> /{" "}
          <span>{collection.title}</span>
        </nav>
        <p className="section-kicker section-kicker--blue">
          {collection.episodeCount} conversation
          {collection.episodeCount === 1 ? "" : "s"}
        </p>
        <h1>{collection.title}</h1>
        {collection.description ? <p>{collection.description}</p> : null}
      </div>

      <div className="page-body">
        {collection.curatorNote ? (
          <blockquote
            className="pull-quote"
            style={{ marginBottom: 44, maxWidth: 680 }}
          >
            {collection.curatorNote}
            <footer>Curator&rsquo;s note</footer>
          </blockquote>
        ) : null}

        {episodes.length === 0 ? (
          <EmptyState
            title="This collection is still being assembled"
            body="Episodes will appear here in the curator's order."
            action={{ href: "/episodes", label: "Browse the archive" }}
          />
        ) : (
          <div className="episode-grid">
            {episodes.map(episode => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
