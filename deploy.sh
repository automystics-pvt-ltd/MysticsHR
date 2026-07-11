#!/usr/bin/env bash
# MysticsHR — smooth VPS deploy script
# • Only ever touches the "mysticshr-api" pm2 process — nothing else.
# • DB migrations are plain SQL (IF NOT EXISTS) — zero interactive prompts.
# • Uses pm2 restart/update-env when already running; pm2 start on first run.
#
# Usage (secrets come from the existing .env.pm2 on VPS — no need to export):
#   bash deploy.sh
#
# Or to override a secret for this run:
#   DATABASE_URL="postgres://..." bash deploy.sh

set -euo pipefail

PROJECT_DIR="/home/automystics-mysticshr/htdocs/mysticshr.automystics.tech"
BRANCH="${BRANCH:-main}"
PORT="${APP_PORT:-8090}"
PM2_APP="mysticshr-api"

cd "$PROJECT_DIR"

step() { echo ""; echo "▶ [$1/$TOTAL] $2"; }
TOTAL=7

# ── 1. Pull ───────────────────────────────────────────────────────────────────
step 1 "Pulling latest from origin/$BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# ── 2. Install dependencies ───────────────────────────────────────────────────
step 2 "Installing dependencies"
pnpm install --no-frozen-lockfile

# ── 3. DB migrations (idempotent SQL — no prompts, no drizzle push) ──────────
step 3 "Applying DB migrations"

# Load DATABASE_URL from .env.pm2 if not already in the environment
if [ -z "${DATABASE_URL:-}" ] && [ -f "$PROJECT_DIR/.env.pm2" ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' "$PROJECT_DIR/.env.pm2" | head -1 | cut -d= -f2-)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "  ERROR: DATABASE_URL not set and not found in .env.pm2"
  echo "  Add it to .env.pm2:  DATABASE_URL=postgres://user:pass@host/db"
  exit 1
fi

psql "$DATABASE_URL" <<'SQL'
-- platform_settings (Email Settings page)
CREATE TABLE IF NOT EXISTS platform_settings (
  id          serial PRIMARY KEY,
  category    text NOT NULL,
  key         text NOT NULL,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- enabled_screens column (Screen-level plan access control)
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS enabled_screens jsonb NOT NULL DEFAULT '[]'::jsonb;

-- DB Admin: audit log of all DB admin operations
CREATE TABLE IF NOT EXISTS platform_db_audit_log (
  id          serial PRIMARY KEY,
  admin_id    integer NOT NULL,
  admin_email text NOT NULL,
  action      text NOT NULL,
  table_name  text NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- DB Admin: soft-archive store
CREATE TABLE IF NOT EXISTS platform_db_archives (
  id          serial PRIMARY KEY,
  table_name  text NOT NULL,
  record_id   text NOT NULL,
  data        jsonb NOT NULL,
  reason      text NOT NULL DEFAULT '',
  admin_id    integer NOT NULL,
  admin_email text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
SQL

echo "  ✓ DB schema up to date"

# ── 4. Build shared DB types ──────────────────────────────────────────────────
step 4 "Building shared DB types"
pnpm --filter @workspace/db run build

# ── 5. Build SPAs ─────────────────────────────────────────────────────────────
step 5 "Building SPAs"
echo "  → MysticsHR SPA (BASE_PATH=/)"
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/mysticshr run build

echo "  → Platform Admin SPA (BASE_PATH=/platform_admin/)"
PORT=5174 BASE_PATH=/platform_admin/ pnpm --filter @workspace/platform-admin run build

# ── 6. Build API server ───────────────────────────────────────────────────────
step 6 "Building API server"
pnpm --filter @workspace/api-server run build

# ── 7. Restart ONLY mysticshr-api ─────────────────────────────────────────────
step 7 "Restarting $PM2_APP"
mkdir -p /var/log/pm2

if pm2 describe "$PM2_APP" &>/dev/null; then
  # Already running — reload config + env, zero downtime
  pm2 restart "$PM2_APP" --update-env
else
  # First run — start only this app from the ecosystem file
  pm2 start ecosystem.config.cjs --only "$PM2_APP"
fi

pm2 save --force

# ── Health check ──────────────────────────────────────────────────────────────
echo ""
echo "  Waiting for server to be ready..."
sleep 5

STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
apps = json.load(sys.stdin)
app = next((a for a in apps if a['name'] == '${PM2_APP}'), None)
print(app['pm2_env']['status'] if app else 'not_found')
" 2>/dev/null || echo "unknown")

if [ "$STATUS" != "online" ]; then
  echo ""
  echo "  ❌  pm2 status: $STATUS"
  echo "      Check logs:  pm2 logs $PM2_APP --lines 30 --nostream"
  exit 1
fi

HTTP=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/api/healthz" 2>/dev/null || echo "000")
if [ "$HTTP" != "200" ]; then
  echo ""
  echo "  ❌  Health check returned HTTP $HTTP"
  echo "      Check logs:  pm2 logs $PM2_APP --lines 30 --nostream"
  exit 1
fi

echo ""
echo "  ✅  Deployed successfully!"
echo ""
echo "  Health:          http://localhost:${PORT}/api/healthz  →  HTTP $HTTP"
echo "  MysticsHR:       https://mysticshr.automystics.tech"
echo "  Platform Admin:  https://mysticshr.automystics.tech/platform_admin/"
echo ""
pm2 status | grep -E "($PM2_APP|name)" || true
