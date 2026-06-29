---
name: Multi-tenant schema strategy
description: How tenantId is added and enforced in MysticsHR's multi-tenant refactor
---

# Multi-tenant schema strategy

## Rule
`tenantId` columns are defined as nullable in Drizzle schema (no `.notNull()`) so `drizzle-kit push` can apply them to tables with existing rows. The application layer enforces non-null via JWT claims.

**Why:** `drizzle-kit push` cannot add a NOT NULL column to a non-empty table without a default. Making it nullable at the DB level and enforcing at app layer avoids a complex migration dance.

**How to apply:** When adding new tables that need tenant isolation, follow the same pattern: nullable tenantId in schema, always pass tenantId from JWT in every query. Never query without a tenantId filter except in platform admin routes.

## Enum notes
- `super_admin` kept in `hrmsRoleEnum` for backward compat but no new users should get this role.
- `customer_admin` is the top role for tenant-level admins (replaces super_admin).
- Platform Super Admins live in `platform_admins` table, NOT `hrms_users`.

## Migration approach
- Used `drizzle-kit push` (not migration files).
- Manual SQL for data migration: insert default tenant, backfill tenant_id, rename roles.
- Default tenant: slug=`default`, id=1, name=`Default Organization`.
