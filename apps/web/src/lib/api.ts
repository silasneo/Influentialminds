import { API_VERSION_PREFIX } from "@influential-minds/contracts";
import type {
  ApiErrorBody,
  AskResponse,
  AskUsage,
  Collection,
  Episode,
  EpisodeDetailResponse,
  EpisodeSummary,
  Guest,
  HomepagePayload,
  LeadMagnet,
  LeadSubmissionResponse,
  Paginated,
  SiteSettings,
  Topic,
} from "@influential-minds/contracts";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

/**
 * The browser reaches the API on its public origin, but a server render inside
 * a container reaches it on the private network instead. `API_INTERNAL_URL`
 * overrides the origin for server-side fetches only; without it both use the
 * public origin, which is correct for a single-host deployment.
 */
function originForThisRuntime(): string {
  if (typeof window !== "undefined") return API_BASE_URL;
  const internal = process.env.API_INTERNAL_URL;
  return internal ? internal.replace(/\/+$/, "") : API_BASE_URL;
}
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

/** Seconds of ISR for public content. Content changes land through the CMS, not deploys. */
const DEFAULT_REVALIDATE = 300;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: ApiErrorBody
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export function apiUrl(
  path: string,
  query?: Record<string, string | number | undefined | null>
): string {
  const normalised = path.replace(/^\/+/, "");
  const url = new URL(
    `${originForThisRuntime()}/${API_VERSION_PREFIX}/${normalised}`
  );
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, `${value}`);
  }
  return url.toString();
}

interface RequestOptions {
  query?: Record<string, string | number | undefined | null>;
  revalidate?: number | false;
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    query,
    revalidate = DEFAULT_REVALIDATE,
    method = "GET",
    body,
    signal,
  } = options;

  const init: RequestInit & { next?: { revalidate: number } } = {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  };

  if (revalidate === false || method !== "GET") {
    init.cache = "no-store";
  } else {
    init.next = { revalidate };
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path, query), init);
  } catch (cause) {
    throw new ApiError(
      0,
      `Unable to reach the Influential Minds API at ${originForThisRuntime()}. ${(cause as Error).message}`
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const parsed: unknown = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    const errorBody = parsed as ApiErrorBody | undefined;
    throw new ApiError(
      response.status,
      errorBody?.message ?? `Request failed with status ${response.status}`,
      errorBody
    );
  }

  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Returns `null` on 404 instead of throwing, for optional lookups. */
export async function requestOptional<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T | null> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/** A type alias (not an interface) so it still satisfies the query record signature. */
export type EpisodeQuery = {
  search?: string;
  guest?: string;
  topic?: string;
  collection?: string;
  sort?: string;
  page?: number;
  perPage?: number;
};

export const api = {
  homepage: () => request<HomepagePayload>("site/homepage"),
  settings: () => request<SiteSettings>("site/settings"),

  episodes: (query: EpisodeQuery = {}) =>
    request<Paginated<EpisodeSummary>>("episodes", { query }),
  episode: (slug: string) =>
    request<EpisodeDetailResponse>(`episodes/${encodeURIComponent(slug)}`),
  episodeOptional: (slug: string) =>
    requestOptional<EpisodeDetailResponse>(
      `episodes/${encodeURIComponent(slug)}`
    ),

  guests: (
    query: {
      search?: string;
      topic?: string;
      page?: number;
      perPage?: number;
    } = {}
  ) => request<Paginated<Guest>>("guests", { query }),
  guest: (slug: string) =>
    requestOptional<Guest>(`guests/${encodeURIComponent(slug)}`),
  guestEpisodes: (slug: string, page = 1) =>
    request<Paginated<EpisodeSummary>>(
      `guests/${encodeURIComponent(slug)}/episodes`,
      { query: { page } }
    ),

  topics: () => request<Topic[]>("topics"),
  topic: (slug: string) =>
    requestOptional<Topic>(`topics/${encodeURIComponent(slug)}`),
  topicEpisodes: (slug: string, page = 1) =>
    request<Paginated<EpisodeSummary>>(
      `topics/${encodeURIComponent(slug)}/episodes`,
      { query: { page } }
    ),

  collections: () => request<Collection[]>("collections"),
  collection: (slug: string) =>
    requestOptional<Collection>(`collections/${encodeURIComponent(slug)}`),
  collectionEpisodes: (slug: string) =>
    request<EpisodeSummary[]>(
      `collections/${encodeURIComponent(slug)}/episodes`
    ),

  leadMagnet: () => requestOptional<LeadMagnet>("leads/magnet"),

  sitemap: () => request<SitemapPayload>("sitemap", { revalidate: 3600 }),
};

export interface SitemapPayload {
  episodes: Array<{ slug: string; updatedAt: string }>;
  guests: Array<{ slug: string; updatedAt: string }>;
  topics: Array<{ slug: string; updatedAt: string }>;
  collections: Array<{ slug: string; updatedAt: string }>;
}

/* ---------- browser-side calls ---------- */

export async function submitAsk(
  payload: { question: string; episodeId?: string },
  signal?: AbortSignal
): Promise<AskResponse> {
  return request<AskResponse>("ask", { method: "POST", body: payload, signal });
}

export async function fetchAskUsage(signal?: AbortSignal): Promise<AskUsage> {
  return request<AskUsage>("ask/usage", { revalidate: false, signal });
}

export async function submitLead(payload: {
  name: string;
  email: string;
  consent: boolean;
  sourcePage?: string;
  company?: string;
}): Promise<LeadSubmissionResponse> {
  return request<LeadSubmissionResponse>("leads", {
    method: "POST",
    body: payload,
  });
}

export type {
  Episode,
  EpisodeSummary,
  Guest,
  Topic,
  Collection,
  SiteSettings,
  HomepagePayload,
  LeadMagnet,
  Paginated,
};
