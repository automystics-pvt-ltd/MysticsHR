#!/usr/bin/env bash
# Deploy MysticsHR on the VPS.
# Run from anywhere — the script cd's to the project root.
set -euo pipefail

PROJECT_DIR="/home/automystics-mysticshr/htdocs/mysticshr.automystics.tech"
BRANCH="${BRANCH:-main}"

cd "$PROJECT_DIR"

echo "==> Pulling latest from origin/$BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies (pnpm)"
pnpm install --frozen-lockfile

echo "==> Building lib/db (schema types)"
pnpm --filter @workspace/db run build

echo "==> Building all packages and artifacts"
pnpm -r build

echo "==> Syncing DB schema (drizzle-kit push)"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "  WARNING: DATABASE_URL not set — skipping DB schema sync"
else
  pnpm --filter db push-force
fi

echo "==> Restarting API server"
# SERVE_SPA=true tells the API server to also serve the MysticsHR and
# Platform Admin SPAs from their dist/ directories (VPS single-process mode).
export SERVE_SPA=true

pm2 restart mysticshr-api 2>/dev/null || \
  pm2 start "node --enable-source-maps artifacts/api-server/dist/index.mjs" \
    --name mysticshr-api \
    --env production \
    -e "/var/log/pm2/mysticshr-api-error.log" \
    -o "/var/log/pm2/mysticshr-api-out.log"
pm2 save

echo ""
echo "==> Done."
echo "    Health check:    curl http://localhost:8080/api/healthz"
echo "    MysticsHR:       https://mysticshr.automystics.tech"
echo "    Platform Admin:  https://mysticshr.automystics.tech/platform_admin/"
