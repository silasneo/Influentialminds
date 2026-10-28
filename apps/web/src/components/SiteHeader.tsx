"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
}

export const PRIMARY_NAV: NavLink[] = [
  { href: "/episodes", label: "Conversations" },
  { href: "/topics", label: "Ideas" },
  { href: "/guests", label: "People" },
  { href: "/collections", label: "Collections" },
  { href: "/about", label: "About" },
];

interface SiteHeaderProps {
  siteTitle: string;
  /** Transparent over a dark hero on the homepage, solid everywhere else. */
  overHero?: boolean;
}

export function SiteHeader({ siteTitle, overHero = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!overHero) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overHero]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const solid = !overHero || scrolled;
  const [first = "Influential", second = "Minds"] = siteTitle.split(" ");

  return (
    <header className={`site-nav${solid ? " site-nav--solid" : ""}`}>
      <Link href="/" className="wordmark" aria-label={`${siteTitle} — home`}>
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
      </Link>

      <nav className="desktop-links" aria-label="Primary">
        {PRIMARY_NAV.map(link => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname.startsWith(link.href) ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="nav-actions">
        <Link href="/ask" className="archive-trigger">
          <Search size={13} aria-hidden="true" />
          Ask the Archive
        </Link>
        <button
          type="button"
          className="mobile-icon"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Menu size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {menuOpen ? (
        <div className="mobile-menu" id="mobile-menu">
          {PRIMARY_NAV.map(link => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/ask">Ask the Archive</Link>
        </div>
      ) : null}
    </header>
  );
}
