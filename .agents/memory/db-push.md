---
name: DB push approach
description: How to apply schema changes in this project — raw SQL only, not drizzle-kit push
---

Use `executeSql` in the code_execution sandbox for all schema changes (ALTER TABLE, CREATE TABLE, etc.).

**Why:** `pnpm --filter @workspace/db run push` (drizzle-kit push) triggers an interactive TTY prompt asking to confirm changes. This blocks the agent and times out.

**How to apply:** Whenever you need to add a column, create a table, or modify an enum:
1. Write raw SQL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`)
2. Run it via `executeSql` in code_execution
3. Also update the Drizzle ORM schema file (lib/db/src/schema/*.ts) so the ORM type system stays in sync

New tables also need:
- An `export *` line in `lib/db/src/schema/index.ts`
- Any required imports in the schema file (e.g., foreign key references to other tables)
