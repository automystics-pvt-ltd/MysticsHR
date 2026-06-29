-- ============================================================
-- Multi-tenant bootstrap migration for MysticsHR
-- Run once in each environment (dev / staging / production)
-- to wrap existing single-tenant data into the "default" tenant.
--
-- SAFE FOR POPULATED DATABASES:
--   This script adds all tenant_id columns as NULLABLE first,
--   backfills them, then enforces NOT NULL — so it works on any
--   database that existed before the multi-tenant schema was added.
--
-- RECOMMENDED RUN ORDER (for environments with existing data):
--   1.  psql $DATABASE_URL -f migrate-default-tenant.sql
--   2.  pnpm --filter @workspace/db run push-force
--       (push is now a no-op / only adds FKs; columns already exist)
--
-- For FRESH databases: run drizzle-kit push first, then this script.
-- The ADD COLUMN IF NOT EXISTS guards make it idempotent in both cases.
--
-- NOTE: platform_admins is intentionally left empty.
-- Provision the first Platform Super Admin separately:
--   node -e "require('bcrypt').hash('YourPass',12).then(console.log)"
--   INSERT INTO platform_admins (email,name,password_hash,is_active)
--   VALUES ('admin@example.com','Platform Admin','<hash>',true);
-- ============================================================

-- ── Pre-migration: ensure customer_admin enum value exists ───────────────────
-- ALTER TYPE ... ADD VALUE cannot be used inside a BEGIN...COMMIT transaction
-- and then have the new value read in the same transaction (PostgreSQL restriction).
-- Running it here, before BEGIN, means it commits in its own auto-commit transaction
-- so the value is fully visible when Step B runs inside the transaction below.
--
-- The DO block guard handles two safe cases:
--   • hrms_role doesn't exist yet (fresh DB, drizzle-kit push not yet run) → skipped
--   • customer_admin already in enum (post-push or re-run) → IF NOT EXISTS no-op
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hrms_role') THEN
    EXECUTE 'ALTER TYPE hrms_role ADD VALUE IF NOT EXISTS ''customer_admin''';
  END IF;
END $$;

BEGIN;

-- ── 0. Bootstrap: create tenant infrastructure tables if missing ──────────────
-- (no-op when drizzle-kit push has already created them)

