import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, SITE_URL } from "@/lib/api";
import { initials, truncate } from "@/lib/format";
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
  const guest = await api.guest(slug);
  if (!guest) return { title: "Guest not found" };

  const description =
    guest.seoDescription ??
    truncate(guest.bio, 200) ??
    `${guest.name} on Influential Minds.`;
  return {
    title: guest.seoTitle ?? guest.name,
    description,
    alternates: { canonical: `/guests/${guest.slug}` },
    openGraph: {
      type: "profile",
      title: guest.name,
      description,
      url: `${SITE_URL}/guests/${guest.slug}`,
      images: guest.headshotUrl ? [{ url: guest.headshotUrl }] : undefined,
    },
  };
}

export default async function GuestPage({ params }: PageProps) {
  const { slug } = await params;
  const guest = await api.guest(slug);
  if (!guest) notFound();

  const episodes = await api.guestEpisodes(guest.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: guest.name,
    jobTitle: guest.role ?? undefined,
    worksFor: guest.company
      ? { "@type": "Organization", name: guest.company }
      : undefined,
    description: guest.bio ?? undefined,
    image: guest.headshotUrl ?? undefined,
    url: `${SITE_URL}/guests/${guest.slug}`,
    sameAs: [guest.websiteUrl, ...Object.values(guest.socialLinks)].filter(
      (value): value is string => Boolean(value)
    ),
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
          <Link href="/">Archive</Link> / <Link href="/guests">People</Link> /{" "}
          <span>{guest.name}</span>
        </nav>
        <div className="guest-header">
          {guest.headshotUrl ? (
            <img src={guest.headshotUrl} alt={`Portrait of ${guest.name}`} />
          ) : (
            <span className="guest-placeholder">{initials(guest.name)}</span>
          )}
          <div>
            <h1>{guest.name}</h1>
            <p>
              {[guest.role, guest.company].filter(Boolean).join(", ") ||
                "Pending editorial review."}
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="episode-detail">
          <div>
            <section>
              <h2
                style={{
                  textTransform: "uppercase",
                  fontSize: 26,
                  marginBottom: 20,
                }}
              >
                Biography
              </h2>
              <p
                style={{
                  color: "var(--muted)",
                  maxWidth: 620,
                  whiteSpace: "pre-line",
                }}
              >
                {guest.bio ?? "Pending editorial review."}
              </p>
            </section>

            <section className="detail-section">
              <h2>
                Conversation{episodes.meta.total === 1 ? "" : "s"} (
                {episodes.meta.total})
              </h2>
              {episodes.items.length === 0 ? (
                <EmptyState
                  title="No published conversations yet"
                  body="This profile will link to conversations as soon as they are published."
                  action={{ href: "/episodes", label: "Browse the archive" }}
                />
              ) : (
                <div className="episode-grid">
                  {episodes.items.map(episode => (
                    <EpisodeCard key={episode.id} episode={episode} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside>
            {guest.expertise.length > 0 ? (
              <div className="sidebar-card">
                <h3>Expertise</h3>
                <div className="tag-row">
                  {guest.expertise.map(item => (
                    <span key={item} className="tag">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {guest.websiteUrl ||
            Object.values(guest.socialLinks).some(Boolean) ? (
              <div className="sidebar-card">
                <h3>Elsewhere</h3>
                <ul>
                  {guest.websiteUrl ? (
                    <li>
                      <a
                        href={guest.websiteUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Website
                      </a>
                    </li>
                  ) : null}
                  {Object.entries(guest.socialLinks)
                    .filter(([, value]) => Boolean(value))
                    .map(([key, value]) => (
                      <li key={key}>
                        <a
                          href={value}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {key === "x"
                            ? "X"
                            : key.charAt(0).toUpperCase() + key.slice(1)}
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
