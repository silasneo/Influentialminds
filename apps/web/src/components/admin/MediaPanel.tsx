"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaAsset } from "@influential-minds/contracts";
import { adminApi } from "@/lib/admin-client";
import { errorMessage, Field, PanelError, Toolbar } from "./ui";

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaPanel() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await adminApi.media());
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await adminApi.uploadMedia(file, alt || undefined);
      if (fileInput.current) fileInput.current.value = "";
      setAlt("");
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PanelError error={error} />

      <form
        onSubmit={upload}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          padding: 20,
          marginBottom: 26,
        }}
      >
        <div className="admin-grid" style={{ marginBottom: 0 }}>
          <Field
            label="File"
            hint="Images for headshots and covers, PDFs for downloadable resources."
          >
            <input ref={fileInput} type="file" />
          </Field>
          <Field label="Alt text" hint="Describe the image for screen readers.">
            <input value={alt} onChange={event => setAlt(event.target.value)} />
          </Field>
        </div>
        <Toolbar>
          <button
            type="submit"
            className="button button--cobalt"
            disabled={pending}
          >
            {pending ? "Uploading…" : "Upload"}
          </button>
        </Toolbar>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Kind</th>
            <th>Size</th>
            <th>URL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5}>Nothing uploaded yet.</td>
            </tr>
          ) : (
            items.map(asset => (
              <tr key={asset.id}>
                <td>{asset.fileName}</td>
                <td>{asset.kind.toLowerCase()}</td>
                <td>{sizeLabel(asset.sizeBytes)}</td>
                <td>
                  <a href={asset.url} target="_blank" rel="noreferrer">
                    {asset.url}
                  </a>
                </td>
                <td>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={async () => {
                      if (!window.confirm(`Delete ${asset.fileName}?`)) return;
                      try {
                        await adminApi.deleteMedia(asset.id);
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
    </div>
  );
}
