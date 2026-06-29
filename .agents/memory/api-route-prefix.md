---
name: API server route prefix
description: All Express routes are mounted under /api; direct curl must include the /api prefix.
---

## Rule
The API server mounts all routes under `/api`: `app.use("/api", router)` in `artifacts/api-server/src/app.ts`.

**Why:** The frontend Vite proxy forwards `/api/*` → `http://localhost:8080/api/*`, so the paths match without stripping. Direct shell curl must therefore use `/api/auth/login`, not `/auth/login`.

**How to apply:** All shell-level API tests, health checks, or debugging curls must prefix with `/api/`.
