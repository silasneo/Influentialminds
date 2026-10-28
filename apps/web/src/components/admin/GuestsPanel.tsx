"use client";

import { useCallback, useEffect, useState } from "react";
import type { Guest } from "@influential-minds/contracts";
import { EDITORIAL_STATUSES } from "@influential-minds/contracts";
import { adminApi } from "@/lib/admin-client";
import {
  errorMessage,
  Field,
  PanelError,
  StatusPill,
  Toolbar,
  toList,
} from "./ui";

interface FormState {
  name: string;
  slug: string;
  role: string;
  company: string;
  bio: string;
  headshotUrl: string;
  websiteUrl: string;
  expertise: string;
  status: string;
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  role: "",
  company: "",
  bio: "",
  headshotUrl: "",
  websiteUrl: "",
  expertise: "",
  status: "DRAFT",
};

export function GuestsPanel() {
  const [items, setItems] = useState<Guest[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async (term: string) => {
    try {
      const result = await adminApi.guests({ search: term || undefined });
      setItems(result.items);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    void refresh("");
  }, [refresh]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(previous => ({ ...previous, [key]: value }));

  function openEditor(guest?: Guest) {
    setError(null);
    if (!guest) {
      setEditingId(null);
      setForm(EMPTY);
    } else {
      setEditingId(guest.id);
      setForm({
        name: guest.name,
        slug: guest.slug,
        role: guest.role ?? "",
        company: guest.company ?? "",
        bio: guest.bio ?? "",
        headshotUrl: guest.headshotUrl ?? "",
        websiteUrl: guest.websiteUrl ?? "",
        expertise: guest.expertise.join(", "),
        status: guest.status,
      });
    }
    setShowForm(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        role: form.role || null,
        company: form.company || null,
        bio: form.bio || null,
        headshotUrl: form.headshotUrl || null,
        websiteUrl: form.websiteUrl || null,
        expertise: toList(form.expertise),
        socialLinks: {},
        status: form.status,
      };
      if (editingId) await adminApi.updateGuest(editingId, payload);
      else await adminApi.createGuest(payload);
      setShowForm(false);
      await refresh(search);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function remove(guest: Guest) {
    if (!window.confirm(`Delete ${guest.name}?`)) return;
    try {
      await adminApi.deleteGuest(guest.id);
      await refresh(search);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <div>
      <PanelError error={error} />

      <Toolbar>
        <input
          type="search"
          placeholder="Search guests"
          value={search}
          onChange={event => setSearch(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") void refresh(search);
          }}
        />
        <button
          type="button"
          className="button button--ghost"
          onClick={() => void refresh(search)}
        >
          Search
        </button>
        <button
          type="button"
          className="button button--cobalt"
          onClick={() => openEditor()}
        >
          New guest
        </button>
      </Toolbar>

      {showForm ? (
        <form
          onSubmit={save}
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            padding: 24,
            marginBottom: 34,
          }}
        >
          <h2
            style={{
              fontSize: 24,
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            {editingId ? "Edit guest" : "New guest"}
          </h2>
          <div className="admin-grid" style={{ marginBottom: 0 }}>
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={event => set("name", event.target.value)}
              />
            </Field>
            <Field label="Slug">
              <input
                value={form.slug}
                onChange={event => set("slug", event.target.value)}
                placeholder="auto-generated"
              />
            </Field>
            <Field label="Role">
              <input
                value={form.role}
                onChange={event => set("role", event.target.value)}
              />
            </Field>
            <Field label="Company">
              <input
                value={form.company}
                onChange={event => set("company", event.target.value)}
              />
            </Field>
            <Field label="Headshot URL">
              <input
                value={form.headshotUrl}
                onChange={event => set("headshotUrl", event.target.value)}
              />
            </Field>
            <Field label="Website">
              <input
                value={form.websiteUrl}
                onChange={event => set("websiteUrl", event.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={event => set("status", event.target.value)}
              >
                {EDITORIAL_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Expertise" hint="Comma separated.">
            <input
              value={form.expertise}
              onChange={event => set("expertise", event.target.value)}
            />
          </Field>
          <Field label="Biography">
            <textarea
              rows={5}
              value={form.bio}
              onChange={event => set("bio", event.target.value)}
            />
          </Field>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="submit"
              className="button button--cobalt"
              disabled={pending}
            >
              {pending ? "Saving…" : "Save guest"}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setShowForm(false)}
            >
              Close
            </button>
          </div>
        </form>
      ) : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Conversations</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5}>No guests yet.</td>
            </tr>
          ) : (
            items.map(guest => (
              <tr key={guest.id}>
                <td>{guest.name}</td>
                <td>
                  {[guest.role, guest.company].filter(Boolean).join(", ") ||
                    "—"}
                </td>
                <td>{guest.episodeCount}</td>
                <td>
                  <StatusPill status={guest.status} />
                </td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => openEditor(guest)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => void remove(guest)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
