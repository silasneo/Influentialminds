"use client";

import { API_VERSION_PREFIX } from "@influential-minds/contracts";
import type {
  AdminDashboard,
  AdminEpisodeSummary,
  AdminUser,
  AuditLogEntry,
  Collection,
  EditableSiteSettings,
  Episode,
  EpisodeTranscript,
  Guest,
  Lead,
  LeadMagnet,
  MediaAsset,
  Paginated,
  Topic,
} from "@influential-minds/contracts";
import { API_BASE_URL } from "./api";

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "CONTENT_EDITOR";
}

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/**
 * The console talks to the API directly with the httpOnly session cookie, so
 * every request must opt into credentials and never be cached.
 */
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/${API_VERSION_PREFIX}/${path.replace(/^\/+/, "")}`,
    {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers:
        init.body instanceof FormData
          ? init.headers
          : { "content-type": "application/json", ...(init.headers ?? {}) },
    }
  );

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? safeParse(text) : undefined;

  if (!response.ok) {
    const body = payload as { message?: string; details?: unknown } | undefined;
    throw new AdminApiError(
      response.status,
      body?.message ?? `Request failed (${response.status})`,
      body?.details
    );
  }

  return (payload ?? (text as unknown)) as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const adminApi = {
  login: (email: string, password: string) =>
    call<AdminProfile>("admin/auth/login", json("POST", { email, password })),
  logout: () => call<void>("admin/auth/logout", { method: "POST" }),
  me: () => call<AdminProfile>("admin/auth/me"),

  dashboard: () => call<AdminDashboard>("admin/dashboard"),
  auditLog: (page = 1) =>
    call<Paginated<AuditLogEntry>>(`admin/audit-log?page=${page}&perPage=25`),

  episodes: (params: { search?: string; page?: number } = {}) => {
    const query = new URLSearchParams({
      page: `${params.page ?? 1}`,
      perPage: "20",
    });
    if (params.search) query.set("search", params.search);
    return call<Paginated<AdminEpisodeSummary>>(
      `admin/episodes?${query.toString()}`
    );
  },
  episode: (id: string) => call<Episode>(`admin/episodes/${id}`),
  createEpisode: (body: unknown) =>
    call<Episode>("admin/episodes", json("POST", body)),
  updateEpisode: (id: string, body: unknown) =>
    call<Episode>(`admin/episodes/${id}`, json("PUT", body)),
  changeEpisodeStatus: (id: string, status: string) =>
    call<Episode>(`admin/episodes/${id}/status`, json("POST", { status })),
  deleteEpisode: (id: string) =>
    call<void>(`admin/episodes/${id}`, { method: "DELETE" }),

  uploadTranscript: (
    id: string,
    body: { language: string; sourceFileName?: string; content: string }
  ) =>
    call<EpisodeTranscript>(
      `admin/episodes/${id}/transcript`,
      json("POST", body)
    ),
  deleteTranscript: (id: string, language: string) =>
    call<void>(`admin/episodes/${id}/transcript/${language}`, {
      method: "DELETE",
    }),

  guests: (params: { search?: string; page?: number } = {}) => {
    const query = new URLSearchParams({
      page: `${params.page ?? 1}`,
      perPage: "25",
    });
    if (params.search) query.set("search", params.search);
    return call<Paginated<Guest>>(`admin/guests?${query.toString()}`);
  },
  createGuest: (body: unknown) =>
    call<Guest>("admin/guests", json("POST", body)),
  updateGuest: (id: string, body: unknown) =>
    call<Guest>(`admin/guests/${id}`, json("PUT", body)),
  deleteGuest: (id: string) =>
    call<void>(`admin/guests/${id}`, { method: "DELETE" }),

  topics: () => call<Topic[]>("admin/topics"),
  createTopic: (body: unknown) =>
    call<Topic>("admin/topics", json("POST", body)),
  updateTopic: (id: string, body: unknown) =>
    call<Topic>(`admin/topics/${id}`, json("PUT", body)),
  deleteTopic: (id: string) =>
    call<void>(`admin/topics/${id}`, { method: "DELETE" }),

  collections: () => call<Collection[]>("admin/collections"),
  createCollection: (body: unknown) =>
    call<Collection>("admin/collections", json("POST", body)),
  updateCollection: (id: string, body: unknown) =>
    call<Collection>(`admin/collections/${id}`, json("PUT", body)),
  deleteCollection: (id: string) =>
    call<void>(`admin/collections/${id}`, { method: "DELETE" }),

  leads: (params: { search?: string; page?: number } = {}) => {
    const query = new URLSearchParams({
      page: `${params.page ?? 1}`,
      perPage: "50",
    });
    if (params.search) query.set("search", params.search);
    return call<Paginated<Lead>>(`admin/leads?${query.toString()}`);
  },
  leadsExportUrl: () =>
    `${API_BASE_URL}/${API_VERSION_PREFIX}/admin/leads/export`,

  leadMagnets: () => call<LeadMagnet[]>("admin/lead-magnets"),
  createLeadMagnet: (body: unknown) =>
    call<LeadMagnet>("admin/lead-magnets", json("POST", body)),
  updateLeadMagnet: (id: string, body: unknown) =>
    call<LeadMagnet>(`admin/lead-magnets/${id}`, json("PUT", body)),
  deleteLeadMagnet: (id: string) =>
    call<void>(`admin/lead-magnets/${id}`, { method: "DELETE" }),

  media: () => call<MediaAsset[]>("admin/media"),
  uploadMedia: (file: File, alt?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (alt) form.append("alt", alt);
    return call<MediaAsset>("admin/media", { method: "POST", body: form });
  },
  deleteMedia: (id: string) =>
    call<void>(`admin/media/${id}`, { method: "DELETE" }),

  settings: () => call<EditableSiteSettings>("admin/settings"),
  updateSettings: (body: unknown) =>
    call<EditableSiteSettings>("admin/settings", json("PUT", body)),

  users: () => call<AdminUser[]>("admin/users"),
  createUser: (body: unknown) =>
    call<AdminUser>("admin/users", json("POST", body)),
  updateUser: (id: string, body: unknown) =>
    call<AdminUser>(`admin/users/${id}`, json("PUT", body)),
  deleteUser: (id: string) =>
    call<void>(`admin/users/${id}`, { method: "DELETE" }),
};
