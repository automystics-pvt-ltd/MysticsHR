---
name: Drizzle/lib package typecheck fails after schema change despite correct source
description: Project-referenced workspace packages (composite tsconfig) must be rebuilt after a schema/type change, or dependents see stale field errors even though the source is correct.
---

`lib/db`'s package.json `exports` map points at `./src/...` (source), which looks like it should make `dist/` irrelevant for type-checking consumers. In practice it does not: `lib/db`'s tsconfig has `"composite": true`, and it is listed in consumers' `references`. When TypeScript checks a project with `references`, composite referenced projects must have up-to-date build output (`dist/*.d.ts`) — otherwise consumers get misleading `TS2339: Property '...' does not exist` errors on fields that were just added to the schema, or (if `dist` is missing entirely) `TS6305: Output file has not been built from source file`.

**Why:** after a schema change (e.g. adding a column to `tenantsTable`) merged from a task agent, `artifacts/api-server` typecheck failed with "Property 'employeeIdSequence' does not exist" even though the field was clearly present in `lib/db/src/schema/tenants.ts`. The actual cause was a stale `lib/db/dist/schema/tenants.d.ts` left over from before the schema change — not a resolution or caching bug in the consumer.

**How to apply:** whenever a composite workspace lib (`lib/db`, `lib/api-zod`, etc.) has schema/type changes — especially after merging a task agent's work — run `pnpm --filter <lib-package> run build` (or the repo's `typecheck:libs` build step) before trusting a consumer's typecheck failure as a real code bug. Check for this before deep-diving into "phantom" property-does-not-exist errors on fields you can see in the source.
