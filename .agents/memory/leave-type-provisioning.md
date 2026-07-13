---
name: Leave type auto-provisioning
description: New tenants (self-signup or platform-admin created) had zero leave types, silently breaking the Leave module's Apply Leave dropdown.
---

Tenant creation (self-service signup verify, and platform-admin manual tenant creation) never seeded any `leave_types`/`leave_policies` rows. The Leave module's UI degrades gracefully (empty dropdown, no crash) so this was easy to miss in QA — it looks like "no data yet" rather than a bug.

**Why:** `seed.ts` only seeds the demo dataset when explicitly run; it is not part of the tenant-creation code path. Any tenant created outside of `seed.ts` (via signup or platform admin) got no leave types at all, making Apply Leave permanently unusable until someone manually visited Leave Types and added them.

**How to apply:** `provisionDefaultLeaveTypes(tenantId)` in `artifacts/api-server/src/routes/leave.ts` inserts the standard 6 leave types + matching policies (idempotent via `onConflictDoNothing`). It's called from both tenant-creation paths (`self-service.ts` signup verify, `platform.ts` tenant create). If a new tenant-creation path is added later, call this too. It does not create `leave_balances` for employees — those are created lazily per employee/type/year via `getOrCreateBalance` in leave.ts, so no backfill is needed there for new tenants.
