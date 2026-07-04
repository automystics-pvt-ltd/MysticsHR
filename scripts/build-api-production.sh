#!/bin/bash
set -e

echo "=== [1/4] Building MysticsHR SPA ==="
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/mysticshr run build

echo "=== [2/4] Building Platform Admin SPA ==="
PORT=5174 BASE_PATH=/platform_admin/ pnpm --filter @workspace/platform-admin run build

echo "=== [3/4] Building API Server ==="
pnpm --filter @workspace/api-server run build

echo "=== [4/4] Syncing DB Schema ==="
if [ -z "$DATABASE_URL" ]; then
  echo "WARNING: DATABASE_URL is not set — skipping DB schema sync"
else
  # Use --force to run non-interactively in CI/CD (only additive schema changes are expected)
  pnpm --filter db push-force
fi

echo "=== Production build complete ==="
