---
name: API client dist .d.ts must match src
description: TypeScript resolves api-client-react types from the stale dist/ folder even though package.json exports ./src/index.ts.
---

## Rule
When updating interface types in `lib/api-client-react/src/generated/api.schemas.ts`, ALWAYS also update `lib/api-client-react/dist/generated/api.schemas.d.ts`.

**Why:** Despite package.json pointing exports to `./src/index.ts`, the TypeScript compiler (in artifacts/mysticshr) resolves types from the dist `.d.ts` files. If only src is updated, the compiler still sees the old interface and reports errors.

**How to apply:** After any change to `api.schemas.ts`, grep `api.schemas.d.ts` for the same interface and update it in parallel.
