#!/usr/bin/env bash
# MysticsHR VPS deploy script — safe, idempotent, fully verified.
# Usage:
#   export DATABASE_URL="postgres://..."
#   export JWT_SECRET="..."
#   export RESEND_API_KEY="..."   # optional but recommended
#   bash deploy.sh
set -euo pipefail

PROJECT_DIR="/home/automystics-mysticshr/htdocs/mysticshr.automystics.tech"
BRANCH="${BRANCH:-main}"
PORT="${APP_PORT:-8090}"
PM2_APP="mysticshr-api"

cd "$PROJECT_DIR"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
echo ""
echo "▶ [1/8] Pulling latest from origin/$BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo ""
echo "▶ [2/8] Installing dependencies"
pnpm install --no-frozen-lockfile

# ── 3. Build shared db package ────────────────────────────────────────────────
echo ""
echo "▶ [3/8] Building shared DB types"
pnpm --filter @workspace/db run build

# ── 4. Build SPAs (must set PORT + BASE_PATH — Vite requires them) ───────────
echo ""
echo "▶ [4/8] Building MysticsHR SPA  (BASE_PATH=/)"
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/mysticshr run build

echo ""
echo "▶ [5/8] Building Platform Admin SPA  (BASE_PATH=/platform_admin/)"
PORT=5174 BASE_PATH=/platform_admin/ pnpm --filter @workspace/platform-admin run build

# ── 5. Build API server ───────────────────────────────────────────────────────
echo ""
echo "▶ [6/8] Building API server"
pnpm --filter @workspace/api-server run build

# ── 6. Validate required secrets ─────────────────────────────────────────────
echo ""
echo "▶ [7/8] Validating environment variables"
MISSING=()
[ -z "${DATABASE_URL:-}" ] && MISSING+=("DATABASE_URL")
[ -z "${JWT_SECRET:-}"   ] && MISSING+=("JWT_SECRET")
if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "  ERROR: missing required environment variables:"
  for v in "${MISSING[@]}"; do echo "    - $v"; done
  echo ""
  echo "  Set them in your shell before running deploy.sh:"
  echo "    export DATABASE_URL='postgres://...'"
  echo "    export JWT_SECRET='\$(openssl rand -hex 64)'"
  exit 1
fi

# Push DB schema (additive only — safe on live DB)
pnpm --filter db push-force

# Write secrets file (chmod 600, gitignored)
cat > "$PROJECT_DIR/.env.pm2" << ENVEOF
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
RESEND_API_KEY=${RESEND_API_KEY:-}
APP_URL=${APP_URL:-https://mysticshr.automystics.tech}
ALLOWED_ORIGIN=${ALLOWED_ORIGIN:-https://mysticshr.automystics.tech}
RESEND_FROM=${RESEND_FROM:-MysticsHR <noreply@automystics.tech>}
PLATFORM_ADMIN_EMAILS=${PLATFORM_ADMIN_EMAILS:-anandakumar.mani01@gmail.com,anandakumar.mani012@gmail.com}
ENVEOF
chmod 600 "$PROJECT_DIR/.env.pm2"

# ── 7. Restart pm2 safely (no port conflict) ──────────────────────────────────
echo ""
echo "▶ [8/8] Restarting pm2 process"
mkdir -p /var/log/pm2

# Stop the existing process cleanly before freeing the port
pm2 stop "$PM2_APP" 2>/dev/null || true
pm2 delete "$PM2_APP" 2>/dev/null || true

# Free the port from ANY process (stale zombie, old cluster worker, etc.)
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 2

# Start fresh — always from the ecosystem file (fork mode, reads .env.pm2)
pm2 start ecosystem.config.cjs
pm2 save

# ── 8. Verify ────────────────────────────────────────────────────────────────
echo ""
echo "  Waiting for server to be ready..."
sleep 6

STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
apps = json.load(sys.stdin)
app = next((a for a in apps if a['name'] == '${PM2_APP}'), None)
if app:
    print(app['pm2_env']['status'])
" 2>/dev/null || echo "unknown")

if [ "$STATUS" != "online" ]; then
  echo ""
  echo "  ❌ pm2 process is '$STATUS' — check logs:"
  echo "     pm2 logs $PM2_APP --lines 20 --nostream"
  exit 1
fi

HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/api/healthz" 2>/dev/null || echo "000")
if [ "$HTTP" != "200" ]; then
  echo ""
  echo "  ❌ Health check returned HTTP $HTTP — check logs:"
  echo "     pm2 logs $PM2_APP --lines 20 --nostream"
  exit 1
fi

echo ""
echo "  ✅ Deployed successfully!"
echo ""
echo "  Health:          http://localhost:${PORT}/api/healthz  →  $HTTP"
echo "  MysticsHR:       https://mysticshr.automystics.tech"
echo "  Platform Admin:  https://mysticshr.automystics.tech/platform_admin/"
echo ""
pm2 status | grep "$PM2_APP" || true
