"use client";

import { useEffect, useState } from "react";
import type {
  AdminDashboard,
  AuditLogEntry,
} from "@influential-minds/contracts";
import { adminApi } from "@/lib/admin-client";
import { errorMessage, PanelError } from "./ui";

export function OverviewPanel() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [dashboard, log] = await Promise.all([
          adminApi.dashboard(),
          adminApi.auditLog(1),
        ]);
        if (!active) return;
        setData(dashboard);
        setAudit(log.items);
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) return <PanelError error={error} />;
  if (!data) return <p>Loading the overview…</p>;

  const counts: Array<[string, number]> = [
    ["Published", data.counts.publishedEpisodes],
    ["In review", data.counts.inReviewEpisodes],
    ["Drafts", data.counts.draftEpisodes],
    ["Archived", data.counts.archivedEpisodes],
    ["Guests", data.counts.guests],
    ["Topics", data.counts.topics],
    ["Collections", data.counts.collections],
    ["Leads", data.counts.leads],
    ["Leads (30 days)", data.counts.leadsLast30Days],
    ["Transcripts indexed", data.counts.transcriptsIndexed],
    ["Transcripts pending", data.counts.transcriptsPending],
    ["Ask queries (30 days)", data.counts.askQueriesLast30Days],
  ];

  return (
    <div>
      <div className="admin-grid">
        {counts.map(([label, value]) => (
          <div className="admin-stat" key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div
        className="sidebar-card"
        style={{ background: "var(--paper)", marginBottom: 38 }}
      >
        <h3>Ask the Archive</h3>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
          Mode <strong>{data.aiProvider.mode}</strong> via{" "}
          {data.aiProvider.providerName} · {data.aiProvider.indexedSegmentCount}{" "}
          indexed passages.
          {data.aiProvider.mode === "disabled"
            ? " Set ASK_PROVIDER and the provider credentials to enable live answers."
            : null}
        </p>
      </div>

      <h2
        style={{ fontSize: 22, textTransform: "uppercase", marginBottom: 16 }}
      >
        Recent leads
      </h2>
      <table className="admin-table" style={{ marginBottom: 38 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Source</th>
            <th>Captured</th>
          </tr>
        </thead>
        <tbody>
          {data.recentLeads.length === 0 ? (
            <tr>
              <td colSpan={4}>No leads captured yet.</td>
            </tr>
          ) : (
            data.recentLeads.map(lead => (
              <tr key={lead.id}>
                <td>{lead.name}</td>
                <td>{lead.email}</td>
                <td>{lead.sourcePage ?? "—"}</td>
                <td>{new Date(lead.createdAt).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2
        style={{ fontSize: 22, textTransform: "uppercase", marginBottom: 16 }}
      >
        Activity
      </h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {audit.length === 0 ? (
            <tr>
              <td colSpan={5}>No activity recorded yet.</td>
            </tr>
          ) : (
            audit.map(entry => (
              <tr key={entry.id}>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                <td>{entry.actorEmail ?? "system"}</td>
                <td>{entry.action}</td>
                <td>{entry.entity}</td>
                <td>{entry.summary ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
