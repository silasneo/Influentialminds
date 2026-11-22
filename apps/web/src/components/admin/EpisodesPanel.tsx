"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AdminEpisodeSummary,
  Collection,
  Episode,
  Guest,
  Topic,
} from "@influential-minds/contracts";
import { EDITORIAL_STATUSES } from "@influential-minds/contracts";
import { adminApi } from "@/lib/admin-client";
import {
  AdminTable,
  errorMessage,
  Field,
  PanelError,
  StatusPill,
  Toolbar,
} from "./ui";
import {
  EMPTY_FORM as EMPTY,
  toForm,
  toPayload,
  type FormState,
  type QuoteDraft,
} from "./episode-form";

export function EpisodesPanel() {
  const [items, setItems] = useState<AdminEpisodeSummary[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Episode | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");

  const refresh = useCallback(async (term: string) => {
    try {
      const result = await adminApi.episodes({ search: term || undefined });
      setItems(result.items);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    void refresh("");
    void (async () => {
      try {
        const [guestPage, topicList, collectionList] = await Promise.all([
          adminApi.guests({ page: 1 }),
          adminApi.topics(),
          adminApi.collections(),
        ]);
        setGuests(guestPage.items);
        setTopics(topicList);
        setCollections(collectionList);
      } catch (cause) {
        setError(errorMessage(cause));
      }
    })();
  }, [refresh]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(previous => ({ ...previous, [key]: value }));

  const updateQuote = (index: number, patch: Partial<QuoteDraft>) =>
    setForm(previous => ({
      ...previous,
      quotes: previous.quotes.map((quote, position) =>
        position === index ? { ...quote, ...patch } : quote
      ),
    }));

  const addQuote = () =>
    setForm(previous => ({
      ...previous,
      quotes: [
        ...previous.quotes,
        { text: "", attribution: "", timestamp: "" },
      ],
    }));

  const removeQuote = (index: number) =>
    setForm(previous => ({
      ...previous,
      quotes: previous.quotes.filter((_, position) => position !== index),
    }));

  const multiValue = useMemo(
    () => ({
      guestIds: form.guestIds,
      topicIds: form.topicIds,
      collectionIds: form.collectionIds,
    }),
    [form.guestIds, form.topicIds, form.collectionIds]
  );

  async function openEditor(id?: string) {
    setError(null);
    setNotice(null);
    setTranscriptText("");
    if (!id) {
      setEditing(null);
      setForm(EMPTY);
      setShowForm(true);
      return;
    }
    try {
      const episode = await adminApi.episode(id);
      setEditing(episode);
      setForm(toForm(episode));
      setShowForm(true);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const payload = toPayload(form);
      const saved = editing
        ? await adminApi.updateEpisode(editing.id, payload)
        : await adminApi.createEpisode(payload);
      setEditing(saved);
      setForm(toForm(saved));
      setNotice(`Saved â€œ${saved.title}â€.`);
      await refresh(search);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      await adminApi.changeEpisodeStatus(id, status);
      await refresh(search);
      setNotice(`Status updated to ${status.toLowerCase()}.`);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete â€œ${title}â€? This cannot be undone.`)) return;
    try {
      await adminApi.deleteEpisode(id);
      if (editing?.id === id) setShowForm(false);
      await refresh(search);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function uploadTranscript() {
    if (!editing || !transcriptText.trim()) return;
    setPending(true);
    setError(null);
    try {
      const transcript = await adminApi.uploadTranscript(editing.id, {
        language: "en",
        content: transcriptText,
      });
      setNotice(
        `${transcript.segmentCount} passages indexed for Ask the Archive.`
      );
      setTranscriptText("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PanelError error={error} />
      {notice ? (
        <p style={{ color: "var(--cobalt)", marginBottom: 16 }}>{notice}</p>
      ) : null}

      <Toolbar>
        <input
          type="search"
          placeholder="Search conversations"
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
          onClick={() => void openEditor()}
        >
          New conversation
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
            {editing ? "Edit conversation" : "New conversation"}
          </h2>

          <Field label="Title">
            <input
              required
              value={form.title}
              onChange={event => set("title", event.target.value)}
            />
          </Field>
          <Field
            label="YouTube URL or video ID"
            hint="The video ID, thumbnail and embed are derived from this."
          >
            <input
              required
              value={form.youtubeUrl}
              onChange={event => set("youtubeUrl", event.target.value)}
            />
          </Field>

          <div className="admin-grid" style={{ marginBottom: 0 }}>
            <Field label="Slug">
              <input
                value={form.slug}
                onChange={event => set("slug", event.target.value)}
                placeholder="auto-generated"
              />
            </Field>
            <Field label="Episode number">
              <input
                type="number"
                min={0}
                value={form.episodeNumber}
                onChange={event => set("episodeNumber", event.target.value)}
              />
            </Field>
            <Field label="Season">
              <input
                type="number"
                min={0}
                value={form.season}
                onChange={event => set("season", event.target.value)}
              />
            </Field>
            <Field label="Duration (seconds)">
              <input
                type="number"
                min={0}
                value={form.durationSeconds}
                onChange={event => set("durationSeconds", event.target.value)}
              />
            </Field>
            <Field label="Published date">
              <input
                type="date"
                value={form.publishedAt}
                onChange={event => set("publishedAt", event.target.value)}
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

          <Field
            label="Summary"
            hint="One or two sentences used on cards and in search results."
          >
            <textarea
              rows={2}
              value={form.summary}
              onChange={event => set("summary", event.target.value)}
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={6}
              value={form.description}
              onChange={event => set("description", event.target.value)}
            />
          </Field>
          <Field label="Key takeaways" hint="One per line.">
            <textarea
              rows={4}
              value={form.takeaways}
              onChange={event => set("takeaways", event.target.value)}
            />
          </Field>

          <Field
            label="Pull quotes"
            hint="Shown on the conversation page. Timestamp accepts mm:ss or hh:mm:ss."
          >
            <div style={{ display: "grid", gap: 10 }}>
              {form.quotes.map((quote, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gap: 6,
                    padding: 10,
                    border: "1px solid var(--admin-border, #d7dbe3)",
                    borderRadius: 8,
                  }}
                >
                  <textarea
                    rows={2}
                    placeholder="Quote"
                    value={quote.text}
                    onChange={event =>
                      updateQuote(index, { text: event.target.value })
                    }
                  />
                  <div className="admin-quote-fields">
                    <input
                      style={{ flex: 2 }}
                      placeholder="Attribution"
                      value={quote.attribution}
                      onChange={event =>
                        updateQuote(index, { attribution: event.target.value })
                      }
                    />
                    <input
                      style={{ flex: 1 }}
                      placeholder="12:34"
                      value={quote.timestamp}
                      onChange={event =>
                        updateQuote(index, { timestamp: event.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => removeQuote(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <div>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={addQuote}
                >
                  Add quote
                </button>
              </div>
            </div>
          </Field>

          <div className="admin-grid" style={{ marginBottom: 0 }}>
            <Field label="Guests" hint="Ctrl/Cmd-click to select several.">
              <select
                multiple
                size={5}
                value={multiValue.guestIds}
                onChange={event =>
                  set(
                    "guestIds",
                    Array.from(
                      event.target.selectedOptions,
                      option => option.value
                    )
                  )
                }
              >
                {guests.map(guest => (
                  <option key={guest.id} value={guest.id}>
                    {guest.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Topics">
              <select
                multiple
                size={5}
                value={multiValue.topicIds}
                onChange={event =>
                  set(
                    "topicIds",
                    Array.from(
                      event.target.selectedOptions,
                      option => option.value
                    )
                  )
                }
              >
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Collections">
              <select
                multiple
                size={5}
                value={multiValue.collectionIds}
                onChange={event =>
                  set(
                    "collectionIds",
                    Array.from(
                      event.target.selectedOptions,
                      option => option.value
                    )
                  )
                }
              >
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="admin-grid" style={{ marginBottom: 0 }}>
            <Field label="Spotify URL">
              <input
                value={form.spotifyUrl}
                onChange={event => set("spotifyUrl", event.target.value)}
              />
            </Field>
            <Field label="Apple Podcasts URL">
              <input
                value={form.applePodcastsUrl}
                onChange={event => set("applePodcastsUrl", event.target.value)}
              />
            </Field>
            <Field label="SEO title">
              <input
                value={form.seoTitle}
                onChange={event => set("seoTitle", event.target.value)}
              />
            </Field>
            <Field label="SEO description">
              <input
                value={form.seoDescription}
                onChange={event => set("seoDescription", event.target.value)}
              />
            </Field>
            <Field
              label="Social share image URL"
              hint="Used for link previews. Falls back to the thumbnail."
            >
              <input
                value={form.ogImageUrl}
                onChange={event => set("ogImageUrl", event.target.value)}
              />
            </Field>
          </div>

          <div className="admin-actions" style={{ marginTop: 10 }}>
            <button
              type="submit"
              className="button button--cobalt"
              disabled={pending}
            >
              {pending ? "Savingâ€¦" : "Save conversation"}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setShowForm(false)}
            >
              Close
            </button>
          </div>

          {editing ? (
            <div
              style={{
                marginTop: 34,
                borderTop: "1px solid var(--line)",
                paddingTop: 24,
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  marginBottom: 14,
                }}
              >
                Transcript
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Paste WebVTT, SRT or timestamped plain text. Uploading replaces
                the existing English transcript and re-indexes Ask the Archive.
              </p>
              <Field label="Transcript file contents">
                <textarea
                  rows={6}
                  value={transcriptText}
                  onChange={event => setTranscriptText(event.target.value)}
                />
              </Field>
              <div className="admin-actions">
                <button
                  type="button"
                  className="button button--ghost"
                  disabled={pending || !transcriptText.trim()}
                  onClick={() => void uploadTranscript()}
                >
                  Upload and index
                </button>
                <label
                  className="button button--ghost"
                  style={{ cursor: "pointer" }}
                >
                  Choose file
                  <input
                    type="file"
                    accept=".vtt,.srt,.txt"
                    style={{ display: "none" }}
                    onChange={async event => {
                      const file = event.target.files?.[0];
                      if (file) setTranscriptText(await file.text());
                    }}
                  />
                </label>
              </div>
            </div>
          ) : null}
        </form>
      ) : null}

      <AdminTable label="Conversations">
        <thead>
          <tr>
            <th>Title</th>
            <th>Guests</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4}>No conversations yet.</td>
            </tr>
          ) : (
            items.map(episode => (
              <tr key={episode.id}>
                <td>
                  <strong>{episode.title}</strong>
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    /{episode.slug}
                  </span>
                </td>
                <td>
                  {episode.guests.map(guest => guest.name).join(", ") || "â€”"}
                </td>
                <td>
                  <StatusPill status={episode.status} />
                </td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => void openEditor(episode.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => void changeStatus(episode.id, "PUBLISHED")}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => void changeStatus(episode.id, "DRAFT")}
                  >
                    Unpublish
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => void remove(episode.id, episode.title)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </div>
  );
}
