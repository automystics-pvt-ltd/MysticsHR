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
