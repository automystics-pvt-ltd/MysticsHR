---
name: Multi-tenant schema strategy
description: How tenantId is added and enforced in MysticsHR's multi-tenant refactor
---

# Multi-tenant schema strategy

## Rule
Adding `tenantId` to tables with existing data requires a 3-step approach:
1. Define column as nullable in Drizzle schema → run `drizzle-kit push` (column added without constraint)
2. Run `lib/db/src/migrate-default-tenant.sql` to backfill all rows with `tenant_id = 1`
3. Change schema to `.notNull().references(...)` → run `drizzle-kit push` again (applies NOT NULL constraint)

**Why:** `drizzle-kit push` cannot add a NOT NULL column to a non-empty table in one step. Split into add-then-constrain.

**How to apply:** For any new table needing tenant isolation, follow the same 3-step pattern. Never skip the backfill step or the NOT NULL push will fail.

## Enum notes
- `super_admin` was fully removed from `hrmsRoleEnum` — drizzle-kit push handles PostgreSQL enum removal automatically.
- `customer_admin` is the top role for tenant-level admins.
- Platform Super Admins live in `platform_admins` table, NOT `hrms_users`.
- `hrms_role` enum values: `customer_admin`, `hr_manager`, `hr_executive`, `hod`, `payroll_admin`, `employee`.

## Migration approach
- Schema management: `drizzle-kit push` (not migration files).
- Data migration: `lib/db/src/migrate-default-tenant.sql` — idempotent, safe to re-run.
- Default tenant: slug=`default`, id=1, name=`Default Organization`.
- Platform admin email: `platform@mysticshr.io`; stored in `platform_admins` table; initial password is a bootstrap secret that must be rotated after first login.

## Coverage
61 tables have `tenant_id NOT NULL`. All customer-data tables are covered including the secondary sub-tables (goal_progress, self_appraisals, manager_evaluations, salary_components, payroll_records, payslips, onboarding_tasks, ticket_comments, ticket_attachments, exit_clearance_tasks, document_requests, interview_rounds, interview_feedback, overtime_records).
