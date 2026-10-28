"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-client";

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await adminApi.login(email, password);
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed.");
      setPending(false);
    }
  }

  return (
    <div className="admin-shell">
      <form className="admin-panel" onSubmit={onSubmit}>
        <h1>
          Editorial <em>console</em>
        </h1>
        <p>Sign in to manage conversations, guests, collections and leads.</p>

        <label className="admin-field" htmlFor="admin-email">
          <span>Email</span>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </label>

        <label className="admin-field" htmlFor="admin-password">
          <span>Password</span>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>

        {error ? (
          <p className="form-error" role="alert" style={{ color: "#b3261e" }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="button button--cobalt"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
