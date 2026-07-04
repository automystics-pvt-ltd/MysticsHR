#!/bin/bash
set -e

echo "=== [1/2] Building API Server ==="
pnpm --filter @workspace/api-server run build

echo "=== [2/2] Syncing DB Schema ==="
if [ -z "$DATABASE_URL" ]; then
  echo "WARNING: DATABASE_URL is not set — skipping DB schema sync"
else
  # Use --force to run non-interactively in CI/CD (only additive schema changes are expected)
  pnpm --filter db push-force
fi

echo "=== Production build complete ==="
