import type { Metadata } from "next";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { EpisodeCard } from "@/components/EpisodeCard";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { ArchiveFilters } from "@/components/ArchiveFilters";

export const metadata: Metadata = {
  title: "Conversations",
  description:
    "Every published Influential Minds conversation, searchable by guest, idea and collection.",
  alternates: { canonical: "/episodes" },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function EpisodesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = single(params.search);
  const topic = single(params.topic);
  const sort = single(params.sort) || "newest";
  const page = Number.parseInt(single(params.page) || "1", 10) || 1;

  const [result, topics] = await Promise.all([
    api.episodes({
      search: search || undefined,
      topic: topic || undefined,
      sort,
      page,
      perPage: 12,
    }),
    api.topics().catch(() => []),
  ]);

  return (
    <PageShell>
      <div className="page-header">
        <p className="section-kicker section-kicker--blue">The archive</p>
        <h1>
          Every <em>conversation</em>
        </h1>
        <p>
          {result.meta.total} published conversation
          {result.meta.total === 1 ? "" : "s"}, indexed and deep-linked to the
          moment each idea was argued.
        </p>
      </div>

      <div className="page-body">
        <Suspense fallback={null}>
          <ArchiveFilters
            topics={topics}
            initialSearch={search}
            initialTopic={topic}
            initialSort={sort}
          />
        </Suspense>

        {result.items.length === 0 ? (
          <EmptyState
            title="No conversations match"
            body={
              search || topic
                ? "Try a broader search, or clear the filters to see the full archive."
                : "Conversations appear here as soon as they are published."
            }
            action={{ href: "/episodes", label: "Clear filters" }}
          />
        ) : (
          <div className="episode-grid">
            {result.items.map(episode => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        )}

        <Pagination
          meta={result.meta}
          basePath="/episodes"
          params={{ search, topic, sort: sort === "newest" ? "" : sort }}
        />
      </div>
    </PageShell>
  );
}
