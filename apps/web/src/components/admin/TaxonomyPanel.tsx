"use client";

import { useCallback, useEffect, useState } from "react";
import type { Collection, Topic } from "@influential-minds/contracts";
import { adminApi } from "@/lib/admin-client";
import { errorMessage, Field, PanelError, Toolbar } from "./ui";

export function TaxonomyPanel() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [topicForm, setTopicForm] = useState({
    id: "",
    name: "",
    description: "",
    featured: false,
    sortOrder: "0",
  });
  const [collectionForm, setCollectionForm] = useState({
    id: "",
    title: "",
    description: "",
    curatorNote: "",
    featured: false,
    sortOrder: "0",
  });

  const refresh = useCallback(async () => {
    try {
      const [topicList, collectionList] = await Promise.all([
        adminApi.topics(),
        adminApi.collections(),
      ]);
      setTopics(topicList);
      setCollections(collectionList);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveTopic(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = {
        name: topicForm.name,
        description: topicForm.description || null,
        featured: topicForm.featured,
        sortOrder: Number(topicForm.sortOrder) || 0,
      };
      if (topicForm.id) await adminApi.updateTopic(topicForm.id, payload);
      else await adminApi.createTopic(payload);
      setTopicForm({
        id: "",
        name: "",
        description: "",
        featured: false,
        sortOrder: "0",
      });
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function saveCollection(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      // episodeIds is deliberately omitted: membership is curated from the
      // conversation editor and the API leaves it untouched when absent.
      const payload = {
        title: collectionForm.title,
        description: collectionForm.description || null,
        curatorNote: collectionForm.curatorNote || null,
        featured: collectionForm.featured,
        sortOrder: Number(collectionForm.sortOrder) || 0,
      };
      if (collectionForm.id)
        await adminApi.updateCollection(collectionForm.id, payload);
      else await adminApi.createCollection(payload);
      setCollectionForm({
        id: "",
        title: "",
        description: "",
        curatorNote: "",
        featured: false,
        sortOrder: "0",
      });
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <div>
      <PanelError error={error} />

      <section style={{ marginBottom: 50 }}>
        <h2
          style={{ fontSize: 24, textTransform: "uppercase", marginBottom: 18 }}
        >
          Topics
        </h2>
        <form
          onSubmit={saveTopic}
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            padding: 20,
            marginBottom: 22,
          }}
        >
          <div className="admin-grid" style={{ marginBottom: 0 }}>
            <Field label="Name">
              <input
                required
                value={topicForm.name}
                onChange={event =>
                  setTopicForm({ ...topicForm, name: event.target.value })
                }
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                value={topicForm.sortOrder}
                onChange={event =>
                  setTopicForm({ ...topicForm, sortOrder: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              rows={2}
              value={topicForm.description}
              onChange={event =>
                setTopicForm({ ...topicForm, description: event.target.value })
              }
            />
          </Field>
          <label
            className="newsletter-consent"
            style={{ color: "var(--muted)", marginBottom: 16 }}
          >
            <input
              type="checkbox"
              checked={topicForm.featured}
              onChange={event =>
                setTopicForm({ ...topicForm, featured: event.target.checked })
              }
            />
            <span>Feature on the homepage index</span>
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="button button--cobalt">
              {topicForm.id ? "Update topic" : "Add topic"}
            </button>
            {topicForm.id ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={() =>
                  setTopicForm({
                    id: "",
                    name: "",
                    description: "",
                    featured: false,
                    sortOrder: "0",
                  })
                }
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Conversations</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {topics.length === 0 ? (
              <tr>
                <td colSpan={4}>No topics yet.</td>
              </tr>
            ) : (
              topics.map(topic => (
                <tr key={topic.id}>
                  <td>{topic.name}</td>
                  <td>{topic.episodeCount}</td>
                  <td>{topic.featured ? "Yes" : "No"}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() =>
                        setTopicForm({
                          id: topic.id,
                          name: topic.name,
                          description: topic.description ?? "",
                          featured: topic.featured,
                          sortOrder: `${topic.sortOrder}`,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={async () => {
                        if (!window.confirm(`Delete topic “${topic.name}”?`))
                          return;
                        try {
                          await adminApi.deleteTopic(topic.id);
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

      <section>
        <h2
          style={{ fontSize: 24, textTransform: "uppercase", marginBottom: 18 }}
        >
          Collections
        </h2>
        <form
          onSubmit={saveCollection}
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
                value={collectionForm.title}
                onChange={event =>
                  setCollectionForm({
                    ...collectionForm,
                    title: event.target.value,
                  })
                }
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                value={collectionForm.sortOrder}
                onChange={event =>
                  setCollectionForm({
                    ...collectionForm,
                    sortOrder: event.target.value,
                  })
                }
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              rows={2}
              value={collectionForm.description}
              onChange={event =>
                setCollectionForm({
                  ...collectionForm,
                  description: event.target.value,
                })
              }
            />
          </Field>
          <Field label="Curator's note">
            <textarea
              rows={2}
              value={collectionForm.curatorNote}
              onChange={event =>
                setCollectionForm({
                  ...collectionForm,
                  curatorNote: event.target.value,
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
              checked={collectionForm.featured}
              onChange={event =>
                setCollectionForm({
                  ...collectionForm,
                  featured: event.target.checked,
                })
              }
            />
            <span>Feature on the homepage</span>
          </label>
          <p style={{ color: "var(--muted)", fontSize: 12 }}>
            Conversations are added to a collection from the conversation
            editor.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="button button--cobalt">
              {collectionForm.id ? "Update collection" : "Add collection"}
            </button>
            {collectionForm.id ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={() =>
                  setCollectionForm({
                    id: "",
                    title: "",
                    description: "",
                    curatorNote: "",
                    featured: false,
                    sortOrder: "0",
                  })
                }
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
              <th>Conversations</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 ? (
              <tr>
                <td colSpan={4}>No collections yet.</td>
              </tr>
            ) : (
              collections.map(collection => (
                <tr key={collection.id}>
                  <td>{collection.title}</td>
                  <td>{collection.episodeCount}</td>
                  <td>{collection.featured ? "Yes" : "No"}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() =>
                        setCollectionForm({
                          id: collection.id,
                          title: collection.title,
                          description: collection.description ?? "",
                          curatorNote: collection.curatorNote ?? "",
                          featured: collection.featured,
                          sortOrder: `${collection.sortOrder}`,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Delete collection “${collection.title}”?`
                          )
                        )
                          return;
                        try {
                          await adminApi.deleteCollection(collection.id);
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
