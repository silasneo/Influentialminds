import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import "./globals.css";

/**
 * Every public page is CMS-driven, so rendering happens per request and the
 * shared fetch cache (revalidate 300) absorbs the load. This also keeps
 * production builds independent of database availability.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${settings.siteTitle} — ${settings.tagline}`,
      template: `%s — ${settings.siteTitle}`,
    },
    description: settings.metaDescription,
    openGraph: {
      type: "website",
      siteName: settings.siteTitle,
      title: settings.siteTitle,
      description: settings.metaDescription,
      url: SITE_URL,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.siteTitle,
      description: settings.metaDescription,
    },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#010101",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" id="top">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