CREATE TABLE IF NOT EXISTS tenants (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admins (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── A. Default tenant ─────────────────────────────────────────────────────────
INSERT INTO tenants (slug, name, is_active)
VALUES ('default', 'Default Organization', true)
ON CONFLICT (slug) DO NOTHING;

-- ── B. Legacy super_admin role rename ────────────────────────────────────────
-- Guard: only runs if the enum value still exists, making this step safe
-- both before and after the drizzle-kit push that removes the value.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_enum  e
    JOIN   pg_type  t ON t.oid = e.enumtypid
    WHERE  t.typname   = 'hrms_role'
    AND    e.enumlabel = 'super_admin'
  ) THEN
    UPDATE hrms_users
    SET    role = 'customer_admin'
    WHERE  role::text = 'super_admin';
    RAISE NOTICE 'Renamed super_admin → customer_admin';
  ELSE
    RAISE NOTICE 'super_admin enum value not present – skipping role rename';
  END IF;
END $$;

-- ── C. Add tenant_id as NULLABLE to every customer table ─────────────────────
-- All guards use ADD COLUMN IF NOT EXISTS so this step is idempotent.
-- We do NOT add the FK reference here; drizzle-kit push applies that.
-- The column type (INTEGER) matches the tenants.id SERIAL primary key.

-- Core HR
ALTER TABLE hrms_users              ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE employees               ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE departments             ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE designations            ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE roles                   ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE audit_logs              ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE api_keys                ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE system_settings         ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE storage_cleanup_runs    ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE approval_chain_configs  ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Employee profile sub-tables
ALTER TABLE employee_profiles        ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE employee_education       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE employee_work_experience ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE employee_documents       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE employee_skills          ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE employee_certifications  ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE employee_family_members  ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE employee_history         ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Attendance
ALTER TABLE attendance_records          ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE attendance_regularizations  ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE overtime_records            ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Shifts
ALTER TABLE shift_templates   ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE shift_swaps       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Leave
ALTER TABLE leave_types             ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE leave_policies          ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE leave_balances          ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE leave_applications      ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE leave_accrual_history   ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE blackout_dates          ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE permission_applications ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE permission_registers    ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Payroll
ALTER TABLE salary_structures       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE salary_components       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE payroll_runs            ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE payroll_records         ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE payslips                ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE tax_regime_declarations ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE salary_revisions        ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE payroll_locks           ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE payroll_lock_exceptions ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE payroll_settings        ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE loan_repayments         ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Performance
ALTER TABLE performance_cycles  ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE performance_goals   ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE goal_progress       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE self_appraisals     ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE manager_evaluations ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE appraisal_outcomes  ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Recruitment
ALTER TABLE job_requisitions  ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE candidates         ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE interview_rounds   ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE interview_feedback ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE offer_letters      ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Onboarding / Pre-onboarding
ALTER TABLE pre_onboarding_records   ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE pre_onboarding_documents ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE onboarding_checklists    ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE onboarding_tasks         ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE induction_sessions       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Helpdesk
ALTER TABLE helpdesk_tickets   ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE ticket_comments    ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE ticket_sla_logs    ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE ticket_assignments ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Documents
ALTER TABLE document_templates       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE issued_documents         ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE document_requests        ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE document_download_tokens ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Exit
ALTER TABLE exit_requests        ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE exit_clearance_tasks ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE fnf_computations     ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE exit_interviews      ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Notifications
ALTER TABLE notification_logs        ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE notification_templates   ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE user_notifications       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Reports
ALTER TABLE report_schedules       ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE saved_report_templates ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- ── D. Backfill: set tenant_id = default tenant on all existing rows ──────────
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
  UPDATE employee_profiles        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_education       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_work_experience SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_documents       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_skills          SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_certifications  SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_family_members  SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE employee_history         SET tenant_id = default_tid WHERE tenant_id IS NULL;

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
  UPDATE document_templates       SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE issued_documents         SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE document_requests        SET tenant_id = default_tid WHERE tenant_id IS NULL;
  UPDATE document_download_tokens SET tenant_id = default_tid WHERE tenant_id IS NULL;

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

-- ── E. Enforce NOT NULL on all tenant_id columns ──────────────────────────────
-- These are no-ops when drizzle-kit push has already enforced them.
-- On populated databases this runs after the backfill above, so it succeeds.

-- Core HR
ALTER TABLE hrms_users             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employees              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE departments            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE designations           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE roles                  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE audit_logs             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE api_keys               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE system_settings        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE storage_cleanup_runs   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE approval_chain_configs ALTER COLUMN tenant_id SET NOT NULL;

-- Employee profile sub-tables
ALTER TABLE employee_profiles        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_education       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_work_experience ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_documents       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_skills          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_certifications  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_family_members  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_history         ALTER COLUMN tenant_id SET NOT NULL;

-- Attendance
ALTER TABLE attendance_records         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE attendance_regularizations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE overtime_records           ALTER COLUMN tenant_id SET NOT NULL;

-- Shifts
ALTER TABLE shift_templates   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE shift_assignments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE shift_swaps       ALTER COLUMN tenant_id SET NOT NULL;

-- Leave
ALTER TABLE leave_types             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE leave_policies          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE leave_balances          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE leave_applications      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE leave_accrual_history   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE blackout_dates          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE permission_applications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE permission_registers    ALTER COLUMN tenant_id SET NOT NULL;

-- Payroll
ALTER TABLE salary_structures       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE salary_components       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll_runs            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll_records         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payslips                ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tax_regime_declarations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE salary_revisions        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll_locks           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll_lock_exceptions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll_settings        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE loan_repayments         ALTER COLUMN tenant_id SET NOT NULL;

-- Performance
ALTER TABLE performance_cycles  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE performance_goals   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE goal_progress       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE self_appraisals     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE manager_evaluations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE appraisal_outcomes  ALTER COLUMN tenant_id SET NOT NULL;

-- Recruitment
ALTER TABLE job_requisitions   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE candidates         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE interview_rounds   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE interview_feedback ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE offer_letters      ALTER COLUMN tenant_id SET NOT NULL;

-- Onboarding / Pre-onboarding
ALTER TABLE pre_onboarding_records   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pre_onboarding_documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE onboarding_checklists    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE onboarding_tasks         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE induction_sessions       ALTER COLUMN tenant_id SET NOT NULL;

-- Helpdesk
ALTER TABLE helpdesk_tickets   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ticket_comments    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ticket_attachments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ticket_sla_logs    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ticket_assignments ALTER COLUMN tenant_id SET NOT NULL;

-- Documents
ALTER TABLE document_templates       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE issued_documents         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE document_requests        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE document_download_tokens ALTER COLUMN tenant_id SET NOT NULL;

-- Exit
ALTER TABLE exit_requests        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE exit_clearance_tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE fnf_computations     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE exit_interviews      ALTER COLUMN tenant_id SET NOT NULL;

-- Notifications
ALTER TABLE notification_logs        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notification_templates   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE user_notifications       ALTER COLUMN tenant_id SET NOT NULL;

-- Reports
ALTER TABLE report_schedules       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE saved_report_templates ALTER COLUMN tenant_id SET NOT NULL;

-- ── F. Tenant-scoped unique indexes ───────────────────────────────────────────
-- These replace the old global unique constraints with per-tenant uniqueness.
-- IF NOT EXISTS prevents errors on re-runs or post-push execution.

CREATE UNIQUE INDEX IF NOT EXISTS hrms_users_email_tenant_idx
  ON hrms_users (email, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS employees_tenant_employee_id_idx
  ON employees (tenant_id, employee_id);

CREATE UNIQUE INDEX IF NOT EXISTS employees_tenant_email_idx
  ON employees (tenant_id, email);

CREATE UNIQUE INDEX IF NOT EXISTS departments_tenant_code_idx
  ON departments (tenant_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS designations_tenant_code_idx
  ON designations (tenant_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS roles_tenant_slug_idx
  ON roles (tenant_id, slug);

CREATE UNIQUE INDEX IF NOT EXISTS leave_types_tenant_code_idx
  ON leave_types (tenant_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS payroll_settings_tenant_key_idx
  ON payroll_settings (tenant_id, setting_key);

CREATE UNIQUE INDEX IF NOT EXISTS job_requisitions_tenant_code_idx
  ON job_requisitions (tenant_id, requisition_code);

CREATE UNIQUE INDEX IF NOT EXISTS offer_letters_tenant_code_idx
  ON offer_letters (tenant_id, offer_code);

COMMIT;
