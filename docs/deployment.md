# Deployment

The API and the web app deploy separately. The API needs a persistent filesystem (for the media library) and a MySQL database; the web app needs neither.

---

## 0. Local preview with Docker

`docker-compose.yml` runs the whole stack — MySQL, the API and the site — with one command:

```bash
docker compose up --build
```

The API container applies the migrations and runs the seed before starting, so a fresh volume comes up with renderable content and a working admin account. The site is on <http://localhost:3000>, the API on <http://localhost:4000/api/v1>, and MySQL on host port **3307** so it cannot collide with a local installation.

```bash
docker compose logs -f api     # follow the API
docker compose down            # stop, keeping the database and media
docker compose down -v         # stop and discard both volumes
```

Two things about this file are worth understanding before copying it to a server:

- The secrets in it are fixed development values. A deployed environment needs its own `AUTH_SECRET`, `IP_HASH_SALT` and database password, supplied as real secrets rather than committed.
- `NEXT_PUBLIC_*` values are compiled into the browser bundle at image build time, which is why they are build arguments. Changing the public URLs means rebuilding the web image, not just restarting it. `API_INTERNAL_URL` is the exception: server-side rendering reads it at runtime so the web container can reach the API over the private network while the browser still uses the public origin.

The sections below describe deploying the two apps properly, without compose.

---

## 1. Database

MySQL 8.0 or later.

```sql
CREATE DATABASE influential_minds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'influential'@'%' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON influential_minds.* TO 'influential'@'%';
FLUSH PRIVILEGES;
```

`utf8mb4` is required — transcripts and quotes contain punctuation and names outside Latin-1.

Apply the committed migrations:

```bash
pnpm db:deploy
```

Then seed once, to create site settings, the verified starting content and the first administrator:

```bash
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='a-strong-password' pnpm db:seed
```

The seed is idempotent: re-running it updates the seeded records instead of duplicating them.

### Schema changes

During development, edit `apps/api/prisma/schema.prisma` and run `pnpm db:migrate` to generate a migration. Commit the generated SQL. Never run `migrate dev` against production — CI and production use `pnpm db:deploy`, which only applies what is already committed.

### Backups

Back up the database and the media directory together; a database restore without `apps/api/storage` leaves broken image and download links.

```bash
mysqldump --single-transaction --routines influential_minds > backup.sql
tar czf media.tar.gz apps/api/storage
```

---

## 2. API (`apps/api`)

Any Node host works: a VM, a container, Render, Railway, Fly.io, App Platform.

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @influential-minds/contracts build
pnpm --filter @influential-minds/api build
pnpm --filter @influential-minds/api start      # node dist/main.js
```

Environment variables are documented in `apps/api/.env.example`. The process validates them at boot and exits with a readable message if any are missing, so a misconfigured deployment fails immediately rather than at the first request.

Production checklist:

- `NODE_ENV=production`
- `AUTH_SECRET` — at least 32 random characters, unique per environment (`openssl rand -base64 48`)
- `AUTH_COOKIE_SECURE=true` (requires HTTPS)
- `AUTH_COOKIE_DOMAIN` — set only when the site and API share a parent domain
- `CORS_ORIGINS` — the exact public site origin; credentials are sent, so a wildcard will not work
- `IP_HASH_SALT` — a unique random value, so stored rate-limit keys are not reversible
- `DATABASE_URL` — point at the production database
- Persist `STORAGE_LOCAL_ROOT` on a real volume, not ephemeral container storage

Run the API behind TLS. It sets `trust proxy`, so a standard reverse proxy forwarding `X-Forwarded-*` is enough.

---

## 3. Web (`apps/web`)

Deploy to Vercel, or to any Node host, or as a container.

```bash
pnpm install --frozen-lockfile
pnpm --filter @influential-minds/contracts build
pnpm --filter @influential-minds/web build
pnpm --filter @influential-minds/web start
```

Two environment variables, both public:

| Variable               | Example                                                  |
| ---------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | `https://api.influentialminds.com` (no `/api/v1` suffix) |
| `NEXT_PUBLIC_SITE_URL` | `https://influentialminds.com`                           |

`NEXT_PUBLIC_SITE_URL` feeds canonical URLs, Open Graph tags, JSON-LD and `sitemap.xml`; a wrong value produces wrong canonicals, so set it before announcing the site.

### Rendering

Routes render on demand, and server-side fetches share a 5-minute data cache. The build therefore does not need a reachable API or database, which keeps CI independent of infrastructure. If you later want statically prerendered episode pages, remove `export const dynamic = "force-dynamic"` from `apps/web/src/app/layout.tsx` and add `generateStaticParams` — but the API must then be reachable at build time.

---

## 4. DNS and domains

A typical layout:

| Host                       | Serves     |
| -------------------------- | ---------- |
| `influentialminds.com`     | `apps/web` |
| `api.influentialminds.com` | `apps/api` |

With that split, set `AUTH_COOKIE_DOMAIN=.influentialminds.com` so the admin session cookie is accepted on both hosts, and list the site origin in `CORS_ORIGINS`.

---

## 5. Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main` and `prod-deploy`:

1. **verify** — install, generate the Prisma client, typecheck, test, build all three packages.
2. **migrations** — start MySQL 8, apply the committed migrations, then assert with `prisma migrate diff --exit-code` that the migration history still reproduces `schema.prisma`. This catches a schema edit committed without its migration.
3. **images** — `prod-deploy` only. Builds both release containers after the first two jobs pass, because the deployable artefact is the image, not the workspace build. A Dockerfile that breaks while `pnpm build` still succeeds is caught here rather than during a release.

The old GitHub Pages workflow has been removed; the site is no longer static.

### Branches

| Branch        | Role                                                                         |
| ------------- | ---------------------------------------------------------------------------- |
| `main`        | Integration. Every pull request lands here and runs verify and migrations.   |
| `prod-deploy` | What production is cut from. Adds the container build on top of both checks. |

Promote by fast-forwarding `prod-deploy` to the reviewed commit on `main`:

```bash
git fetch origin
git push origin origin/main:prod-deploy
```

The web image inlines `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` at build time, so set them as repository **variables** (not secrets — they are public and must match the live hostnames) before cutting a release. Without them the job falls back to the localhost defaults, which is correct for a build check but not for a shipped image.
