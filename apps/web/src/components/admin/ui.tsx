"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
      {hint ? (
        <small style={{ color: "var(--muted)", fontSize: 11 }}>{hint}</small>
      ) : null}
    </label>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

export function PanelError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      className="form-error"
      role="alert"
      style={{ color: "#b3261e", marginBottom: 16 }}
    >
      {error}
    </p>
  );
}

export function StatusPill({ status }: { status: string }) {
  const modifier =
    status === "PUBLISHED"
      ? " status-pill--published"
      : status === "DRAFT"
        ? " status-pill--draft"
        : "";
  return (
    <span className={`status-pill${modifier}`}>
      {status.replace("_", " ").toLowerCase()}
    </span>
  );
}

/** Splits a newline- or comma-separated textarea into a trimmed list. */
export function toList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

/** Splits on newlines only, for prose entries that legitimately contain commas. */
export function toLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Something went wrong.";
}
