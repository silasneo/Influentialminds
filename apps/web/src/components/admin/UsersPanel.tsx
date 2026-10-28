"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUser } from "@influential-minds/contracts";
import { ADMIN_ROLES } from "@influential-minds/contracts";
import { adminApi } from "@/lib/admin-client";
import { errorMessage, Field, PanelError, Toolbar } from "./ui";
import { formatDate } from "@/lib/format";

const EMPTY = {
  id: "",
  email: "",
  name: "",
  password: "",
  role: "CONTENT_EDITOR",
  status: "ACTIVE",
};

export function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setUsers(await adminApi.users());
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = {
        email: form.email,
        name: form.name,
        role: form.role,
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      };
      if (form.id) await adminApi.updateUser(form.id, payload);
      else await adminApi.createUser(payload);
      setForm(EMPTY);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <div>
      <PanelError error={error} />

      <form
        onSubmit={save}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          padding: 20,
          marginBottom: 26,
        }}
      >
        <div className="admin-grid" style={{ marginBottom: 0 }}>
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={event => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={form.email}
              onChange={event =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </Field>
          <Field
            label="Password"
            hint={
              form.id
                ? "Leave blank to keep the current password."
                : "At least 12 characters."
            }
          >
            <input
              type="password"
              value={form.password}
              onChange={event =>
                setForm({ ...form, password: event.target.value })
              }
              required={!form.id}
              minLength={12}
            />
          </Field>
          <Field label="Role">
            <select
              value={form.role}
              onChange={event => setForm({ ...form, role: event.target.value })}
            >
              {ADMIN_ROLES.map(role => (
                <option key={role} value={role}>
                  {role.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={event =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </Field>
        </div>
        <Toolbar>
          <button type="submit" className="button button--cobalt">
            {form.id ? "Update user" : "Add user"}
          </button>
          {form.id ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setForm(EMPTY)}
            >
              Cancel
            </button>
          ) : null}
        </Toolbar>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last sign-in</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role.replace("_", " ")}</td>
              <td>{user.status}</td>
              <td>{formatDate(user.lastLoginAt) ?? "Never"}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="filter-chip"
                  onClick={() =>
                    setForm({
                      id: user.id,
                      email: user.email,
                      name: user.name,
                      password: "",
                      role: user.role,
                      status: user.status,
                    })
                  }
                >
                  Edit
                </button>
                {user.id === currentUserId ? null : (
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={async () => {
                      if (!window.confirm(`Remove ${user.email}?`)) return;
                      try {
                        await adminApi.deleteUser(user.id);
                        await refresh();
                      } catch (cause) {
                        setError(errorMessage(cause));
                      }
                    }}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
