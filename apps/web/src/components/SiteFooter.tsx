import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { PRIMARY_NAV } from "./SiteHeader";

interface SiteFooterProps {
  siteTitle: string;
  tagline: string;
  youtubePlaylistUrl: string | null;
}

export function SiteFooter({
  siteTitle,
  tagline,
  youtubePlaylistUrl,
}: SiteFooterProps) {
  const [first = "Influential", second = "Minds"] = siteTitle.split(" ");

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="wordmark wordmark--footer">
          <img
            className="wordmark-mark"
            src="/assets/logo-small.png"
            alt=""
            aria-hidden="true"
          />
          <span>
            <strong>{first.toUpperCase()}</strong>
            <strong>{second.toUpperCase()}</strong>
          </span>
        </div>

        <p>{tagline}</p>

        <nav className="footer-nav" aria-label="Footer">
          {PRIMARY_NAV.map(link => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/ask">Ask the Archive</Link>
          {youtubePlaylistUrl ? (
            <a
              href={youtubePlaylistUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              YouTube
            </a>
          ) : null}
        </nav>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {siteTitle}
        </span>
        <a href="#top" className="back-top">
          Back to top <ArrowUp size={11} aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
