---
name: Billing SQL raw alias pitfall
description: Drizzle-orm raw sql`` fragments do not support JOIN aliases; use actual table names
---

When writing drizzle-orm `.select()` with raw `sql<T>\`...\`` fragments inside a query that has a `.leftJoin()`, the joined table is referenced by its **actual table name**, not any alias.

**Wrong:**
```ts
sql<number>`sum(ti.amount_cents)`  // "ti" alias doesn't exist
```

**Correct:**
```ts
sql<number>`sum(tenant_invoices.amount_cents)`  // actual table name
```

**Why:** drizzle-orm generates SQL using the table's real name from `pgTable("tenant_invoices", ...)`. There is no alias mechanism in the query builder for the joined tables, so raw SQL fragments must reference the schema-defined name.

**How to apply:** Any time you write a raw `sql\`\`` expression inside a query with joins, use the PostgreSQL table name as defined in `pgTable("...", ...)` — never invent a short alias like `ti`, `sp`, etc.
