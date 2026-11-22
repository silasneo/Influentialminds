#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

root=/opt/influential-minds
release_id=${1:?Supply the Git commit SHA with an optional run ID and attempt}
[[ "$release_id" =~ ^[0-9a-f]{40}(-[0-9]+-[0-9]+)?$ ]] || { echo "Invalid release identifier" >&2; exit 1; }
release="$root/releases/$release_id"
[[ -f "$root/.content-imported" ]] || { echo "Complete the one-time content import before deploying." >&2; exit 1; }
[[ -f "$root/.env.production.local" && -f "$release/release.env" ]] || { echo "Release configuration is missing." >&2; exit 1; }
exec 9>/run/lock/influential-minds-deploy.lock
flock -n 9 || { echo "Another deployment is running." >&2; exit 1; }
trap 'echo "Deployment failed. Data volumes and off-instance backups are retained; inspect the SSM output before retrying." >&2' ERR

region=$(sed -n 's/^AWS_REGION=//p' "$root/.env.production.local")
bucket=$(sed -n 's/^DEPLOY_BUCKET=//p' "$root/.env.production.local")
[[ "$region" =~ ^[a-z]{2}-[a-z]+-[0-9]+$ && "$bucket" =~ ^[a-z0-9.-]+$ ]] || { echo "Invalid AWS backup configuration." >&2; exit 1; }
compose=(docker compose --project-name influential-minds --env-file "$root/.env.production.local" --env-file "$release/release.env" -f "$release/docker-compose.production.yml")
registry=$(sed -n 's/^API_IMAGE=\([^/]*\)\/.*/\1/p' "$release/release.env")
[[ "$registry" =~ ^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com$ ]] || { echo "Invalid release registry." >&2; exit 1; }
aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$registry"
"${compose[@]}" pull

# Pause writers so the database and media backup describe the same state.
if [[ -L "$root/current" ]]; then
  current=$(readlink -f "$root/current")
  previous=(docker compose --project-name influential-minds --env-file "$root/.env.production.local" --env-file "$current/release.env" -f "$current/docker-compose.production.yml")
  "${previous[@]}" stop api web
fi
backup="$root/backups/$(date -u +%Y%m%dT%H%M%SZ)-$release_id"
mkdir -p "$backup"
"${compose[@]}" exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"' > "$backup/database.sql"
"${compose[@]}" run --rm --no-deps -v "$backup:/backup" api tar -czf /backup/media.tar.gz -C /repo/apps/api/storage .
tar -czf "$backup.tar.gz" -C "$backup" database.sql media.tar.gz
aws s3 cp "$backup.tar.gz" "s3://$bucket/backups/$(basename "$backup").tar.gz" --sse AES256 --region "$region" --only-show-errors
rm "$backup/database.sql" "$backup/media.tar.gz" "$backup.tar.gz"
rmdir "$backup"

"${compose[@]}" run --rm --no-deps api node_modules/.bin/prisma migrate deploy
"${compose[@]}" up -d --wait --wait-timeout 300
host=$(sed -n 's/^SITE_HOST=//p' "$root/.env.production.local")
curl --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 5 "https://$host/api/v1/site/settings" >/dev/null
curl --fail --silent --show-error --retry 5 --retry-all-errors "https://$host/" >/dev/null
ln -sfn "$release" "$root/current"
echo "Production release $release_id is healthy."
