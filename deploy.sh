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
pnpm install --no-frozen-lockfile

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

echo "==> Restarting API server (via pm2 ecosystem)"
# ecosystem.config.cjs bakes in SERVE_SPA=true and all other env vars so
# they survive pm2 restarts without relying on the calling shell's environment.
mkdir -p /var/log/pm2
pm2 reload ecosystem.config.cjs --update-env 2>/dev/null || \
  pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "==> Done."
echo "    Health check:    curl http://localhost:8080/api/healthz"
echo "    MysticsHR:       https://mysticshr.automystics.tech"
echo "    Platform Admin:  https://mysticshr.automystics.tech/platform_admin/"
