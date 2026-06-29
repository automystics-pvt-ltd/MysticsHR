-- ============================================================
-- Multi-tenant bootstrap migration for MysticsHR
-- Run once in each environment (dev / staging / production)
-- to wrap existing single-tenant data into the "default" tenant
-- and provision the Platform Super Admin account.
--
-- Prerequisites:
--   1. drizzle-kit push has been run with the updated schema
--      (all tables have the nullable tenant_id column).
--   2. The platform_admins table exists (created by the schema push).
--
-- Steps performed:
--   A. Insert the default tenant (idempotent via ON CONFLICT DO NOTHING)
--   B. Insert the Platform Super Admin user (idempotent)
--   C. Backfill tenant_id = default-tenant-id on every customer table
--
-- Note: The hrms_role enum value 'super_admin' was removed via
-- drizzle-kit push before this script runs. If any rows still
-- carry that legacy value, update them manually to 'customer_admin'
-- before running drizzle-kit push.
-- ============================================================

BEGIN;

-- ── A. Default tenant ─────────────────────────────────────────
INSERT INTO tenants (slug, name, is_active)
VALUES ('default', 'Default Organization', true)
ON CONFLICT (slug) DO NOTHING;

-- ── B. Platform Super Admin ────────────────────────────────────
-- IMPORTANT: Change this password immediately after first login.
-- Generate a new bcrypt hash: node -e "require('bcrypt').hash('YourNewPass', 12).then(console.log)"
-- Then: UPDATE platform_admins SET password_hash = '<new-hash>' WHERE email = 'platform@mysticshr.io';
INSERT INTO platform_admins (email, name, password_hash, is_active)
VALUES (
  'platform@mysticshr.io',
  'Platform Admin',
  '$2b$12$sCgXKkjRRvjd/H78JUZYs.nD1GfwAkqCyYw16yQ4Agt1PNCAVOgn6',
  true
)
ON CONFLICT (email) DO NOTHING;

-- ── C. Backfill tenant_id on all customer tables ───────────────
DO $$
DECLARE
  default_tid INTEGER;
BEGIN
  SELECT id INTO default_tid FROM tenants WHERE slug = 'default';

  -- Core HR
  UPDATE hrms_users           SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employees            SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE departments          SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE designations         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE roles                SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE audit_logs           SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE api_keys             SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE system_settings      SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE storage_cleanup_runs SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE approval_chain_configs SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Attendance
  UPDATE attendance_records         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE attendance_regularizations SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE overtime_records           SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Shifts
  UPDATE shift_templates   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE shift_assignments SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE shift_swaps       SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Leave
  UPDATE leave_types        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE leave_policies     SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE leave_balances     SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE leave_applications SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Payroll
  UPDATE salary_structures       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE salary_components       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payroll_runs            SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payroll_records         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payslips                SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE tax_regime_declarations SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE salary_revisions        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payroll_locks           SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payroll_settings        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE loan_repayments         SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Performance
  UPDATE performance_cycles   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE performance_goals    SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE goal_progress        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE self_appraisals      SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE manager_evaluations  SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE appraisal_outcomes   SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Recruitment
  UPDATE job_requisitions   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE candidates         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE interview_rounds   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE interview_feedback SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE offer_letters      SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Onboarding / Pre-onboarding
  UPDATE pre_onboarding_records SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE onboarding_checklists  SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE onboarding_tasks       SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Helpdesk
  UPDATE helpdesk_tickets   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE ticket_comments    SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE ticket_attachments SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Documents
  UPDATE document_templates SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE issued_documents   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE document_requests  SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Exit
  UPDATE exit_requests        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE exit_clearance_tasks SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Notifications
  UPDATE notification_logs      SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE notification_templates SET tenant_id = default_tid WHERE tenant_id IS NULL;

  RAISE NOTICE 'Backfill complete for default tenant_id = %', default_tid;
END $$;

COMMIT;
