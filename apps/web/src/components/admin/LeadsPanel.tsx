"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lead, LeadMagnet } from "@influential-minds/contracts";
import { adminApi } from "@/lib/admin-client";
import { errorMessage, Field, PanelError, Toolbar } from "./ui";
import { formatDate } from "@/lib/format";

const EMPTY_MAGNET = {
  id: "",
  title: "",
  description: "",
  fileUrl: "",
  fileName: "",
  coverUrl: "",
  active: true,
};

export function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [magnets, setMagnets] = useState<LeadMagnet[]>([]);
  const [magnetForm, setMagnetForm] = useState(EMPTY_MAGNET);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [leadPage, magnetList] = await Promise.all([
        adminApi.leads(),
        adminApi.leadMagnets(),
      ]);
      setLeads(leadPage.items);
      setMagnets(magnetList);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveMagnet(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = {
        title: magnetForm.title,
        description: magnetForm.description || null,
        fileUrl: magnetForm.fileUrl || null,
        fileName: magnetForm.fileName || null,
        coverUrl: magnetForm.coverUrl || null,
        active: magnetForm.active,
      };
      if (magnetForm.id)
        await adminApi.updateLeadMagnet(magnetForm.id, payload);
      else await adminApi.createLeadMagnet(payload);
      setMagnetForm(EMPTY_MAGNET);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <div>
      <PanelError error={error} />

      <section style={{ marginBottom: 50 }}>
        <Toolbar>
          <h2 style={{ fontSize: 24, textTransform: "uppercase", margin: 0 }}>
            Subscribers
          </h2>
          <a
            className="button button--ghost"
            href={adminApi.leadsExportUrl()}
            download
          >
            Export CSV
          </a>
          <button
            type="button"
            className="filter-chip"
            onClick={() => void refresh()}
          >
            Refresh
          </button>
        </Toolbar>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Resource</th>
              <th>Consent</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={5}>No subscribers yet.</td>
              </tr>
            ) : (
              leads.map(lead => (
                <tr key={lead.id}>
                  <td>{lead.email}</td>
                  <td>{lead.name || "—"}</td>
                  <td>{lead.leadMagnetTitle ?? "Newsletter"}</td>
                  <td>{lead.consent ? "Yes" : "No"}</td>
                  <td>{formatDate(lead.createdAt) ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2
          style={{ fontSize: 24, textTransform: "uppercase", marginBottom: 18 }}
        >
          Lead magnets
        </h2>
        <form
          onSubmit={saveMagnet}
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            padding: 20,
            marginBottom: 22,
          }}
        >
          <div className="admin-grid" style={{ marginBottom: 0 }}>
            <Field label="Title">
              <input
                required
                value={magnetForm.title}
                onChange={event =>
                  setMagnetForm({ ...magnetForm, title: event.target.value })
                }
              />
            </Field>
            <Field label="File URL" hint="Where the PDF or guide is hosted.">
              <input
                value={magnetForm.fileUrl}
                onChange={event =>
                  setMagnetForm({ ...magnetForm, fileUrl: event.target.value })
                }
              />
            </Field>
            <Field label="File name" hint="Shown on the download button.">
              <input
                value={magnetForm.fileName}
                onChange={event =>
                  setMagnetForm({ ...magnetForm, fileName: event.target.value })
                }
              />
            </Field>
            <Field label="Cover image URL">
              <input
                value={magnetForm.coverUrl}
                onChange={event =>
                  setMagnetForm({ ...magnetForm, coverUrl: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              rows={2}
              value={magnetForm.description}
              onChange={event =>
                setMagnetForm({
                  ...magnetForm,
                  description: event.target.value,
                })
              }
            />
          </Field>
          <label
            className="newsletter-consent"
            style={{ color: "var(--muted)", marginBottom: 16 }}
          >
            <input
              type="checkbox"
              checked={magnetForm.active}
              onChange={event =>
                setMagnetForm({ ...magnetForm, active: event.target.checked })
              }
            />
            <span>Offer this resource on the site</span>
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="button button--cobalt">
              {magnetForm.id ? "Update resource" : "Add resource"}
            </button>
            {magnetForm.id ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setMagnetForm(EMPTY_MAGNET)}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>File</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {magnets.length === 0 ? (
              <tr>
                <td colSpan={4}>No resources yet.</td>
              </tr>
            ) : (
              magnets.map(magnet => (
                <tr key={magnet.id}>
                  <td>{magnet.title}</td>
                  <td>{magnet.fileName ?? magnet.fileUrl ?? "—"}</td>
                  <td>{magnet.active ? "Yes" : "No"}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() =>
                        setMagnetForm({
                          id: magnet.id,
                          title: magnet.title,
                          description: magnet.description ?? "",
                          fileUrl: magnet.fileUrl ?? "",
                          fileName: magnet.fileName ?? "",
                          coverUrl: magnet.coverUrl ?? "",
                          active: magnet.active,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={async () => {
                        if (!window.confirm(`Delete “${magnet.title}”?`))
                          return;
                        try {
                          await adminApi.deleteLeadMagnet(magnet.id);
                          await refresh();
                        } catch (cause) {
                          setError(errorMessage(cause));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
