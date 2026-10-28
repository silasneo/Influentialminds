"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, AdminApiError, type AdminProfile } from "@/lib/admin-client";

import { OverviewPanel } from "./OverviewPanel";
import { EpisodesPanel } from "./EpisodesPanel";
import { GuestsPanel } from "./GuestsPanel";
import { TaxonomyPanel } from "./TaxonomyPanel";
import { LeadsPanel } from "./LeadsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { UsersPanel } from "./UsersPanel";
import { MediaPanel } from "./MediaPanel";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "episodes", label: "Conversations" },
  { id: "guests", label: "Guests" },
  { id: "taxonomy", label: "Topics & collections" },
  { id: "leads", label: "Subscribers" },
  { id: "media", label: "Media" },
  { id: "settings", label: "Site settings" },
  { id: "users", label: "Team", superAdminOnly: true },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminConsole() {
  const router = useRouter();
  const [user, setUser] = useState<AdminProfile | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [error, setError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      router.replace("/admin");
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    adminApi
      .me()
      .then(session => {
        if (active) setUser(session);
      })
      .catch((cause: unknown) => {
        if (cause instanceof AdminApiError && cause.status === 401) {
          router.replace("/admin");
          return;
        }
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to reach the API."
          );
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="admin-shell">
        <p className="form-error" role="alert" style={{ color: "#b3261e" }}>
          {error}
        </p>
        <Link className="button button--ghost" href="/admin">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-shell">
        <p style={{ color: "var(--muted)" }}>Checking your session…</p>
      </div>
    );
  }

  const tabs = TABS.filter(
    item =>
      !("superAdminOnly" in item && item.superAdminOnly) ||
      user.role === "SUPER_ADMIN"
  );

  return (
    <div className="admin-shell">
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <p className="eyebrow">Editorial console</p>
          <h1
            style={{ fontFamily: "var(--serif)", fontSize: 40, lineHeight: 1 }}
          >
            Influential Minds
          </h1>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          <span>
            {user.name} · {user.role.replace("_", " ").toLowerCase()}
          </span>
          <Link className="filter-chip" href="/">
            View site
          </Link>
          <button
            type="button"
            className="filter-chip"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </header>

      <nav className="filter-bar" aria-label="Console sections">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            className={`filter-chip${tab === item.id ? " filter-chip--active" : ""}`}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="admin-panel">
        {tab === "overview" ? <OverviewPanel /> : null}
        {tab === "episodes" ? <EpisodesPanel /> : null}
        {tab === "guests" ? <GuestsPanel /> : null}
        {tab === "taxonomy" ? <TaxonomyPanel /> : null}
        {tab === "leads" ? <LeadsPanel /> : null}
        {tab === "media" ? <MediaPanel /> : null}
        {tab === "settings" ? <SettingsPanel /> : null}
        {tab === "users" ? <UsersPanel currentUserId={user.id} /> : null}
      </section>
    </div>
  );
}
