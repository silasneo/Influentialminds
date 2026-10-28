import type { Metadata } from "next";
import Link from "next/link";
import { api, SITE_URL } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { PageShell } from "@/components/PageShell";
import { LeadForm } from "@/components/LeadForm";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `About ${settings.hostName}`,
    description: settings.hostBio.slice(0, 200),
    alternates: { canonical: "/about" },
    openGraph: {
      title: `About ${settings.hostName}`,
      description: settings.hostBio.slice(0, 200),
      url: `${SITE_URL}/about`,
      images: [{ url: settings.hostPortraitUrl }],
    },
  };
}

export default async function AboutPage() {
  const [settings, leadMagnet] = await Promise.all([
    getSettings(),
    api.leadMagnet().catch(() => null),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings.hostName,
    jobTitle: settings.hostRole,
    description: settings.hostBio,
    image: settings.hostPortraitUrl,
    url: `${SITE_URL}/about`,
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
          <Link href="/">Archive</Link> / <span>About</span>
        </nav>
        <p className="section-kicker section-kicker--blue">
          {settings.hostRole}
        </p>
        <h1>
          About <em>{settings.hostName}</em>
        </h1>
        <p>{settings.tagline}</p>
      </div>

      <section className="about-section" style={{ borderTop: "0" }}>
        <div className="about-layout">
          <div>
            <div className="about-portrait-wrap" style={{ marginTop: 0 }}>
              <img
                className="about-portrait"
                src={settings.hostPortraitUrl}
                alt={`Portrait of ${settings.hostName}`}
              />
            </div>
            {settings.hostQuote ? (
              <blockquote className="quote">“{settings.hostQuote}”</blockquote>
            ) : null}
          </div>
          <div>
            <p className="about-body">
              {settings.hostLongBio ?? settings.hostBio}
            </p>
            {settings.youtubePlaylistUrl ? (
              <a
                className="text-link text-link--light"
                href={settings.youtubePlaylistUrl}
                target="_blank"
                rel="noreferrer noopener"
                style={{ marginTop: 28, display: "inline-flex" }}
              >
                Watch the full playlist
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="join-section" id="join">
        <div>
          <h2>
            Join the <em>room</em>
          </h2>
          <LeadForm
            heading={settings.newsletterHeading}
            body={settings.newsletterBody}
            leadMagnet={leadMagnet}
            sourcePage="/about"
          />
        </div>
        <div>
          <p>
            Influential Minds is an independent, long-form interview project.
            Conversations are published to YouTube and indexed here so that
            every argument can be found, cited and revisited.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
