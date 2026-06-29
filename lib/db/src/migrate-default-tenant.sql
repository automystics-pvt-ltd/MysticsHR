-- ============================================================
-- Multi-tenant bootstrap migration for MysticsHR
-- Run once in each environment (dev / staging / production)
-- to wrap existing single-tenant data into the "default" tenant.
--
-- Prerequisites:
--   1. drizzle-kit push has been run with the updated schema
--      (all customer-data tables have tenant_id NOT NULL after
--       the backfill below).
--   2. The tenants and platform_admins tables exist.
--
-- Steps performed:
--   A. Insert the default tenant (idempotent via ON CONFLICT DO NOTHING)
--   B. Rename any legacy super_admin roles → customer_admin
--      (safe no-op if the enum value was already dropped)
--   C. Backfill tenant_id = default-tenant-id on every customer table
--
-- NOTE: platform_admins is intentionally left empty by this script.
-- Use `pnpm --filter @workspace/api-server run seed:admin` (or a
-- one-time psql command) to create the first Platform Super Admin
-- in each environment after running this migration.
-- ============================================================

BEGIN;

-- ── A. Default tenant ─────────────────────────────────────────────────────────
INSERT INTO tenants (slug, name, is_active)
VALUES ('default', 'Default Organization', true)
ON CONFLICT (slug) DO NOTHING;

-- ── B. Legacy super_admin role rename ────────────────────────────────────────
-- Guard: only execute if the 'super_admin' enum value still exists.
-- This makes the step safe to run both before and after the drizzle-kit push
-- that removes the enum value.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_enum e
    JOIN   pg_type t ON t.oid = e.enumtypid
    WHERE  t.typname = 'hrms_role'
    AND    e.enumlabel = 'super_admin'
  ) THEN
    UPDATE hrms_users
    SET    role = 'customer_admin'
    WHERE  role::text = 'super_admin';
    RAISE NOTICE 'Renamed super_admin → customer_admin on % row(s)', ROW_COUNT;
  ELSE
    RAISE NOTICE 'super_admin enum value not present – skipping role rename';
  END IF;
END $$;

-- ── C. Backfill tenant_id on all customer tables ──────────────────────────────
DO $$
DECLARE
  default_tid INTEGER;
BEGIN
  SELECT id INTO default_tid FROM tenants WHERE slug = 'default';

  -- Core HR
  UPDATE hrms_users             SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employees              SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE departments            SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE designations           SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE roles                  SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE audit_logs             SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE api_keys               SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE system_settings        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE storage_cleanup_runs   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE approval_chain_configs SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Employee profile sub-tables
  UPDATE employee_profiles       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_education      SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_work_experience SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_documents      SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_skills         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_certifications SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_family_members SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_history        SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Attendance
  UPDATE attendance_records         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE attendance_regularizations SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE overtime_records           SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Shifts
  UPDATE shift_templates   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE shift_assignments SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE shift_swaps       SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Leave
  UPDATE leave_types            SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE leave_policies         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE leave_balances         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE leave_applications     SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE leave_accrual_history  SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE blackout_dates         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE permission_applications SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE permission_registers   SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Payroll
  UPDATE salary_structures       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE salary_components       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payroll_runs            SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payroll_records         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payslips                SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE tax_regime_declarations SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE salary_revisions        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payroll_locks           SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payroll_lock_exceptions SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE payroll_settings        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE loan_repayments         SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Performance
  UPDATE performance_cycles  SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE performance_goals   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE goal_progress       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE self_appraisals     SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE manager_evaluations SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE appraisal_outcomes  SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Recruitment
  UPDATE job_requisitions   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE candidates         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE interview_rounds   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE interview_feedback SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE offer_letters      SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Onboarding / Pre-onboarding
  UPDATE pre_onboarding_records   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE pre_onboarding_documents SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE onboarding_checklists    SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE onboarding_tasks         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE induction_sessions       SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Helpdesk
  UPDATE helpdesk_tickets   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE ticket_comments    SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE ticket_attachments SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE ticket_sla_logs    SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE ticket_assignments SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Documents
  UPDATE document_templates        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE issued_documents          SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE document_requests         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE document_download_tokens  SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Exit
  UPDATE exit_requests        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE exit_clearance_tasks SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE fnf_computations     SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE exit_interviews      SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Notifications
  UPDATE notification_logs        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE notification_templates   SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE notification_preferences SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE user_notifications       SET tenant_id = default_tid WHERE tenant_id IS NULL;

  -- Reports
  UPDATE report_schedules       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE saved_report_templates SET tenant_id = default_tid WHERE tenant_id IS NULL;

  RAISE NOTICE 'Backfill complete for default tenant_id = %', default_tid;
END $$;

COMMIT;
