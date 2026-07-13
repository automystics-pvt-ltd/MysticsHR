CREATE TYPE "public"."employee_status" AS ENUM('Pre-Joining', 'Active', 'On Leave of Absence', 'Suspended', 'Notice Period', 'Separated');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('Permanent', 'Contract', 'Probation', 'Intern', 'Part-Time');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('Male', 'Female', 'Other');--> statement-breakpoint
CREATE TYPE "public"."blood_group" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('Single', 'Married', 'Divorced', 'Widowed');--> statement-breakpoint
CREATE TYPE "public"."emp_doc_status" AS ENUM('Active', 'Expired', 'Expiring Soon');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('Not Started', 'In Progress', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."onboarding_task_category" AS ENUM('HR', 'IT', 'Department', 'Employee');--> statement-breakpoint
CREATE TYPE "public"."hrms_role" AS ENUM('customer_admin', 'hr_manager', 'hr_executive', 'hod', 'payroll_admin', 'employee');--> statement-breakpoint
CREATE TYPE "public"."requisition_employment_type" AS ENUM('Permanent', 'Contract', 'Probation', 'Intern', 'Part-Time');--> statement-breakpoint
CREATE TYPE "public"."requisition_status" AS ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected', 'On Hold', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."candidate_stage" AS ENUM('Applied', 'Shortlisted', 'Interview Scheduled', 'Interview Completed', 'Offer Issued', 'Offer Accepted', 'Rejected', 'On Hold');--> statement-breakpoint
CREATE TYPE "public"."source_of_hire" AS ENUM('LinkedIn', 'Naukri', 'Indeed', 'Referral', 'Walk-In', 'Campus', 'Agency', 'Company Website', 'Other');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('Scheduled', 'Completed', 'Cancelled', 'No Show');--> statement-breakpoint
CREATE TYPE "public"."interview_recommendation" AS ENUM('Strong Hire', 'Hire', 'No Decision', 'No Hire', 'Strong No Hire');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('Draft', 'Issued', 'Accepted', 'Rejected', 'Withdrawn', 'Expired');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('Pending', 'Uploaded', 'Under Verification', 'Verified', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('Government ID', 'PAN Card', 'Bank Account Details', 'Passport Photo', 'Educational Certificate', 'Experience Letter', 'Relieving Letter', 'Salary Slip', 'Address Proof', 'Other');--> statement-breakpoint
CREATE TYPE "public"."pre_onboarding_status" AS ENUM('Pending', 'In Progress', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."shift_swap_status" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."shift_type" AS ENUM('Fixed', 'Flexible', 'Rotational', 'Night Shift');--> statement-breakpoint
CREATE TYPE "public"."week_day" AS ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('Present', 'Absent', 'Half-Day', 'On Leave', 'On Permission', 'Holiday', 'Week Off', 'Regularization Pending');--> statement-breakpoint
CREATE TYPE "public"."regularization_status" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('Pending', 'HOD Approved', 'HR Approved', 'Approved', 'Rejected', 'Cancelled', 'Cancel Requested');--> statement-breakpoint
CREATE TYPE "public"."permission_status" AS ENUM('Pending', 'Approved', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."lock_exception_status" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."lock_exception_type" AS ENUM('edit_salary', 'edit_attendance', 'edit_leave_balance', 'edit_bank_account');--> statement-breakpoint
CREATE TYPE "public"."payroll_record_status" AS ENUM('Pending', 'Approved', 'Paid');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('Draft', 'Processing', 'Computed', 'Approved', 'Locked');--> statement-breakpoint
CREATE TYPE "public"."salary_component_type" AS ENUM('Basic', 'HRA', 'Special Allowance', 'Travel Allowance', 'Medical Allowance', 'Performance Bonus', 'Shift Allowance', 'Night Differential Pay', 'Other Earning', 'PF Employee', 'PF Employer', 'ESI Employee', 'ESI Employer', 'Professional Tax', 'TDS', 'LOP Deduction', 'Loan Repayment', 'Other Deduction');--> statement-breakpoint
CREATE TYPE "public"."salary_revision_status" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."tax_regime" AS ENUM('Old', 'New');--> statement-breakpoint
CREATE TYPE "public"."appraisal_outcome_label" AS ENUM('Outstanding', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement', 'Unsatisfactory');--> statement-breakpoint
CREATE TYPE "public"."appraisal_stage" AS ENUM('Goal Setting', 'Mid Review', 'Self Appraisal', 'Manager Evaluation', 'Calibration', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."performance_cycle_status" AS ENUM('Draft', 'Active', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."performance_cycle_type" AS ENUM('Annual', 'Semi-Annual', 'Quarterly');--> statement-breakpoint
CREATE TYPE "public"."performance_goal_status" AS ENUM('Draft', 'Active', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."ticket_category" AS ENUM('IT', 'HR', 'Finance', 'Payroll', 'Admin', 'Other');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('Low', 'Medium', 'High', 'Urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('Open', 'In Progress', 'Pending Employee Response', 'Resolved', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."document_request_status" AS ENUM('Pending', 'Fulfilled', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."hr_document_type" AS ENUM('Experience Certificate', 'Appointment Letter', 'Warning Notice', 'Offer Letter', 'NOC', 'Relieving Letter');--> statement-breakpoint
CREATE TYPE "public"."clearance_status" AS ENUM('Pending', 'Completed', 'Waived');--> statement-breakpoint
CREATE TYPE "public"."exit_status" AS ENUM('Submitted', 'HR Reviewing', 'Notice Period', 'Clearance Pending', 'FnF Pending', 'FnF Approved', 'Separated', 'Rejected', 'Withdrawn');--> statement-breakpoint
CREATE TYPE "public"."exit_type" AS ENUM('Resignation', 'Termination', 'Retirement', 'Contract Expiry');--> statement-breakpoint
CREATE TYPE "public"."wfh_status" AS ENUM('Pending', 'Approved', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('Meals', 'Travel', 'Accommodation', 'Communications', 'Office Supplies', 'Training', 'Client Entertainment', 'Other');--> statement-breakpoint
CREATE TYPE "public"."expense_claim_status" AS ENUM('Draft', 'Submitted', 'Approved', 'Rejected', 'Paid');--> statement-breakpoint
CREATE TYPE "public"."shift_change_status" AS ENUM('Pending', 'Approved', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"plan_id" integer,
	"contact_email" text,
	"industry" text,
	"website" text,
	"country" text,
	"notes" text,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"grace_period_days" integer DEFAULT 7 NOT NULL,
	"trial_ends_at" timestamp,
	"subscription_starts_at" timestamp,
	"subscription_ends_at" timestamp,
	"custom_max_users" integer,
	"custom_max_employees" integer,
	"custom_max_branches" integer,
	"custom_max_api_calls" integer,
	"custom_price_monthly" integer,
	"custom_price_yearly" integer,
	"enabled_modules" jsonb,
	"enabled_features" jsonb,
	"theme_config" jsonb,
	"payslip_config" jsonb,
	"id_card_config" jsonb,
	"employee_id_prefix" text,
	"employee_id_sequence" integer DEFAULT 0 NOT NULL,
	"razorpay_customer_id" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"gst_number" text,
	"billing_address" jsonb,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'starter' NOT NULL,
	"price_monthly" integer DEFAULT 0 NOT NULL,
	"price_yearly" integer DEFAULT 0 NOT NULL,
	"max_users" integer DEFAULT 10 NOT NULL,
	"max_employees" integer DEFAULT 50 NOT NULL,
	"max_branches" integer DEFAULT 1 NOT NULL,
	"max_api_calls" integer DEFAULT 10000 NOT NULL,
	"enabled_modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled_features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled_screens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"offer_text" text,
	"badge_text" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"head_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "designations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"title" text NOT NULL,
	"code" text NOT NULL,
	"department_id" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"date_of_birth" date,
	"gender" "gender",
	"department_id" integer,
	"designation_id" integer,
	"employment_type" "employment_type" DEFAULT 'Permanent' NOT NULL,
	"status" "employee_status" DEFAULT 'Pre-Joining' NOT NULL,
	"date_of_joining" date,
	"ctc" numeric(14, 2),
	"manager_id" integer,
	"location" text,
	"branch_id" integer,
	"default_shift_template_id" integer,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "employee_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"national_id" text,
	"pan" text,
	"aadhaar" text,
	"pf_number" text,
	"esi_number" text,
	"uan" text,
	"marital_status" "marital_status",
	"blood_group" "blood_group",
	"nationality" text,
	"permanent_address" text,
	"current_address" text,
	"personal_email" text,
	"linkedin_url" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relation" text,
	"bank_account_name" text,
	"bank_account_number" text,
	"ifsc_code" text,
	"bank_name" text,
	"bank_branch" text,
	"probation_end_date" date,
	"confirmation_date" date,
	"notice_period_days" integer,
	"work_location" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_profiles_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "employee_education" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"degree" text NOT NULL,
	"institution" text NOT NULL,
	"field_of_study" text,
	"start_year" integer,
	"end_year" integer,
	"grade" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_work_experience" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"company" text NOT NULL,
	"designation" text NOT NULL,
	"location" text,
	"start_date" date,
	"end_date" date,
	"description" text,
	"ctc_drawn" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_name" text NOT NULL,
	"file_url" text,
	"issue_date" date,
	"expiry_date" date,
	"alert_days" integer DEFAULT 30,
	"status" "emp_doc_status" DEFAULT 'Active' NOT NULL,
	"notes" text,
	"uploaded_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"name" text NOT NULL,
	"proficiency" text,
	"years_of_experience" integer,
	"last_used_year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"name" text NOT NULL,
	"issuing_organization" text NOT NULL,
	"credential_id" text,
	"credential_url" text,
	"issue_date" date,
	"expiry_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"name" text NOT NULL,
	"relation" text NOT NULL,
	"date_of_birth" date,
	"gender" text,
	"phone" text,
	"occupation" text,
	"is_dependent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"module" text NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by_id" integer,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "induction_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"session_date" date NOT NULL,
	"trainer_name" text NOT NULL,
	"topics" text,
	"duration_minutes" integer,
	"notes" text,
	"recorded_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"status" "onboarding_status" DEFAULT 'Not Started' NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"joining_date" date,
	"welcome_email_sent_at" timestamp with time zone,
	"id_card_generated_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_checklists_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "onboarding_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"checklist_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" "onboarding_task_category" DEFAULT 'HR' NOT NULL,
	"assignee_role" text,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"completed_by_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrms_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "hrms_role" DEFAULT 'employee' NOT NULL,
	"password_hash" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_at" timestamp,
	"locked_reason" text,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp,
	"invite_token" text,
	"invite_expiry" timestamp,
	"invited_at" timestamp,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" text,
	"mfa_backup_codes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer,
	"user_email" text,
	"action" text NOT NULL,
	"module" text NOT NULL,
	"record_id" text,
	"field_name" text,
	"previous_value" text,
	"new_value" text,
	"ip_address" text,
	"platform_admin_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"slug" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"description" text,
	"level" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_requisitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"requisition_code" text NOT NULL,
	"title" text NOT NULL,
	"department_id" integer,
	"designation_id" integer,
	"number_of_positions" integer DEFAULT 1 NOT NULL,
	"employment_type" "requisition_employment_type" DEFAULT 'Permanent' NOT NULL,
	"location" text,
	"experience_min" integer,
	"experience_max" integer,
	"budget_min" numeric(14, 2),
	"budget_max" numeric(14, 2),
	"job_description" text,
	"required_skills" text,
	"status" "requisition_status" DEFAULT 'Draft' NOT NULL,
	"raised_by_id" integer,
	"approver_id" integer,
	"approval_notes" text,
	"approved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"requisition_id" integer,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"current_company" text,
	"current_designation" text,
	"total_experience" integer,
	"current_ctc" text,
	"expected_ctc" text,
	"notice_period" text,
	"resume_url" text,
	"source" "source_of_hire" DEFAULT 'Other' NOT NULL,
	"stage" "candidate_stage" DEFAULT 'Applied' NOT NULL,
	"rejection_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "interview_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"candidate_id" integer NOT NULL,
	"round_number" integer DEFAULT 1 NOT NULL,
	"round_name" text NOT NULL,
	"interviewer_id" integer,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"mode" text DEFAULT 'Video' NOT NULL,
	"meeting_link" text,
	"location" text,
	"status" "interview_status" DEFAULT 'Scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"interview_round_id" integer NOT NULL,
	"interviewer_id" integer,
	"technical_score" integer,
	"communication_score" integer,
	"problem_solving_score" integer,
	"culture_fit_score" integer,
	"overall_score" integer,
	"strengths" text,
	"weaknesses" text,
	"comments" text,
	"recommendation" "interview_recommendation",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"offer_code" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_title" text NOT NULL,
	"ctc" numeric(14, 2) NOT NULL,
	"joining_date" date NOT NULL,
	"expiry_date" date,
	"letter_content" text,
	"letter_url" text,
	"status" "offer_status" DEFAULT 'Draft' NOT NULL,
	"issued_by_id" integer,
	"issued_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_onboarding_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"record_id" integer NOT NULL,
	"document_type" "document_type" NOT NULL,
	"document_name" text NOT NULL,
	"file_url" text,
	"status" "document_status" DEFAULT 'Pending' NOT NULL,
	"uploaded_at" timestamp with time zone,
	"verified_by_id" integer,
	"verified_at" timestamp with time zone,
	"rejection_reason" text,
	"is_required" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_onboarding_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"candidate_id" integer NOT NULL,
	"offer_letter_id" integer,
	"expected_joining_date" date NOT NULL,
	"status" "pre_onboarding_status" DEFAULT 'Pending' NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"shift_template_id" integer NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"assigned_by_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_swaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"requester_employee_id" integer NOT NULL,
	"swap_with_employee_id" integer NOT NULL,
	"swap_date" date NOT NULL,
	"reason" text,
	"hod_status" "shift_swap_status" DEFAULT 'Pending' NOT NULL,
	"hod_actioned_by_id" integer,
	"hod_remarks" text,
	"hod_actioned_at" timestamp with time zone,
	"hr_status" "shift_swap_status" DEFAULT 'Pending' NOT NULL,
	"hr_actioned_by_id" integer,
	"hr_remarks" text,
	"hr_actioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"shift_type" "shift_type" DEFAULT 'Fixed' NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"grace_period_minutes" integer DEFAULT 0 NOT NULL,
	"break_duration_minutes" integer DEFAULT 0 NOT NULL,
	"min_working_hours_minutes" integer DEFAULT 480 NOT NULL,
	"weekly_off" text[],
	"department_id" integer,
	"shift_rate_per_hour" numeric(10, 2),
	"night_differential_rate" numeric(10, 2),
	"overtime_threshold_minutes" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"attendance_date" date NOT NULL,
	"sign_in_time" timestamp with time zone,
	"sign_out_time" timestamp with time zone,
	"total_minutes_worked" integer,
	"break_duration_minutes" integer DEFAULT 0,
	"overtime_minutes" integer DEFAULT 0,
	"status" "attendance_status" DEFAULT 'Absent' NOT NULL,
	"is_hr_override" boolean DEFAULT false NOT NULL,
	"override_reason" text,
	"override_by_id" integer,
	"override_at" timestamp with time zone,
	"notes" text,
	"sign_in_latitude" numeric(9, 6),
	"sign_in_longitude" numeric(9, 6),
	"sign_in_accuracy_meters" integer,
	"sign_in_user_agent" text,
	"sign_out_latitude" numeric(9, 6),
	"sign_out_longitude" numeric(9, 6),
	"sign_out_accuracy_meters" integer,
	"sign_out_user_agent" text,
	"sign_in_timezone" text,
	"sign_out_timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_regularizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"attendance_date" date NOT NULL,
	"requested_sign_in" timestamp with time zone,
	"requested_sign_out" timestamp with time zone,
	"reason" text NOT NULL,
	"status" "regularization_status" DEFAULT 'Pending' NOT NULL,
	"hod_actioned_by_id" integer,
	"hod_remarks" text,
	"hod_actioned_at" timestamp with time zone,
	"attendance_record_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "overtime_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"attendance_date" date NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"rate_per_hour" numeric(10, 2),
	"total_amount" numeric(12, 2),
	"attendance_record_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blackout_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"department_id" integer,
	"reason" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_accrual_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"accrual_type" text NOT NULL,
	"days" numeric(5, 1) NOT NULL,
	"notes" text,
	"processed_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"total_days" numeric(5, 1) NOT NULL,
	"is_half_day" boolean DEFAULT false NOT NULL,
	"half_day_session" text,
	"reason" text NOT NULL,
	"document_url" text,
	"status" "leave_status" DEFAULT 'Pending' NOT NULL,
	"is_lop" boolean DEFAULT false NOT NULL,
	"lop_confirmed" boolean DEFAULT false NOT NULL,
	"hod_actioned_by_id" integer,
	"hod_remarks" text,
	"hod_actioned_at" timestamp with time zone,
	"hr_actioned_by_id" integer,
	"hr_remarks" text,
	"hr_actioned_at" timestamp with time zone,
	"cancelled_by_id" integer,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"year" integer NOT NULL,
	"allocated" numeric(5, 1) DEFAULT '0' NOT NULL,
	"used" numeric(5, 1) DEFAULT '0' NOT NULL,
	"pending" numeric(5, 1) DEFAULT '0' NOT NULL,
	"carry_forward" numeric(5, 1) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"requires_hod_approval" boolean DEFAULT true NOT NULL,
	"requires_hr_approval" boolean DEFAULT true NOT NULL,
	"advance_notice_days" integer DEFAULT 0 NOT NULL,
	"min_consecutive_days" numeric(3, 1) DEFAULT '0.5',
	"max_consecutive_days" numeric(5, 1),
	"allow_half_day" boolean DEFAULT true NOT NULL,
	"lop_by_default" boolean DEFAULT false NOT NULL,
	"carry_forward_enabled" boolean DEFAULT false NOT NULL,
	"carry_forward_max" numeric(5, 1),
	"encashment_enabled" boolean DEFAULT false NOT NULL,
	"applicable_employment_types" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_policies_leave_type_id_unique" UNIQUE("leave_type_id")
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"annual_quota" numeric(5, 1) DEFAULT '0' NOT NULL,
	"carry_forward_enabled" boolean DEFAULT false NOT NULL,
	"carry_forward_max" numeric(5, 1),
	"encashment_enabled" boolean DEFAULT false NOT NULL,
	"applicable_employment_types" text[],
	"min_consecutive_days" numeric(3, 1) DEFAULT '0.5',
	"max_consecutive_days" numeric(5, 1),
	"advance_notice_days" integer DEFAULT 0 NOT NULL,
	"requires_hr_approval" boolean DEFAULT true NOT NULL,
	"requires_hod_approval" boolean DEFAULT true NOT NULL,
	"allow_half_day" boolean DEFAULT true NOT NULL,
	"lop_by_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"permission_date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"reason" text NOT NULL,
	"status" "permission_status" DEFAULT 'Pending' NOT NULL,
	"hod_actioned_by_id" integer,
	"hod_remarks" text,
	"hod_actioned_at" timestamp with time zone,
	"is_override" boolean DEFAULT false NOT NULL,
	"override_justification" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_registers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"used_minutes" integer DEFAULT 0 NOT NULL,
	"limit_minutes" integer DEFAULT 240 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_repayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"loan_type" text NOT NULL,
	"principal_amount" numeric(12, 2) NOT NULL,
	"monthly_deduction" numeric(12, 2) NOT NULL,
	"outstanding_amount" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"notes" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_lock_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"payroll_lock_id" integer NOT NULL,
	"requested_by_id" integer,
	"reason" text NOT NULL,
	"exception_type" "lock_exception_type" NOT NULL,
	"status" "lock_exception_status" DEFAULT 'Pending' NOT NULL,
	"approved_by_id" integer,
	"approval_remarks" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_by_id" integer,
	"locked_at" timestamp with time zone,
	"unlocked_by_id" integer,
	"unlocked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"payroll_run_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"salary_structure_id" integer,
	"working_days" numeric(4, 1) DEFAULT '0' NOT NULL,
	"present_days" numeric(4, 1) DEFAULT '0' NOT NULL,
	"leave_days" numeric(4, 1) DEFAULT '0' NOT NULL,
	"lop_days" numeric(4, 1) DEFAULT '0' NOT NULL,
	"overtime_hours" numeric(6, 2) DEFAULT '0' NOT NULL,
	"basic" numeric(12, 2) DEFAULT '0' NOT NULL,
	"hra" numeric(12, 2) DEFAULT '0' NOT NULL,
	"special_allowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"travel_allowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"medical_allowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"performance_bonus" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shift_allowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"night_differential" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_earnings" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gross_earnings" numeric(12, 2) DEFAULT '0' NOT NULL,
	"pf_employee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"pf_employer" numeric(12, 2) DEFAULT '0' NOT NULL,
	"esi_employee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"esi_employer" numeric(12, 2) DEFAULT '0' NOT NULL,
	"professional_tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tds" numeric(12, 2) DEFAULT '0' NOT NULL,
	"lop_deduction" numeric(12, 2) DEFAULT '0' NOT NULL,
	"loan_deduction" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_regime" "tax_regime" DEFAULT 'New',
	"component_breakdown" jsonb,
	"status" "payroll_record_status" DEFAULT 'Pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"status" "payroll_run_status" DEFAULT 'Draft' NOT NULL,
	"initiated_by_id" integer,
	"approved_by_id" integer,
	"run_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"total_employees" integer DEFAULT 0 NOT NULL,
	"total_gross" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_net" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"setting_key" text NOT NULL,
	"setting_value" text NOT NULL,
	"description" text,
	"updated_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"payroll_record_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"payslip_data" jsonb,
	"html_content" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"component_type" "salary_component_type" NOT NULL,
	"component_name" text NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"percentage_of_basic" numeric(6, 2),
	"is_earning" boolean DEFAULT true NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"old_structure_id" integer,
	"new_structure_id" integer,
	"effective_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" "salary_revision_status" DEFAULT 'Pending' NOT NULL,
	"requested_by_id" integer,
	"approved_by_id" integer,
	"approval_remarks" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"gross_ctc" numeric(12, 2) DEFAULT '0' NOT NULL,
	"annual_ctc" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_regime_declarations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"financial_year" text NOT NULL,
	"regime" "tax_regime" DEFAULT 'New' NOT NULL,
	"investment_declarations" jsonb,
	"declaration_date" date NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appraisal_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"final_score" numeric(5, 2),
	"outcome_label" "appraisal_outcome_label",
	"calibration_note" text,
	"normalized_score" numeric(5, 2),
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"calculated_by" integer
);
--> statement-breakpoint
CREATE TABLE "goal_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"goal_id" integer NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"commentary" text,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"goal_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"commentary" text,
	"evaluated_by" integer,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"title" text NOT NULL,
	"cycle_type" "performance_cycle_type" DEFAULT 'Annual' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "performance_cycle_status" DEFAULT 'Draft' NOT NULL,
	"current_stage" "appraisal_stage" DEFAULT 'Goal Setting' NOT NULL,
	"description" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"weightage" numeric(5, 2) DEFAULT '10' NOT NULL,
	"target_value" text,
	"measurement_method" text,
	"status" "performance_goal_status" DEFAULT 'Draft' NOT NULL,
	"assigned_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "self_appraisals" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"goal_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"commentary" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"category" "ticket_category" NOT NULL,
	"priority" "ticket_priority" NOT NULL,
	"status" "ticket_status" DEFAULT 'Open' NOT NULL,
	"raised_by_employee_id" integer,
	"assigned_to_user_id" integer,
	"sla_deadline" timestamp with time zone,
	"sla_breached" boolean DEFAULT false NOT NULL,
	"sla_escalated_at" timestamp with time zone,
	"attachment_url" text,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"assigned_to_user_id" integer,
	"assigned_by_user_id" integer,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "ticket_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"comment_id" integer,
	"uploaded_by_user_id" integer,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"content_type" text NOT NULL,
	"object_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_sla_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"event" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_download_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"issued_document_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"downloaded_at" timestamp with time zone,
	"download_count" integer DEFAULT 0 NOT NULL,
	"last_ip_address" text,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_download_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"document_type" "hr_document_type" NOT NULL,
	"reason" text,
	"captured_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "document_request_status" DEFAULT 'Pending' NOT NULL,
	"issued_document_id" integer,
	"fulfilled_by" integer,
	"fulfilled_at" timestamp with time zone,
	"hr_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"document_type" "hr_document_type" NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"company_address" text,
	"header_text" text,
	"footer_text" text,
	"body_template" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issued_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"template_id" integer,
	"document_type" "hr_document_type" NOT NULL,
	"filename" text NOT NULL,
	"generated_by" integer,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"field_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"file_content" text
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"recipient_user_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exit_clearance_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"exit_request_id" integer NOT NULL,
	"department" text NOT NULL,
	"task_name" text NOT NULL,
	"description" text,
	"assigned_to_user_id" integer,
	"due_date" date,
	"status" "clearance_status" DEFAULT 'Pending' NOT NULL,
	"completed_by_user_id" integer,
	"completed_at" timestamp with time zone,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exit_interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"exit_request_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exit_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"exit_type" "exit_type" NOT NULL,
	"status" "exit_status" DEFAULT 'Submitted' NOT NULL,
	"reason" text NOT NULL,
	"requested_lwd" date NOT NULL,
	"actual_lwd" date,
	"notice_period_days" integer,
	"notice_period_waived" boolean DEFAULT false NOT NULL,
	"notice_period_buyout" boolean DEFAULT false NOT NULL,
	"hr_remarks" text,
	"initiated_by_user_id" integer,
	"approved_by_user_id" integer,
	"approved_at" timestamp with time zone,
	"separated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fnf_computations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"exit_request_id" integer NOT NULL,
	"pending_salary" numeric(14, 2) DEFAULT '0' NOT NULL,
	"leave_encashment" numeric(14, 2) DEFAULT '0' NOT NULL,
	"gratuity" numeric(14, 2) DEFAULT '0' NOT NULL,
	"bonus_proration" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notice_period_lop" numeric(14, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_payable" numeric(14, 2) DEFAULT '0' NOT NULL,
	"computed_by_user_id" integer,
	"computed_at" timestamp with time zone,
	"hr_approved_by_user_id" integer,
	"hr_approved_at" timestamp with time zone,
	"finance_approved_by_user_id" integer,
	"finance_approved_at" timestamp with time zone,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"report_type" text NOT NULL,
	"name" text NOT NULL,
	"frequency" text NOT NULL,
	"recipients" text[] DEFAULT '{}' NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_report_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"report_type" text NOT NULL,
	"selected_fields" text[] DEFAULT '{}' NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"channel" text NOT NULL,
	"event_type" text NOT NULL,
	"module" text NOT NULL,
	"recipient_email" text,
	"recipient_phone" text,
	"recipient_name" text,
	"subject" text,
	"body" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"error_message" text,
	"entity_type" text,
	"entity_id" integer,
	"metadata" jsonb,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"email_subject" text,
	"email_body" text,
	"whatsapp_template" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"whatsapp_enabled" boolean DEFAULT true NOT NULL,
	"silenced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_prefs_emp_event_unique" UNIQUE("employee_id","event_type")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_chain_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"transaction_type" text NOT NULL,
	"step" integer DEFAULT 1 NOT NULL,
	"approver_role" text NOT NULL,
	"approver_label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"escalation_after_hours" integer,
	"escalate_to" text,
	"conditions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_cleanup_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"scanned" integer DEFAULT 0 NOT NULL,
	"candidates" integer DEFAULT 0 NOT NULL,
	"orphans" integer DEFAULT 0 NOT NULL,
	"deleted" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"age_days" integer DEFAULT 0 NOT NULL,
	"dry_run" boolean DEFAULT false NOT NULL,
	"duration_ms" integer,
	"triggered_by" text DEFAULT 'cron' NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"hashed_secret" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_id" integer,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_prefix_unique" UNIQUE("prefix")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"invoice_id" integer,
	"gateway" text DEFAULT 'razorpay' NOT NULL,
	"gateway_order_id" text,
	"gateway_payment_id" text,
	"gateway_signature" text,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"method" text,
	"error_code" text,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"from_plan_id" integer,
	"to_plan_id" integer,
	"change_type" text NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_by" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"plan_id" integer,
	"invoice_number" text NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"billing_period_start" date,
	"billing_period_end" date,
	"due_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method" text,
	"payment_reference" text,
	"notes" text,
	"gateway" text DEFAULT 'manual' NOT NULL,
	"gateway_order_id" text,
	"gateway_payment_id" text,
	"tax_amount_cents" integer DEFAULT 0 NOT NULL,
	"gst_number" text,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "tenant_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"invoice_id" integer,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" text,
	"reference_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'India',
	"phone" text,
	"email" text,
	"is_headquarters" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"role_slug" varchar(50) NOT NULL,
	"module_key" varchar(100) NOT NULL,
	"actions" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"company_name" text NOT NULL,
	"slug" text NOT NULL,
	"industry" text,
	"country" text,
	"plan_id" integer,
	"password_hash" text NOT NULL,
	"otp" text NOT NULL,
	"otp_expiry" timestamp NOT NULL,
	"otp_attempts" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"otp" text NOT NULL,
	"expiry" timestamp NOT NULL,
	"used_at" timestamp,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "wfh_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" "wfh_status" DEFAULT 'Pending' NOT NULL,
	"manager_actioned_by_id" integer,
	"manager_remarks" text,
	"manager_actioned_at" timestamp with time zone,
	"hr_actioned_by_id" integer,
	"hr_remarks" text,
	"hr_actioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_claim_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"claim_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"category" "expense_category" NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"receipt_url" text,
	"expense_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"title" text NOT NULL,
	"claim_date" date NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "expense_claim_status" DEFAULT 'Draft' NOT NULL,
	"notes" text,
	"manager_actioned_by_id" integer,
	"manager_remarks" text,
	"manager_actioned_at" timestamp with time zone,
	"hr_actioned_by_id" integer,
	"hr_remarks" text,
	"hr_actioned_at" timestamp with time zone,
	"finance_actioned_by_id" integer,
	"finance_remarks" text,
	"finance_actioned_at" timestamp with time zone,
	"paid_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"current_shift_id" integer,
	"requested_shift_id" integer NOT NULL,
	"effective_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" "shift_change_status" DEFAULT 'Pending' NOT NULL,
	"manager_actioned_by_id" integer,
	"manager_remarks" text,
	"manager_actioned_at" timestamp with time zone,
	"hr_actioned_by_id" integer,
	"hr_remarks" text,
	"hr_actioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designations" ADD CONSTRAINT "designations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designations" ADD CONSTRAINT "designations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_experience" ADD CONSTRAINT "employee_work_experience_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_experience" ADD CONSTRAINT "employee_work_experience_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_certifications" ADD CONSTRAINT "employee_certifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_certifications" ADD CONSTRAINT "employee_certifications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_family_members" ADD CONSTRAINT "employee_family_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_family_members" ADD CONSTRAINT "employee_family_members_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_history" ADD CONSTRAINT "employee_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_history" ADD CONSTRAINT "employee_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_history" ADD CONSTRAINT "employee_history_changed_by_id_hrms_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "induction_sessions" ADD CONSTRAINT "induction_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "induction_sessions" ADD CONSTRAINT "induction_sessions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "induction_sessions" ADD CONSTRAINT "induction_sessions_recorded_by_id_hrms_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_checklists" ADD CONSTRAINT "onboarding_checklists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_checklists" ADD CONSTRAINT "onboarding_checklists_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_checklist_id_onboarding_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."onboarding_checklists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_completed_by_id_hrms_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrms_users" ADD CONSTRAINT "hrms_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrms_users" ADD CONSTRAINT "hrms_users_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_raised_by_id_hrms_users_id_fk" FOREIGN KEY ("raised_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_approver_id_hrms_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_requisition_id_job_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."job_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_rounds" ADD CONSTRAINT "interview_rounds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_rounds" ADD CONSTRAINT "interview_rounds_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_rounds" ADD CONSTRAINT "interview_rounds_interviewer_id_hrms_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interview_round_id_interview_rounds_id_fk" FOREIGN KEY ("interview_round_id") REFERENCES "public"."interview_rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interviewer_id_hrms_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_issued_by_id_hrms_users_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_onboarding_documents" ADD CONSTRAINT "pre_onboarding_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_onboarding_documents" ADD CONSTRAINT "pre_onboarding_documents_record_id_pre_onboarding_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."pre_onboarding_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_onboarding_documents" ADD CONSTRAINT "pre_onboarding_documents_verified_by_id_hrms_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_onboarding_records" ADD CONSTRAINT "pre_onboarding_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_onboarding_records" ADD CONSTRAINT "pre_onboarding_records_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_onboarding_records" ADD CONSTRAINT "pre_onboarding_records_offer_letter_id_offer_letters_id_fk" FOREIGN KEY ("offer_letter_id") REFERENCES "public"."offer_letters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_template_id_shift_templates_id_fk" FOREIGN KEY ("shift_template_id") REFERENCES "public"."shift_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_assigned_by_id_hrms_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swaps" ADD CONSTRAINT "shift_swaps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swaps" ADD CONSTRAINT "shift_swaps_requester_employee_id_employees_id_fk" FOREIGN KEY ("requester_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swaps" ADD CONSTRAINT "shift_swaps_swap_with_employee_id_employees_id_fk" FOREIGN KEY ("swap_with_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swaps" ADD CONSTRAINT "shift_swaps_hod_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("hod_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swaps" ADD CONSTRAINT "shift_swaps_hr_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("hr_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_override_by_id_hrms_users_id_fk" FOREIGN KEY ("override_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_hod_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("hod_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_records" ADD CONSTRAINT "overtime_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_records" ADD CONSTRAINT "overtime_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_records" ADD CONSTRAINT "overtime_records_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blackout_dates" ADD CONSTRAINT "blackout_dates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blackout_dates" ADD CONSTRAINT "blackout_dates_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blackout_dates" ADD CONSTRAINT "blackout_dates_created_by_id_hrms_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_accrual_history" ADD CONSTRAINT "leave_accrual_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_accrual_history" ADD CONSTRAINT "leave_accrual_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_accrual_history" ADD CONSTRAINT "leave_accrual_history_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_accrual_history" ADD CONSTRAINT "leave_accrual_history_processed_by_id_hrms_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_hod_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("hod_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_hr_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("hr_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_cancelled_by_id_hrms_users_id_fk" FOREIGN KEY ("cancelled_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_applications" ADD CONSTRAINT "permission_applications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_applications" ADD CONSTRAINT "permission_applications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_applications" ADD CONSTRAINT "permission_applications_hod_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("hod_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_registers" ADD CONSTRAINT "permission_registers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_registers" ADD CONSTRAINT "permission_registers_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_created_by_id_hrms_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_lock_exceptions" ADD CONSTRAINT "payroll_lock_exceptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_lock_exceptions" ADD CONSTRAINT "payroll_lock_exceptions_payroll_lock_id_payroll_locks_id_fk" FOREIGN KEY ("payroll_lock_id") REFERENCES "public"."payroll_locks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_lock_exceptions" ADD CONSTRAINT "payroll_lock_exceptions_requested_by_id_hrms_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_lock_exceptions" ADD CONSTRAINT "payroll_lock_exceptions_approved_by_id_hrms_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_locks" ADD CONSTRAINT "payroll_locks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_locks" ADD CONSTRAINT "payroll_locks_locked_by_id_hrms_users_id_fk" FOREIGN KEY ("locked_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_locks" ADD CONSTRAINT "payroll_locks_unlocked_by_id_hrms_users_id_fk" FOREIGN KEY ("unlocked_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_initiated_by_id_hrms_users_id_fk" FOREIGN KEY ("initiated_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_id_hrms_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD CONSTRAINT "payroll_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD CONSTRAINT "payroll_settings_updated_by_id_hrms_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_record_id_payroll_records_id_fk" FOREIGN KEY ("payroll_record_id") REFERENCES "public"."payroll_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_old_structure_id_salary_structures_id_fk" FOREIGN KEY ("old_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_new_structure_id_salary_structures_id_fk" FOREIGN KEY ("new_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_requested_by_id_hrms_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_approved_by_id_hrms_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_created_by_id_hrms_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_regime_declarations" ADD CONSTRAINT "tax_regime_declarations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_regime_declarations" ADD CONSTRAINT "tax_regime_declarations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_outcomes" ADD CONSTRAINT "appraisal_outcomes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_outcomes" ADD CONSTRAINT "appraisal_outcomes_cycle_id_performance_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."performance_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_outcomes" ADD CONSTRAINT "appraisal_outcomes_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_outcomes" ADD CONSTRAINT "appraisal_outcomes_calculated_by_hrms_users_id_fk" FOREIGN KEY ("calculated_by") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_goal_id_performance_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."performance_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_updated_by_hrms_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_goal_id_performance_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."performance_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_evaluated_by_hrms_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_cycles" ADD CONSTRAINT "performance_cycles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_cycles" ADD CONSTRAINT "performance_cycles_created_by_hrms_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_cycle_id_performance_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."performance_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_assigned_by_hrms_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_appraisals" ADD CONSTRAINT "self_appraisals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_appraisals" ADD CONSTRAINT "self_appraisals_goal_id_performance_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."performance_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_appraisals" ADD CONSTRAINT "self_appraisals_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_raised_by_employee_id_employees_id_fk" FOREIGN KEY ("raised_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_assigned_to_user_id_hrms_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_ticket_id_helpdesk_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."helpdesk_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_assigned_to_user_id_hrms_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_assigned_by_user_id_hrms_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_helpdesk_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."helpdesk_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_comment_id_ticket_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."ticket_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_user_id_hrms_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_helpdesk_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."helpdesk_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_author_id_hrms_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_sla_logs" ADD CONSTRAINT "ticket_sla_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_sla_logs" ADD CONSTRAINT "ticket_sla_logs_ticket_id_helpdesk_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."helpdesk_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_download_tokens" ADD CONSTRAINT "document_download_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_download_tokens" ADD CONSTRAINT "document_download_tokens_issued_document_id_issued_documents_id_fk" FOREIGN KEY ("issued_document_id") REFERENCES "public"."issued_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_download_tokens" ADD CONSTRAINT "document_download_tokens_created_by_user_id_hrms_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_issued_document_id_issued_documents_id_fk" FOREIGN KEY ("issued_document_id") REFERENCES "public"."issued_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_fulfilled_by_hrms_users_id_fk" FOREIGN KEY ("fulfilled_by") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_generated_by_hrms_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_recipient_user_id_hrms_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_clearance_tasks" ADD CONSTRAINT "exit_clearance_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_clearance_tasks" ADD CONSTRAINT "exit_clearance_tasks_exit_request_id_exit_requests_id_fk" FOREIGN KEY ("exit_request_id") REFERENCES "public"."exit_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_clearance_tasks" ADD CONSTRAINT "exit_clearance_tasks_assigned_to_user_id_hrms_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_clearance_tasks" ADD CONSTRAINT "exit_clearance_tasks_completed_by_user_id_hrms_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_interviews" ADD CONSTRAINT "exit_interviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_interviews" ADD CONSTRAINT "exit_interviews_exit_request_id_exit_requests_id_fk" FOREIGN KEY ("exit_request_id") REFERENCES "public"."exit_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_interviews" ADD CONSTRAINT "exit_interviews_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_requests" ADD CONSTRAINT "exit_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_requests" ADD CONSTRAINT "exit_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_requests" ADD CONSTRAINT "exit_requests_initiated_by_user_id_hrms_users_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_requests" ADD CONSTRAINT "exit_requests_approved_by_user_id_hrms_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fnf_computations" ADD CONSTRAINT "fnf_computations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fnf_computations" ADD CONSTRAINT "fnf_computations_exit_request_id_exit_requests_id_fk" FOREIGN KEY ("exit_request_id") REFERENCES "public"."exit_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fnf_computations" ADD CONSTRAINT "fnf_computations_computed_by_user_id_hrms_users_id_fk" FOREIGN KEY ("computed_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fnf_computations" ADD CONSTRAINT "fnf_computations_hr_approved_by_user_id_hrms_users_id_fk" FOREIGN KEY ("hr_approved_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fnf_computations" ADD CONSTRAINT "fnf_computations_finance_approved_by_user_id_hrms_users_id_fk" FOREIGN KEY ("finance_approved_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_created_by_user_id_hrms_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_report_templates" ADD CONSTRAINT "saved_report_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_report_templates" ADD CONSTRAINT "saved_report_templates_created_by_user_id_hrms_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_chain_configs" ADD CONSTRAINT "approval_chain_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_cleanup_runs" ADD CONSTRAINT "storage_cleanup_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_hrms_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_registrations" ADD CONSTRAINT "tenant_registrations_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_hrms_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wfh_requests" ADD CONSTRAINT "wfh_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wfh_requests" ADD CONSTRAINT "wfh_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wfh_requests" ADD CONSTRAINT "wfh_requests_manager_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("manager_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wfh_requests" ADD CONSTRAINT "wfh_requests_hr_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("hr_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claim_items" ADD CONSTRAINT "expense_claim_items_claim_id_expense_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."expense_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claim_items" ADD CONSTRAINT "expense_claim_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_manager_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("manager_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_hr_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("hr_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_finance_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("finance_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_current_shift_id_shift_templates_id_fk" FOREIGN KEY ("current_shift_id") REFERENCES "public"."shift_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_requested_shift_id_shift_templates_id_fk" FOREIGN KEY ("requested_shift_id") REFERENCES "public"."shift_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_manager_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("manager_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_hr_actioned_by_id_hrms_users_id_fk" FOREIGN KEY ("hr_actioned_by_id") REFERENCES "public"."hrms_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "departments_tenant_code_idx" ON "departments" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "designations_tenant_code_idx" ON "designations" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_tenant_employee_id_idx" ON "employees" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_tenant_email_idx" ON "employees" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "hrms_users_email_tenant_idx" ON "hrms_users" USING btree ("email","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_tenant_slug_idx" ON "roles" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "job_requisitions_tenant_code_idx" ON "job_requisitions" USING btree ("tenant_id","requisition_code");--> statement-breakpoint
CREATE UNIQUE INDEX "offer_letters_tenant_code_idx" ON "offer_letters" USING btree ("tenant_id","offer_code");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_types_tenant_code_idx" ON "leave_types" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_settings_tenant_key_idx" ON "payroll_settings" USING btree ("tenant_id","setting_key");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_tenant_code_idx" ON "branches" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_unique_idx" ON "role_permissions" USING btree ("tenant_id","role_slug","module_key");