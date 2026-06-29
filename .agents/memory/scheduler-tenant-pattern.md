---
name: Scheduler tenant isolation pattern
description: How background jobs must handle multi-tenant data — never hardcode a tenantId
---

**Rule:** The scheduler must never hardcode `tenantId = 1` or fetch global records without tenant scoping.

**Pattern:**
1. Fetch records that include `tenantId` in the SELECT (add it if missing).
2. Group records by tenantId.
3. For each tenantId, fetch tenant-specific config/users (e.g. `getUsersByRoles(roles, tenantId)`).
4. Process per-tenant.

**Why:** Hardcoded tenantId=1 means background workflows (SLA escalation, approval escalation, leave reminders) silently only work for the default tenant. All other tenants never get notifications.

**Where applied:**
- `escalateSlaBreaches()` — groups overdue helpdesk tickets by tenantId, pre-fetches HR managers per tenant.
- `processConfiguredEscalations()` — uses `config.tenantId` from the approvalChainConfigsTable row.

**Relevant file:** `artifacts/api-server/src/lib/scheduler.ts`
