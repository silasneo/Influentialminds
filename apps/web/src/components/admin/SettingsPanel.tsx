"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditableSiteSettings } from "@influential-minds/contracts";
import { adminApi } from "@/lib/admin-client";
import { errorMessage, Field, PanelError, toLines } from "./ui";

type FormState = Omit<EditableSiteSettings, "updatedAt" | "askSuggestions"> & {
  askSuggestions: string;
};

function toForm(settings: EditableSiteSettings): FormState {
  const { updatedAt: _updatedAt, askSuggestions, ...rest } = settings;
  return { ...rest, askSuggestions: askSuggestions.join("\n") };
}

export function SettingsPanel() {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      setForm(toForm(await adminApi.settings()));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!form) {
    return (
      <div>
        <PanelError error={error} />
        {error ? null : (
          <p style={{ color: "var(--muted)" }}>Loading settings…</p>
        )}
      </div>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(previous => (previous ? { ...previous, [key]: value } : previous));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const saved = await adminApi.updateSettings({
        ...form,
        askSuggestions: toLines(form.askSuggestions),
      });
      setForm(toForm(saved));
      setStatus("Settings saved.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save}>
      <PanelError error={error} />
      {status ? (
        <p style={{ color: "var(--cobalt)", marginBottom: 20 }}>{status}</p>
      ) : null}

      <h2
        style={{ fontSize: 24, textTransform: "uppercase", marginBottom: 18 }}
      >
        Brand
      </h2>
      <div className="admin-grid">
        <Field label="Site title">
          <input
            required
            value={form.siteTitle}
            onChange={event => set("siteTitle", event.target.value)}
          />
        </Field>
        <Field label="Tagline">
          <input
            required
            value={form.tagline}
            onChange={event => set("tagline", event.target.value)}
          />
        </Field>
      </div>
      <Field
        label="Meta description"
        hint="Used for search engines and link previews."
      >
        <textarea
          required
          rows={2}
          value={form.metaDescription}
          onChange={event => set("metaDescription", event.target.value)}
        />
      </Field>

      <h2
        style={{
          fontSize: 24,
          textTransform: "uppercase",
          margin: "34px 0 18px",
        }}
      >
        Hero
      </h2>
      <div className="admin-grid">
        <Field label="Eyebrow">
          <input
            required
            value={form.heroEyebrow}
            onChange={event => set("heroEyebrow", event.target.value)}
          />
        </Field>
        <Field label="Deck">
          <input
            required
            value={form.heroDeck}
            onChange={event => set("heroDeck", event.target.value)}
          />
        </Field>
        <Field label="Hero image URL">
          <input
            required
            value={form.heroImageUrl}
            onChange={event => set("heroImageUrl", event.target.value)}
          />
        </Field>
        <Field label="YouTube playlist URL">
          <input
            value={form.youtubePlaylistUrl ?? ""}
            onChange={event =>
              set("youtubePlaylistUrl", event.target.value || null)
            }
          />
        </Field>
      </div>
      <Field label="Hero body">
        <textarea
          required
          rows={3}
          value={form.heroBody}
          onChange={event => set("heroBody", event.target.value)}
        />
      </Field>

      <h2
        style={{
          fontSize: 24,
          textTransform: "uppercase",
          margin: "34px 0 18px",
        }}
      >
        Host
      </h2>
      <div className="admin-grid">
        <Field label="Host name">
          <input
            required
            value={form.hostName}
            onChange={event => set("hostName", event.target.value)}
          />
        </Field>
        <Field label="Host role">
          <input
            required
            value={form.hostRole}
            onChange={event => set("hostRole", event.target.value)}
          />
        </Field>
        <Field label="Portrait URL">
          <input
            required
            value={form.hostPortraitUrl}
            onChange={event => set("hostPortraitUrl", event.target.value)}
          />
        </Field>
      </div>
      <Field label="Short bio">
        <textarea
          required
          rows={3}
          value={form.hostBio}
          onChange={event => set("hostBio", event.target.value)}
        />
      </Field>
      <Field label="Long bio" hint="Shown on the About page.">
        <textarea
          rows={6}
          value={form.hostLongBio ?? ""}
          onChange={event => set("hostLongBio", event.target.value || null)}
        />
      </Field>
      <Field label="Pull quote">
        <textarea
          rows={2}
          value={form.hostQuote ?? ""}
          onChange={event => set("hostQuote", event.target.value || null)}
        />
      </Field>

      <h2
        style={{
          fontSize: 24,
          textTransform: "uppercase",
          margin: "34px 0 18px",
        }}
      >
        Newsletter
      </h2>
      <Field label="Heading">
        <input
          required
          value={form.newsletterHeading}
          onChange={event => set("newsletterHeading", event.target.value)}
        />
      </Field>
      <Field label="Body">
        <textarea
          required
          rows={2}
          value={form.newsletterBody}
          onChange={event => set("newsletterBody", event.target.value)}
        />
      </Field>

      <h2
        style={{
          fontSize: 24,
          textTransform: "uppercase",
          margin: "34px 0 18px",
        }}
      >
        Ask the Archive
      </h2>
      <Field
        label="Suggested questions"
        hint="One per line, up to twelve. These appear as prompt chips."
      >
        <textarea
          rows={6}
          value={form.askSuggestions}
          onChange={event => set("askSuggestions", event.target.value)}
        />
      </Field>

      <button
        type="submit"
        className="button button--cobalt"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
