# Deployment

The API and the web app deploy separately. The API needs a persistent filesystem (for the media library) and a MySQL database; the web app needs neither.

## Ubuntu EC2 with GitHub Actions

Use `docker-compose.production.yml`, not the local preview file, on EC2.
The production stack publishes only Caddy's ports 80/443; MySQL and the API stay
on the Docker network. Caddy preserves `/api/v1` and `/media` prefixes, terminates
HTTPS, and redirects HTTP. The admin cookie is always secure.

### First deployment and content migration

1. Give the instance an IAM instance profile with SSM connectivity, ECR pull
   access to the two application repositories, read access to the private
   deployment bucket's releases, and write access to its backups. No SSH keys
   or AWS access keys are needed on the server or in GitHub Actions.
2. Install Docker, the Compose plugin and AWS CLI. Store production settings
   at `/opt/influential-minds/.env.production.local` with mode `600`, using
   `deploy/.env.example` as the field reference. Generate separate random
   hexadecimal database passwords, auth secret and IP salt. Configure Brevo
   here if needed; GitHub never needs its API key.
3. Point the public hostname's DNS-only A record at the instance's public IP
   and permit TCP 80/443. If DNS is delegated to Cloudflare, changes to an
   unused Route 53 zone have no effect. An automatically assigned EC2 public
   IP can change after stop/start; update DNS then or reserve an Elastic IP.
4. Export the **current database and uploaded media**, not fresh seed output:

   ```powershell
   .\deploy\export-local.ps1 -Destination 'C:\private\im-export'
   ```

   Choose a private destination outside the checkout. The SQL is created in
   the database container and copied without PowerShell text redirection.
   `counts.json` records every table, including transcripts and associations.
   Avoid CMS edits during export. Commit bundled assets such as portraits and
   the lead-magnet PDF separately; these are part of the web image, not the API
   media volume.
   With the workflow available on `prod-deploy`, stage the first images and
   bundle using Actions while automatic deployment is still disabled:

   ```bash
   gh workflow run ci.yml --ref prod-deploy -f publish_only=true
   ```

   This runs the same CI checks and uses the scoped OIDC role, but does not
   start the application before the private content import.

5. Transfer the export and initial configuration privately to EC2. Restore
   SQL only into an empty database, restore media into the persistent media
   volume, then run `deploy/import-local.mjs` using the API image with
   `/tmp/counts.json` and `/tmp/admin.json` mounted read-only. The latter contains
   a generated `password` of at least 32 characters for the seeded admin.
   The script checks every source table/count, rewrites localhost URL prefixes
   to the HTTPS origin and rotates the imported development password. Other
   accounts with known development passwords cause a hard failure.
6. Only after the import succeeds, create `/opt/influential-minds/.content-imported`
   and invoke the release. **Do not rerun seeds after restoring CMS data.**
   Changing `SEED_ADMIN_PASSWORD` does not rotate an existing account.
   Delete temporary credential/configuration transfer objects and local
   plaintext copies after successful import.

The deployment bundle contains Compose, `deploy/Caddyfile`, deployment scripts
and `release.env` with SHA-tagged `API_IMAGE` and `WEB_IMAGE` ECR references.
Releases live at `/opt/influential-minds/releases/<git-sha>-<run-id>-<attempt>`. Named database,
media and TLS volumes are shared across releases; never use `down -v`.

### Continuous delivery

The existing `images` CI job adds delivery when `EC2_DEPLOY_ENABLED=true`.
Configure the GitHub `production` environment to accept only `prod-deploy`;
the AWS OIDC trust must match this repository and environment. The deployment
role can publish only the two ECR repositories, upload release bundles and
invoke the `InfluentialMinds-Deploy` SSM document on the target instance.
It cannot read the database backups or production secrets.

Set these repository variables:

| Variable               | Value                                       |
| ---------------------- | ------------------------------------------- |
| `EC2_DEPLOY_ENABLED`   | `true`, only after the first import         |
| `AWS_REGION`           | deployment region                           |
| `AWS_ACCOUNT_ID`       | target account                              |
| `AWS_DEPLOY_ROLE_ARN`  | scoped GitHub OIDC role ARN                 |
| `EC2_INSTANCE_ID`      | target EC2 instance                         |
| `EC2_DEPLOY_BUCKET`    | private deployment-bundle/backup bucket     |
| `NEXT_PUBLIC_SITE_URL` | public HTTPS origin, without trailing slash |
| `NEXT_PUBLIC_API_URL`  | the same origin                             |

After CI and migration-history checks pass, Actions publishes immutable
SHA/run-tagged images and a release bundle, invokes SSM and waits for successful
HTTPS health checks. `deploy/release.sh` serializes deployments, pauses writers
for a consistent database/media backup, uploads that encrypted backup to S3,
applies migrations **without seeds**, and starts the new release. There is a
brief maintenance window while the API/web containers restart. Production runs
are serialized without cancelling an in-flight SSM deployment; reruns get new
immutable image tags and release directories.

`/opt/influential-minds/current` changes only after the release is healthy.
Failures are reported through Actions/SSM, not hidden by automatic database
rollback. Inspect the failed command before retrying; schema rollback requires
an intentional restore of the matching database/media backup. Backups should
be retained off-instance and restore-tested; arrange additional scheduled
backups if CMS edits must be protected between releases.

Disable the legacy GitHub Pages workflow once EC2 is verified. The existing
root disk may be deleted when the instance is terminated unless its block
device mapping is changed; Docker persistence alone is not an off-instance backup.

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

The seed is idempotent: existing Site settings and episode fields are preserved on re-runs. The placeholder topic is assigned only when an episode is first created, so startup does not undo editorial topic assignments or descriptions.

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
- `API_URL` — the real public API origin; lead-magnet email links are built from it
- `EMAIL_PROVIDER=brevo` plus `BREVO_API_KEY` (a secret) and a verified
  `BREVO_SENDER_EMAIL` if subscribers should be emailed their download — see
  [email-and-leads.md](email-and-leads.md). Leave it `disabled` to keep using CSV export.

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
