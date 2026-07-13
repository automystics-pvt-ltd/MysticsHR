---
name: MysticsHR VPS deployment quirks
description: Hard-won lessons from deploying to srv1609330 (shared multi-tenant VPS at mysticshr.automystics.tech)
---

## Port
- Port 8080 is permanently held by another process on this VPS (pid was 962172, a node zombie). Use **port 8090** for mysticshr-api.
- Nginx config: `/etc/nginx/sites-available/mysticshr.automystics.tech` — proxies all traffic to `127.0.0.1:8090`.

**Why:** This is a shared VPS running 15+ pm2 apps. Port 8080 was claimed by another service and EADDRINUSE crashed mysticshr-api in a loop.

## ecosystem.config.cjs — env ordering matters
- `...fileEnv` (from `.env.pm2`) must be spread **before** `PORT` in the env block, otherwise `.env.pm2` overrides PORT.
- Correct order: `{ NODE_ENV, SERVE_SPA, ...fileEnv, PORT: "8090" }`

**Why:** `.env.pm2` on the server can have a stale `PORT=8080` from earlier manual edits. PORT must come last to always win.

## pm2 env changes require delete + start
- `pm2 restart` ignores updated env vars (warns "Use --update-env").
- Always use `pm2 delete mysticshr-api && pm2 start ecosystem.config.cjs` when changing port/env.

## git pull vs local modifications
- If the server file was modified by `sed`, `git pull` will not overwrite it.
- Force-apply: `git fetch origin main && git checkout origin/main -- ecosystem.config.cjs`

## SPA builds must run on server
- `artifacts/mysticshr/dist` and `artifacts/platform-admin/dist` are in `.gitignore`.
- Must build ON the server after every git pull:
  - `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/mysticshr run build`
  - `PORT=5174 BASE_PATH=/platform_admin/ pnpm --filter @workspace/platform-admin run build`
- `deploy.sh` handles this automatically when run with the correct env vars.

## OTP for platform admin
- OTP is logged to pm2 stdout (no email required during dev/testing).
- `pm2 logs mysticshr-api --lines 50 --nostream | grep "Platform OTP"`

## Prod schema drift — now fixed permanently via tracked drizzle migrations
- `deploy.sh` used to hand-patch prod schema with ad-hoc `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` blocks. Schema fields added in dev (lib/db/src/schema) after each patch was written silently never reached prod, causing 500s on routes selecting those columns (e.g. tenant detail).
- Fixed by baselining drizzle-kit's own migration tracker (`drizzle.__drizzle_migrations`) against a full-schema snapshot (`lib/db/migrations/0000_*.sql`), then wiring `deploy.sh` to run `pnpm --filter @workspace/db run migrate` every deploy.
- **Going forward:** any schema change in `lib/db/src/schema` must be followed by `pnpm --filter @workspace/db run generate` (commit the new `lib/db/migrations/NNNN_*.sql` + updated `meta/`) — that's what makes it reach prod automatically. Editing `deploy.sh` by hand for schema changes is no longer needed/correct.
- Dev DB's own migrations tracker was also baselined (same hash/timestamp) so `drizzle-kit migrate` no-ops there; dev still uses `pnpm --filter @workspace/db run push` for fast iteration.

## deploy.sh self-modifies mid-run — must re-exec after the pull
- `deploy.sh` does `git reset --hard` on itself (the file currently being interpreted by `bash deploy.sh`). bash reads a running script incrementally, so once the on-disk bytes change mid-run, the rest of that invocation can silently execute a stale/mismatched mix of old and new content — observed as: wrong total step count, whole steps missing, older SQL blocks running despite the new commit being checked out.
- Fixed permanently with a re-exec guard right after the `git reset --hard`: `if [ -z "${DEPLOY_REEXECED:-}" ]; then export DEPLOY_REEXECED=1; exec bash "$PROJECT_DIR/deploy.sh" "$@"; fi`. This starts a brand-new bash process that reads the just-updated file fresh from disk, so the rest of the run always matches exactly what was pulled.
- **Why this matters:** any self-updating deploy script that pulls itself before running must re-exec (or otherwise avoid continuing to read the same already-open file) — this is a generic bash gotcha, not specific to this script.
