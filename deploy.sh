#!/usr/bin/env bash
# MysticsHR — smooth VPS deploy script
# • Only ever touches the "mysticshr-api" pm2 process — nothing else.
# • Uses pm2 restart/update-env when already running; pm2 start on first run.
#
# DB schema sync (permanent fix for prod schema drift):
#   1. One-time idempotent ALTER statements catch this DB up to a known-good
#      baseline (lib/db/migrations/0000_*.sql) and record that baseline as
#      applied in drizzle's own tracking table.
#   2. From then on, `pnpm --filter @workspace/db run migrate` (drizzle-kit
#      migrate) applies any newer migration files automatically. Whenever the
#      schema in lib/db/src/schema changes, run
#      `pnpm --filter @workspace/db run generate` in dev, commit the new
#      migration file under lib/db/migrations/, and this script will apply it
#      on the next deploy — no more hand-written ALTER TABLE statements here.
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
TOTAL=8

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

-- Tenants: catch up any columns added to the dev schema since this VPS was
-- first provisioned. All ADD COLUMN IF NOT EXISTS — safe to re-run any time.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_id integer,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS grace_period_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp,
  ADD COLUMN IF NOT EXISTS subscription_starts_at timestamp,
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp,
  ADD COLUMN IF NOT EXISTS custom_max_users integer,
  ADD COLUMN IF NOT EXISTS custom_max_employees integer,
  ADD COLUMN IF NOT EXISTS custom_max_branches integer,
  ADD COLUMN IF NOT EXISTS custom_max_api_calls integer,
  ADD COLUMN IF NOT EXISTS custom_price_monthly integer,
  ADD COLUMN IF NOT EXISTS custom_price_yearly integer,
  ADD COLUMN IF NOT EXISTS enabled_modules jsonb,
  ADD COLUMN IF NOT EXISTS enabled_features jsonb,
  ADD COLUMN IF NOT EXISTS theme_config jsonb,
  ADD COLUMN IF NOT EXISTS payslip_config jsonb,
  ADD COLUMN IF NOT EXISTS id_card_config jsonb,
  ADD COLUMN IF NOT EXISTS employee_id_prefix text,
  ADD COLUMN IF NOT EXISTS employee_id_sequence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razorpay_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

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

-- One-time bootstrap of drizzle-kit's tracked-migrations table (idempotent).
-- This marks the full-schema baseline (lib/db/migrations/0000_*.sql) as
-- already applied, since the ALTER statements above just brought this
-- database's columns in line with that baseline. From here on, ANY future
-- schema change is captured as a new drizzle migration file (checked into
-- git) and applied automatically by step 4 below — no more hand-written
-- ALTER TABLE statements needed, so this class of drift can't recur.
CREATE SCHEMA IF NOT EXISTS "drizzle";
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id         serial PRIMARY KEY,
  hash       text NOT NULL,
  created_at bigint
);
INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
SELECT '5a4405625a094b8862d93fdb1d83b55b15aad6ec21b9d3b7cbdaa1f615dcef5e', 1783930935158
WHERE NOT EXISTS (
  SELECT 1 FROM "drizzle"."__drizzle_migrations"
  WHERE hash = '5a4405625a094b8862d93fdb1d83b55b15aad6ec21b9d3b7cbdaa1f615dcef5e'
);
SQL

echo "  ✓ DB schema caught up + migrations baseline recorded"

# ── 4. Apply tracked schema migrations (permanent fix for schema drift) ──────
step 4 "Applying tracked schema migrations"
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run migrate

# ── 5. Build shared DB types ──────────────────────────────────────────────────
step 5 "Building shared DB types"
pnpm --filter @workspace/db run build

# ── 6. Build SPAs ─────────────────────────────────────────────────────────────
step 6 "Building SPAs"
echo "  → MysticsHR SPA (BASE_PATH=/)"
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/mysticshr run build

echo "  → Platform Admin SPA (BASE_PATH=/platform_admin/)"
PORT=5174 BASE_PATH=/platform_admin/ pnpm --filter @workspace/platform-admin run build

# ── 7. Build API server ───────────────────────────────────────────────────────
step 7 "Building API server"
pnpm --filter @workspace/api-server run build

# ── 8. Restart ONLY mysticshr-api ─────────────────────────────────────────────
step 8 "Restarting $PM2_APP"
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
