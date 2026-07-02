-- MysticsHR Production Migration Script
-- Safe to run multiple times — uses IF NOT EXISTS / DO blocks throughout
-- Run with: psql $DATABASE_URL -f scripts/migrate-production.sql

-- ─── New ENUM Types ────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE wfh_status AS ENUM('Pending','Approved','Rejected','Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE expense_category AS ENUM('Meals','Travel','Accommodation','Communications','Office Supplies','Training','Client Entertainment','Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE expense_claim_status AS ENUM('Draft','Submitted','Approved','Rejected','Paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE shift_change_status AS ENUM('Pending','Approved','Rejected','Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE lock_exception_status AS ENUM('Pending','Approved','Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE lock_exception_type AS ENUM('edit_salary','edit_attendance','edit_leave_balance','edit_bank_account'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Tenants: new columns ──────────────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_starts_at timestamp;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_max_users integer;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_max_employees integer;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_max_branches integer;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_max_api_calls integer;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_price_monthly integer;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_price_yearly integer;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enabled_modules jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enabled_features jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS razorpay_customer_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_address jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS grace_period_days integer NOT NULL DEFAULT 7;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamp;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id integer;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country text;

-- ─── HRMS Users: MFA + security columns ───────────────────────────────────
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS locked_at timestamp;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS locked_reason text;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS last_login_at timestamp;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS invite_token text;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS invite_expiry timestamp;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS invited_at timestamp;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS mfa_secret text;
ALTER TABLE hrms_users ADD COLUMN IF NOT EXISTS mfa_backup_codes jsonb;

-- ─── Employees: new columns ────────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id integer;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS default_shift_template_id integer;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url text;

-- ─── Subscription Plans ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id serial PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'starter',
  price_monthly integer NOT NULL DEFAULT 0,
  price_yearly integer NOT NULL DEFAULT 0,
  max_users integer NOT NULL DEFAULT 10,
  max_employees integer NOT NULL DEFAULT 50,
  max_branches integer NOT NULL DEFAULT 1,
  max_api_calls integer NOT NULL DEFAULT 10000,
  enabled_modules jsonb NOT NULL DEFAULT '[]',
  enabled_features jsonb NOT NULL DEFAULT '[]',
  description text,
  offer_text text,
  badge_text text,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- ─── Platform Admins ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admins (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- ─── Branches ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  code text NOT NULL,
  address text,
  city text,
  state text,
  country text DEFAULT 'India',
  phone text,
  email text,
  is_headquarters boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS branches_tenant_code_idx ON branches(tenant_id, code);

-- ─── Roles & Permissions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  slug varchar(50) NOT NULL,
  label varchar(100) NOT NULL,
  description text,
  level integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS roles_tenant_slug_idx ON roles(tenant_id, slug);

CREATE TABLE IF NOT EXISTS role_permissions (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  role_id integer NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  resource text NOT NULL,
  action text NOT NULL,
  conditions jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_role_resource_action_idx ON role_permissions(role_id, resource, action);

-- ─── API Keys ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamp,
  expires_at timestamp,
  created_by integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- ─── Billing: Tenant Invoices ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_invoices (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  plan_id integer,
  invoice_number text NOT NULL UNIQUE,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone,
  payment_method text,
  payment_reference text,
  notes text,
  gateway text NOT NULL DEFAULT 'manual',
  gateway_order_id text,
  gateway_payment_id text,
  tax_amount_cents integer NOT NULL DEFAULT 0,
  gst_number text,
  discount_cents integer NOT NULL DEFAULT 0,
  description text,
  billing_address jsonb,
  line_items jsonb,
  pdf_url text,
  due_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── Billing: Tenant Payments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_payments (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  invoice_id integer,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_method text,
  reference_number text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── Billing: Payment Transactions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_transactions (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  invoice_id integer,
  gateway text NOT NULL DEFAULT 'razorpay',
  gateway_order_id text,
  gateway_payment_id text,
  gateway_signature text,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  method text,
  error_code text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── Billing: Subscription History ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_history (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  from_plan_id integer,
  to_plan_id integer,
  change_type text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  effective_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_by integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── Tenant Registrations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_registrations (
  id serial PRIMARY KEY,
  tenant_id integer REFERENCES tenants(id),
  plan_id integer,
  company_name text NOT NULL,
  slug text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  industry text,
  country text,
  employee_count_range text,
  status text NOT NULL DEFAULT 'pending',
  token text,
  token_expiry timestamp,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- ─── Password Reset Tokens ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  tenant_id integer NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

-- ─── Notification Logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_logs (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  user_id integer,
  channel text NOT NULL,
  recipient text NOT NULL,
  subject text,
  body text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  metadata jsonb,
  sent_at timestamp NOT NULL DEFAULT now()
);

-- ─── WFH Requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wfh_requests (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  employee_id integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status wfh_status NOT NULL DEFAULT 'Pending',
  approved_by integer,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── Expense Claims ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_claims (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  employee_id integer NOT NULL,
  title text NOT NULL,
  description text,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status expense_claim_status NOT NULL DEFAULT 'Draft',
  submitted_at timestamp with time zone,
  approved_by integer,
  approved_at timestamp with time zone,
  rejection_reason text,
  paid_at timestamp with time zone,
  payment_reference text,
  receipt_url text,
  category expense_category,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_claim_items (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  claim_id integer NOT NULL,
  description text NOT NULL,
  category expense_category,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  receipt_url text,
  expense_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── Shift Change Requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_change_requests (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  employee_id integer NOT NULL,
  current_shift_id integer,
  requested_shift_id integer,
  effective_date date NOT NULL,
  reason text,
  status shift_change_status NOT NULL DEFAULT 'Pending',
  approved_by integer,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── System Settings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id serial PRIMARY KEY,
  category text NOT NULL,
  key text NOT NULL,
  value text,
  is_encrypted boolean NOT NULL DEFAULT false,
  updated_by integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(category, key)
);

-- ─── Storage Cleanup Runs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS storage_cleanup_runs (
  id serial PRIMARY KEY,
  started_at timestamp NOT NULL DEFAULT now(),
  finished_at timestamp,
  files_deleted integer NOT NULL DEFAULT 0,
  bytes_freed bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error text
);

SELECT 'Migration completed successfully.' AS result;
