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

echo "==> Checking required environment variables"
MISSING=()
[ -z "${DATABASE_URL:-}" ] && MISSING+=("DATABASE_URL")
[ -z "${JWT_SECRET:-}"   ] && MISSING+=("JWT_SECRET")
if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "ERROR: The following required environment variables are not set:"
  for v in "${MISSING[@]}"; do echo "  - $v"; done
  echo ""
  echo "Fix: export each variable in your shell, then re-run deploy.sh"
  echo "  e.g.  export DATABASE_URL='postgres://...'"
  echo "        export JWT_SECRET='...'"
  echo "        bash deploy.sh"
  exit 1
fi

echo "==> Syncing DB schema (drizzle-kit push)"
pnpm --filter db push-force

echo "==> Writing secrets to .env.pm2 (read by ecosystem.config.cjs)"
# Capture secrets from the current shell into a local file that pm2 reads.
# This file is gitignored — secrets never leave the server.
cat > "$PROJECT_DIR/.env.pm2" << ENVEOF
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
RESEND_API_KEY=${RESEND_API_KEY:-}
APP_URL=${APP_URL:-https://mysticshr.automystics.tech}
ALLOWED_ORIGIN=${ALLOWED_ORIGIN:-https://mysticshr.automystics.tech}
RESEND_FROM=${RESEND_FROM:-MysticsHR <noreply@automystics.tech>}
ENVEOF
chmod 600 "$PROJECT_DIR/.env.pm2"

echo "==> Restarting API server (via pm2 ecosystem)"
mkdir -p /var/log/pm2
pm2 reload ecosystem.config.cjs --update-env 2>/dev/null || \
  pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "==> Done."
echo "    Health check:    curl http://localhost:8080/api/healthz"
echo "    MysticsHR:       https://mysticshr.automystics.tech"
echo "    Platform Admin:  https://mysticshr.automystics.tech/platform_admin/"
