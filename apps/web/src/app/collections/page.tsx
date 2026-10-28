import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Collections",
  description: "Editor-curated routes through the Influential Minds archive.",
  alternates: { canonical: "/collections" },
};

const TONES = [
  "collection-card--dark",
  "collection-card--blue",
  "collection-card--paper",
] as const;

export default async function CollectionsPage() {
  const collections = await api.collections();

  return (
    <PageShell>
      <div className="page-header">
        <p className="section-kicker section-kicker--blue">Curated paths</p>
        <h1>
          Where to <em>start</em>
        </h1>
        <p>
          Short, editor-picked routes through the archive for when you do not
          know where to begin.
        </p>
      </div>

      <div className="page-body">
        {collections.length === 0 ? (
          <EmptyState
            title="Collections are being curated"
            body="Editorial will publish reading paths as the archive grows."
            action={{ href: "/episodes", label: "Browse conversations" }}
          />
        ) : (
          <div className="collection-grid">
            {collections.map((collection, index) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.slug}`}
                className={`collection-card ${TONES[index % TONES.length]}`}
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
      </div>
    </PageShell>
  );
}
