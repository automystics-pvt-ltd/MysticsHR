---
name: Multi-tenant auth login design
description: How login handles the same email existing across multiple tenants
---

The login endpoint allows the same email in different tenants (uniqueness is per tenant, not global).

**Rule:** `POST /auth/login` accepts `{ email, password, tenantSlug? }`.
- If `tenantSlug` provided: resolve tenant first, then scope email lookup to that tenant.
- If no `tenantSlug`: fetch all users with that email across all tenants, then bcrypt.compare each candidate to find the match.

**Why:** With per-tenant email uniqueness, a single `.limit(1)` query on email alone is non-deterministic and can authenticate a user into the wrong tenant. The multi-candidate approach is always correct regardless of how many tenants share an email.

**How to apply:** Any future login or session endpoint must scope by tenantId. Never use email alone as the user identity key in a multi-tenant context.

**Relevant file:** `artifacts/api-server/src/routes/auth.ts`
