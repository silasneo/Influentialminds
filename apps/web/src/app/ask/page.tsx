import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { AskPanel } from "@/components/AskPanel";

export const metadata: Metadata = {
  title: "Ask the Archive",
  description:
    "Ask a question and get an answer grounded in indexed transcripts, with a deep link to the exact moment on video.",
  alternates: { canonical: "/ask" },
};

export default async function AskPage() {
  const payload = await api.homepage().catch(() => null);
  const suggestions = payload?.askSuggestions ?? [];
  const stats = payload?.stats;

  return (
    <PageShell>
      <section
        className="ask-section"
        style={{ paddingTop: "clamp(150px,15vw,210px)" }}
      >
        <div className="ask-layout">
          <div className="ask-lede">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link href="/">Archive</Link> / <span>Ask the Archive</span>
            </nav>
            <p className="section-kicker section-kicker--blue">
              Ask the archive
            </p>
            <h1>
              Search the <em>transcripts</em>
            </h1>
            <p>
              Answers are assembled only from passages that actually exist in
              the archive. If nothing matches, the archive says so rather than
              inventing one.
            </p>
            <small className="ask-note">
              {stats
                ? `${stats.askableEpisodeCount} of ${stats.episodeCount} conversations are transcript-indexed. `
                : ""}
              Free visitors get two questions a day; subscribers get unlimited
              access.
            </small>
          </div>
          <AskPanel suggestions={suggestions} />
        </div>
      </section>
    </PageShell>
  );
}
