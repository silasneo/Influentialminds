import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Ideas",
  description: "The themes the Influential Minds archive keeps returning to.",
  alternates: { canonical: "/topics" },
};

export default async function TopicsPage() {
  const topics = await api.topics();

  return (
    <PageShell>
      <div className="page-header">
        <p className="section-kicker section-kicker--blue">Explore by idea</p>
        <h1>
          The <em>index</em>
        </h1>
        <p>Every theme in the archive, with the conversations that argue it.</p>
      </div>

      <div className="page-body">
        {topics.length === 0 ? (
          <EmptyState
            title="Topics are awaiting curation"
            body="Editorial will tag conversations as the archive grows."
            action={{ href: "/episodes", label: "Browse conversations" }}
          />
        ) : (
          <div className="episode-grid">
            {topics.map(topic => (
              <article key={topic.id} className="episode-card">
                <div className="episode-card-copy" style={{ paddingTop: 18 }}>
                  <p className="editorial-label">
                    {topic.episodeCount} conversation
                    {topic.episodeCount === 1 ? "" : "s"}
                  </p>
                  <h3>
                    <Link href={`/topics/${topic.slug}`}>{topic.name}</Link>
                  </h3>
                  {topic.description ? <p>{topic.description}</p> : null}
                  <div className="story-meta">
                    <Link href={`/topics/${topic.slug}`} className="text-link">
                      Open <ArrowUpRight size={11} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
