import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";

export const metadata: Metadata = {
  title: "People",
  description: "The thinkers, writers and builders who have been in the room.",
  alternates: { canonical: "/guests" },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GuestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = params.page;
  const page =
    Number.parseInt((Array.isArray(raw) ? raw[0] : raw) || "1", 10) || 1;
  const result = await api.guests({ page, perPage: 24 });

  return (
    <PageShell>
      <div className="page-header">
        <p className="section-kicker section-kicker--blue">The directory</p>
        <h1>
          Who has been <em>in the room</em>
        </h1>
        <p>
          {result.meta.total} guest{result.meta.total === 1 ? "" : "s"} across
          the archive. Each profile links to every conversation they appear in.
        </p>
      </div>

      <div className="page-body">
        {result.items.length === 0 ? (
          <EmptyState
            title="The directory is being written"
            body="Guest profiles are published alongside their conversations."
            action={{ href: "/episodes", label: "Browse conversations" }}
          />
        ) : (
          <div className="guest-grid">
            {result.items.map(guest => (
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
                <p>
                  {[guest.role, guest.company].filter(Boolean).join(", ") ||
                    "Pending editorial review."}
                </p>
                <div className="story-meta">
                  <span>
                    {guest.episodeCount} conversation
                    {guest.episodeCount === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Pagination meta={result.meta} basePath="/guests" />
      </div>
    </PageShell>
  );
}
