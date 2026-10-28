import { getSettings } from "@/lib/settings";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface PageShellProps {
  children: React.ReactNode;
  overHero?: boolean;
}

/** Header + footer wrapper used by every public route so chrome stays identical. */
export async function PageShell({
  children,
  overHero = false,
}: PageShellProps) {
  const settings = await getSettings();

  return (
    <div className="site-shell">
      <SiteHeader siteTitle={settings.siteTitle} overHero={overHero} />
      <main id="main">{children}</main>
      <SiteFooter
        siteTitle={settings.siteTitle}
        tagline={settings.tagline}
        youtubePlaylistUrl={settings.youtubePlaylistUrl}
      />
    </div>
  );
}
