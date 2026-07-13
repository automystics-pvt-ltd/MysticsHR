---
name: OpenAPI spec is hand-maintained, not auto-derived
description: lib/api-spec/openapi.yaml must be manually edited before codegen picks up new endpoints; it only covers mysticshr-consumed endpoints, not platform-admin.
---

`lib/api-spec/openapi.yaml` is a hand-written static spec, not generated from the Express routes. New backend endpoints do not automatically appear in it or in the generated client.

**Why:** `pnpm run codegen` (run inside `lib/api-spec`) reads this YAML to produce `lib/api-client-react` and `lib/api-zod`. If a route is added to `artifacts/api-server` without a matching path added to the YAML first, codegen silently has nothing new to generate and the frontend has no typed hook for it.

**How to apply:** Before adding a new employee/ESS-facing endpoint consumed by `mysticshr`, add its path (and any new/changed schema fields) to `openapi.yaml` first, then run `pnpm run codegen` from `lib/api-spec` and confirm a clean typecheck. Note: `platform-admin`'s hand-written `api.ts` client is separate and intentionally NOT covered by this spec (no `/platform/tenants` paths exist in it) — platform-admin routes don't need spec updates.
