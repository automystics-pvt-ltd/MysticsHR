---
name: Postgres array bind params with drizzle
description: A raw sql template with a JS array interpolated into ANY(...) throws "op ANY/ALL (array) requires array on right side".
---

`sql\`role = ANY(${rolesArray})\`` (raw drizzle `sql` template) expands a JS array into individual scalar bind params instead of a Postgres array literal, so Postgres sees `ANY($1, $2, $3)` — invalid — not `ANY(ARRAY[$1,$2,$3])`.

**Why:** drizzle's `sql` template tag does not know an interpolated array should become an array literal; it just splices values in as separate placeholders.

**How to apply:** use drizzle's `inArray(column, values)` helper for this exact pattern, or build the literal explicitly (`sql\`ANY(ARRAY[${sql.join(...)}])\`` style) if raw SQL is unavoidable. Grep for other raw `= ANY(${...})` usages when you hit this — check each one individually, since some may already build a proper `ARRAY[...]` literal and be fine.
