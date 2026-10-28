# API reference

Base URL: `{API_URL}/api/v1`

All responses are JSON. Errors use a consistent envelope produced by the global exception filter:

```json
{
  "statusCode": 404,
  "message": "No episode exists at \"missing-slug\".",
  "error": "Not Found"
}
```

Paginated responses are always:

```json
{ "items": [], "total": 0, "page": 1, "perPage": 12, "pageCount": 0 }
```

---

## Public endpoints

No authentication. Safe to cache.

### Site

| Method | Path             | Notes                                                                                                                                                               |
| ------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/site/homepage` | One call renders the entire homepage: settings, featured episode, latest episodes, topics, guests, collections, the active lead magnet, Ask suggestions and counts. |
| `GET`  | `/site/settings` | Brand, hero, host and newsletter copy, used for the global chrome and metadata.                                                                                     |
| `GET`  | `/sitemap`       | Slugs and `updatedAt` timestamps for every public route; consumed by `apps/web/src/app/sitemap.ts`.                                                                 |

### Episodes

| Method | Path              | Notes                                                                                                                         |
| ------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/episodes`       | Query: `search`, `guest`, `topic`, `collection`, `sort`, `page`, `perPage`. Published episodes only.                          |
| `GET`  | `/episodes/:slug` | Full detail: embed data, takeaways, quotes, guests, topics, collections, transcript and related episodes. 404 if unpublished. |

### Guests, topics, collections

| Method | Path                                                    |
| ------ | ------------------------------------------------------- |
| `GET`  | `/guests` (query: `search`, `topic`, `page`, `perPage`) |
| `GET`  | `/guests/:slug`                                         |
| `GET`  | `/guests/:slug/episodes`                                |
| `GET`  | `/topics`                                               |
| `GET`  | `/topics/:slug`                                         |
| `GET`  | `/topics/:slug/episodes`                                |
| `GET`  | `/collections`                                          |
| `GET`  | `/collections/:slug`                                    |
| `GET`  | `/collections/:slug/episodes`                           |

### Ask the Archive

| Method | Path         | Notes                                                                                                                                                                                                                                          |
| ------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/ask/usage` | Remaining questions for the caller today.                                                                                                                                                                                                      |
| `POST` | `/ask`       | Body: `{ question, episodeId? }`. Returns the answer, `sources[]` (each with `startSeconds`, `timecode`, `momentUrl`), and `mode` (`live` / `mock` / `disabled`). `429` when the daily quota is spent; `503` when the provider is unavailable. |

See [ask-the-archive.md](ask-the-archive.md).

### Leads

| Method | Path            | Notes                                                                                                                                                                                                 |
| ------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/leads/magnet` | The currently active lead magnet, or `null`.                                                                                                                                                          |
| `POST` | `/leads`        | Body: `{ name, email, consent, sourcePage?, company? }`. `company` is a honeypot — a non-empty value is treated as a bot. A repeat email returns `created: false` but still returns the download URL. |

---

## Admin endpoints

Every route below requires a valid admin session cookie. Browser calls must send `credentials: "include"`, and the caller's origin must be listed in `CORS_ORIGINS`. All writes are recorded in the audit log.

### Authentication

| Method | Path                 | Notes                                                                         |
| ------ | -------------------- | ----------------------------------------------------------------------------- |
| `POST` | `/admin/auth/login`  | Body `{ email, password }`. Sets the signed session cookie.                   |
| `POST` | `/admin/auth/logout` | Clears the cookie.                                                            |
| `GET`  | `/admin/auth/me`     | Current profile, or `401`. The console treats `401` as "redirect to sign-in". |

### Content

| Method               | Path                                       |
| -------------------- | ------------------------------------------ |
| `GET`                | `/admin/dashboard`                         |
| `GET`                | `/admin/audit-log`                         |
| `GET` `POST`         | `/admin/episodes`                          |
| `GET` `PUT` `DELETE` | `/admin/episodes/:id`                      |
| `POST`               | `/admin/episodes/:id/status`               |
| `POST`               | `/admin/episodes/:id/transcript`           |
| `DELETE`             | `/admin/episodes/:id/transcript/:language` |
| `GET` `POST`         | `/admin/guests`                            |
| `GET` `PUT` `DELETE` | `/admin/guests/:id`                        |
| `GET` `POST`         | `/admin/topics`                            |
| `GET` `PUT` `DELETE` | `/admin/topics/:id`                        |
| `GET` `POST`         | `/admin/collections`                       |
| `GET` `PUT` `DELETE` | `/admin/collections/:id`                   |

Unlike episode listings, `/admin/episodes` returns drafts and archived items with their `status` and `updatedAt`.

`PUT /admin/collections/:id` only rewrites episode membership when the body includes `episodeIds`. Omitting the field leaves the curated order untouched, which is why the taxonomy screen can edit a collection's copy without emptying it.

### Audience

| Method         | Path                      | Notes                     |
| -------------- | ------------------------- | ------------------------- |
| `GET`          | `/admin/leads`            | Paginated, with `search`. |
| `GET`          | `/admin/leads/export`     | CSV download.             |
| `GET` `POST`   | `/admin/lead-magnets`     |                           |
| `PUT` `DELETE` | `/admin/lead-magnets/:id` |                           |

### Media

| Method         | Path               | Notes                                                                                     |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `GET`          | `/admin/media`     |                                                                                           |
| `POST`         | `/admin/media`     | `multipart/form-data` with `file` and optional `alt`. Limited by `STORAGE_MAX_UPLOAD_MB`. |
| `PUT` `DELETE` | `/admin/media/:id` |                                                                                           |

Uploads are served back at `STORAGE_PUBLIC_PATH` (default `/media`).

### Settings and team

| Method         | Path               | Notes                      |
| -------------- | ------------------ | -------------------------- |
| `GET` `PUT`    | `/admin/settings`  | Includes `askSuggestions`. |
| `GET` `POST`   | `/admin/users`     | `SUPER_ADMIN` only.        |
| `PUT` `DELETE` | `/admin/users/:id` | `SUPER_ADMIN` only.        |

---

## Validation

Request bodies and query strings are parsed by the Zod schemas in `packages/contracts`. The same schemas type the web app, so an invalid payload is usually a compile error before it is a `400`.
